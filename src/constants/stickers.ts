import type { Sticker, StickerPack } from '../types/sticker.types';
import { ICQ_KOLOBKI_STICKERS } from './kolobki';
import { DUCK_STICKERS } from './duck_stickers';
import { CHERRY_STICKERS } from './cherry_stickers';

// Helper to create reliable SVG Data URI stickers with crisp Telegram aesthetic
const createSvgSticker = (svgContent: string): string => {
  const cleaned = svgContent
    .replace(/\n/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(cleaned)}`;
};

export const STICKER_PACKS: StickerPack[] = [
  // 1. 🦆 УТОЧКА СЕНЯ (26 Official Telegram 60 FPS Animated Stickers)
  {
    id: 'duck',
    title: 'Уточка Сеня 60 FPS',
    icon: '🦆',
    author: 'Telegram Official',
    description: '26 плавных векторных анимированных стикеров Уточки в 60 FPS',
    isAnimated: true,
    stickers: DUCK_STICKERS
  },

  // 2. 🍒 ВИШЕНКА HOT CHERRY (60 FPS Animated Telegram Stickers)
  {
    id: 'cherry',
    title: 'Вишенка Hot Cherry',
    icon: '🍒',
    author: 'Telegram Official',
    description: 'Плавные векторные стикеры Вишенки в 60 FPS',
    isAnimated: true,
    stickers: CHERRY_STICKERS
  },

  // 3. 🟡 ICQ КОЛОБКИ (50 Animated Telegram .TGS Lottie Stickers)
  {
    id: 'icqkolobki',
    title: 'ICQ Колобки',
    icon: '🟡',
    author: 'ICQ & Aiwan',
    description: '50 легендарных ретро-колобков ICQ в формате Telegram .TGS',
    isAnimated: true,
    stickers: ICQ_KOLOBKI_STICKERS
  },

  // 2. 🐸 МЕМНЫЙ ЛЯГУШОНОК ПЕПЕ (Pepe the Frog)
  {
    id: 'pepe',
    title: 'Лягушонок Пепе',
    icon: '🐸',
    author: 'Internet Legends',
    description: 'Культовый мемный лягушонок Пепе с топовыми эмоциями',
    stickers: [
      {
        id: 'pepe_smug',
        packId: 'pepe',
        packTitle: 'Лягушонок Пепе',
        emoji: '😏',
        title: 'Хех / Smug',
        tags: ['пепе', 'pepe', 'хех', 'smug', 'ухмылка', 'хитрый', 'лягушка'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <defs>
              <linearGradient id="pepeGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#8BC34A"/><stop offset="100%" stop-color="#558B2F"/>
              </linearGradient>
            </defs>
            <g>
              <!-- Head -->
              <ellipse cx="120" cy="115" rx="72" ry="58" fill="url(#pepeGreen)" stroke="#33691E" stroke-width="4.5"/>
              <!-- Bulging Frog Eyes -->
              <circle cx="85" cy="72" r="28" fill="url(#pepeGreen)" stroke="#33691E" stroke-width="4"/>
              <circle cx="155" cy="72" r="28" fill="url(#pepeGreen)" stroke="#33691E" stroke-width="4"/>
              <!-- White of Eyes with heavy eyelids -->
              <ellipse cx="85" cy="76" rx="20" ry="16" fill="#FFFFFF" stroke="#33691E" stroke-width="2"/>
              <ellipse cx="155" cy="76" rx="20" ry="16" fill="#FFFFFF" stroke="#33691E" stroke-width="2"/>
              <!-- Eyelids droop -->
              <path d="M65 72 Q85 82 105 72" stroke="#33691E" stroke-width="4" fill="#7CB342"/>
              <path d="M135 72 Q155 82 175 72" stroke="#33691E" stroke-width="4" fill="#7CB342"/>
              <!-- Pupils -->
              <ellipse cx="85" cy="80" rx="8" ry="10" fill="#212121"/>
              <ellipse cx="155" cy="80" rx="8" ry="10" fill="#212121"/>
              <!-- Smug Curved Lips -->
              <path d="M70 125 C95 120 140 110 175 140 C150 150 100 155 70 125 Z" fill="#D32F2F" stroke="#33691E" stroke-width="4"/>
              <path d="M165 130 Q180 125 185 115" stroke="#33691E" stroke-width="4" fill="none" stroke-linecap="round"/>
              <rect x="55" y="196" width="130" height="30" rx="15" fill="#33691E" stroke="#FFFFFF" stroke-width="2"/>
              <text x="120" y="216" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#FFFFFF" text-anchor="middle">ХЕХ 😏</text>
            </g>
          </svg>
        `)
      },
      {
        id: 'pepe_wine',
        packId: 'pepe',
        packTitle: 'Лягушонок Пепе',
        emoji: '🍷',
        title: 'Ваше здоровье',
        tags: ['вино', 'чин-чин', 'wine', 'тост', 'элита', 'пепе'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <ellipse cx="105" cy="115" rx="66" ry="54" fill="#7CB342" stroke="#33691E" stroke-width="4"/>
            <circle cx="75" cy="74" r="26" fill="#7CB342" stroke="#33691E" stroke-width="4"/>
            <circle cx="135" cy="74" r="26" fill="#7CB342" stroke="#33691E" stroke-width="4"/>
            <ellipse cx="75" cy="78" rx="18" ry="14" fill="#FFF"/>
            <ellipse cx="135" cy="78" rx="18" ry="14" fill="#FFF"/>
            <circle cx="75" cy="80" r="7" fill="#212121"/>
            <circle cx="135" cy="80" r="7" fill="#212121"/>
            <!-- Lips -->
            <path d="M65 125 Q105 138 145 120" stroke="#33691E" stroke-width="5" fill="none" stroke-linecap="round"/>
            <!-- Wine Glass in Hand -->
            <g transform="translate(150, 95)">
              <path d="M10 10 C10 40 40 40 40 10 Z" fill="#880E4F" stroke="#FFFFFF" stroke-width="2.5"/>
              <path d="M25 40 L25 70 M10 70 L40 70" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
              <ellipse cx="25" cy="15" rx="14" ry="5" fill="#C2185B"/>
            </g>
            <text x="120" y="222" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#880E4F" text-anchor="middle">ВАШЕ ЗДОРОВЬЕ 🍷</text>
          </svg>
        `)
      },
      {
        id: 'pepe_crying',
        packId: 'pepe',
        packTitle: 'Лягушонок Пепе',
        emoji: '😭',
        title: 'Боль / FeelsBadMan',
        tags: ['боль', 'слезы', 'грустно', 'feelsbadman', 'пепе', 'печаль'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <ellipse cx="120" cy="120" rx="70" ry="55" fill="#7CB342" stroke="#33691E" stroke-width="4"/>
            <circle cx="85" cy="75" r="26" fill="#7CB342" stroke="#33691E" stroke-width="4"/>
            <circle cx="155" cy="75" r="26" fill="#7CB342" stroke="#33691E" stroke-width="4"/>
            <!-- Sad Drooping Eyes -->
            <path d="M68 65 Q85 85 102 75" stroke="#33691E" stroke-width="4" fill="#FFF"/>
            <path d="M138 75 Q155 85 172 65" stroke="#33691E" stroke-width="4" fill="#FFF"/>
            <circle cx="85" cy="75" r="7" fill="#212121"/>
            <circle cx="155" cy="75" r="7" fill="#212121"/>
            <!-- Giant Sad Lips -->
            <path d="M65 145 C90 120 150 120 175 145" stroke="#33691E" stroke-width="6" fill="none" stroke-linecap="round"/>
            <!-- Tear rivers -->
            <path d="M85 85 L80 175 M155 85 L160 175" stroke="#00E5FF" stroke-width="7" stroke-linecap="round"/>
            <text x="120" y="222" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#0091EA" text-anchor="middle">FEELS BAD MAN 😢</text>
          </svg>
        `)
      },
      {
        id: 'pepe_clown',
        packId: 'pepe',
        packTitle: 'Лягушонок Пепе',
        emoji: '🤡',
        title: 'Клоун / Clown World',
        tags: ['клоун', 'цирк', 'clown', 'honk', 'пепе', 'шутка'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <!-- Rainbow Clown Hair -->
            <circle cx="55" cy="80" r="26" fill="#E91E63"/>
            <circle cx="185" cy="80" r="26" fill="#00E5FF"/>
            <circle cx="70" cy="55" r="22" fill="#FFEA00"/>
            <circle cx="170" cy="55" r="22" fill="#76FF03"/>
            <!-- Pepe -->
            <ellipse cx="120" cy="120" rx="68" ry="54" fill="#7CB342" stroke="#33691E" stroke-width="4"/>
            <circle cx="85" cy="80" r="24" fill="#FFF" stroke="#33691E" stroke-width="3"/>
            <circle cx="155" cy="80" r="24" fill="#FFF" stroke="#33691E" stroke-width="3"/>
            <circle cx="85" cy="80" r="7" fill="#212121"/>
            <circle cx="155" cy="80" r="7" fill="#212121"/>
            <!-- Red Clown Nose -->
            <circle cx="120" cy="105" r="18" fill="#FF1744" stroke="#B71C1C" stroke-width="3"/>
            <!-- Painted Smile -->
            <path d="M70 135 Q120 170 170 135" stroke="#D50000" stroke-width="8" fill="none" stroke-linecap="round"/>
            <text x="120" y="222" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#D50000" text-anchor="middle">HONK HONK 🤡</text>
          </svg>
        `)
      },
      {
        id: 'pepe_hacker',
        packId: 'pepe',
        packTitle: 'Лягушонок Пепе',
        emoji: '💻',
        title: 'Взламываю пентагон',
        tags: ['хакер', 'программист', 'hacker', 'код', 'it', 'пепе', 'dev'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <ellipse cx="120" cy="100" rx="64" ry="50" fill="#7CB342" stroke="#33691E" stroke-width="4"/>
            <!-- Dark Matrix Glasses -->
            <rect x="65" y="70" width="45" height="28" rx="4" fill="#212121" stroke="#00E676" stroke-width="2"/>
            <rect x="130" y="70" width="45" height="28" rx="4" fill="#212121" stroke="#00E676" stroke-width="2"/>
            <path d="M110 80 L130 80" stroke="#212121" stroke-width="4"/>
            <text x="75" y="88" font-family="monospace" font-size="11" fill="#00E676">>_</text>
            <text x="140" y="88" font-family="monospace" font-size="11" fill="#00E676">10</text>
            <!-- Glowing Laptop -->
            <g transform="translate(60, 130)">
              <polygon points="10,0 110,0 120,45 0,45" fill="#37474F" stroke="#263238" stroke-width="3"/>
              <rect x="25" y="5" width="70" height="30" fill="#00E676" opacity="0.9"/>
              <text x="60" y="24" font-family="monospace" font-weight="bold" font-size="11" fill="#212121" text-anchor="middle">ACCESS OK</text>
            </g>
            <text x="120" y="222" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#00C853" text-anchor="middle">Я ПО ПРИКОЛУ 💻</text>
          </svg>
        `)
      }
    ]
  },

  // 3. 🐱 МЕМНЫЕ КОТИКИ (Meme Cats & Popcat)
  {
    id: 'cats',
    title: 'Мемные Котики',
    icon: '🐱',
    author: 'Cat Universe',
    description: 'Попкэт, вежливый котик и все самые вирусные коты интернета',
    stickers: [
      {
        id: 'cat_popcat',
        packId: 'cats',
        packTitle: 'Мемные Котики',
        emoji: '😮',
        title: 'POPCAT!',
        tags: ['попкэт', 'popcat', 'кот', 'рот', 'мем', 'котик'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <!-- Cat Head -->
            <ellipse cx="120" cy="130" rx="75" ry="65" fill="#FFF8E1" stroke="#4E342E" stroke-width="4.5"/>
            <!-- Ears -->
            <polygon points="65,95 45,35 105,70" fill="#FFF8E1" stroke="#4E342E" stroke-width="4.5"/>
            <polygon points="62,90 52,48 95,72" fill="#FF8A80"/>
            <polygon points="175,95 195,35 135,70" fill="#FFF8E1" stroke="#4E342E" stroke-width="4.5"/>
            <polygon points="178,90 188,48 145,72" fill="#FF8A80"/>
            <!-- Eyes -->
            <circle cx="85" cy="100" r="16" fill="#212121"/>
            <circle cx="155" cy="100" r="16" fill="#212121"/>
            <circle cx="81" cy="95" r="6" fill="#FFF"/>
            <circle cx="151" cy="95" r="6" fill="#FFF"/>
            <!-- Giant O-Mouth of Popcat -->
            <ellipse cx="120" cy="148" rx="34" ry="40" fill="#212121" stroke="#B71C1C" stroke-width="3"/>
            <ellipse cx="120" cy="165" rx="20" ry="16" fill="#D32F2F"/>
            <text x="120" y="222" font-family="system-ui, sans-serif" font-weight="900" font-size="16" fill="#E65100" text-anchor="middle">POOOOP! 😮</text>
          </svg>
        `)
      },
      {
        id: 'cat_polite',
        packId: 'cats',
        packTitle: 'Мемные Котики',
        emoji: '🐱',
        title: 'Вежливый кот Олли',
        tags: ['вежливый', 'олли', 'кот', 'улыбка', 'polite', 'мило'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <ellipse cx="120" cy="130" rx="72" ry="62" fill="#EEEEEE" stroke="#37474F" stroke-width="4.5"/>
            <polygon points="65,95 45,35 105,70" fill="#EEEEEE" stroke="#37474F" stroke-width="4.5"/>
            <polygon points="175,95 195,35 135,70" fill="#EEEEEE" stroke="#37474F" stroke-width="4.5"/>
            <circle cx="85" cy="105" r="12" fill="#212121"/>
            <circle cx="155" cy="105" r="12" fill="#212121"/>
            <!-- Polite pressed lips smile -->
            <path d="M85 142 C105 155 135 155 155 142" stroke="#212121" stroke-width="5" fill="none" stroke-linecap="round"/>
            <text x="120" y="222" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#37474F" text-anchor="middle">ОЧЕНЬ ВЕЖЛИВО 🙂</text>
          </svg>
        `)
      },
      {
        id: 'cat_crying_thumbsup',
        packId: 'cats',
        packTitle: 'Мемные Котики',
        emoji: '👍',
        title: 'Всё под контролем (нет)',
        tags: ['плач', 'лайк', 'держись', 'кот', 'слезы', 'боль'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <ellipse cx="105" cy="125" rx="65" ry="55" fill="#FFF3E0" stroke="#E65100" stroke-width="4"/>
            <polygon points="55,90 40,35 95,65" fill="#FFF3E0" stroke="#E65100" stroke-width="4"/>
            <polygon points="155,90 170,35 115,65" fill="#FFF3E0" stroke="#E65100" stroke-width="4"/>
            <!-- Huge Glossy Teary Eyes -->
            <ellipse cx="78" cy="105" rx="18" ry="16" fill="#0288D1"/>
            <ellipse cx="132" cy="105" rx="18" ry="16" fill="#0288D1"/>
            <circle cx="72" cy="98" r="7" fill="#FFF"/>
            <circle cx="126" cy="98" r="7" fill="#FFF"/>
            <!-- Paw with Thumbs Up -->
            <g transform="translate(155, 100)">
              <ellipse cx="20" cy="30" rx="18" ry="16" fill="#FFF3E0" stroke="#E65100" stroke-width="3.5"/>
              <path d="M12 25 L12 0 C12 -6 26 -6 26 5 L26 25 Z" fill="#FFF3E0" stroke="#E65100" stroke-width="3.5"/>
            </g>
            <text x="120" y="222" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#E65100" text-anchor="middle">ВСЁ ХОРОШО 👍😭</text>
          </svg>
        `)
      },
      {
        id: 'cat_knife',
        packId: 'cats',
        packTitle: 'Мемные Котики',
        emoji: '🔪',
        title: 'Опасно / Не зли',
        tags: ['нож', 'опасно', 'злой', 'угроза', 'кот', 'knife'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <ellipse cx="120" cy="120" rx="68" ry="58" fill="#ECEFF1" stroke="#263238" stroke-width="4"/>
            <polygon points="65,85 45,25 105,60" fill="#ECEFF1" stroke="#263238" stroke-width="4"/>
            <polygon points="175,85 195,25 135,60" fill="#ECEFF1" stroke="#263238" stroke-width="4"/>
            <!-- Evil Slanted Eyes -->
            <path d="M75 95 L100 105" stroke="#212121" stroke-width="5" stroke-linecap="round"/>
            <path d="M165 95 L140 105" stroke="#212121" stroke-width="5" stroke-linecap="round"/>
            <!-- Big Shiny Knife -->
            <g transform="translate(130, 120) rotate(-20)">
              <polygon points="0,0 80,-15 70,15 0,8" fill="#B0BEC5" stroke="#37474F" stroke-width="3"/>
              <rect x="-25" y="-2" width="28" height="12" rx="4" fill="#5D4037"/>
            </g>
            <text x="120" y="222" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#D50000" text-anchor="middle">НЕ ЗЛИ МЕНЯ 🔪</text>
          </svg>
        `)
      }
    ]
  },

  // 4. 🐕 ДОГЕ И ЧИМС (Shiba Inu & Cheems)
  {
    id: 'doge',
    title: 'Доге и Чимс',
    icon: '🐕',
    author: 'Doge Lore',
    description: 'Легендарный Чимс Бонк, Своле Доге и классический Much Wow',
    stickers: [
      {
        id: 'doge_bonk',
        packId: 'doge',
        packTitle: 'Доге и Чимс',
        emoji: '🏏',
        title: 'BONK!',
        tags: ['бонк', 'bonk', 'чимс', 'доге', 'бита', 'удар', 'doge'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <!-- Cheems Head -->
            <ellipse cx="105" cy="130" rx="60" ry="50" fill="#FFA726" stroke="#E65100" stroke-width="4"/>
            <polygon points="60,95 45,45 95,75" fill="#FFA726" stroke="#E65100" stroke-width="4"/>
            <polygon points="150,95 165,45 115,75" fill="#FFA726" stroke="#E65100" stroke-width="4"/>
            <!-- Cheems Sad Flat Face -->
            <circle cx="85" cy="115" r="7" fill="#212121"/>
            <circle cx="125" cy="115" r="7" fill="#212121"/>
            <ellipse cx="105" cy="130" rx="14" ry="10" fill="#212121"/>
            <!-- Wooden Bat Smashing -->
            <g transform="translate(125, 45) rotate(35)">
              <polygon points="0,0 90,-12 90,12 0,6" fill="#8D6E63" stroke="#4E342E" stroke-width="3"/>
            </g>
            <!-- Impact Star -->
            <polygon points="135,80 145,65 155,80 170,75 160,90 175,100 155,105 150,120 140,105 125,110 135,95 120,85" fill="#FFEA00" stroke="#FF6D00" stroke-width="2"/>
            <text x="120" y="222" font-family="system-ui, sans-serif" font-weight="900" font-size="18" fill="#D50000" text-anchor="middle">BONK! 🏏</text>
          </svg>
        `)
      },
      {
        id: 'doge_wow',
        packId: 'doge',
        packTitle: 'Доге и Чимс',
        emoji: '🐕',
        title: 'Much Wow / Doge',
        tags: ['доге', 'вау', 'wow', 'doge', 'shiba', 'шиба'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <ellipse cx="120" cy="120" rx="68" ry="58" fill="#FFB74D" stroke="#E65100" stroke-width="4"/>
            <polygon points="65,85 50,30 105,65" fill="#FFB74D" stroke="#E65100" stroke-width="4"/>
            <polygon points="175,85 190,30 135,65" fill="#FFB74D" stroke="#E65100" stroke-width="4"/>
            <circle cx="85" cy="105" r="10" fill="#212121"/>
            <circle cx="155" cy="105" r="10" fill="#212121"/>
            <circle cx="81" cy="100" r="4" fill="#FFF"/>
            <circle cx="151" cy="100" r="4" fill="#FFF"/>
            <ellipse cx="120" cy="122" rx="16" ry="12" fill="#212121"/>
            <!-- Floating Doge Phrases -->
            <text x="35" y="60" font-family="Comic Sans MS, cursive" font-weight="bold" font-size="14" fill="#E91E63">so amaze</text>
            <text x="165" y="70" font-family="Comic Sans MS, cursive" font-weight="bold" font-size="14" fill="#00E5FF">much wow</text>
            <text x="120" y="222" font-family="system-ui, sans-serif" font-weight="900" font-size="16" fill="#E65100" text-anchor="middle">MUCH WOW 🐕</text>
          </svg>
        `)
      }
    ]
  },

  // 5. 🌸 АНЯ ФОРДЖЕР (Spy x Family / Anya)
  {
    id: 'anya',
    title: 'Аня Шпионка',
    icon: '🌸',
    author: 'Anime Legends',
    description: 'Знаменитая ухмылка «Heh» и реакция «Waku Waku» от Ани Форджер',
    stickers: [
      {
        id: 'anya_heh',
        packId: 'anya',
        packTitle: 'Аня Шпионка',
        emoji: '😏',
        title: 'Heh / Хех',
        tags: ['аня', 'anya', 'heh', 'хех', 'аниме', 'ухмылка', 'spy'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <!-- Pink Hair -->
            <circle cx="120" cy="110" r="70" fill="#F48FB1"/>
            <polygon points="50,110 30,170 80,140" fill="#F48FB1"/>
            <polygon points="190,110 210,170 160,140" fill="#F48FB1"/>
            <!-- Face -->
            <circle cx="120" cy="120" r="54" fill="#FFF3E0"/>
            <!-- Horn ornaments -->
            <polygon points="65,65 50,30 85,50" fill="#37474F" stroke="#F48FB1" stroke-width="2"/>
            <polygon points="175,65 190,30 155,50" fill="#37474F" stroke="#F48FB1" stroke-width="2"/>
            <!-- Iconic Smug Slanted Eyes -->
            <path d="M85 110 Q98 100 110 110" stroke="#37474F" stroke-width="4.5" fill="none" stroke-linecap="round"/>
            <path d="M130 110 Q142 100 155 110" stroke="#37474F" stroke-width="4.5" fill="none" stroke-linecap="round"/>
            <circle cx="95" cy="122" r="7" fill="#FF8A80" opacity="0.6"/>
            <circle cx="145" cy="122" r="7" fill="#FF8A80" opacity="0.6"/>
            <!-- Wide Smug Grin -->
            <path d="M92 135 Q120 155 148 135" stroke="#37474F" stroke-width="4.5" fill="none" stroke-linecap="round"/>
            <text x="120" y="222" font-family="system-ui, sans-serif" font-weight="900" font-size="17" fill="#C2185B" text-anchor="middle">HEH 😏</text>
          </svg>
        `)
      },
      {
        id: 'anya_waku',
        packId: 'anya',
        packTitle: 'Аня Шпионка',
        emoji: '🤩',
        title: 'Waku Waku!',
        tags: ['ваку', 'waku', 'шок', 'радость', 'аня', 'блеск'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <circle cx="120" cy="110" r="70" fill="#F48FB1"/>
            <circle cx="120" cy="120" r="54" fill="#FFF3E0"/>
            <!-- Sparkly Star Eyes -->
            <polygon points="95,95 99,107 111,111 99,115 95,127 91,115 79,111 91,107" fill="#00E5FF"/>
            <polygon points="145,95 149,107 161,111 149,115 145,127 141,115 129,111 141,107" fill="#00E5FF"/>
            <!-- Cheerful Open Mouth -->
            <ellipse cx="120" cy="142" rx="14" ry="12" fill="#D81B60"/>
            <text x="120" y="222" font-family="system-ui, sans-serif" font-weight="900" font-size="15" fill="#D81B60" text-anchor="middle">WAKU WAKU! ✨</text>
          </svg>
        `)
      }
    ]
  },

  // 6. 🗿 ГИГАЧАД И МЕМЫ (Gigachad & Top Memes)
  {
    id: 'memes',
    title: 'Гигачад и Мемы',
    icon: '🗿',
    author: 'Chad Universe',
    description: 'Гигачад, Stonks, Big Brain и золотая классика мемов',
    stickers: [
      {
        id: 'meme_gigachad',
        packId: 'memes',
        packTitle: 'Гигачад и Мемы',
        emoji: '🗿',
        title: 'Average Enjoyer / Gigachad',
        tags: ['гигачад', 'chad', 'чад', 'база', 'сигма', 'sigma', 'красавчик'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <defs>
              <linearGradient id="chadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#78909C"/><stop offset="100%" stop-color="#37474F"/>
              </linearGradient>
            </defs>
            <!-- Gigachad Sculpted Jawline Face -->
            <polygon points="80,50 160,50 175,100 165,150 120,185 75,150 65,100" fill="url(#chadGrad)" stroke="#212121" stroke-width="4.5"/>
            <!-- Perfect Beard Contour -->
            <path d="M70 120 L120 185 L170 120 L160 160 L120 185 L80 160 Z" fill="#212121"/>
            <!-- Eyes & Strong Eyebrows -->
            <path d="M85 85 L105 85 M135 85 L155 85" stroke="#ECEFF1" stroke-width="6" stroke-linecap="round"/>
            <!-- Confident Jawline Shadow -->
            <path d="M120 100 L115 130 L125 130 Z" fill="#ECEFF1"/>
            <path d="M100 145 Q120 155 140 145" stroke="#ECEFF1" stroke-width="4" fill="none"/>
            <rect x="40" y="196" width="160" height="32" rx="16" fill="#263238" stroke="#FFFFFF" stroke-width="2"/>
            <text x="120" y="217" font-family="system-ui, sans-serif" font-weight="900" font-size="14" fill="#FFFFFF" text-anchor="middle">ЧАД ОДОБРЯЕТ 🗿</text>
          </svg>
        `)
      },
      {
        id: 'meme_stonks',
        packId: 'memes',
        packTitle: 'Гигачад и Мемы',
        emoji: '📈',
        title: 'STONKS!',
        tags: ['stonks', 'стонкс', 'акции', 'рост', 'успех', 'бизнес'],
        url: createSvgSticker(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
            <!-- Blue Stock Chart Grid -->
            <rect x="20" y="20" width="200" height="170" rx="12" fill="#0D47A1" opacity="0.9"/>
            <!-- Rising Red Orange Arrow -->
            <path d="M40 160 L100 120 L140 140 L195 50" fill="none" stroke="#FF5722" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
            <polygon points="195,50 170,55 188,75" fill="#FF5722"/>
            <!-- Meme Man Head -->
            <ellipse cx="100" cy="90" rx="30" ry="36" fill="#D7CCC8" stroke="#3E2723" stroke-width="3"/>
            <text x="120" y="222" font-family="system-ui, sans-serif" font-weight="900" font-size="18" fill="#FF5722" text-anchor="middle">STONKS 📈</text>
          </svg>
        `)
      }
    ]
  },

  // 7. ✨ 3D ЖИВЫЕ ЭМОДЗИ (Telegram 3D Animated Super-Emojis)
  {
    id: 'animated_3d',
    title: '3D Живые Стикеры',
    icon: '✨',
    author: 'Telegram Ultra-HD',
    description: 'Премиальные анимированные 3D стикеры 60fps высокой четкости',
    isAnimated: true,
    stickers: [
      {
        id: 'anim_fire_heart',
        packId: 'animated_3d',
        packTitle: '3D Живые Стикеры',
        emoji: '❤️‍🔥',
        title: 'Пылающее сердце',
        tags: ['сердце', 'огонь', 'любовь', 'страсть', 'heart'],
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f_200d_1f525/512.webp',
        animated: true
      },
      {
        id: 'anim_rocket',
        packId: 'animated_3d',
        packTitle: '3D Живые Стикеры',
        emoji: '🚀',
        title: 'Ракета в космос',
        tags: ['ракета', 'космос', 'полет', 'старт', 'rocket'],
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp',
        animated: true
      },
      {
        id: 'anim_mindblown',
        packId: 'animated_3d',
        packTitle: '3D Живые Стикеры',
        emoji: '🤯',
        title: 'Взрыв мозга',
        tags: ['взрыв', 'мозг', 'шок', 'mindblown', 'офигеть'],
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.webp',
        animated: true
      },
      {
        id: 'anim_party',
        packId: 'animated_3d',
        packTitle: '3D Живые Стикеры',
        emoji: '🎉',
        title: 'Праздник / Хлопушка',
        tags: ['праздник', 'пати', 'party', 'ура', 'салют'],
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp',
        animated: true
      },
      {
        id: 'anim_laughing',
        packId: 'animated_3d',
        packTitle: '3D Живые Стикеры',
        emoji: '😂',
        title: 'Смех до слез',
        tags: ['смех', 'ржу', 'ору', 'слезы', 'лол', 'кек'],
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp',
        animated: true
      },
      {
        id: 'anim_thumbsup',
        packId: 'animated_3d',
        packTitle: '3D Живые Стикеры',
        emoji: '👍',
        title: 'Класс 3D',
        tags: ['лайк', 'класс', 'топ', 'thumbsup'],
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.webp',
        animated: true
      },
      {
        id: 'anim_starstruck',
        packId: 'animated_3d',
        packTitle: '3D Живые Стикеры',
        emoji: '🤩',
        title: 'В восторге',
        tags: ['звезды', 'восторг', 'вау', 'звездный'],
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.webp',
        animated: true
      },
      {
        id: 'anim_flame',
        packId: 'animated_3d',
        packTitle: '3D Живые Стикеры',
        emoji: '🔥',
        title: 'Пламя 3D',
        tags: ['огонь', 'жара', 'пламя', 'fire'],
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp',
        animated: true
      },
      {
        id: 'anim_crown',
        packId: 'animated_3d',
        packTitle: '3D Живые Стикеры',
        emoji: '👑',
        title: 'Корона',
        tags: ['корона', 'царь', 'король', 'лучший', 'crown'],
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f451/512.webp',
        animated: true
      },
      {
        id: 'anim_diamond',
        packId: 'animated_3d',
        packTitle: '3D Живые Стикеры',
        emoji: '💎',
        title: 'Алмаз',
        tags: ['алмаз', 'бриллиант', 'сокровище', 'diamond'],
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48e/512.webp',
        animated: true
      },
      {
        id: 'anim_clapping',
        packId: 'animated_3d',
        packTitle: '3D Живые Стикеры',
        emoji: '👏',
        title: 'Аплодисменты',
        tags: ['хлопки', 'браво', 'аплодисменты', 'clap'],
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.webp',
        animated: true
      },
      {
        id: 'anim_hundred',
        packId: 'animated_3d',
        packTitle: '3D Живые Стикеры',
        emoji: '💯',
        title: '100 из 100',
        tags: ['сто', '100', 'идеально', 'база'],
        url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.webp',
        animated: true
      }
    ]
  }
];

