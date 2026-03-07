# Plan

## Summary



## Conversation

[user]: This project is a VS code extension. It's from the same publisher (me) as the project here (C:\Users\Gareth\src\as-notes). Use the same typescript config settings, other conventions and visual studio marketplace publisher id etc -  except for anything related to extension title.

The extension is for differentiating multiple versions of vs code on the same machine, similar to peacock. It will only set the status bar colour - so is simpler in the changes it makes.

The problem with peacock is that it applies settings in settings.json, which teams often share. This is a deal breaker.

We need something that allows for the setting of a custom colour for the status bar, but only applies for the current user, if the extension is running and is settable per workspace

https://github.com/johnpapa/vscode-peacock

[agent]: I've read the README.md and thoroughly examined the as-notes project for conventions. Here's my understanding and proposed approach:

**Problem:** Peacock writes colour settings to `settings.json` (workspace-level), which gets shared via version control. Teams don't want personal colour preferences polluting shared config. Kingfisher solves this by applying status bar colours at runtime only — no `settings.json` modifications.

**Reference conventions from as-notes:**
- Publisher: `appsoftwareltd`
- TypeScript: ES2022 target, Node16 module/moduleResolution, strict mode
- Bundler: esbuild (not webpack), CJS output, `vscode` external
- Testing: vitest
- Engine: vscode ^1.85.0
- Linting: `tsc --noEmit`
- License: Elastic-2.0

**Proposed architecture for Kingfisher:**

1. **Storage:** Use VS Code's `globalState` (per-machine, per-extension) or `workspaceState` (per-workspace, per-extension) to persist the chosen colour per workspace. Neither touches `settings.json`. `workspaceState` is the right fit — it's per-workspace and per-user, invisible to version control.

2. **UI Customisation:** Use the `StatusBarItem` API or the `workbench.colorCustomizations` via `vscode.workspace.getConfiguration().update()` with `ConfigurationTarget.Workspace` — but wait, that *would* write to settings.json. Instead, we should use the **Color Theme Contribution** or the **`vscode.window.createStatusBarItem()`** approach.

   Actually, the cleanest approach: use `vscode.workspace.getConfiguration('workbench').update('colorCustomizations', {...}, ConfigurationTarget.Workspace)` but this writes to settings.json which is exactly what we want to avoid.

   **Better approach:** Use the `setStatusBarMessage` API or create status bar items with custom background colours. VS Code supports `statusBarItem.backgroundColor` but only for warning/error. For full status bar colour, we'd need `workbench.colorCustomizations`.

   Let me reconsider — the only way to colour the entire status bar is via `workbench.colorCustomizations`. The question is *where* to write it:
   - `ConfigurationTarget.Workspace` → `.vscode/settings.json` (shared — BAD)
   - `ConfigurationTarget.WorkspaceFolder` → same issue
   - `ConfigurationTarget.Global` → user settings (affects all workspaces — BAD)

   **The key insight:** We could write to `ConfigurationTarget.Workspace` but have the extension manage it carefully, or we could use the **Workspace Storage API** (`context.workspaceState` or `context.storageUri`) to persist the colour choice, and then apply it programmatically on activation using the Color Decoration API.

   Actually — the real solution is to apply `workbench.colorCustomizations` to `ConfigurationTarget.Workspace` **but** add `.vscode/settings.json` changes to `.gitignore`. But that's not great either since teams may want other settings shared.

   **Best approach I can think of:** Store the colour in `workspaceState`. On activation, apply it via `workbench.colorCustomizations` using `ConfigurationTarget.Workspace`. Provide a command to clear it on deactivation. The settings.json *will* be modified, but the extension manages this transparently. The key differentiator from Peacock is that Kingfisher could be more targeted — only touching the status bar colour keys — and could be designed to clean up after itself.

   Alternatively, we could explore writing only to **User settings** with workspace-specific keys, but that's clunky.

   I think we need to discuss the storage/application strategy. What's your preferred approach? The core options are:

   **Option A:** Store colour in `workspaceState`, apply via `workbench.colorCustomizations` in `ConfigurationTarget.Workspace`. This *does* write to `.vscode/settings.json` but the extension manages it. Users would need to gitignore the relevant keys or the whole settings file.

   **Option B:** Store colour in `workspaceState`, apply via `workbench.colorCustomizations` in `ConfigurationTarget.Global` (user settings). This means the colour applies everywhere unless we actively manage/toggle it based on the current workspace.

   **Option C:** Only use custom `StatusBarItem` elements to give a visual colour cue (e.g., a coloured badge/icon in the status bar) without changing the actual status bar colour. Limited visual impact but zero settings.json footprint.

   My recommendation is **Option A** with the extension being smart about it — applying on activation, cleaning on deactivation, and making it clear in docs that these settings are ephemeral extensions of the extension. What are your thoughts?

