import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import {
    isValidHex,
    getContrastColour,
    dimColour,
    buildColourCustomizations,
    removeColourCustomizations,
    clearColour,
    WORKSPACE_COLOUR_KEY,
} from '../ColourService.js';

describe('isValidHex', () => {
    it('accepts 6-digit hex with hash', () => {
        expect(isValidHex('#ff6600')).toBe(true);
        expect(isValidHex('#FF6600')).toBe(true);
        expect(isValidHex('#000000')).toBe(true);
        expect(isValidHex('#ffffff')).toBe(true);
    });

    it('rejects invalid hex values', () => {
        expect(isValidHex('ff6600')).toBe(false);   // missing hash
        expect(isValidHex('#ff660')).toBe(false);    // 5 digits
        expect(isValidHex('#ff66000')).toBe(false);  // 7 digits
        expect(isValidHex('#gggggg')).toBe(false);   // invalid chars
        expect(isValidHex('')).toBe(false);
        expect(isValidHex('#')).toBe(false);
    });

    it('accepts 3-digit shorthand hex', () => {
        expect(isValidHex('#f60')).toBe(true);
        expect(isValidHex('#fff')).toBe(true);
    });
});

describe('getContrastColour', () => {
    it('returns black for light colours', () => {
        expect(getContrastColour('#ffffff')).toBe('#000000');
        expect(getContrastColour('#ffff00')).toBe('#000000');
        expect(getContrastColour('#87ceeb')).toBe('#000000'); // sky blue
    });

    it('returns white for dark colours', () => {
        expect(getContrastColour('#000000')).toBe('#ffffff');
        expect(getContrastColour('#003366')).toBe('#ffffff');
        expect(getContrastColour('#1e1e2e')).toBe('#ffffff');
    });

    it('handles 3-digit shorthand hex', () => {
        expect(getContrastColour('#fff')).toBe('#000000');
        expect(getContrastColour('#000')).toBe('#ffffff');
    });
});

describe('dimColour', () => {
    it('moves a dark colour toward mid-grey', () => {
        const result = dimColour('#000000');
        const r = parseInt(result.slice(1, 3), 16);
        expect(r).toBeGreaterThan(0);
        expect(r).toBeLessThan(128);
    });

    it('moves a light colour toward mid-grey', () => {
        const result = dimColour('#ffffff');
        const r = parseInt(result.slice(1, 3), 16);
        expect(r).toBeGreaterThan(128);
        expect(r).toBeLessThan(255);
    });

    it('returns a valid 6-digit hex string', () => {
        expect(isValidHex(dimColour('#ff6600'))).toBe(true);
    });

    it('handles 3-digit shorthand hex', () => {
        expect(isValidHex(dimColour('#f60'))).toBe(true);
    });

    it('produces a different value from the input', () => {
        expect(dimColour('#1e1e2e')).not.toBe('#1e1e2e');
    });
});

describe('buildColourCustomizations', () => {
    it('merges kingfisher keys into existing customizations', () => {
        const existing = { 'editor.background': '#1e1e1e' };
        const result = buildColourCustomizations(existing, '#ff6600');
        expect(result['editor.background']).toBe('#1e1e1e');
        expect(result['titleBar.activeBackground']).toBe('#ff6600');
        expect(result['titleBar.activeForeground']).toBe('#000000');
    });

    it('sets title bar active background to the chosen colour', () => {
        const result = buildColourCustomizations({}, '#003366');
        expect(result['titleBar.activeBackground']).toBe('#003366');
    });

    it('sets title bar active foreground to contrast colour', () => {
        const result = buildColourCustomizations({}, '#003366');
        expect(result['titleBar.activeForeground']).toBe('#ffffff');
    });

    it('sets title bar inactive background to dimmed colour', () => {
        const result = buildColourCustomizations({}, '#003366');
        const inactive = result['titleBar.inactiveBackground'];
        expect(isValidHex(inactive)).toBe(true);
        expect(inactive).not.toBe('#003366');
    });

    it('sets title bar inactive foreground to contrast of dimmed colour', () => {
        const result = buildColourCustomizations({}, '#003366');
        const inactive = result['titleBar.inactiveBackground'];
        expect(result['titleBar.inactiveForeground']).toBe(getContrastColour(inactive));
    });

    it('overwrites existing title bar keys', () => {
        const existing = { 'titleBar.activeBackground': '#0000ff', 'titleBar.activeForeground': '#ffffff' };
        const result = buildColourCustomizations(existing, '#ffff00');
        expect(result['titleBar.activeBackground']).toBe('#ffff00');
        expect(result['titleBar.activeForeground']).toBe('#000000');
    });

    it('does not mutate the input object', () => {
        const existing = { 'editor.background': '#1e1e1e' };
        buildColourCustomizations(existing, '#ff6600');
        expect(existing).not.toHaveProperty('titleBar.activeBackground');
    });
});

