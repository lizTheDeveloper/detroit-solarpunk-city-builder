import { describe, it, expect } from 'vitest';
import { createDarkTerminalStyle } from './map-style';

describe('createDarkTerminalStyle', () => {
  it('returns a valid MapLibre style object', () => {
    const style = createDarkTerminalStyle('https://tiles.example.com');
    expect(style.version).toBe(8);
    expect(style.name).toBe('detroit-terminal');
    expect(style.sources).toBeDefined();
    expect(style.layers.length).toBeGreaterThan(0);
  });

  it('uses near-black background', () => {
    const style = createDarkTerminalStyle('https://tiles.example.com');
    const bg = style.layers.find((l: any) => l.id === 'background') as any;
    expect(bg).toBeDefined();
    expect(bg!.paint['background-color']).toBe('#0a0a0a');
  });

  it('uses green glowing streets', () => {
    const style = createDarkTerminalStyle('https://tiles.example.com');
    const roads = style.layers.find((l: any) => l.id === 'roads') as any;
    expect(roads).toBeDefined();
    expect(roads!.paint['line-color']).toBe('#00ff41');
    expect(roads!.paint['line-blur']).toBeGreaterThan(0);
  });

  it('uses the provided tile source URL', () => {
    const style = createDarkTerminalStyle('https://my-tiles.example.com');
    const source = style.sources['openmaptiles'] as any;
    expect(source.url).toBe('https://my-tiles.example.com');
  });

  it('uses tile URLs array when provided', () => {
    const tiles = ['https://tiles.example.com/{z}/{x}/{y}.pbf'];
    const style = createDarkTerminalStyle(tiles);
    const source = style.sources['openmaptiles'] as any;
    expect(source.tiles).toEqual(tiles);
    expect(source.url).toBeUndefined();
  });
});