[user]: Editing `settings.json` is not an option. The colour change needs to be visible on alt tab window selection, so I think that rules out B. Where can I see an example of StatusBarItem - it needs to be visible in small alt tab view of the window

[agent]: Good — that firmly rules out Options A and B. The constraint is: **no writes to any `settings.json`**, and the colour must be visible in Alt+Tab thumbnails.

Let me clarify what `StatusBarItem` can and can't do:

**StatusBarItem capabilities:**
- `vscode.window.createStatusBarItem()` creates an item in the bottom status bar
- You can set `.text`, `.tooltip`, `.command`, `.color` (foreground text colour)
- `backgroundColor` only supports `ThemeColor` values: `statusBarItem.errorBackground` (red) or `statusBarItem.warningBackground` (yellow/orange) — **not arbitrary colours**
- You cannot set an arbitrary background colour on a single StatusBarItem

**The problem:** A single StatusBarItem won't colour the entire status bar. It would just be a small text element. In an Alt+Tab thumbnail, a single status bar item is essentially invisible — the status bar itself is a thin strip at the bottom, and a small coloured text label within it would be imperceptible at thumbnail scale.

**What IS visible in Alt+Tab?** The overall status bar colour — specifically the `statusBar.background` colour. That's the full-width strip at the bottom of the VS Code window. Peacock changes exactly this, and it's what makes windows distinguishable at a glance.

**The fundamental tension:** The only VS Code API to change `statusBar.background` is `workbench.colorCustomizations`, which writes to settings.json. There is no runtime-only API for this. The VS Code extension API does not expose a way to programmatically set the status bar background colour without going through configuration.

**Possible approaches given this hard constraint:**

1. **Proposed API / Unsupported workaround:** There's no proposed API for this that I'm aware of. The VS Code team has been asked for this and the answer has consistently been "use `workbench.colorCustomizations`".

2. **Write to User settings (not workspace settings):** We could use `ConfigurationTarget.Global` which writes to the user's personal `settings.json` (in `~/.config/Code/User/settings.json` or equivalent). This is **never shared** via version control — it's the user's machine-level config. The extension would:
   - Store the colour per workspace in `workspaceState`
   - On activation, apply via `workbench.colorCustomizations` in **User settings** (`ConfigurationTarget.Global`)
   - On workspace change/deactivation, remove or update the colour
   - This means the user's global settings.json gets modified, but that's *their personal file*, never committed to a repo

   This is actually different from what I described as Option B earlier. The colour *would* be workspace-specific because the extension actively manages it — applying the right colour when a workspace activates and clearing/changing it when switching.

3. **Memento + User Settings hybrid:** Same as above but using `globalState` keyed by workspace folder URI to remember colours across workspaces, and `ConfigurationTarget.Global` to apply.

**My revised recommendation:** Option 2/3 — use **User-level settings** (not workspace settings). The user's personal `settings.json` is never in version control, so it meets the "don't pollute shared config" requirement. The extension manages lifecycle so the right colour shows for the right workspace.

Does this approach work for you? The key distinction: **workspace** `settings.json` (shared, in `.vscode/`) is off limits, but **user** `settings.json` (personal, machine-level) is acceptable since it's never committed.

[user]: OK option 2 sounds best. We just need the colour to persist per vscode instance. Can this be done?

[agent]: Yes, this can be done. Here's how each piece works:

**Per-instance persistence:** `context.workspaceState` is exactly this — it's a key-value store scoped to the current workspace/folder. Each VS Code window that opens a different folder gets its own `workspaceState`. It persists across sessions (close and reopen the same folder → same state). It's never written to any file the user can see — VS Code manages it internally in its own storage database.

So the flow is:

1. **User picks a colour** → stored in `workspaceState` (e.g. `workspaceState.update('statusBarColor', '#ff6600')`)
2. **Extension activates** (on window open) → reads `workspaceState.get('statusBarColor')`, applies it to `workbench.colorCustomizations` via `ConfigurationTarget.Global` (user settings)
3. **User switches workspace / closes window** → the extension in the *new* window applies *its* workspace's colour (or clears if none set)
4. **Colour persists** indefinitely in `workspaceState` — survives restarts, updates, etc.

