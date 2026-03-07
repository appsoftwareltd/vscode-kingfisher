# TODO

## Kingfisher VS Code Extension

## Iteration 1

- [x] Create project scaffold (package.json, tsconfig.json, build.mjs, vitest.config.ts, .vscodeignore, .gitignore, .github/workflows)
- [x] Create src/ColourService.ts (persistence via globalState, apply via workbench.colorCustomizations)
- [x] Create src/test/ColourService.test.ts
- [x] Create src/extension.ts (activate/deactivate, commands, status bar item, focus listener)
- [x] Run build and verify no type/compile errors
## Iteration 2 — Title bar colouring

- [x] Extend `buildColourCustomizations` to include title bar keys
- [x] Extend `removeColourCustomizations` to remove title bar keys
- [x] Add tests for title bar keys in ColourService.test.ts
- [x] Add `dimColour` utility + tests (inactive title bar)
- [x] Verify build and all tests pass
- [x] Update TECHNICAL.md

## Iteration 3 — Window blur + Colour picker

- [x] Handle window blur → clearColour() in onDidChangeWindowState (extension.ts)
- [x] Create src/ColourPickerPanel.ts with WebviewPanel, nonce CSP, input[type=color], Apply/Cancel
- [x] Add $(paintcan) Colour picker option to QuickPick in extension.ts
- [x] Verify build and all tests pass
- [x] Update README.md and TECHNICAL.md
