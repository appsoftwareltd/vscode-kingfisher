import * as vscode from 'vscode';

export const WORKSPACE_COLOUR_KEY = 'kingfisher.statusBarColour';

const STATUS_BAR_BACKGROUND = 'statusBar.background';
const STATUS_BAR_FOREGROUND = 'statusBar.foreground';
const TITLE_BAR_ACTIVE_BACKGROUND = 'titleBar.activeBackground';
const TITLE_BAR_ACTIVE_FOREGROUND = 'titleBar.activeForeground';
const TITLE_BAR_INACTIVE_BACKGROUND = 'titleBar.inactiveBackground';
const TITLE_BAR_INACTIVE_FOREGROUND = 'titleBar.inactiveForeground';

const KINGFISHER_KEYS = [
    STATUS_BAR_BACKGROUND,
    STATUS_BAR_FOREGROUND,
    TITLE_BAR_ACTIVE_BACKGROUND,
    TITLE_BAR_ACTIVE_FOREGROUND,
    TITLE_BAR_INACTIVE_BACKGROUND,
    TITLE_BAR_INACTIVE_FOREGROUND,
] as const;

/** Validates a CSS hex colour string (#rrggbb or #rgb). */
export function isValidHex(value: string): boolean {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/** Returns #000000 or #ffffff depending on which contrasts better against the given hex colour. */
export function getContrastColour(hex: string): '#000000' | '#ffffff' {
    const normalised = hex.length === 4
        ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
        : hex;

    const r = parseInt(normalised.slice(1, 3), 16);
    const g = parseInt(normalised.slice(3, 5), 16);
    const b = parseInt(normalised.slice(5, 7), 16);

    // Relative luminance (WCAG 2.x formula)
    const toLinear = (c: number): number => {
        const s = c / 255;
        return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

    return luminance > 0.179 ? '#000000' : '#ffffff';
}

/**
 * Returns a dimmed version of a hex colour by blending it toward the midpoint.
 * Used for inactive title bar states so they appear visually subdued.
 * @param hex   Source colour (#rrggbb or #rgb)
 * @param factor 0 = original, 1 = fully mid-grey. Default 0.35.
 */
export function dimColour(hex: string, factor = 0.35): string {
    const normalised = hex.length === 4
        ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
        : hex;

    const blend = (channel: number): number =>
        Math.round(channel + (128 - channel) * factor);

    const r = blend(parseInt(normalised.slice(1, 3), 16));
    const g = blend(parseInt(normalised.slice(3, 5), 16));
    const b = blend(parseInt(normalised.slice(5, 7), 16));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Returns a new colorCustomizations object with all Kingfisher keys merged in.
 * Covers status bar and title bar. Does not mutate the input.
 */
export function buildColourCustomizations(
    existing: Record<string, string>,
    colour: string,
): Record<string, string> {
    const inactiveColour = dimColour(colour);
    const contrastActive = getContrastColour(colour);
    const contrastInactive = getContrastColour(inactiveColour);
    return {
        ...existing,
        [STATUS_BAR_BACKGROUND]: colour,
        [STATUS_BAR_FOREGROUND]: contrastActive,
        [TITLE_BAR_ACTIVE_BACKGROUND]: colour,
        [TITLE_BAR_ACTIVE_FOREGROUND]: contrastActive,
        [TITLE_BAR_INACTIVE_BACKGROUND]: inactiveColour,
        [TITLE_BAR_INACTIVE_FOREGROUND]: contrastInactive,
    };
}

/**
 * Returns a new colorCustomizations object with all Kingfisher keys removed.
 * Does not mutate the input.
 */
export function removeColourCustomizations(
    existing: Record<string, string>,
): Record<string, string> {
    const result = { ...existing };
    for (const key of KINGFISHER_KEYS) {
        delete result[key];
    }
    return result;
}

/** Applies `colour` to the workbench.colorCustomizations in user settings. */
export async function applyColour(colour: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('workbench');
    const existing = config.get<Record<string, string>>('colorCustomizations') ?? {};
    const updated = buildColourCustomizations(existing, colour);
    await config.update('colorCustomizations', updated, vscode.ConfigurationTarget.Global);
}

/** Removes Kingfisher's statusBar keys from workbench.colorCustomizations in user settings. */
export async function clearColour(): Promise<void> {
    const config = vscode.workspace.getConfiguration('workbench');
    const existing = config.get<Record<string, string>>('colorCustomizations') ?? {};
    const updated = removeColourCustomizations(existing);

    // If nothing remains, write undefined to clean the key from settings.json
    const value = Object.keys(updated).length > 0 ? updated : undefined;
    await config.update('colorCustomizations', value, vscode.ConfigurationTarget.Global);
}

/** Reads the saved colour for the current workspace from globalState. */
export function getSavedColour(globalState: vscode.Memento): string | undefined {
    const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri.toString();
    if (!workspaceUri) {
        return undefined;
    }
    const map = globalState.get<Record<string, string>>(WORKSPACE_COLOUR_KEY) ?? {};
    return map[workspaceUri];
}

/** Saves a colour for the current workspace to globalState. */
export async function saveColour(globalState: vscode.Memento, colour: string): Promise<void> {
    const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri.toString();
    if (!workspaceUri) {
        return;
    }
    const map = globalState.get<Record<string, string>>(WORKSPACE_COLOUR_KEY) ?? {};
    await globalState.update(WORKSPACE_COLOUR_KEY, { ...map, [workspaceUri]: colour });
}

/** Removes the saved colour for the current workspace from globalState. */
export async function deleteSavedColour(globalState: vscode.Memento): Promise<void> {
    const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri.toString();
    if (!workspaceUri) {
        return;
    }
    const map = globalState.get<Record<string, string>>(WORKSPACE_COLOUR_KEY) ?? {};
    const updated = { ...map };
    delete updated[workspaceUri];
    await globalState.update(WORKSPACE_COLOUR_KEY, Object.keys(updated).length > 0 ? updated : undefined);
}