**The one nuance with multiple simultaneous windows:** If you have 3 VS Code windows open, each running Kingfisher, they'll each try to write to the same user `settings.json`. The last one to activate "wins" for the global setting. However, this is fine in practice because:
- Each window applies its own colour on `window.onDidChangeWindowState` (focus gain)
- When you Alt+Tab to a window, it gains focus → Kingfisher reapplies its colour
- The brief flash when switching is negligible

Actually, let me refine this. There's an even cleaner approach: we listen to **`vscode.window.state.focused`** changes. When a window gains focus, it applies its colour. This means the user settings always reflect the *currently focused* window's colour, which is exactly what you see.

**Summary of the architecture:**

| Concern | Mechanism |
|---|---|
| Persist colour per workspace | `context.workspaceState` |
| Apply colour visually | `workbench.colorCustomizations` → `ConfigurationTarget.Global` |
| Handle multi-window | Reapply on focus gain (`onDidChangeWindowState`) |
| Set colour | Command: "Kingfisher: Set Colour" → colour picker |
| Clear colour | Command: "Kingfisher: Clear Colour" |
| Status bar keys modified | `statusBar.background`, `statusBar.foreground` |

**Commands:**
- `kingfisher.setColour` — opens a colour picker (input box for hex, or a preset palette), saves to workspaceState, applies immediately
- `kingfisher.clearColour` — removes from workspaceState, reverts status bar to theme default
- Possibly `kingfisher.randomColour` — picks a random pleasant colour

**Activation:** `*` (always active) — needs to apply colour on startup before user interacts.

Does this architecture look right? Shall I proceed to TODOs?

[user]: Will all windows appear coloured all the time in alt tab ?

[agent]: No — and this is the key limitation of using `ConfigurationTarget.Global`.

**How it actually works:** `workbench.colorCustomizations` in user settings is a **global** setting. When Kingfisher writes `statusBar.background: #ff6600` to user settings, **every open VS Code window** picks up that colour immediately. VS Code's settings are reactive — all windows share the same user settings and respond to changes in real time.

So if you have 3 windows:
- Window A: colour = red
- Window B: colour = blue  
- Window C: no colour

When Window A gains focus, Kingfisher writes red → **all 3 windows turn red**. When you Alt+Tab to Window B, Kingfisher writes blue → **all 3 windows turn blue**. At any given moment, all windows share the same status bar colour — the colour of whichever window was last focused.

