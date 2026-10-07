import { describe, it, expect } from 'vitest';
import { parseUserAgent } from './user-agent.js';

describe('parseUserAgent', () => {
  it('parses common user agents', () => {
    expect(
      parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ),
    ).toEqual({ os: 'Windows 10/11', browser: 'Chrome 131' });
    expect(
      parseUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
      ),
    ).toEqual({ os: 'iOS 18.1', browser: 'Safari 18' });
    expect(
      parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      ).browser,
    ).toBe('Edge 131');
    expect(parseUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0')).toEqual({
      os: 'Linux',
      browser: 'Firefox 133',
    });
    expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130.0 Mobile').os).toBe('Android 14');
    expect(parseUserAgent(undefined)).toEqual({ os: 'Неизвестная ОС', browser: 'Неизвестный браузер' });
  });

});
