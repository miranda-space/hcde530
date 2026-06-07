# Cursor Spider Coach

**A coach that sits beside Cursor while you vibe-code.** Cursor Spider helps beginners stay oriented during AI-assisted work—when to write a sharper prompt, when to wait, when you’re spinning your wheels, and when to lock in a win.

It picks up on what you’re doing in Composer (drafting, running the agent, going quiet) and meets you in that moment with **targeted coaching**—not generic tips, but guidance matched to where you are. The spider recognizes **eight coaching states** and responds with encouragement, prompt craft, and next-step nudges accordingly.

---

## Access (no public URL)

This is a **local desktop app**, not a hosted website.

**Source code:** [github.com/miranda-space/hcde530](https://github.com/miranda-space/hcde530.git)

Clone the repo and run it on your machine—the spider appears as a **desktop overlay** (not a link you open from GitHub).

---

## Get started

**Requirements:** macOS or Windows, [Node.js 20+](https://nodejs.org/), [Cursor](https://cursor.com) (recommended).

Setup is a few commands (~5 minutes the first time). You do **not** need two separate install paths—everything below is one flow.

### Option A — Ask Cursor (easiest)

1. Clone and **open this repo in Cursor**.
2. In **Agent** chat, paste something like:

   > Install Spider Coach and start it for me: run `npm install`, `npm run build:extension`, then `npm run dev:electron` in the background. Install the latest extension VSIX if needed and restart the Extension Host. Tell me when the overlay is up and the bridge is connected.

3. You should see two windows: the **spider overlay** and a **Dev panel**. Keep the terminal running.

The agent can run the same steps you would manually. This is how most contributors on this project start it day to day.

### Option B — Terminal (same steps, by hand)

```bash
git clone https://github.com/miranda-space/hcde530.git
cd Cursor_Spider
npm install
npm run build:extension
npm run dev:electron
```

**What you should see:** spider overlay + Dev panel; coach bridge on `127.0.0.1:39217` (local only).

**Enable live coaching in Cursor** (after Electron is running):

```bash
npm run package:extension
cursor --install-extension extension/cursor-spider-coach-*.vsix --force
```

Then in Cursor: **Cmd+Shift+P** → **Developer: Restart Extension Host**.  
Check **Output → Cursor Spider Coach** for `Bridge: connected`.

**Quick demo without typing in Composer** (Electron must be running):

```bash
npm run simulate:coach
```

**Stop:** `Ctrl+C` in the terminal running `dev:electron`, or close the Electron windows.

---

## Coaching states

Live triggers come from the Cursor extension while Electron is running. The spider picks **one line at random** from each state’s message library (shown below: two samples; full pools live in `src/data/spiderCoachMessages.ts`).

| State | Triggering condition | Example guidance |
| --- | --- | --- |
| **build** | You type in the **Composer input** (before Send)—about **12+ characters** or **~2.5s** of composing in one burst | • *“Good prompt recipe: goal, context, constraint, next step…”*<br>• *“Prompt tip: don’t just say ‘fix this.’ Try: ‘Here’s what I want…’”*<br>*+6 more* |
| **running** | The **agent starts working** (generating, tools, etc.)—cue **~2–8s** after work begins; at most once per **~60s** | • *“Tiny patience moment. While Cursor runs, watch for which files it opens…”*<br>• *“Cursor is spinning its little code web. Don’t stack another request yet…”*<br>*+2 more* |
| **stuck** | **~2 minutes** with no typing in Composer | • *“Psst… if Cursor keeps guessing wrong, pause the battle. Ask it to restate the plan first…”*<br>• *“Spider wisdom: ‘try again’ is too blurry. Try: ‘Keep everything the same except ___.’”*<br>*+2 more* |
| **recovery** | You **type in Composer again** within **5 minutes** after a stuck moment | • *“Wiggle wiggle, welcome back!”*<br>• *“Aww, proud spider moment. You’re getting better at guiding the AI instead of fighting the web!”*<br>*+2 more* |
| **success** | **Every 2nd agent turn** finishes successfully | • *“Nice, it works! Tiny checkpoint: save, commit, or write down what changed…”*<br>• *“Victory wiggle! Before adding more, ask Cursor to summarize this working state…”*<br>*+1 more* |
| **permission_check** | A **terminal command** runs while the agent was active in the last **~90 seconds** | • *“Tiny safety check: Run executes this command now. Allow gives Cursor permission to continue…”*<br>• *“Before clicking, ask: will this command install, run, stop, or delete something?”*<br>*+1 more* |
| **idle** | **Preview only** (Dev panel)—no live extension trigger | • *“Psst… start with one tiny thing you want Cursor to help with…”*<br>• *“Ready when you are. Try asking Cursor to break your idea into the smallest first step…”*<br>*+1 more* |
| **looping** | **Preview only** (Dev panel)—no live extension trigger yet | • *“Loop alert… you’ve changed this a few times, but the bug still looks the same…”*<br>• *“Spidey sense says we might be circling the same web…”*<br>*+1 more* |

---

## Note on `http://127.0.0.1:5173`

You may see this in the terminal when Electron starts. It is an **internal dev server**, not the product. Do not open it in a browser—the spider overlay window is what you use.

---

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev:electron` | Start overlay + dev panel + bridge |
| `npm run simulate:coach` | Demo states without Cursor |
| `npm run package:extension` | Build installable `.vsix` |
| `npm run build:extension` | Compile the Cursor extension |

---

## Repo layout

- `electron/` — overlay, dev panel, local bridge  
- `extension/` — Cursor sensors (Composer / agent activity)  
- `src/` — coaching engine and UI  
- `public/assets/spider/` — state videos
