import fs from 'fs';
import https from 'https';
import { inflate } from 'pako';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

const packsToDownload = [
  {
    id: 'duck',
    title: 'Уточка Сеня',
    slug: 'UtyaDuck',
    count: 30,
    dir: 'duck',
    emojiMap: ['👋', '❤️', '😎', '🎉', '😭', '🔥', '👍', '😴', '😱', '🤩', '🤔', '😡', '👏', '🥳', '🚀', '😍', '🙄', '🤫', '🥱', '🤐', '😈', '😇', '🤑', '🤠', '🤢', '🤯', '🥶', '🥵', '🤕', '🤒']
  },
  {
    id: 'cherry',
    title: 'Вишенка Hot Cherry',
    slug: 'HotCherry',
    count: 24,
    dir: 'cherry',
    emojiMap: ['🍒', '💋', '❤️', '🔥', '💃', '😘', '✨', '🥰', '🎉', '🥂', '👠', '💄', '🌹', '👑', '💅', '💎', '🍫', '🍓', '🥂', '🍾', '💖', '💘', '💞', '💕']
  },
  {
    id: 'corgi',
    title: 'Корги',
    slug: 'LittleCorgi',
    count: 24,
    dir: 'corgi',
    emojiMap: ['🐕', '🐶', '🦴', '🐾', '❤️', '👋', '🎉', '😎', '😍', '😭', '😴', '🥳', '🚀', '🔥', '👍', '🌭', '🧀', '🎾', '🏆', '🥇', '💤', '🥺', '🤩', '💖']
  }
];

async function run() {
  for (const pack of packsToDownload) {
    const outDir = path.join(__dirname, `../public/stickers/${pack.dir}`);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    console.log(`\n=== Downloading 60 FPS Animated Pack: ${pack.title} (${pack.slug}) ===`);
    const stickerList = [];

    for (let i = 1; i <= pack.count; i++) {
      const padded = String(i).padStart(3, '0');
      const letter = pack.slug[0].toLowerCase();
      const url = `https://data.chpic.su/stickers/${letter}/${pack.slug}/${pack.slug}_${padded}.tgs`;
      const jsonFileName = `${pack.dir}_${padded}.json`;
      const jsonFilePath = path.join(outDir, jsonFileName);

      try {
        const buf = await fetchBuffer(url);
        const inflated = inflate(buf);
        const lottie = JSON.parse(Buffer.from(inflated).toString('utf-8'));
        fs.writeFileSync(jsonFilePath, JSON.stringify(lottie));
        console.log(`[OK] ${jsonFileName} (FPS: ${lottie.fr}, Frames: ${lottie.op}, Layers: ${lottie.layers?.length || 0})`);

        stickerList.push({
          id: `${pack.id}_${padded}`,
          packId: pack.id,
          packTitle: pack.title,
          emoji: pack.emojiMap[i - 1] || '✨',
          title: `${pack.title} #${i}`,
          tags: [pack.id, pack.title.toLowerCase(), 'animated', '60fps', 'tgs'],
          url: `/stickers/${pack.dir}/${jsonFileName}`,
          animated: true
        });
      } catch (err) {
        console.warn(`[WARN ${padded}] Failed: ${err.message}`);
      }
    }

    const code = `import type { Sticker } from '../types/sticker.types';\n\nexport const ${pack.id.toUpperCase()}_STICKERS: Sticker[] = ${JSON.stringify(stickerList, null, 2)};\n`;
    fs.writeFileSync(path.join(__dirname, `../src/constants/${pack.dir}_stickers.ts`), code, 'utf-8');
    console.log(`Saved src/constants/${pack.dir}_stickers.ts with ${stickerList.length} 60fps animations!`);
  }
}

run().catch(console.error);
