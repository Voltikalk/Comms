import type { UserId, Room } from './types';

export const USER_NAMES: Record<UserId, string> = {
  vlad: 'Влад',
  anya: 'Аня',
  mom: 'Мама',
  dad: 'Папа',
  sister: 'Сестра'
};

export const KEY_TO_USER: Record<string, UserId> = {
  'vladpass': 'vlad',
  'anyapass': 'anya',
  'mompass': 'mom',
  'dadpass': 'dad',
  'sispass': 'sister'
};

export const ALL_ROOMS: Room[] = [
  { id: 'family', name: 'Семья', type: 'group', participants: ['vlad', 'mom', 'dad', 'sister'] },
  { id: 'girlfriend', name: 'Аня', type: 'direct', participants: ['vlad', 'anya'] },
  { id: 'mom-dm', name: 'Мама', type: 'direct', participants: ['vlad', 'mom'] },
  { id: 'dad-dm', name: 'Папа', type: 'direct', participants: ['vlad', 'dad'] },
  { id: 'sister-dm', name: 'Сестра', type: 'direct', participants: ['vlad', 'sister'] },
  { id: 'mom-dad-dm', name: 'Папа', type: 'direct', participants: ['mom', 'dad'] },
  { id: 'mom-sister-dm', name: 'Сестра', type: 'direct', participants: ['mom', 'sister'] },
  { id: 'dad-sister-dm', name: 'Сестра', type: 'direct', participants: ['dad', 'sister'] }
];

export const SERVER_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

export const ANIMATED_EMOJIS: Record<string, string> = {
  // Row 1 (Top Reactions)
  '❤️‍🔥': 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f_200d_1f525/512.webp',
  '😭': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.webp',
  '💩': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a9/512.webp',
  '🗿': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f5ff/512.webp',
  '🐳': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f433/512.webp',
  '🥴': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f974/512.webp',
  '🤮': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92e/512.webp',
  '❤️': 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp',

  // Row 2
  '👍': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.webp',
  '👎': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44e/512.webp',
  '🔥': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp',
  '🥰': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f970/512.webp',
  '👏': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.webp',
  '😁': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f601/512.webp',
  '🤔': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/512.webp',
  '🤯': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.webp',

  // Row 3
  '😱': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f631/512.webp',
  '🤬': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92c/512.webp',
  '😔': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f614/512.webp',
  '🎉': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp',
  '🤩': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.webp',
  '🙏': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f64f/512.webp',
  '👌': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44c/512.webp',
  '🕊️': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f54a_fe0f/512.webp',

  // Row 4
  '🤡': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f921/512.webp',
  '🥱': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f971/512.webp',
  '😍': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.webp',
  '🌚': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f31a/512.webp',
  '🌭': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f32d/512.webp',
  '💯': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.webp',
  '😂': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp',
  '⚡': 'https://fonts.gstatic.com/s/e/notoemoji/latest/26a1/512.webp',

  // Row 5
  '🍕': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f355/512.webp',
  '🏆': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.webp',
  '💔': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f494/512.webp',
  '🤨': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f928/512.webp',
  '😐': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f610/512.webp',
  '🍓': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f353/512.webp',
  '🍾': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f37e/512.webp',
  '💋': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48b/512.webp',

  // Row 6
  '🖕': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f595/512.webp',
  '😈': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f608/512.webp',
  '😴': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f634/512.webp',
  '🤓': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f913/512.webp',
  '👻': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f47b/512.webp',
  '💻': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4bb/512.webp',
  '👀': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f440/512.webp',
  '🎃': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f383/512.webp',

  // Row 7
  '🙈': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f648/512.webp',
  '😇': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f607/512.webp',
  '😰': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f630/512.webp',
  '🤝': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f91d/512.webp',
  '✍️': 'https://fonts.gstatic.com/s/e/notoemoji/latest/270d_fe0f/512.webp',
  '🤗': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f917/512.webp',
  '🫡': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1fae1/512.webp',
  '🎁': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f381/512.webp',

  // Row 8
  '💎': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48e/512.webp',
  '☃️': 'https://fonts.gstatic.com/s/e/notoemoji/latest/2603_fe0f/512.webp',
  '🎸': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3b8/512.webp',
  '🤪': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92a/512.webp',
  '😎': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.webp',
  '💖': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f496/512.webp',
  '🙉': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f649/512.webp',
  '🦄': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f984/512.webp',
  '🚀': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp',
  '✨': 'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.webp',
  '👑': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f451/512.webp'
};

export const QUICK_REACTIONS = ['❤️‍🔥', '😭', '💩', '🗿', '🐳', '🥴', '🤮', '❤️'];

