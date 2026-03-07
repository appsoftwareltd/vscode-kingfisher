# Technical Reference — Kingfisher

## Architecture Overview

Kingfisher is a VS Code extension that colours the status bar per workspace without writing to any shared settings file.

### Core Constraint

The VS Code extension API has no runtime mechanism to change the status bar colour. The only available mechanism is `workbench.colorCustomizations`, which must be written to a settings scope:

| Scope | File | Shared via VCS? |
|---|---|---|
| `ConfigurationTarget.Workspace` | `.vscode/settings.json` | ✅ Yes — ruled out |
| `ConfigurationTarget.WorkspaceFolder` | `.vscode/settings.json` | ✅ Yes — ruled out |
| `ConfigurationTarget.Global` | User settings (`%APPDATA%\Code\User\settings.json`) | ❌ No — **used** |

Kingfisher writes only to `ConfigurationTarget.Global` (user settings).

---

## Implementation

### File Structure

```
src/
  extension.ts       — VS Code entry point (activate/deactivate)
  ColourService.ts   — Pure utilities + vscode-dependent apply/persist functions
  test/
    ColourService.test.ts   — Unit tests for pure utility functions
    __mocks__/
      vscode.ts             — Vitest mock for the vscode module
```

### ColourService.ts

**Pure utility functions (unit tested):**

| Function | Description |
|---|---|
| `isValidHex(value)` | Validates `#rrggbb` or `#rgb` hex strings |
| `getContrastColour(hex)` | Returns `#000000` or `#ffffff` using WCAG 2.x relative luminance |
| `dimColour(hex, factor?)` | Blends a hex colour toward mid-grey by `factor` (default 0.35). Used for inactive title bar states. |
| `buildColourCustomizations(existing, colour)` | Returns new object with all Kingfisher keys merged in (status bar + title bar) — does not mutate input |
| `removeColourCustomizations(existing)` | Returns new object with all Kingfisher keys removed — does not mutate input |

**Keys written by `buildColourCustomizations`:**

| Key | Value |
|---|---|
| `statusBar.background` | Chosen colour |
| `statusBar.foreground` | Auto-contrast (`#000000` or `#ffffff`) |
| `titleBar.activeBackground` | Chosen colour |
| `titleBar.activeForeground` | Auto-contrast |
| `titleBar.inactiveBackground` | `dimColour(colour)` — blended toward mid-grey |
| `titleBar.inactiveForeground` | Auto-contrast of the dimmed colour |

**vscode-dependent functions:**

| Function | Description |
|---|---|
| `applyColour(colour)` | Writes to `workbench.colorCustomizations` via `ConfigurationTarget.Global` |
| `clearColour()` | Removes statusBar keys from `workbench.colorCustomizations`; removes the entire key if empty |
| `getSavedColour(globalState)` | Reads saved colour for current workspace from `globalState` keyed by workspace folder URI |
| `saveColour(globalState, colour)` | Persists colour for current workspace to `globalState` |
| `deleteSavedColour(globalState)` | Removes saved colour for current workspace from `globalState` |

**Storage key:** `kingfisher.statusBarColour` in `globalState`. Value is a `Record<string, string>` mapping workspace folder URI → hex colour.

### extension.ts

**`activate(context)`:**
1. Creates a status bar item (left-aligned, low priority) bound to `kingfisher.setColour`
2. Reads saved colour from `globalState` and applies it via `applyColour`
3. Registers `onDidChangeWindowState` listener — reapplies the workspace colour on window focus gain
4. Registers `kingfisher.setColour` command (QuickPick with presets + custom input + clear option)
5. Registers `kingfisher.clearColour` command

**`deactivate()`:**
- Calls `clearColour()` to remove the written user settings keys

### Multi-window Behaviour

VS Code's user settings are global — all open windows share the same `workbench.colorCustomizations` value and react to it live. Kingfisher uses `onDidChangeWindowState` to reapply the *current window's* colour whenever that window gains focus. The result:

- The active/focused window always shows the correct colour
- Other open windows reflect the most recently focused window's colour
- This is a VS Code platform limitation; no extension API provides per-window colour isolation

---

## Build System

- **Bundler:** esbuild — produces `dist/extension.js` (CommonJS, Node platform)
- **External:** `vscode` module (not bundled; provided by VS Code host)
- **Watch mode:** `node build.mjs --watch`
- **Config:** `build.mjs`

## Testing

- **Framework:** vitest
- **Test files:** `src/test/**/*.test.ts`
- **vscode mock:** `src/test/__mocks__/vscode.ts` — aliased via `vitest.config.ts` `resolve.alias`
- **Run:** `npm test`

Only pure utility functions are unit tested. The vscode-dependent functions (`applyColour`, `clearColour`, `getSavedColour`, etc.) require integration with the VS Code host and are not unit tested.

## TypeScript Configuration

- Target: ES2022
- Module: Node16 / moduleResolution: Node16
- Strict mode enabled
- Linting: `tsc --noEmit` (`npm run lint`)

## Publisher / Marketplace

- Publisher ID: `appsoftwareltd`
- Extension ID: `appsoftwareltd.kingfisher`
- License: Elastic-2.0
