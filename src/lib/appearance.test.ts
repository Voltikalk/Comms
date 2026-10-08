import { describe, expect, it } from 'vitest';
import { appearanceVars } from './appearance';

describe('appearanceVars', () => {
  it('keeps the design accent and defaults for an empty config', () => {
    const { accent, vars } = appearanceVars({});
    expect(accent).toBeNull();
    expect(vars['--msg-font-size']).toBe('15px');
    expect(vars['--tg-bubble-radius']).toBe('18px');
    expect(vars['--tg-bubble-radius-grouped']).toBe('4px');
  });

  it('clamps sizes and resolves a custom accent', () => {
    const { accent, vars } = appearanceVars({ accentColorId: 'emerald', textSize: 40, bubbleRadius: 1 });
    expect(accent).toBe('#10b981');
    expect(vars['--msg-font-size']).toBe('20px');
    expect(vars['--tg-bubble-radius']).toBe('4px');
    expect(vars['--tg-bubble-radius-grouped']).toBe('2px');
  });
});
