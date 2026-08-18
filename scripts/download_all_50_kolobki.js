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

// 50 Kolobki titles and emojis mapping
const kolobkiMetadata = [
  { num: 1, emoji: '😩', title: 'Устал / Эх', tags: ['устал', 'эх', 'тяжело', 'kolobok'] },
  { num: 2, emoji: '🎧', title: 'Меломан', tags: ['музыка', 'наушники', 'трек', 'kolobok'] },
  { num: 3, emoji: '🤕', title: 'Болеет', tags: ['болею', 'бинт', 'раненый', 'kolobok'] },
  { num: 4, emoji: '🤪', title: 'Безумие', tags: ['крейзи', 'дурачусь', 'безумие', 'kolobok'] },
  { num: 5, emoji: '⚰️', title: 'Помянем / Гроб', tags: ['гроб', 'помянем', 'rip', 'kolobok'] },
  { num: 6, emoji: '😘', title: 'Поцелуй', tags: ['целую', 'поцелуй', 'любовь', 'мило', 'kolobok'] },
  { num: 7, emoji: '😉', title: 'Подмигивает', tags: ['миг', 'подмигивание', 'секрет', 'kolobok'] },
  { num: 8, emoji: '🔫', title: 'Гангстер', tags: ['пушка', 'пистолет', 'гангстер', 'kolobok'] },
  { num: 9, emoji: '🙄', title: 'Закатил глаза', tags: ['глаза', 'закатил', 'kolobok'] },
  { num: 10, emoji: '🙄', title: 'Скептик', tags: ['сомневаюсь', 'ну-ну', 'kolobok'] },
  { num: 11, emoji: '😎', title: 'Крутой', tags: ['крутой', 'очки', 'босс', 'kolobok'] },
  { num: 12, emoji: '🤟', title: 'Рок-н-ролл', tags: ['рок', 'коза', 'драйв', 'пати', 'kolobok'] },
  { num: 13, emoji: '🌤', title: 'Солнышко', tags: ['солнце', 'утро', 'тепло', 'радость', 'kolobok'] },
  { num: 14, emoji: '👸', title: 'Принцесса', tags: ['принцесса', 'корона', 'девушка', 'kolobok'] },
  { num: 15, emoji: '😘', title: 'Воздушный поцелуй', tags: ['чмок', 'поцелуй', 'kolobok'] },
  { num: 16, emoji: '😊', title: 'Милая улыбка', tags: ['улыбка', 'радость', 'мило', 'kolobok'] },
  { num: 17, emoji: '👏', title: 'Аплодисменты', tags: ['браво', 'хлопки', 'аплодисменты', 'kolobok'] },
  { num: 18, emoji: '🕺', title: 'Диско / Танцы', tags: ['танцы', 'диско', 'туса', 'пати', 'kolobok'] },
  { num: 19, emoji: '😘', title: 'Чмок', tags: ['люблю', 'сердечко', 'kolobok'] },
  { num: 20, emoji: '💤', title: 'Спит', tags: ['сон', 'спит', 'ночь', 'kolobok'] },
  { num: 21, emoji: '🙏', title: 'Молитва / Прошу', tags: ['пожалуйста', 'прошу', 'молитва', 'kolobok'] },
  { num: 22, emoji: '🤢', title: 'Тошнит', tags: ['тошнит', 'плохо', 'зеленый', 'kolobok'] },
  { num: 23, emoji: '🆘', title: 'SOS / Помогите', tags: ['sos', 'помощь', 'спасите', 'kolobok'] },
  { num: 24, emoji: '🍿', title: 'Попкорн', tags: ['попкорн', 'кино', 'смотрю', 'драма', 'kolobok'] },
  { num: 25, emoji: '😂', title: 'Ржу до слез', tags: ['смех', 'ржу', 'лол', 'rofl', 'kolobok'] },
  { num: 26, emoji: '😡', title: 'Злой / Ярость', tags: ['злость', 'ярость', 'бесит', 'kolobok'] },
  { num: 27, emoji: '🍺', title: 'Пивко / Чин-чин', tags: ['пиво', 'бухаем', 'выпьем', 'kolobok'] },
  { num: 28, emoji: '🚬', title: 'Курит', tags: ['сигарета', 'курю', 'дым', 'kolobok'] },
  { num: 29, emoji: '🚗', title: 'За рулем', tags: ['машина', 'еду', 'руль', 'авто', 'kolobok'] },
  { num: 30, emoji: '💣', title: 'Бомба / Взрыв', tags: ['бомба', 'взрыв', 'динамит', 'kolobok'] },
  { num: 31, emoji: '💃', title: 'Танцовщица', tags: ['танцы', 'девушка', 'красотка', 'kolobok'] },
  { num: 32, emoji: '😭', title: 'Рыдает', tags: ['слезы', 'плачу', 'грустно', 'kolobok'] },
  { num: 33, emoji: '😱', title: 'Шок / Крик', tags: ['шок', 'ужас', 'страшно', 'kolobok'] },
  { num: 34, emoji: '🥳', title: 'Праздник / Пати', tags: ['пати', 'др', 'праздник', 'туса', 'kolobok'] },
  { num: 35, emoji: '🤫', title: 'Тссс / Секрет', tags: ['тихо', 'секрет', 'молчи', 'kolobok'] },
  { num: 36, emoji: '🧐', title: 'Детектив', tags: ['лупа', 'ищу', 'подозрительно', 'kolobok'] },
  { num: 37, emoji: '🤤', title: 'Слюнки текут', tags: ['вкусно', 'еда', 'хочу', 'ням', 'kolobok'] },
  { num: 38, emoji: '🥱', title: 'Зевает', tags: ['скучно', 'зеваю', 'устал', 'kolobok'] },
  { num: 39, emoji: '🤔', title: 'Задумался', tags: ['думаю', 'хм', 'мысли', 'kolobok'] },
  { num: 40, emoji: '🤩', title: 'Восторг', tags: ['вау', 'супер', 'восторг', 'звезды', 'kolobok'] },
  { num: 41, emoji: '👋', title: 'Пока / Привет', tags: ['машет', 'привет', 'пока', 'kolobok'] },
  { num: 42, emoji: '🔥', title: 'Огонь / Жара', tags: ['огонь', 'жара', 'топ', 'горит', 'kolobok'] },
  { num: 43, emoji: '❤️', title: 'Сердечко', tags: ['любовь', 'сердце', 'обожаю', 'kolobok'] },
  { num: 44, emoji: '👍', title: 'Класс / Лайк', tags: ['лайк', 'класс', 'хорошо', 'kolobok'] },
  { num: 45, emoji: '👎', title: 'Дизлайк', tags: ['дизлайк', 'плохо', 'не нравится', 'kolobok'] },
  { num: 46, emoji: '🤝', title: 'Договорились', tags: ['рукопожатие', 'сделка', 'партнер', 'kolobok'] },
  { num: 47, emoji: '🥊', title: 'Бокс / Драка', tags: ['бокс', 'удар', 'драка', 'kolobok'] },
  { num: 48, emoji: '🧙‍♂️', title: 'Маг / Фокус', tags: ['магия', 'фокус', 'колдун', 'kolobok'] },
  { num: 49, emoji: '👑', title: 'Король', tags: ['король', 'босс', 'главный', 'kolobok'] },
  { num: 50, emoji: '🚀', title: 'В космос / Ракета', tags: ['ракета', 'взлет', 'космос', 'туземун', 'kolobok'] }
];

