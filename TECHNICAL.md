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
  extension.ts          — VS Code entry point (activate/deactivate)
  ColourService.ts      — Pure utilities + vscode-dependent apply/persist functions
  ColourPickerPanel.ts  — WebviewPanel colour picker
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
3. Registers `onDidChangeWindowState` listener:
   - **Focus gain** → reapplies the workspace colour (or clears if none saved)
   - **Focus loss** → calls `clearColour()` so unfocused windows revert to the theme default
4. Registers `kingfisher.setColour` command (QuickPick with presets + colour picker + hex input + clear option)
5. Registers `kingfisher.clearColour` command

**`deactivate()`:**
- Calls `clearColour()` to remove the written user settings keys

### ColourPickerPanel.ts

**`showColourPicker(context, currentColour, onApply)`:**
- Opens a `WebviewPanel` (title: "Kingfisher: Colour Picker", `ViewColumn.Active`)
- Generates a 16-byte nonce via Node's `crypto.randomBytes` for CSP
- Renders minimal HTML with:
  - `default-src 'none'` CSP with nonce-gated `style-src` and `script-src`
  - `<input type="color">` pre-filled with the current colour (or `#1a6b8a` default)
  - Hex label that updates live on `input` events
  - Apply and Cancel buttons
- On `apply` message: validates the received hex value (regex guard), disposes the panel, calls `onApply(hex)`
- On `cancel` message or panel close: disposes with no changes
- Colour embedded in HTML is sanitised with a regex before insertion (defence-in-depth)

### Multi-window Behaviour

VS Code's user settings are global — all open windows share the same `workbench.colorCustomizations` value and react to it live. Kingfisher uses `onDidChangeWindowState` to manage this:

- **Window gains focus** → applies the saved colour for that workspace
- **Window loses focus** → calls `clearColour()`, reverting to the theme default

The effective result: the *active* VS Code window shows its colour; all other VS Code windows visible in Alt+Tab show the default theme colours. Switching to a VS Code window immediately applies its colour.

This is an improvement over applying-on-focus-only (the previous approach), where all windows would share the colour of the last-focused window.

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
