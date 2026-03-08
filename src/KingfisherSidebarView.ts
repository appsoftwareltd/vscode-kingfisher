import { randomBytes } from 'crypto';
import * as vscode from 'vscode';

/**
 * WebviewViewProvider for the Kingfisher sidebar panel.
 *
 * Each VS Code window has its own extension instance, so each window's
 * webview renders independently — this is what gives us true simultaneous
 * per-window colour in Alt+Tab, without touching any shared settings file.
 */
export class KingfisherSidebarView implements vscode.WebviewViewProvider {
    public static readonly viewId = 'kingfisher.sidebarView';

    private webviewView: vscode.WebviewView | undefined;
    private currentColour: string | undefined;

    /** Whether this view is currently the active view in the sidebar. */
    public get isVisible(): boolean {
        return this.webviewView?.visible ?? false;
    }

    constructor(private readonly context: vscode.ExtensionContext) { }

    public resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.webviewView = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [],
        };

        webviewView.webview.html = this.buildHtml(this.currentColour);

        // When the webview JS signals it is ready, send the current colour.
        // This handles the case where resolveWebviewView is called before
        // activate() has finished reading and applying the saved colour.
        webviewView.webview.onDidReceiveMessage(
            (message: unknown) => {
                if (
                    typeof message === 'object' &&
                    message !== null &&
                    (message as Record<string, unknown>)['command'] === 'ready'
                ) {
                    webviewView.webview.postMessage({
                        command: 'updateColour',
                        colour: this.currentColour ?? null,
                    });
                }
            },
            undefined,
            this.context.subscriptions,
        );
    }

    /** Call whenever the workspace colour changes (or is cleared). */
    public updateColour(colour: string | undefined): void {
        this.currentColour = colour;
        if (this.webviewView) {
            // Post a lightweight message instead of rebuilding the full HTML —
            // avoids a visible flash/repaint when the colour changes.
            this.webviewView.webview.postMessage({ command: 'updateColour', colour: colour ?? null });
        }
    }

    private buildHtml(colour: string | undefined): string {
        const nonce = randomBytes(16).toString('hex');
        const safe =
            colour && /^#[0-9a-fA-F]{3,6}$/.test(colour) ? colour : null;

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kingfisher</title>
  <style nonce="${nonce}">
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; width: 100%; }
    body {
      height: 100vh;
      transition: background-color 0.15s ease;
      background-color: ${safe ?? 'var(--vscode-sideBar-background, #1e1e1e)'};
    }
  </style>
</head>
<body id="body">
  <script nonce="${nonce}">
    const body = document.getElementById('body');

    window.addEventListener('load', () => {
      vscode.postMessage({ command: 'ready' });
    });
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.command !== 'updateColour') return;
      const colour = msg.colour;
      body.style.backgroundColor = colour || '';
    });
  </script>
</body>
</html>`;
    }
}
