import * as fs from 'node:fs'
import * as vscode from 'vscode'
import { setFocusedComposerAgentMode, setFocusedComposerDbDraftEmpty } from './agentSessionContext'
import type { BuildRhythmHandles } from './buildRhythm'
import {
  getCursorGlobalStateDbPath,
  getWorkspaceStateDbPath,
  readComposerDraftSnapshot,
  readComposerUnifiedMode,
  readFocusedComposerId,
  type ComposerDraftSnapshot,
} from './cursorStorage'

const POLL_MS = 300
const LOG_DEBOUNCE_MS = 350

function draftSignature(snapshot: ComposerDraftSnapshot): string {
  return `${snapshot.textField.length}:${snapshot.richTextRaw.length}:${snapshot.extracted.length}:${snapshot.richTextRaw}:${snapshot.textField}:${snapshot.extracted}`
}

function previewDraft(snapshot: ComposerDraftSnapshot): string {
  const text = snapshot.extracted || snapshot.textField
  if (!text) return ''
  return text.length <= 80
    ? text.replace(/\s+/g, ' ').trim()
    : `${text.replace(/\s+/g, ' ').trim().slice(0, 79)}…`
}

export function registerComposerDraftWatcher(
  context: vscode.ExtensionContext,
  log: vscode.OutputChannel,
  buildRhythm: BuildRhythmHandles,
  noteActivity: (kind: 'edit' | 'save') => void,
): void {
  let pollTimer: ReturnType<typeof setInterval> | undefined
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let dbWatch: fs.FSWatcher | undefined
  let walWatch: fs.FSWatcher | undefined
  let lastSignature: string | null = null
  let seeded = false
  let sqliteWarned = false
  let workspaceWarned = false
  let lastComposerId: string | null = null
  let readyLogged = false
  let lastDraftCharCount = 0

  const draftCharCount = (snapshot: ComposerDraftSnapshot): number =>
    snapshot.extracted.length || snapshot.textField.length || snapshot.richTextRaw.length

  const logDraftActivity = (snapshot: ComposerDraftSnapshot, source: string) => {
    const chars = draftCharCount(snapshot)
    const preview = previewDraft(snapshot)
    log.appendLine(
      `Composer draft typing (${chars} chars, ${source})${preview ? `: ${preview}` : ''}`,
    )
  }

  const handleDraftChange = (snapshot: ComposerDraftSnapshot, source: string) => {
    noteActivity('edit')
    const chars = draftCharCount(snapshot)
    const prev = lastDraftCharCount
    lastDraftCharCount = chars
    const delta = chars > prev ? chars - prev : 1
    buildRhythm.noteComposingActivity('composer-draft', delta)

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined
      logDraftActivity(snapshot, source)
    }, LOG_DEBOUNCE_MS)
  }

  const poll = async () => {
    const globalDb = getCursorGlobalStateDbPath()
    if (!globalDb) {
      if (!workspaceWarned) {
        workspaceWarned = true
        log.appendLine('Composer draft watcher: Cursor globalStorage/state.vscdb not found.')
      }
      return
    }

    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    const workspaceDb = folder ? getWorkspaceStateDbPath(folder) : null
    if (folder && !workspaceDb && !workspaceWarned) {
      workspaceWarned = true
      log.appendLine(
        `Composer draft watcher: no workspaceStorage for ${folder}; using global composer headers.`,
      )
    }
    if (workspaceDb || !workspaceWarned) workspaceWarned = false

    try {
      const composerId = await readFocusedComposerId(workspaceDb, globalDb)
      if (!composerId) return

      if (composerId !== lastComposerId) {
        lastComposerId = composerId
        lastSignature = null
        lastDraftCharCount = 0
        seeded = false
        readyLogged = false
      }

      const unifiedMode = await readComposerUnifiedMode(globalDb, composerId)
      const agentMode = unifiedMode === 'agent'
      setFocusedComposerAgentMode(agentMode)

      const snapshot = await readComposerDraftSnapshot(globalDb, composerId)
      if (!snapshot) return

      const dbDraftEmpty =
        snapshot.extracted.length === 0 &&
        snapshot.textField.length === 0 &&
        snapshot.richTextRaw.length <= 142
      setFocusedComposerDbDraftEmpty(dbDraftEmpty)

      const signature = draftSignature(snapshot)

      if (!seeded) {
        lastSignature = signature
        lastDraftCharCount = draftCharCount(snapshot)
        seeded = true
        if (!readyLogged) {
          readyLogged = true
          const modeHint = agentMode
            ? 'agent mode — DB draft usually empty; input hook handles typing'
            : `richText ${snapshot.richTextRaw.length} bytes`
          log.appendLine(
            `Composer draft watcher: tracking composer ${composerId.slice(0, 8)}… (${modeHint})`,
          )
        }
        return
      }

      if (signature !== lastSignature) {
        lastSignature = signature
        handleDraftChange(snapshot, 'composerData.richText')
      }
    } catch (error) {
      if (!sqliteWarned) {
        sqliteWarned = true
        const message = error instanceof Error ? error.message : String(error)
        log.appendLine(`Composer draft detection: ${message}`)
      }
    }
  }

  const attachDbWatch = (globalDb: string) => {
    if (dbWatch) {
      dbWatch.close()
      dbWatch = undefined
    }
    if (walWatch) {
      walWatch.close()
      walWatch = undefined
    }
    const onDbChange = () => void poll()
    try {
      dbWatch = fs.watch(globalDb, { persistent: false }, onDbChange)
      context.subscriptions.push({ dispose: () => dbWatch?.close() })
    } catch {
      // readonly poll only
    }
    const walPath = `${globalDb}-wal`
    if (fs.existsSync(walPath)) {
      try {
        walWatch = fs.watch(walPath, { persistent: false }, onDbChange)
        context.subscriptions.push({ dispose: () => walWatch?.close() })
      } catch {
        // poll only
      }
    }
  }

  const start = () => {
    if (pollTimer) return
    seeded = false
    lastSignature = null
    const globalDb = getCursorGlobalStateDbPath()
    if (globalDb) attachDbWatch(globalDb)
    void poll()
    pollTimer = setInterval(() => void poll(), POLL_MS)
  }

  const stop = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = undefined
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = undefined
    }
    if (dbWatch) {
      dbWatch.close()
      dbWatch = undefined
    }
    if (walWatch) {
      walWatch.close()
      walWatch = undefined
    }
    setFocusedComposerAgentMode(false)
    setFocusedComposerDbDraftEmpty(true)
  }

  const syncEnabled = () => {
    const enabled = vscode.workspace
      .getConfiguration('cursorSpiderCoach')
      .get<boolean>('detectComposerDrafts', true)
    if (enabled) {
      const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '(no folder)'
      log.appendLine(`Composer draft watcher: on — ${folder}`)
      start()
    } else {
      log.appendLine('Composer draft watcher: off')
      stop()
    }
  }

  syncEnabled()
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('cursorSpiderCoach.detectComposerDrafts')) {
        syncEnabled()
      }
    }),
    { dispose: stop },
  )
}
