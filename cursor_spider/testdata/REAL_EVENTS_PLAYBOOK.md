# Test real Cursor events (not the simulate script)

The **simulate script** fakes events over HTTP. **Real events** come from the **Cursor extension** watching Composer + editor activity (vibe-only — no terminal/diagnostic triggers).

## Before you start

**Terminal A** (keep open):

```bash
cd /Users/miranda/cursor_spider
npm run dev:electron
```

**Check readiness:**

```bash
npm run test:real-events
```

You should see two ✓ checks.

## Load the extension

You can test in **either** way:

### Option A — Install in your normal Cursor window (recommended)

Do this once, then edit in the same Cursor you use every day.

1. Build and package:
   ```bash
   npm run package:extension
   ```
2. In Cursor: **Extensions** view (sidebar) → **`...`** menu → **Install from VSIX...**
3. Choose: `extension/cursor-spider-coach-0.0.1.vsix` (in this repo)
4. **Reload Window** when prompted
5. Keep **`npm run dev:electron`** running in a terminal (spider app must be open)

Status bar should say **Spider Coach: connected** when Electron is running.

### Option B — F5 dev window (for extension developers)

1. **Run → Start Debugging** → **Run Spider Coach extension**
2. A **second** Cursor window opens — only that window sends events until you use Option A

---

### Playbook (normal window after Option A, or Extension Host after Option B)

Open `testdata/playground.ts` in the new window.

| Step | What you do | Expected spider state |
|------|-------------|------------------------|
| 1 | Type in Composer input (~12 chars or keep typing ~2.5s) | `build` |
| 2 | Send a Composer prompt; let agent work ~2–8s | `running` |
| 3 | Let agent finish 2 turns | `success` on 2nd turn end |
| 4 | Go quiet ~2 min after editing | `stuck` (stuck-idle) |
| 5 | Command Palette → **Spider Coach: Show Bridge Log** | See `→ onBuildRhythm`, etc. |

Preview-only states (`idle`, `looping`, `thinking`, `permission_check`, `recovery`) are available from the Dev Panel buttons.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Spider not connected | Start `npm run dev:electron` in Terminal A |
| No new window on F5 | Run `npm run build:extension`, then F5 again |
| Status bar says not connected | Electron not running, or wrong window (use Extension Host) |
| Edits in original Cursor window | Use **Option A** (Install from VSIX), not F5 only |
| Composer typing → no build | Open Composer chat; draft watcher needs focused Composer id |

## After it works

The extension stays installed in Cursor. You still need **`npm run dev:electron`** whenever you want the spider overlay visible.
