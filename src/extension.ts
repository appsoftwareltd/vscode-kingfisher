import * as vscode from 'vscode';
import { showColourPicker } from './ColourPickerPanel.js';
import { KingfisherSidebarView } from './KingfisherSidebarView.js';
import {
    isValidHex,
    applyColour,
    clearColour,
    getSavedColour,
    getSavedColours,
    saveColour,
    deleteSavedColour,
} from './ColourService.js';

function hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h >>> 0;
}

const PREDEFINED_COLOURS: Array<{ label: string; hex: string }> = [
    { label: '$(circle-filled) Yellow', hex: '#f7e898' },
    { label: '$(circle-filled) Amber', hex: '#f5c468' },
    { label: '$(circle-filled) Orange', hex: '#f09358' },
    { label: '$(circle-filled) Coral', hex: '#f07868' },
    { label: '$(circle-filled) Rose', hex: '#f07080' },
    { label: '$(circle-filled) Pink', hex: '#f090b0' },
    { label: '$(circle-filled) Mauve', hex: '#d8a0c0' },
    { label: '$(circle-filled) Purple', hex: '#8888c4' },
    { label: '$(circle-filled) Blue', hex: '#90bcd8' },
    { label: '$(circle-filled) Teal', hex: '#88c8c0' },
    { label: '$(circle-filled) Green', hex: '#90c890' },
    { label: '$(circle-filled) Lime', hex: '#bcd880' },
];

let statusBarItem: vscode.StatusBarItem | undefined;
let sidebarView: KingfisherSidebarView | undefined;
// True when Kingfisher was showing in the sidebar when this window last blurred.
// Used to decide whether to close the sidebar on focus restore.
let sidebarOpenedByKingfisher = false;

/** Picks a predefined color, preferably one not already in use. */
function determineHex(workspacePath: string, hexesInUse: string[]) {
    const predefinedHexes = PREDEFINED_COLOURS.map((c) => c.hex);
    const unusedHexes = predefinedHexes.filter((c) => !hexesInUse.includes(c));
    const availableHexes = unusedHexes.length > 0 ? unusedHexes : predefinedHexes;
    const index = hashString(workspacePath) % availableHexes.length;
    return availableHexes[index];
}

export function activate(context: vscode.ExtensionContext): void {
    // Read saved colour first so it is set on the sidebar view before VS Code
    // calls resolveWebviewView (which can happen during registerWebviewViewProvider).
    const saved = getSavedColour(context.globalState);

    // Sidebar WebviewView — per-window, always-on colour indicator
    sidebarView = new KingfisherSidebarView(context);
    if (saved) {
        sidebarView.updateColour(saved); // pre-warm before registration
    }

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(KingfisherSidebarView.viewId, sidebarView, {
            webviewOptions: { retainContextWhenHidden: true },
        }),
    );

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, -1000);
    statusBarItem.command = 'kingfisher.setColour';
    statusBarItem.tooltip = 'Kingfisher: Click to set title bar colour';
    context.subscriptions.push(statusBarItem);

    if (saved) {
        applyColour(saved).catch(logError);
        updateStatusBarItem(saved);
    } else {
        const resource = vscode.workspace.workspaceFolders?.[0]?.uri;
        const isAutoAssignEnabled = vscode.workspace.getConfiguration('kingfisher', resource)
            .get<boolean>('autoAssignColour', true);
        if (isAutoAssignEnabled) {
            const workspacePath = resource?.fsPath ?? '';
            const hexesInUse = Object.entries(getSavedColours(context.globalState))
                .map( ([, hex]) => hex );
            const chosenHex = determineHex(workspacePath, hexesInUse);
            persistAndApply(context, chosenHex).catch(logError);
        }
    }
    statusBarItem.show();

    // Apply colour on focus, clear on blur — ensures non-active windows show default theme colours.
    // On blur:  open the Kingfisher sidebar (if not already visible) so the window
    //           colour is visible in Alt+Tab thumbnails.
    // On focus: close the sidebar again if we were the ones who opened it.
    context.subscriptions.push(
        vscode.window.onDidChangeWindowState((state) => {
            if (state.focused) {
                const colour = getSavedColour(context.globalState);
                if (colour) {
                    applyColour(colour).catch(logError);
                } else {
                    clearColour().catch(logError);
                }
                if (sidebarOpenedByKingfisher) {
                    sidebarOpenedByKingfisher = false;
                    // Restore the Explorer sidebar (most common panel) and return
                    // keyboard focus to the editor so the user is not left in the
                    // file tree.
                    vscode.commands.executeCommand('workbench.view.explorer').then(
                        () => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'),
                        logError,
                    );
                }
            } else {
                clearColour().catch(logError);
                const colour = getSavedColour(context.globalState);
                if (colour) {
                    // Always track that Kingfisher was/should be showing on blur.
                    // Only issue the open command if the panel is not already visible.
                    sidebarOpenedByKingfisher = true;
                    if (!sidebarView?.isVisible) {
                        vscode.commands.executeCommand('kingfisher.sidebarView.focus').then(undefined, logError);
                    }
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
            picks.push({ label: '$(paintcan) Colour picker…', description: '' });
            picks.push({ label: '$(edit) Custom hex colour…', description: '' });
            if (currentColour) {
                picks.push({ label: '$(trash) Clear colour', description: '' });
            }

            const selection = await vscode.window.showQuickPick(picks, {
                title: 'Kingfisher: Set Colour',
                placeHolder: 'Choose a colour or enter a custom hex value',
            });

            if (!selection) {
                return;
            }

            if (selection.label.startsWith('$(trash)')) {
                await handleClearColour(context);
                return;
            }

            if (selection.label.startsWith('$(paintcan)')) {
                showColourPicker(context, currentColour, (hex) => persistAndApply(context, hex));
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

export function deactivate(): Promise<void> {
    // Clear the applied colour from user settings so it doesn't persist after deactivation.
    // Returning the Promise allows VS Code to await the async write before shutdown.
    return clearColour().catch(() => undefined);
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
    sidebarView?.updateColour(undefined);
    vscode.window.setStatusBarMessage('Kingfisher: Title bar colour cleared.', 3000);
}

async function persistAndApply(context: vscode.ExtensionContext, hex: string): Promise<void> {
    await saveColour(context.globalState, hex);
    await applyColour(hex);
    updateStatusBarItem(hex);
    sidebarView?.updateColour(hex);
    vscode.window.setStatusBarMessage(`Kingfisher: Colour set to ${hex}`, 3000);
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
