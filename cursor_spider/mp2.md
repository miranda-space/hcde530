# MP2 Competency Claims

## C8 — Building and Deploying a Complete Tool

**Claim:** My MP2 is **Cursor Spider Coach**—a local desktop companion for **new vibe coders using Cursor**. It detects eight coaching moments (drafting, agent running, stuck, recovery, success, etc.) and responds with authored guidance from a pixel spider overlay. It is **shipped as a complete local tool**: source at [github.com/miranda-space/Cursor_Spider](https://github.com/miranda-space/Cursor_Spider), installable extension (`.vsix`), and documented run path (`npm run dev:electron` + Cursor extension). 

**Evidence:**

- Working overlay + Cursor extension + coaching engine (see `README.md`, `reflection.md`)
- State/trigger reference table and get-started flow for reviewers without class context
- `npm run simulate:coach` demos behavior without a full Cursor session

**Something that went wrong:** I first built triggers around **terminal and file events** (runs finishing, saves). The spider mostly **re-announced status** users already had—it did not change behavior. I removed that scope, redefined the user as a **vibe coder**, and rebuilt on **Composer-only signals** (typing, agent work, quiet time).

**What I’d scope differently next time:** Define the **vibe-coder persona and positioning copy before choosing sensors**, so I do not invest in detectable events that cannot produce useful coaching.

---

## C7: Critical evaluation and professional judgment

**Claim:** I evaluated whether the MP2a direction (Claude mascot + **Bolt**) could actually read **Claude Code** session/terminal state. I concluded it could not without a custom bridge, **pivoted to Cursor**, and later judged terminal-based coaching as low-value even for engineers—then narrowed scope again.

**Evidence:** Platform pivot and trigger redesign documented in `reflection.md`; final trigger table in `README.md` (live vs preview-only states).

---

