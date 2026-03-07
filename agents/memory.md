# Memory

## Project: Kingfisher VS Code Extension

### Publisher / Conventions
- Publisher: `appsoftwareltd`
- Reference project: `C:\Users\Gareth\src\as-notes\vs-code-extension`
- TypeScript: ES2022 target, Node16 module/moduleResolution, strict mode
- Bundler: esbuild (CJS, `vscode` external), `build.mjs`
- Testing: vitest (`src/test/**/*.test.ts`)
- Linting: `tsc --noEmit`
- License: Elastic-2.0
- Engine: `vscode: ^1.85.0`

### Architecture Decision
- Colour persisted per workspace in `context.globalState` keyed by workspace folder URI
- Colour applied via `workbench.colorCustomizations` → `ConfigurationTarget.Global` (user settings only — never workspace settings)
- Reapply on `onDidChangeWindowState` (focus gain) to handle multi-window scenarios
- Multi-window limitation accepted: all windows share the same colour simultaneously; the focused window always shows the correct colour on focus
- No writes to any `settings.json` visible to VCS (workspace .vscode/settings.json never touched)

### Key Settings Written
- `workbench.colorCustomizations["statusBar.background"]`
- `workbench.colorCustomizations["statusBar.foreground"]` (auto-computed contrast)

### Commands
- `kingfisher.setColour` — QuickPick presets + custom hex input
- `kingfisher.clearColour` — restores theme default