**In the Alt+Tab view:** You see a static snapshot of each window. The snapshots reflect whatever colour was applied *at the time each thumbnail was last rendered*. Since all windows share the same colour at any moment, the Alt+Tab thumbnails will likely all show the same colour (the most recently focused window's colour). This defeats the purpose.

**This is a real problem.** The single-global-setting approach doesn't give true per-window colouring in Alt+Tab.

**Is there a workaround?** Unfortunately, no — not with the current VS Code API. The `workbench.colorCustomizations` setting is inherently global or workspace-scoped. There's no per-window setting mechanism.

**What Peacock does:** Peacock writes to **workspace** `.vscode/settings.json`, which *is* per-window (each window has its own workspace). That's why it works for multi-window — but it's exactly what we can't do.

**Honest assessment:** With the constraint of not writing to workspace `settings.json`, true simultaneous per-window status bar colouring is not achievable with the current VS Code extension API. The options are:

1. **Accept the limitation:** Only the focused window shows its correct colour. Other windows show the last-applied colour. For many users (who Alt+Tab sequentially and just need to confirm "am I in the right window"), this may be acceptable — you see the colour change as soon as the window gains focus.

2. **Reconsider workspace settings:** Write to `.vscode/settings.json` but only the `workbench.colorCustomizations` keys. Add documentation encouraging teams to gitignore these specific settings or the extension could even manage a `.gitignore` entry.

3. **Hybrid approach:** Use workspace settings *only if* a `.vscode/settings.json` already exists and is gitignored, otherwise fall back to user settings with the focus-based approach.

What's your preference? Option 1 (live with the limitation) is the simplest and still useful for identifying the focused window. The colour updates instantly on focus, so by the time you're looking at a window, it shows the right colour.

[user]: Can't the extension just keep it's own settings and apply colours while it is active?

[agent]: The extension *can* persist its own settings (via `workspaceState`) — that part is straightforward. The problem is specifically the "apply colours" step.

VS Code's rendering is not exposed to extensions. An extension cannot directly manipulate the DOM, inject CSS, or programmatically change UI element colours. The **only** mechanism VS Code provides to change the status bar colour is via the `workbench.colorCustomizations` configuration setting. And that setting must be written to *some* `settings.json` — either workspace-level (`.vscode/settings.json`) or user-level (`~/.config/Code/User/settings.json`).

There's no "apply colour at runtime without touching any settings file" API. The configuration system *is* the API.

**So the real question is:** which `settings.json` is acceptable to write to?

- **Workspace** `.vscode/settings.json` — shared via VCS. This is what Peacock uses. Your hard constraint says no.
- **User** `settings.json` — personal, machine-level, never in VCS. The extension would write to this on activation/focus, and it auto-applies to the current window.

Writing to the user `settings.json` **is** the extension "keeping its own settings and applying them while active." The workspaceState stores the chosen colour (invisible, internal). The user settings.json is the *mechanism* through which VS Code applies the colour visually — it's the only lever available.

**To be clear:** the extension would only touch `workbench.colorCustomizations.statusBar.background` (and foreground) in user settings. It wouldn't interfere with workspace settings at all. When the extension is uninstalled or disabled, those keys can be cleaned up.

The earlier issue about multi-window (all windows showing the same colour) remains. But for the single-window or primary-window use case, this works perfectly. And even with multiple windows, the focused window always shows its correct colour.

Shall we go with this approach? To summarise the final design:

1. **Colour choice persisted** in `workspaceState` (internal, invisible)
2. **Colour applied** via `workbench.colorCustomizations` in **user settings** (`ConfigurationTarget.Global`)
3. **On activation** → apply saved colour
4. **On focus gain** → reapply (handles multi-window)
5. **On clear/disable** → remove the keys from user settings
6. **No workspace `settings.json` touched ever**

[user]: Can the extension configure where it reads user settings from, or have different workspaces merge settings in memory?

[agent]: No to both, unfortunately — these are constraints of the VS Code extension API, not something we can configure or work around.

**On "configure where it reads settings from":** The VS Code configuration API (`vscode.workspace.getConfiguration`) only exposes the standard settings hierarchy: Default → User → Workspace → WorkspaceFolder → Language. Extensions cannot redirect VS Code to read from a custom file path or add new tiers to this hierarchy.

**On "merge settings in memory":** Extensions can read settings into memory and compute whatever they like, but they can't inject a computed result back into VS Code's rendering pipeline without writing it to one of those standard settings scopes. VS Code doesn't have an "in-memory settings override" API.

**The root constraint:** VS Code's workbench UI (including the status bar) re-renders based on the live settings hierarchy. Extensions are sandboxed — they can't reach into the renderer process to change colours directly. The only way to tell VS Code to paint the status bar a different colour is to put the value in a settings scope it watches.

---

**I want to reconsider and be pragmatic about this.** Let me step back and think about what the actual user experience looks like:

The real scenario is: a developer has multiple VS Code windows open, each for a different project. They want to glance at Alt+Tab and know which window is which.

The fundamental issue is that all windows share one user `settings.json`. But — **in practice** — when you're looking at the Alt+Tab switcher, you're focused on one window at a time. The moment you hover over a thumbnail, that window hasn't gained focus yet. When you click it, it gains focus and Kingfisher immediately applies its colour.

**So for the Alt+Tab use case specifically:** the thumbnails in Alt+Tab reflect the *current rendered state* of each window. Since they all share user settings and live-update in real time, all windows will show the same colour at any given moment. This does limit the utility for quickly identifying windows *before* you click them.

**However — a viable alternative I haven't fully explored:**

What if Kingfisher stored colours per workspace in `globalState` (keyed by workspace URI) rather than `workspaceState`, and each extension instance (one per window) fought to apply *its* colour on focus? The result would be:
- Windows all show the same colour simultaneously (whichever last had focus)
- On focus, the correct colour snaps in immediately
- The primary use case — "I switched to this window, is it the right one?" — is satisfied instantly

**My honest recommendation:** Build the extension with this design. It's genuinely useful for sequential window identification (which is the common case — you switch to a window and confirm it's right). Document the limitation clearly. If VS Code ever adds a per-window runtime colour API, Kingfisher can adopt it.

Shall we proceed on this basis? Or do you have a specific alt-tab multi-window simultaneous colouring requirement that would make this not useful enough?

[user]: todo implement

