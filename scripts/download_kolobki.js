import fs from 'fs';
import https from 'https';
import { inflate } from 'pako';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, '../public/stickers/kolobki');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function main() {
  const contentPath = 'C:\\Users\\Drilla\\.gemini\\antigravity-ide\\brain\\8f4482bd-2539-416b-9c78-72540b366a2e\\.system_generated\\steps\\189\\content.md';
  const html = fs.readFileSync(contentPath, 'utf-8');

  // Extract from figure items
  // <figure class="sticker-item" ...> <img src="..." alt="😩 emoji Kolobki Telegram sticker 1 of 50" ...> <figcaption class="sticker-emoji" ...>😩</figcaption> </figure>
  const figureRegex = /<figure class="sticker-item"[\s\S]*?<img[\s\S]*?src="([^"]+)"[\s\S]*?alt="([^"]+)"[\s\S]*?<figcaption[^>]*>([^<]+)<\/figcaption>/g;
  let match;
  const items = [];

  while ((match = figureRegex.exec(html)) !== null) {
    const src = match[1];
    const alt = match[2];
    const emoji = match[3].trim();
    const indexMatch = alt.match(/sticker\s+(\d+)\s+of/i);
    const index = indexMatch ? Number(indexMatch[1]) : items.length + 1;
    items.push({ index, emoji, thumbUrl: src, alt });
  }

  console.log(`Extracted ${items.length} Kolobki stickers from HTML`);

  // Map of titles and tags for Kolobki
  const titles = [
    'Устал', 'Меломан', 'Болеет', 'Безумие', 'Помянем', 'Поцелуй', 'Подмигивает',
    'Гангстер', 'Закатил глаза', 'Крутой', 'Рок-н-ролл', 'Солнышко', 'Принцесса',
    'Милая улыбка', 'Аплодисменты', 'Диско / Танцы', 'Спит', 'Молитва', 'Тошнит',
    'SOS', 'Попкорн', 'Смех', 'Влюблен', 'Огонь'
  ];

  const downloaded = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = titles[i] || `Колобок ${item.emoji}`;
    const fileName = `kolobok_${item.index}.json`;
    const filePath = path.join(outputDir, fileName);

    // Try downloading the document via document endpoint
    let isAnimated = false;
    try {
      const docUrl = item.thumbUrl.replace(/\/sticker\.webp$/, '/document');
      const docBuffer = await fetchUrl(docUrl);
      let lottie;
      try {
        const inflated = inflate(docBuffer);
        lottie = JSON.parse(Buffer.from(inflated).toString('utf-8'));
      } catch {
        lottie = JSON.parse(docBuffer.toString('utf-8'));
      }
      fs.writeFileSync(filePath, JSON.stringify(lottie));
      console.log(`[OK ${item.index}] Saved Animated Lottie: ${fileName} (Frames: ${lottie.op}, FPS: ${lottie.fr}, Emoji: ${item.emoji})`);
      isAnimated = true;
    } catch (err) {
      console.log(`[FALLBACK ${item.index}] Used WebP for ${title} (${err.message})`);
    }

    downloaded.push({
      id: `icq_${item.index}`,
      packId: 'icqkolobki',
      packTitle: 'ICQ Колобки',
      emoji: item.emoji,
      title: `Колобок: ${title}`,
      tags: ['колобок', 'icq', 'kolobok', title.toLowerCase(), item.emoji],
      url: isAnimated ? `/stickers/kolobki/${fileName}` : item.thumbUrl,
      thumbUrl: item.thumbUrl,
      isAnimated: isAnimated
    });
  }

  console.log(`\nProcessed ${downloaded.length} stickers!`);
  fs.writeFileSync(
    path.join(__dirname, '../src/constants/kolobki_manifest.json'),
    JSON.stringify(downloaded, null, 2)
  );
  console.log('Saved manifest to src/constants/kolobki_manifest.json');
}

main().catch(console.error);
