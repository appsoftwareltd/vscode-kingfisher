# Kingfisher

> Subtly change the color of your Visual Studio Code workspace (JUST FOR YOU). Ideal when you have multiple VS Code instances, use VS Live Share, or use VS Code's Remote features, and you want to quickly identify your editor (AND YOU DON'T WANT TO SHARE THE SETTING WITH THE WHOLE TEAM!).

Sorry [vscode-peacock](https://github.com/johnpapa/vscode-peacock), I was excited to discover this extension but this [issue](https://github.com/johnpapa/vscode-peacock/issues/7), needed addressing. Teams often share `.vscode/settings.json`, so we can't set editor colours in there. I concede that the approach here has trade-offs (this extension cannot apply colours while it's not the active editor, so previewing windows via `Alt + Tab` will not see colours applied except for the active editor).

## Why "Kingfisher"? 

In the UK, the Common Kingfisher is iconic for its brilliant electric blue and orange, yet it’s a small, hardworking bird that stays low to the water and mind its own business. It doesn't "strut"—it just performs its task with precision.

**The Vibe:** It’s striking and colorful, but it represents speed and utility rather than vanity.
**The Metaphor:** Just as a Kingfisher dives into a specific spot, your extension "dives" into a specific workspace to apply a flash of color, then vanishes when not needed.
**The Aesthetic:** Kingfisher blues and oranges are naturally high-contrast, which is perfect for distinguishing between window title bars.

Kingfishers, we concede however, are just not _**quite**_ as fancy.

---

## How it works

Kingfisher stores your chosen colour privately per workspace (in VS Code's internal extension storage — never written to any file tracked by version control). When a VS Code window gains focus, Kingfisher applies the saved colour to `workbench.colorCustomizations` in your **personal user settings** (`%APPDATA%\Code\User\settings.json` on Windows, `~/.config/Code/User/settings.json` on Linux/macOS). This file is personal and machine-level — never committed to a repository.

### Multi-window behaviour

Because VS Code's `workbench.colorCustomizations` is a global user setting shared by all open windows, the **focused** window always shows its correct colour. Other windows visible in `Alt+Tab` may display the last-focused window's colour until they gain focus themselves. This is a VS Code API limitation — there is currently no runtime API to apply per-window colours independently.

---

## Commands

| Command | Description |
|---|---|
| **Kingfisher: Set Status Bar Colour** | Choose from presets or enter a custom hex value (#rrggbb) |
| **Kingfisher: Clear Status Bar Colour** | Restore the default theme status bar colour for this workspace |

Open the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for "Kingfisher".

You can also click the Kingfisher indicator in the status bar to open the colour picker.

---

## Requirements

- VS Code 1.85.0 or later

---

## How it works

Kingfisher stores your chosen colour privately per workspace (in VS Code's internal extension storage — never written to any file tracked by version control). When a VS Code window gains focus, Kingfisher applies the saved colour to `workbench.colorCustomizations` in your **personal user settings** (`%APPDATA%\Code\User\settings.json` on Windows, `~/.config/Code/User/settings.json` on Linux/macOS). This file is personal and machine-level — never committed to a repository.

### Multi-window behaviour

Because VS Code's `workbench.colorCustomizations` is a global user setting shared by all open windows, the **focused** window always shows its correct colour. Other windows visible in Alt+Tab may display the last-focused window's colour until they gain focus themselves. This is a VS Code API limitation — there is currently no runtime API to apply per-window colours independently.

---

## Commands

| Command | Description |
|---|---|
| **Kingfisher: Set Status Bar Colour** | Choose from presets or enter a custom hex value (#rrggbb) |
| **Kingfisher: Clear Status Bar Colour** | Restore the default theme status bar colour for this workspace |

Open the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for "Kingfisher".

You can also click the Kingfisher indicator in the status bar to open the colour picker.

---

## Requirements

- VS Code 1.85.0 or later

---

## Publishing

Releases are published to the VS Code Marketplace manually, then a GitHub Release is created automatically when a version tag is pushed.

**Step 1 - bump the version**

Update `version` in `package.json` and add an entry to `CHANGELOG.md`.

**Step 2 - publish to the VS Code Marketplace**

```bash
npm run build
npx @vscode/vsce package
npx @vscode/vsce login appsoftwareltd   # enter PAT token if auth expired
npx @vscode/vsce publish
```

**Step 3 - tag and push**

```bash
git add package.json CHANGELOG.md README.md
git commit -m "Release v0.x.x"   # change version
git tag v0.x.x                   # change version
git push origin main --tags
```

Pushing the tag triggers the [Release workflow](.github/workflows/release.yml), which creates a GitHub Release automatically with auto-generated release notes and the VS Code Marketplace install link.
