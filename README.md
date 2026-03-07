# VS Code Kingfisher

[VS Code Kingfisher on VS Marketplace](https://marketplace.visualstudio.com/items?itemName=AppSoftwareLtd.vscode-kingfisher)

> Subtly change the color of your Visual Studio Code workspace [JUST FOR YOU[]. Ideal when you have multiple VS Code instances, use VS Live Share, or use VS Code's Remote features, and you want to quickly identify your editor [AND YOU DON'T WANT TO SHARE THE SETTING WITH THE WHOLE TEAM!].

I was excited to discover the [vscode-peacock](https://github.com/johnpapa/vscode-peacock) extension, to help me identify VS Code instances when juggling multiple work streams, but (for me at least) this [issue](https://github.com/johnpapa/vscode-peacock/issues/7) whereby Peacock can only work by modifying the workspace `.vscode/settings.json`, stopped me from using Peacock. Teams often share settings common to all devs in this file, so we can't set editor colours (which are very much a personal preference) in there. 

**Kingfisher's approach has a trade-off** — because VS Code's `workbench.colorCustomizations` is a global user setting, all open VS Code windows share the same colour at any moment. Kingfisher mitigates this: when a window **gains focus** it applies its colour, and when it **loses focus** it clears the colour back to your theme default. The result in Alt+Tab: the currently active window shows its colour; all other VS Code windows show the default theme. As soon as you activate any Kingfisher-managed window, the correct colour appears instantly.

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

When a VS Code window **gains focus**, Kingfisher applies its workspace colour. When the window **loses focus**, Kingfisher clears the colour back to the theme default. This means:

- **Active / focused window** → shows its Kingfisher colour
- **Other VS Code windows in Alt+Tab** → show the default theme colour
- Switching to a VS Code window immediately applies that window's saved colour

> If you need simultaneous per-window colouring (all windows coloured differently at the same time), consider [vscode-peacock](https://github.com/johnpapa/vscode-peacock) — it uses `.vscode/settings.json` per workspace which does support that, at the cost of polluting shared config.

---

## Commands

| Command | Description |
|---|---|
| **Kingfisher: Set Title and Status Bar Colour** | Choose from presets, use the colour picker, or enter a custom hex value (#rrggbb) |
| **Kingfisher: Clear Title and Status Bar Colour** | Restore the default theme colours for this workspace |

Open the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for "Kingfisher".

You can also click the Kingfisher indicator in the status bar to open the colour picker.

---

## Requirements

- VS Code 1.85.0 or later

## Moving from VS Code Peacock

If you have VS Code Peacock settings, or `workbench.colorCustomizations` in `.vscode/settings.json`, you may want to remove them to ensure that this extension works as it should.

```json
"workbench.colorCustomizations": {
    "activityBar.activeBackground": "#0057b3",
    "activityBar.background": "#0057b3",
    "activityBar.foreground": "#e7e7e7",
    "activityBar.inactiveForeground": "#e7e7e799",
    "activityBarBadge.background": "#ff409d",
    "activityBarBadge.foreground": "#15202b",
    "commandCenter.border": "#e7e7e799",
    "sash.hoverBorder": "#0057b3",
    "statusBar.background": "#003e80",
    "statusBar.foreground": "#e7e7e7",
    "statusBarItem.hoverBackground": "#0057b3",
    "statusBarItem.remoteBackground": "#003e80",
    "statusBarItem.remoteForeground": "#e7e7e7",
    "titleBar.activeBackground": "#003e80",
    "titleBar.activeForeground": "#e7e7e7",
    "titleBar.inactiveBackground": "#003e8099",
    "titleBar.inactiveForeground": "#e7e7e799"
},
"peacock.color": "#003e80"
```

You may also need to clean up user settings:

- Windows:  `%APPDATA%\Code\User\settings.json`
- macOS:	`$HOME/Library/Application Support/Code/User/settings.json`
- Linux:	`$HOME/.config/Code/User/settings.json`

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
git commit -m "Release v0.1.4"   # change version
git tag v0.1.4                  # change version
git push origin main --tags
```

Pushing the tag triggers the [Release workflow](.github/workflows/release.yml), which creates a GitHub Release automatically with auto-generated release notes and the VS Code Marketplace install link.
