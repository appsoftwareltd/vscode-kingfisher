import { randomBytes } from 'crypto';
import * as vscode from 'vscode';

/**
 * Opens a WebviewPanel containing a native OS colour picker (`<input type="color">`).
 * When the user clicks Apply the `onApply` callback is called with the chosen hex value
 * and the panel is disposed. Cancelling or closing the panel makes no changes.
 */
export function showColourPicker(
    context: vscode.ExtensionContext,
    currentColour: string | undefined,
    onApply: (hex: string) => Promise<void>,
): void {
    const panel = vscode.window.createWebviewPanel(
        'kingfisherColourPicker',
        'Kingfisher: Colour Picker',
        vscode.ViewColumn.Active,
        {
            enableScripts: true,
            localResourceRoots: [],
            retainContextWhenHidden: false,
        },
    );

    const nonce = randomBytes(16).toString('hex');
    panel.webview.html = buildHtml(nonce, currentColour ?? '#1a6b8a');

    panel.webview.onDidReceiveMessage(
        async (message: unknown) => {
            if (!isMessage(message)) {
                return;
            }
            panel.dispose();
            if (message.command === 'apply') {
                await onApply(message.colour);
            }
        },
        undefined,
        context.subscriptions,
    );
}

interface PanelMessage {
    command: 'apply' | 'cancel';
    colour: string;
}

function isMessage(value: unknown): value is PanelMessage {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const m = value as Record<string, unknown>;
    return (
        (m['command'] === 'apply' || m['command'] === 'cancel') &&
        typeof m['colour'] === 'string' &&
        /^#[0-9a-fA-F]{6}$/.test(m['colour'])
    );
}

function buildHtml(nonce: string, initialColour: string): string {
    // Defence-in-depth: sanitise colour before embedding in HTML even though it
    // only ever comes from validated internal storage.
    const safe = /^#[0-9a-fA-F]{3,6}$/.test(initialColour) ? initialColour : '#1a6b8a';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kingfisher Colour Picker</title>
  <style nonce="${nonce}">
    *, *::before, *::after { box-sizing: border-box; }
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    h2 {
      margin: 0 0 1.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    input[type="color"] {
      width: 128px;
      height: 128px;
      padding: 4px;
      border: 2px solid var(--vscode-input-border, #555);
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
    }
    .hex-label {
      margin-top: 0.6rem;
      font-size: 0.85rem;
      color: var(--vscode-descriptionForeground);
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.05em;
    }
    .buttons {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.75rem;
    }
    button {
      padding: 0.45rem 1.4rem;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.9rem;
      font-family: inherit;
    }
    .btn-apply {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-apply:hover { background: var(--vscode-button-hoverBackground); }
    .btn-cancel {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-cancel:hover { background: var(--vscode-button-secondaryHoverBackground); }
  </style>
</head>
<body>
  <h2>Choose a workspace colour</h2>
  <input type="color" id="picker" value="${safe}">
  <div class="hex-label" id="hex-label">${safe}</div>
  <div class="buttons">
    <button class="btn-apply" id="btn-apply">Apply</button>
    <button class="btn-cancel" id="btn-cancel">Cancel</button>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const picker = document.getElementById('picker');
    const label  = document.getElementById('hex-label');
    picker.addEventListener('input', () => { label.textContent = picker.value; });
    document.getElementById('btn-apply').addEventListener('click', () => {
      vscode.postMessage({ command: 'apply', colour: picker.value });
    });
    document.getElementById('btn-cancel').addEventListener('click', () => {
      vscode.postMessage({ command: 'cancel', colour: picker.value });
    });
  </script>
</body>
</html>`;
}
