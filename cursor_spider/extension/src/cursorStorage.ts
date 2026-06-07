import { execFile } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/** GUI-launched Cursor often has a minimal PATH; use a full path when possible. */
export function resolveSqlite3Executable(): string {
  if (process.platform === 'darwin' && fs.existsSync('/usr/bin/sqlite3')) {
    return '/usr/bin/sqlite3'
  }
  if (process.platform === 'win32') {
    const candidates = [
      path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'sqlite3', 'sqlite3.exe'),
      path.join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'sqlite3', 'sqlite3.exe'),
    ]
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate
    }
  }
  return 'sqlite3'
}

export function getCursorWorkspaceStorageDir(): string | null {
  const home = os.homedir()
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage')
  }
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming')
    return path.join(appData, 'Cursor', 'User', 'workspaceStorage')
  }
  if (process.platform === 'linux') {
    return path.join(home, '.config', 'Cursor', 'User', 'workspaceStorage')
  }
  return null
}

function normalizeFsPath(value: string): string {
  let normalized = value.trim()
  if (normalized.startsWith('file://')) {
    try {
      normalized = fileURLToPath(normalized)
    } catch {
      normalized = normalized.replace(/^file:\/\//, '')
    }
  }
  return path.normalize(normalized).replace(/\\/g, '/').replace(/\/+$/, '')
}

/** Resolve workspaceStorage/<hash>/state.vscdb for an open folder. */
export function getWorkspaceStateDbPath(workspaceFsPath: string): string | null {
  const storageDir = getCursorWorkspaceStorageDir()
  if (!storageDir || !fs.existsSync(storageDir)) return null

  const target = normalizeFsPath(workspaceFsPath)
  try {
    for (const entry of fs.readdirSync(storageDir)) {
      const workspaceJson = path.join(storageDir, entry, 'workspace.json')
      if (!fs.existsSync(workspaceJson)) continue
      const meta = JSON.parse(fs.readFileSync(workspaceJson, 'utf8')) as {
        folder?: string
        workspace?: string
      }
      const folder = meta.folder ?? meta.workspace
      if (!folder || typeof folder !== 'string') continue
      if (normalizeFsPath(folder) === target) {
        return path.join(storageDir, entry, 'state.vscdb')
      }
    }
  } catch {
    return null
  }
  return null
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''")
}

export async function queryCursorDbValue(dbPath: string, sql: string): Promise<string | null> {
  const rows = await queryCursorDbJson<{ value: string }>(dbPath, sql)
  return rows[0]?.value ?? null
}

export async function readFocusedComposerIdFromWorkspace(
  workspaceDbPath: string,
): Promise<string | null> {
  const raw = await queryCursorDbValue(
    workspaceDbPath,
    `SELECT value FROM ItemTable WHERE key = 'composer.composerData' LIMIT 1`,
  )
  if (!raw) return null
  try {
    const meta = JSON.parse(raw) as { lastFocusedComposerIds?: string[] }
    const id = meta.lastFocusedComposerIds?.[0]
    return typeof id === 'string' && id.length > 0 ? id : null
  } catch {
    return null
  }
}

/** Most recently updated Composer thread (works without a workspace folder open). */
export async function readFocusedComposerIdFromGlobal(
  globalDbPath: string,
): Promise<string | null> {
  const raw = await queryCursorDbValue(
    globalDbPath,
    `SELECT value FROM ItemTable WHERE key = 'composer.composerHeaders' LIMIT 1`,
  )
  if (!raw) return null
  try {
    const meta = JSON.parse(raw) as {
      allComposers?: Array<{ composerId?: string; lastUpdatedAt?: number }>
    }
    const sorted = (meta.allComposers ?? [])
      .filter((c) => typeof c.composerId === 'string' && c.composerId.length > 0)
      .sort((a, b) => (b.lastUpdatedAt ?? 0) - (a.lastUpdatedAt ?? 0))
    return sorted[0]?.composerId ?? null
  } catch {
    return null
  }
}

export async function readFocusedComposerId(
  workspaceDbPath: string | null,
  globalDbPath: string | null,
): Promise<string | null> {
  if (workspaceDbPath) {
    const fromWorkspace = await readFocusedComposerIdFromWorkspace(workspaceDbPath)
    if (fromWorkspace) return fromWorkspace
  }
  if (globalDbPath) {
    return readFocusedComposerIdFromGlobal(globalDbPath)
  }
  return null
}

function extractLexicalText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const record = node as Record<string, unknown>
  if (typeof record.text === 'string') return record.text
  const children = record.children
  if (!Array.isArray(children)) return ''
  return children.map((child) => extractLexicalText(child)).join('')
}