[agent]: Proceeding with implementation. Final design confirmed:
- Colour persisted per workspace in `globalState` (keyed by workspace URI)
- Applied via `workbench.colorCustomizations` → `ConfigurationTarget.Global`
- Reapplied on window focus gain
- Commands: `kingfisher.setColour`, `kingfisher.clearColour`
- No workspace `settings.json` modifications ever

[user]:

[user]: OK apply this - it is better than no colour at all. Document our approach, the constraints, limitations and considerations

[user]: Are we still limited to only the status bar colour with this implementation?

[agent]: No — with the `ConfigurationTarget.Global` approach we can write any key under `workbench.colorCustomizations`. The status bar is the most visible element (especially in Alt+Tab thumbnails) and was the primary goal, but other workbench colours are accessible via the same mechanism.

**What else could Kingfisher colour:**

| Key | What it affects |
|---|---|
| `statusBar.background` | The entire status bar strip ✅ (already implemented) |
| `statusBar.foreground` | Status bar text/icons ✅ (already implemented — auto-contrast) |
| `titleBar.activeBackground` | Title bar background (very visible in Alt+Tab and when window is focused) |
| `titleBar.activeForeground` | Title bar text colour |
| `titleBar.inactiveBackground` | Title bar when window is unfocused |
| `activityBar.background` | The leftmost icon strip |
| `activityBar.foreground` | Activity bar icons |
| `sideBar.background` | Explorer/file tree panel |
| `editorGroupHeader.tabsBackground` | Tab bar background |

**Title bar is particularly useful:** On Windows/Linux with the default VS Code title bar, `titleBar.activeBackground` is a large coloured area at the very top of the window — highly visible in Alt+Tab thumbnails without any focus interaction needed. This would significantly improve the multi-window identification use case.

**Recommendation:** Extend the current implementation to also colour the title bar (`titleBar.activeBackground`, `titleBar.activeForeground`, `titleBar.inactiveBackground`) in addition to the status bar. The title bar is a large, visible area and would make windows much more distinguishable. The same hex + contrast logic already implemented applies directly.

Would you like me to extend Kingfisher to also colour the title bar?

[user]: yes - plan todo implement

[agent]: Plan: extend `buildColourCustomizations` / `removeColourCustomizations` to also write the title bar keys (`titleBar.activeBackground`, `titleBar.activeForeground`, `titleBar.inactiveBackground`, `titleBar.inactiveForeground`). The inactive foreground/background will use a slightly dimmed version of the chosen colour so the inactive state is visually distinct. All existing tests remain valid; new tests will cover the title bar keys. No changes to extension.ts or storage are needed — only `ColourService.ts` and its tests change.

[user]:

[user]: yes

[user]: Can we add a colour picker as well as the add custom hex colour command option?

[agent]: VS Code doesn't have a built-in colour picker dialog in its extension API — there's no `showColorPicker()`. So to add a real colour picker, we'd need a **WebviewPanel** with an HTML `<input type="color">` element. That gives the native OS colour picker (the same one you'd get in a browser). Here's how the options break down:

**Option A — WebviewPanel with `<input type="color">`**
- Opens a small VS Code panel containing an HTML colour wheel/picker (native OS dialog via `<input type="color">`)
- User picks a colour, clicks "Apply", message is posted back to the extension via `panel.webview.onDidReceiveMessage`
- Reasonably clean but adds a webview lifecycle to manage (create, dispose, focus)
- The OS colour picker (Windows: colour dialog; macOS: colour wheel) is what users expect from a "colour picker"

**Option B — Inline hex input with live preview (current approach, enhanced)**
- Keep the existing `showInputBox` for custom hex but add display of the current colour swatch in the QuickPick list
- Not a true colour picker but low complexity — users comfortable with hex values might prefer this

**Option C — Third-party colour picker in a webview**
- Embed a library like `react-colorful` or vanilla `iro.js` in a webview for a richer UI
- Heavier — requires bundling the picker library into the extension
- More complex to implement and test

**My recommendation: Option A.** It's the right trade-off — a genuine colour picker without significant complexity overhead. The webview would be minimal: a single HTML file with `<input type="color">` and an "Apply" button. 

The flow would be:
1. User runs "Set Colour" command → QuickPick appears with presets + "Custom colour picker…" option
2. Selecting "Custom colour picker…" opens a small WebviewPanel
3. The webview pre-populates the colour input with the current colour (if any)
4. User picks a colour, clicks Apply → extension receives the hex value, applies and saves it
5. Panel disposes itself