async function main() {
  console.log('Downloading all 50 Telegram Animated .TGS Kolobki...');
  const stickerList = [];

  for (const meta of kolobkiMetadata) {
    const padded = String(meta.num).padStart(3, '0');
    const tgsUrl = `https://data.chpic.su/stickers/i/icqkolobki/icqkolobki_${padded}.tgs`;
    const jsonFileName = `kolobok_${padded}.json`;
    const jsonFilePath = path.join(outputDir, jsonFileName);

    try {
      const buffer = await fetchBuffer(tgsUrl);
      const inflated = inflate(buffer);
      const jsonStr = Buffer.from(inflated).toString('utf-8');
      const lottie = JSON.parse(jsonStr);

      fs.writeFileSync(jsonFilePath, JSON.stringify(lottie));
      console.log(`[OK ${padded}] Saved Lottie: ${jsonFileName} (${lottie.fr} fps, ${lottie.op} frames, ${meta.emoji} ${meta.title})`);

      stickerList.push({
        id: `icq_${padded}`,
        packId: 'icqkolobki',
        packTitle: 'ICQ Колобки',
        emoji: meta.emoji,
        title: meta.title,
        tags: ['колобок', 'icq', 'kolobok', ...meta.tags],
        url: `/stickers/kolobki/${jsonFileName}`,
        animated: true
      });
    } catch (err) {
      console.warn(`[WARN ${padded}] Failed: ${err.message}`);
    }
  }

  console.log(`\nSuccessfully generated ${stickerList.length} / 50 animated Lottie stickers!`);
  
  // Write stickers module code
  const code = `import type { Sticker } from '../types/sticker.types';\n\nexport const ICQ_KOLOBKI_STICKERS: Sticker[] = ${JSON.stringify(stickerList, null, 2)};\n`;
  fs.writeFileSync(path.join(__dirname, '../src/constants/kolobki.ts'), code, 'utf-8');
  console.log('Generated src/constants/kolobki.ts!');
}

main().catch(console.error);