/** Draft text in the Composer input (before Send). */
export function extractComposerDraftText(raw: string): string {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    if (typeof value.text === 'string' && value.text.length > 0) return value.text
    if (typeof value.richText === 'string' && value.richText.length > 0) {
      if (value.richText.includes('"root"')) {
        const lexical = JSON.parse(value.richText) as { root?: unknown }
        return extractLexicalText(lexical.root).trim()
      }
      return value.richText
    }
    if (Array.isArray(value.richText)) {
      return value.richText
        .map((chunk) =>
          typeof chunk === 'object' && chunk && 'text' in chunk
            ? String((chunk as { text?: string }).text ?? '')
            : '',
        )
        .join('')
    }
  } catch {
    return ''
  }
  return ''
}

/** Cursor often stores the live input in composer.content.<hash> (plain text). */
export function parseComposerContentValue(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('{') && trimmed.includes('"root"')) {
    try {
      const lexical = JSON.parse(trimmed) as { root?: unknown }
      return extractLexicalText(lexical.root).trim()
    } catch {
      return trimmed
    }
  }
  return trimmed
}

type ComposerContentRow = { key: string; value: string }

export async function readRecentComposerContentDrafts(
  globalDbPath: string,
  limit = 12,
): Promise<ComposerContentRow[]> {
  return queryCursorDbJson<ComposerContentRow>(
    globalDbPath,
    `SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composer.content.%' ORDER BY rowid DESC LIMIT ${limit}`,
  )
}

export type ComposerDraftSnapshot = {
  extracted: string
  richTextRaw: string
  textField: string
}

/** Live Composer input for the focused thread (before Send). */
export async function readComposerDraftSnapshot(
  globalDbPath: string,
  composerId: string,
): Promise<ComposerDraftSnapshot | null> {
  const key = escapeSqlString(`composerData:${composerId}`)
  const raw = await queryCursorDbValue(
    globalDbPath,
    `SELECT value FROM cursorDiskKV WHERE key = '${key}' LIMIT 1`,
  )
  if (raw == null) return null

  let textField = ''
  let richTextRaw = ''
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    if (typeof value.text === 'string') textField = value.text
    if (typeof value.richText === 'string') richTextRaw = value.richText
  } catch {
    return null
  }

  return {
    extracted: extractComposerDraftText(raw),
    richTextRaw,
    textField,
  }
}

export async function readComposerDraftText(
  globalDbPath: string,
  composerId: string,
): Promise<string | null> {
  const snapshot = await readComposerDraftSnapshot(globalDbPath, composerId)
  return snapshot?.extracted ?? null
}

export async function readComposerUnifiedMode(
  globalDbPath: string,
  composerId: string,
): Promise<string | null> {
  const key = escapeSqlString(`composerData:${composerId}`)
  const raw = await queryCursorDbValue(
    globalDbPath,
    `SELECT value FROM cursorDiskKV WHERE key = '${key}' LIMIT 1`,
  )
  if (raw == null) return null
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    return typeof value.unifiedMode === 'string' ? value.unifiedMode : null
  } catch {
    return null
  }
}

export type ComposerAgentSnapshot = {
  generatingCount: number
  isReadingLongFile: boolean
  status: string
  lastUpdatedAt: number
}

export type ComposerAgentWorkSignals = {
  working: boolean
  source: 'generating' | 'reading-file' | 'tool-loading' | 'idle'
  generatingCount: number
  isReadingLongFile: boolean
  status: string
  toolLoadingCount: number
}

/** Agent activity signals from the focused Composer thread. */
export async function readComposerAgentSnapshot(
  globalDbPath: string,
  composerId: string,
): Promise<ComposerAgentSnapshot | null> {
  const key = escapeSqlString(`composerData:${composerId}`)
  const raw = await queryCursorDbValue(
    globalDbPath,
    `SELECT value FROM cursorDiskKV WHERE key = '${key}' LIMIT 1`,
  )
  if (raw == null) return null

  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    const generating = value.generatingBubbleIds
    const generatingCount = Array.isArray(generating) ? generating.length : 0
    return {
      generatingCount,
      isReadingLongFile: value.isReadingLongFile === true,
      status: typeof value.status === 'string' ? value.status : 'none',
      lastUpdatedAt: typeof value.lastUpdatedAt === 'number' ? value.lastUpdatedAt : 0,
    }
  } catch {
    return null
  }
}