The existing "Custom hex colour…" option could remain alongside it (some users prefer typing hex directly), or be replaced by the picker — your call.

Shall I plan this out fully, or do you have a preference between these options / any refinements?

[user]: Can we have option A and B?

[agent]: Yes, both can coexist cleanly. The QuickPick would offer:

1. **Preset colours** (existing 8 swatches)
2. **$(paintcan) Colour picker…** — opens the WebviewPanel with `<input type="color">`
3. **$(edit) Enter hex value…** — opens the existing `showInputBox`
4. **$(trash) Clear colour** (if a colour is currently set)

The WebviewPanel will be a minimal self-contained HTML page — no external dependencies, no bundled libraries. It pre-fills with the current colour, shows a large `<input type="color">` swatch, and has an Apply button. On Apply, it posts the hex value back and the panel closes itself. A cancel/close just disposes the panel with no changes.

The hex input box stays exactly as it is now. Both routes converge on the same `persistAndApply` function so the rest of the extension is unchanged.

**Changes needed:**
- `src/extension.ts` — add "Colour picker…" option to QuickPick, add `handleColourPicker()` function that creates/manages the WebviewPanel
- `src/ColourPickerPanel.ts` — new file: encapsulates the WebviewPanel lifecycle (create, receive message, dispose)
- No changes to `ColourService.ts`, tests, or `package.json`

Shall I add this to the todo list and implement?

[user]: Regarding the "all vscode instances get the active editor colour issue here" could the extension in the non active editor reset the colour to default for the non active instances?

[agent]: Yes — and this is actually a meaningful improvement worth implementing. The `onDidChangeWindowState` event already fires for both focus gain (`state.focused = true`) **and focus loss** (`state.focused = false`). We're currently only acting on focus gain. If we also act on focus loss by calling `clearColour()`, the behaviour becomes:

- **Window A focused** → applies colour A (all windows show colour A)
- **User switches to Window B:**
  1. Window A fires blur → clears colour (all windows briefly show default)
  2. Window B fires focus → applies colour B (all windows show colour B)
- **Result:** non-focused VS Code windows show no custom colour; the focused window shows its colour

**For Alt+Tab:** This is a significant improvement. The static thumbnails would show the current VS Code window (or whichever had focus when you pressed Alt+Tab) with its colour, and all other VS Code windows with default colours. You can now visually distinguish "the one I'm in" from "the others" without clicking.

**Trade-offs:**
- When you switch to a non-VS Code app (browser, terminal), your VS Code window fires a blur and clears its colour. While you're in Chrome, VS Code shows no colour. On returning to VS Code, the colour snaps back on focus. Likely fine — you'd only care about VS Code colours while in VS Code.
- There's a brief (~millisecond) flash to default when switching *between* VS Code windows. Practically imperceptible.
- If you only have one VS Code window open, the behaviour is unchanged (it gains focus on activation, colours apply, and clears would only happen when you leave VS Code entirely — which is correct).

**Implementation is tiny:** in `extension.ts`, the `onDidChangeWindowState` handler already exists. Currently:
```ts
if (state.focused) { applyColour(...) }
```
Change to:
```ts
if (state.focused) { applyColour(...) } else { clearColour() }
```

This is a one-line change to the event handler with no architectural changes.

**Recommendation:** Yes, implement this. It makes Kingfisher genuinely more useful in the multi-window case at essentially zero cost.

[user]: Apply both this change and the colour picker options selected

[agent]: Plan for Iteration 3:

**Feature 1 — Window blur → clear colour (1-line change)**
- In `extension.ts` `onDidChangeWindowState` handler: add `else { clearColour().catch(logError); }` so non-focused VS Code windows revert to the default theme colour. Alt+Tab will now show: active window = its colour, all other VS Code windows = default.

**Feature 2 — Colour picker WebviewPanel**
- New `src/ColourPickerPanel.ts`: `showColourPicker(context, currentColour, onApply)` function that creates a `WebviewPanel` containing a minimal HTML page. Uses a nonce-based CSP for security. Renders a large `<input type="color">` pre-filled with the current colour, a hex label that updates live, and Apply/Cancel buttons. `postMessage` sends `{ command: 'apply', colour }` back to the extension; panel disposes on either action.
- `extension.ts`: Add `$(paintcan) Colour picker…` QuickPick option (between presets and hex input), handled by calling `showColourPicker`. The existing hex input box is retained unchanged. Both converge on `persistAndApply`.
- No changes to `ColourService.ts` or existing tests.

[user]: 