// Flat array of all stickers
export const ALL_STICKERS: Sticker[] = STICKER_PACKS.flatMap(p => p.stickers);

// Find stickers matching an emoji
export const findStickersByEmoji = (emoji: string): Sticker[] => {
  if (!emoji || !emoji.trim()) return [];
  const clean = emoji.trim();
  return ALL_STICKERS.filter(s => s.emoji === clean || s.tags?.some(t => t.includes(clean)));
};

// Search stickers by text query
export const searchStickers = (query: string): Sticker[] => {
  if (!query || !query.trim()) return ALL_STICKERS;
  const q = query.trim().toLowerCase();
  return ALL_STICKERS.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.packTitle.toLowerCase().includes(q) ||
    s.emoji.includes(q) ||
    s.tags?.some(t => t.toLowerCase().includes(q))
  );
};

// Find sticker by ID, title or filename
export const findStickerByTitleOrId = (titleOrId?: string): Sticker | undefined => {
  if (!titleOrId) return undefined;
  const clean = titleOrId.trim().toLowerCase();
  return ALL_STICKERS.find(s =>
    s.id.toLowerCase() === clean ||
    s.title.toLowerCase() === clean ||
    clean.startsWith(`sticker_${s.id.toLowerCase()}`) ||
    clean === s.title.toLowerCase()
  );
};

