import * as vscode from 'vscode';
import {
    isValidHex,
    applyColour,
    clearColour,
    getSavedColour,
    saveColour,
    deleteSavedColour,
} from './ColourService.js';

const PREDEFINED_COLOURS: Array<{ label: string; hex: string }> = [
    { label: '$(circle-filled) Kingfisher Blue', hex: '#1a6b8a' },
    { label: '$(circle-filled) Teal', hex: '#007d7d' },
    { label: '$(circle-filled) Forest Green', hex: '#2d6a2d' },
    { label: '$(circle-filled) Amber', hex: '#b35900' },
    { label: '$(circle-filled) Crimson', hex: '#8b1a1a' },
    { label: '$(circle-filled) Indigo', hex: '#3d1a8b' },
    { label: '$(circle-filled) Plum', hex: '#7b2d7b' },
    { label: '$(circle-filled) Slate', hex: '#2f4f6f' },
];

let statusBarItem: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext): void {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1000);
    statusBarItem.command = 'kingfisher.setColour';
    statusBarItem.tooltip = 'Kingfisher: Click to set status bar colour';
    context.subscriptions.push(statusBarItem);

    // Apply saved colour for this workspace on activation
    const saved = getSavedColour(context.globalState);
    if (saved) {
        applyColour(saved).catch(logError);
        updateStatusBarItem(saved);
    }
    statusBarItem.show();

    // Reapply when this window gains focus (handles multi-window scenarios)
    context.subscriptions.push(
        vscode.window.onDidChangeWindowState((state) => {
            if (state.focused) {
                const colour = getSavedColour(context.globalState);
                if (colour) {
                    applyColour(colour).catch(logError);
                } else {
                    clearColour().catch(logError);
                }
            }
        }),
    );

    // Command: Set Colour
    context.subscriptions.push(
        vscode.commands.registerCommand('kingfisher.setColour', async () => {
            const currentColour = getSavedColour(context.globalState);

            const picks: vscode.QuickPickItem[] = PREDEFINED_COLOURS.map((c) => ({
                label: c.label,
                description: c.hex,
                picked: c.hex === currentColour,
            }));
            picks.push({ label: '$(edit) Custom hex colour…', description: '' });
            if (currentColour) {
                picks.push({ label: '$(trash) Clear colour', description: '' });
            }

            const selection = await vscode.window.showQuickPick(picks, {
                title: 'Kingfisher: Set Status Bar Colour',
                placeHolder: 'Choose a colour or enter a custom hex value',
            });

            if (!selection) {
                return;
            }

            if (selection.label.startsWith('$(trash)')) {
                await handleClearColour(context);
                return;
            }

            if (selection.label.startsWith('$(edit)')) {
                await handleCustomColour(context, currentColour);
                return;
            }

            const hex = selection.description!;
            await persistAndApply(context, hex);
        }),
    );

    // Command: Clear Colour
    context.subscriptions.push(
        vscode.commands.registerCommand('kingfisher.clearColour', async () => {
            await handleClearColour(context);
        }),
    );
}

export function deactivate(): void {
    // Clear the applied colour from user settings so it doesn't persist after deactivation
    clearColour().catch(logError);
}

async function handleCustomColour(
    context: vscode.ExtensionContext,
    currentColour: string | undefined,
): Promise<void> {
    const input = await vscode.window.showInputBox({
        title: 'Kingfisher: Custom Colour',
        prompt: 'Enter a hex colour value (e.g. #ff6600)',
        value: currentColour ?? '#',
        validateInput: (v) => (isValidHex(v) ? undefined : 'Enter a valid hex colour: #rrggbb or #rgb'),
    });

    if (!input) {
        return;
    }

    await persistAndApply(context, input);
}

async function handleClearColour(context: vscode.ExtensionContext): Promise<void> {
    await deleteSavedColour(context.globalState);
    await clearColour();
    updateStatusBarItem(undefined);
    vscode.window.setStatusBarMessage('Kingfisher: Status bar colour cleared.', 3000);
}

async function persistAndApply(context: vscode.ExtensionContext, hex: string): Promise<void> {
    await saveColour(context.globalState, hex);
    await applyColour(hex);
    updateStatusBarItem(hex);
    vscode.window.setStatusBarMessage(`Kingfisher: Status bar colour set to ${hex}`, 3000);
}

function updateStatusBarItem(colour: string | undefined): void {
    if (!statusBarItem) {
        return;
    }
    if (colour) {
        statusBarItem.text = `$(circle-filled) ${colour}`;
        statusBarItem.color = colour;
    } else {
        statusBarItem.text = '$(circle-outline) Kingfisher';
        statusBarItem.color = undefined;
    }
}

function logError(err: unknown): void {
    console.error('[Kingfisher]', err);
}
