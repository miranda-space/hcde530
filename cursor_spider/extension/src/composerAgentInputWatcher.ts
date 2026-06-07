import * as vscode from 'vscode'
import type { BuildRhythmHandles } from './buildRhythm'
import { isFocusedComposerAgentMode, isFocusedComposerDbDraftEmpty } from './agentSessionContext'

const FILE_EDIT_GUARD_MS = 250
const VISIBLE_DOC_POLL_MS = 300

const TYPING_COMMANDS = new Set([
  'type',
  'default:type',
  'paste',
  'cut',
  'deleteLeft',
  'deleteRight',
  'editor.action.clipboardPasteAction',
])

const IGNORED_DOC_SCHEMES = new Set(['file', 'output', 'debug', 'vscode-terminal', 'vscode-log'])

function isWorkspaceFileDocument(document: vscode.TextDocument): boolean {
  return document.uri.scheme === 'file'
}

function charDeltaFromChanges(changes: readonly vscode.TextDocumentContentChangeEvent[]): number {
  let added = 0
  for (const change of changes) {
    added += change.text.length
  }
  return added > 0 ? added : 1
}

export function registerComposerAgentInputWatcher(
  context: vscode.ExtensionContext,
  log: vscode.OutputChannel,
  buildRhythm: BuildRhythmHandles,
  noteActivity: (kind: 'edit' | 'save') => void,
): void {
  let lastFileEditMs = 0
  let lastVisibleDocVersions = new Map<string, number>()
  let pollTimer: ReturnType<typeof setInterval> | undefined
  let hookLogged = false
  let logDebounceTimer: ReturnType<typeof setTimeout> | undefined
  let pendingLogSource: string | undefined

  const flushLog = () => {
    if (!pendingLogSource) return
    const source = pendingLogSource
    pendingLogSource = undefined
    log.appendLine(`Composer draft typing (agent input, ${source})`)
  }

  const noteComposerInput = (source: string, charDelta: number) => {
    if (!isFocusedComposerAgentMode() || !isFocusedComposerDbDraftEmpty()) return
    if (Date.now() - lastFileEditMs < FILE_EDIT_GUARD_MS) return
    noteActivity('edit')
    buildRhythm.noteComposingActivity('composer-agent-input', charDelta)

    pendingLogSource = source
    if (logDebounceTimer) clearTimeout(logDebounceTimer)
    logDebounceTimer = setTimeout(() => {
      logDebounceTimer = undefined
      flushLog()
    }, 350)
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (isWorkspaceFileDocument(event.document)) {
        lastFileEditMs = Date.now()
        return
      }
      if (IGNORED_DOC_SCHEMES.has(event.document.uri.scheme)) return
      if (event.contentChanges.length === 0) return
      noteComposerInput(`textdoc:${event.document.uri.scheme}`, charDeltaFromChanges(event.contentChanges))
    }),
  )

  const pollVisibleEditors = () => {
    if (!isFocusedComposerAgentMode()) return
    for (const editor of vscode.window.visibleTextEditors) {
      const { document } = editor
      if (IGNORED_DOC_SCHEMES.has(document.uri.scheme)) continue
      if (isWorkspaceFileDocument(document)) continue
      const key = document.uri.toString()
      const version = document.version
      const previous = lastVisibleDocVersions.get(key)
      lastVisibleDocVersions.set(key, version)
      if (previous !== undefined && version !== previous) {
        noteComposerInput(`visible:${document.uri.scheme}`, 1)
      }
    }
  }

  const commandsWithHook = vscode.commands as typeof vscode.commands & {
    onDidExecuteCommand?: (
      listener: (event: { command: string }) => void,
    ) => vscode.Disposable
  }

  if (typeof commandsWithHook.onDidExecuteCommand === 'function') {
    context.subscriptions.push(
      commandsWithHook.onDidExecuteCommand((event) => {
        if (!TYPING_COMMANDS.has(event.command)) return
        const editor = vscode.window.activeTextEditor
        if (editor && isWorkspaceFileDocument(editor.document)) {
          if (Date.now() - lastFileEditMs < FILE_EDIT_GUARD_MS) return
        }
        noteComposerInput(`cmd:${event.command}`, 1)
      }),
    )
  }

  const start = () => {
    if (pollTimer) return
    lastVisibleDocVersions = new Map()
    if (!hookLogged) {
      hookLogged = true
      const hook = typeof commandsWithHook.onDidExecuteCommand === 'function' ? 'command+poll' : 'poll'
      log.appendLine(`Composer agent input watcher: on (${hook} — for Agent chat where DB draft stays empty).`)
    }
    void pollVisibleEditors()
    pollTimer = setInterval(pollVisibleEditors, VISIBLE_DOC_POLL_MS)
  }

  const stop = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = undefined
    }
    if (logDebounceTimer) {
      clearTimeout(logDebounceTimer)
      logDebounceTimer = undefined
    }
    pendingLogSource = undefined
    lastVisibleDocVersions.clear()
  }

  const syncEnabled = () => {
    const enabled = vscode.workspace
      .getConfiguration('cursorSpiderCoach')
      .get<boolean>('detectComposerDrafts', true)
    if (enabled) start()
    else stop()
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