describe('removeColourCustomizations', () => {
    it('removes all kingfisher keys and preserves others', () => {
        const existing = {
            'editor.background': '#1e1e1e',
            'titleBar.activeBackground': '#ff6600',
            'titleBar.activeForeground': '#000000',
            'titleBar.inactiveBackground': '#cc7a33',
            'titleBar.inactiveForeground': '#000000',
        };
        const result = removeColourCustomizations(existing);
        expect(result).not.toHaveProperty('titleBar.activeBackground');
        expect(result).not.toHaveProperty('titleBar.activeForeground');
        expect(result).not.toHaveProperty('titleBar.inactiveBackground');
        expect(result).not.toHaveProperty('titleBar.inactiveForeground');
        expect(result['editor.background']).toBe('#1e1e1e');
    });

    it('returns empty object when only kingfisher keys exist', () => {
        const existing = {
            'titleBar.activeBackground': '#ff6600',
            'titleBar.activeForeground': '#000000',
            'titleBar.inactiveBackground': '#cc7a33',
            'titleBar.inactiveForeground': '#000000',
        };
        const result = removeColourCustomizations(existing);
        expect(Object.keys(result)).toHaveLength(0);
    });

    it('does not mutate the input object', () => {
        const existing = { 'titleBar.activeBackground': '#ff6600' };
        removeColourCustomizations(existing);
        expect(existing).toHaveProperty('titleBar.activeBackground');
    });
});

describe('WORKSPACE_COLOUR_KEY', () => {
    it('is a non-empty string', () => {
        expect(typeof WORKSPACE_COLOUR_KEY).toBe('string');
        expect(WORKSPACE_COLOUR_KEY.length).toBeGreaterThan(0);
    });
});

describe('clearColour', () => {
    // The mock always returns the same workbenchConfig object from getConfiguration.
    const mockConfig = vscode.workspace.getConfiguration('workbench');

    beforeEach(() => {
        vi.mocked(mockConfig.update).mockClear();
    });

    it('does not call config.update when colorCustomizations is empty', async () => {
        vi.mocked(mockConfig.get).mockReturnValueOnce({});
        await clearColour();
        expect(mockConfig.update).not.toHaveBeenCalled();
    });

    it('does not call config.update when colorCustomizations is undefined', async () => {
        vi.mocked(mockConfig.get).mockReturnValueOnce(undefined);
        await clearColour();
        expect(mockConfig.update).not.toHaveBeenCalled();
    });

    it('does not call config.update when only non-Kingfisher keys are present', async () => {
        vi.mocked(mockConfig.get).mockReturnValueOnce({ 'editor.background': '#1e1e1e' });
        await clearColour();
        expect(mockConfig.update).not.toHaveBeenCalled();
    });

    it('calls config.update when a Kingfisher key is present', async () => {
        vi.mocked(mockConfig.get).mockReturnValueOnce({ 'titleBar.activeBackground': '#ff6600' });
        await clearColour();
        expect(mockConfig.update).toHaveBeenCalledOnce();
    });

    it('removes Kingfisher keys and preserves other keys', async () => {
        vi.mocked(mockConfig.get).mockReturnValueOnce({
            'titleBar.activeBackground': '#ff6600',
            'editor.background': '#1e1e1e',
        });
        await clearColour();
        expect(mockConfig.update).toHaveBeenCalledWith(
            'colorCustomizations',
            { 'editor.background': '#1e1e1e' },
            vscode.ConfigurationTarget.Global,
        );
    });

    it('writes undefined when only Kingfisher keys remain', async () => {
        vi.mocked(mockConfig.get).mockReturnValueOnce({
            'titleBar.activeBackground': '#ff6600',
            'titleBar.activeForeground': '#000000',
            'titleBar.inactiveBackground': '#cc7a33',
            'titleBar.inactiveForeground': '#000000',
        });
        await clearColour();
        expect(mockConfig.update).toHaveBeenCalledWith(
            'colorCustomizations',
            undefined,
            vscode.ConfigurationTarget.Global,
        );
    });
});