// Local storage management for Recent and Favorite Stickers
const RECENT_KEY = 'tg_recent_stickers_v1';
const FAVORITES_KEY = 'tg_favorite_stickers_v1';

export const getRecentStickers = (): Sticker[] => {
  try {
    const saved = localStorage.getItem(RECENT_KEY);
    if (saved) {
      const ids: string[] = JSON.parse(saved);
      return ids.map(id => ALL_STICKERS.find(s => s.id === id)).filter(Boolean) as Sticker[];
    }
  } catch {
    // fallback
  }
  // Default recent fallback
  return ALL_STICKERS.slice(0, 8);
};

export const addRecentSticker = (sticker: Sticker): void => {
  try {
    const current = getRecentStickers().map(s => s.id);
    const next = [sticker.id, ...current.filter(id => id !== sticker.id)].slice(0, 24);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
};

export const getFavoriteStickers = (): Sticker[] => {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) {
      const ids: string[] = JSON.parse(saved);
      return ids.map(id => ALL_STICKERS.find(s => s.id === id)).filter(Boolean) as Sticker[];
    }
  } catch {
    // fallback
  }
  return [ALL_STICKERS[0], ALL_STICKERS[1], ALL_STICKERS[4], ALL_STICKERS[8]];
};

export const toggleFavoriteSticker = (stickerId: string): boolean => {
  try {
    const current = getFavoriteStickers().map(s => s.id);
    const isFav = current.includes(stickerId);
    let next: string[];
    if (isFav) {
      next = current.filter(id => id !== stickerId);
    } else {
      next = [stickerId, ...current];
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    return !isFav;
  } catch {
    return false;
  }
};

export const isFavoriteSticker = (stickerId: string): boolean => {
  const current = getFavoriteStickers().map(s => s.id);
  return current.includes(stickerId);
};
