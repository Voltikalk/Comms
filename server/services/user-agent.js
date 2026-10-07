/**
 * Tiny User-Agent parser for the "Активные сеансы" list (no external deps).
 */

/** @type {Array<[RegExp, (m: RegExpMatchArray) => string]>} */
const OS_RULES = [
  [/Windows NT 10\.0/, () => 'Windows 10/11'],
  [/Windows NT 6\.3/, () => 'Windows 8.1'],
  [/Windows NT 6\.1/, () => 'Windows 7'],
  [/Windows/, () => 'Windows'],
  [/iPhone OS (\d+)[_.](\d+)/, (m) => `iOS ${m[1]}.${m[2]}`],
  [/iPad.*OS (\d+)[_.](\d+)/, (m) => `iPadOS ${m[1]}.${m[2]}`],
  [/Android (\d+(?:\.\d+)?)/, (m) => `Android ${m[1]}`],
  [/CrOS/, () => 'ChromeOS'],
  [/Mac OS X (\d+)[_.](\d+)/, (m) => `macOS ${m[1]}.${m[2]}`],
  [/Macintosh/, () => 'macOS'],
  [/Linux/, () => 'Linux'],
];

// Order matters: Edge/Opera/Yandex/Samsung UA strings also contain "Chrome" and "Safari".
/** @type {Array<[RegExp, string]>} */
const BROWSER_RULES = [
  [/Edg(?:e|A|iOS)?\/(\d+)/, 'Edge'],
  [/OPR\/(\d+)/, 'Opera'],
  [/YaBrowser\/(\d+)/, 'Yandex Browser'],
  [/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
  [/Firefox\/(\d+)/, 'Firefox'],
  [/FxiOS\/(\d+)/, 'Firefox'],
  [/CriOS\/(\d+)/, 'Chrome'],
  [/Chrome\/(\d+)/, 'Chrome'],
  [/Version\/(\d+).*Safari/, 'Safari'],
  [/node|undici|curl|PostmanRuntime/i, 'API client'],
];

/**
 * @param {string | null | undefined} ua
 * @returns {{ os: string, browser: string }}
 */
export function parseUserAgent(ua) {
  const s = String(ua || '').slice(0, 512);
  let os = 'Неизвестная ОС';
  for (const [re, fmt] of OS_RULES) {
    const m = s.match(re);
    if (m) {
      os = fmt(m);
      break;
    }
  }
  let browser = 'Неизвестный браузер';
  for (const [re, name] of BROWSER_RULES) {
    const m = s.match(re);
    if (m) {
      browser = m[1] && /^\d+$/.test(m[1]) ? `${name} ${m[1]}` : name;
      break;
    }
  }
  return { os, browser };
}
