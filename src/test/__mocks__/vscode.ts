import { vi } from 'vitest';

const colorCustomizations: Record<string, unknown> = {};

const workbenchConfig = {
    get: vi.fn((key: string) => {
        if (key === 'colorCustomizations') {
            return { ...colorCustomizations };
        }
        return undefined;
    }),
    update: vi.fn(async (key: string, value: unknown) => {
        if (key === 'colorCustomizations') {
            Object.keys(colorCustomizations).forEach((k) => delete colorCustomizations[k]);
            if (value && typeof value === 'object') {
                Object.assign(colorCustomizations, value);
            }
        }
    }),
};

export const workspace = {
    getConfiguration: vi.fn(() => workbenchConfig),
    workspaceFolders: [{ uri: { toString: () => 'file:///workspace/test' } }],
};

export const window = {
    createStatusBarItem: vi.fn(),
    showQuickPick: vi.fn(),
    showInputBox: vi.fn(),
    setStatusBarMessage: vi.fn(),
    onDidChangeWindowState: vi.fn(),
};

export const ConfigurationTarget = {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
};

export const StatusBarAlignment = {
    Left: 1,
    Right: 2,
};

export const commands = {
    registerCommand: vi.fn(),
};

export enum ExtensionKind {
    UI = 1,
    Workspace = 2,
}