function bubbleHasLoadingTool(raw: string): boolean {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    if (value.type !== 2) return false
    const tool = value.toolFormerData as { status?: string } | undefined
    return tool?.status === 'loading'
  } catch {
    return false
  }
}

/** composerData fields + recent agent bubbles (tool calls often omit generatingBubbleIds). */
export async function readComposerAgentWorkSignals(
  globalDbPath: string,
  composerId: string,
): Promise<ComposerAgentWorkSignals | null> {
  const snapshot = await readComposerAgentSnapshot(globalDbPath, composerId)
  if (!snapshot) return null

  let toolLoadingCount = 0
  const bubblePrefix = escapeSqlString(`bubbleId:${composerId}:`)
  const bubbles = await queryCursorDbJson<{ value: string }>(
    globalDbPath,
    `SELECT value FROM cursorDiskKV WHERE key LIKE '${bubblePrefix}%' ORDER BY rowid DESC LIMIT 15`,
  )
  for (const row of bubbles) {
    if (bubbleHasLoadingTool(row.value)) toolLoadingCount += 1
  }

  if (snapshot.generatingCount > 0) {
    return {
      working: true,
      source: 'generating',
      generatingCount: snapshot.generatingCount,
      isReadingLongFile: snapshot.isReadingLongFile,
      status: snapshot.status,
      toolLoadingCount,
    }
  }
  if (snapshot.isReadingLongFile) {
    return {
      working: true,
      source: 'reading-file',
      generatingCount: snapshot.generatingCount,
      isReadingLongFile: true,
      status: snapshot.status,
      toolLoadingCount,
    }
  }
  if (toolLoadingCount > 0) {
    return {
      working: true,
      source: 'tool-loading',
      generatingCount: snapshot.generatingCount,
      isReadingLongFile: snapshot.isReadingLongFile,
      status: snapshot.status,
      toolLoadingCount,
    }
  }

  return {
    working: false,
    source: 'idle',
    generatingCount: snapshot.generatingCount,
    isReadingLongFile: snapshot.isReadingLongFile,
    status: snapshot.status,
    toolLoadingCount,
  }
}

export function getCursorGlobalStateDbPath(): string | null {
  const home = os.homedir()
  const platform = process.platform

  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb')
  }
  if (platform === 'win32') {
    const appData = process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming')
    return path.join(appData, 'Cursor', 'User', 'globalStorage', 'state.vscdb')
  }
  if (platform === 'linux') {
    return path.join(home, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb')
  }
  return null
}

export async function queryCursorDbJson<T extends Record<string, unknown>>(
  dbPath: string,
  sql: string,
): Promise<T[]> {
  if (!fs.existsSync(dbPath)) return []

  const { stdout } = await execFileAsync(resolveSqlite3Executable(), ['-readonly', '-json', dbPath, sql], {
    maxBuffer: 4 * 1024 * 1024,
  })
  const trimmed = stdout.trim()
  if (!trimmed) return []
  const parsed = JSON.parse(trimmed) as T[] | T
  return Array.isArray(parsed) ? parsed : [parsed]
}

/** Best-effort: Cursor user bubble JSON uses varying field names across versions. */
export function isUserComposerBubble(raw: string): boolean {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    if (value.type === 1 || value.type === 'user') return true
    if (value.role === 'user' || value.bubbleType === 'user' || value.author === 'user') return true
    if (value.messageType === 'user' || value.source === 'user') return true
    if (value.isUser === true) return true
  } catch {
    return false
  }
  return false
}

export function bubbleTextPreview(raw: string, maxLen = 120): string | undefined {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    const text =
      (typeof value.text === 'string' && value.text) ||
      (typeof value.rawText === 'string' && value.rawText) ||
      (typeof value.content === 'string' && value.content) ||
      (Array.isArray(value.richText) &&
        value.richText
          .map((chunk) =>
            typeof chunk === 'object' && chunk && 'text' in chunk
              ? String((chunk as { text?: string }).text ?? '')
              : '',
          )
          .join(''))
    if (!text) return undefined
    const oneLine = text.replace(/\s+/g, ' ').trim()
    return oneLine.length <= maxLen ? oneLine : `${oneLine.slice(0, maxLen - 1)}…`
  } catch {
    return undefined
  }
}
