/**
 * Emoji set for the composer picker, grouped like Telegram's panel
 * (Unicode categories, Emoji ≤ 14 so every current OS renders them), plus
 * Russian / English search keywords and a persisted "recent" row.
 */

export type EmojiCategoryId = 'people' | 'nature' | 'food' | 'activity' | 'travel' | 'objects' | 'symbols' | 'flags';

export interface EmojiCategory {
  id: EmojiCategoryId;
  title: string;
  /** Extra words that match the whole category in search ("флаг", "еда"…). */
  keywords: string;
  emojis: string[];
}

const list = (s: string) => s.trim().split(/\s+/);

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'people',
    title: 'Смайлики и люди',
    keywords: 'смайлы смайлик лицо эмоции люди жесты сердце smileys people',
    emojis: list(`
      😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 🫠 😉 😊 😇 🥰 😍 🤩 😘 😗 ☺️ 😚 😙 🥲 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🫢 🫣 🤫 🤔 🫡
      🤐 🤨 😐 😑 😶 🫥 😶‍🌫️ 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 😵‍💫 🤯 🤠 🥳 🥸 😎
      🤓 🧐 😕 🫤 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 🥹 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀
      ☠️ 💩 🤡 👹 👺 👻 👽 👾 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾 🙈 🙉 🙊 💋 💌 💘 💝 💖 💗 💓 💞 💕 💟 ❣️ 💔 ❤️‍🔥 ❤️‍🩹
      ❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 💯 💢 💥 💫 💦 💨 🕳️ 💬 🗨️ 🗯️ 💭 💤 👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️
      🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻
      👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦 👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 🕵️
      💂 🥷 👷 🫅 🤴 👸 👳 👲 🧕 🤵 👰 🤰 🫃 🤱 👼 🎅 🤶 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 🧌 💆 💇 🚶 🧍 🧎 🏃 💃 🕺
      🕴️ 👯 🧖 🧗 🤺 🏇 ⛷️ 🏂 🏌️ 🏄 🚣 🏊 ⛹️ 🏋️ 🚴 🚵 🤸 🤼 🤽 🤾 🤹 🧘 🛀 🛌 👭 👫 👬 💏 💑 👪 🗣️ 👤 👥 🫂 👣
    `),
  },
  {
    id: 'nature',
    title: 'Животные и природа',
    keywords: 'животные звери природа растения цветы погода animals nature',
    emojis: list(`
      🐵 🐒 🦍 🦧 🐶 🐕 🦮 🐕‍🦺 🐩 🐺 🦊 🦝 🐱 🐈 🐈‍⬛ 🦁 🐯 🐅 🐆 🐴 🐎 🦄 🦓 🦌 🦬 🐮 🐂 🐃 🐄 🐷 🐖 🐗 🐽 🐏 🐑
      🐐 🐪 🐫 🦙 🦒 🐘 🦣 🦏 🦛 🐭 🐁 🐀 🐹 🐰 🐇 🐿️ 🦫 🦔 🦇 🐻 🐻‍❄️ 🐨 🐼 🦥 🦦 🦨 🦘 🦡 🐾 🦃 🐔 🐓 🐣 🐤 🐥
      🐦 🐧 🕊️ 🦅 🦆 🦢 🦉 🦤 🪶 🦩 🦚 🦜 🐸 🐊 🐢 🦎 🐍 🐲 🐉 🦕 🦖 🐳 🐋 🐬 🦭 🐟 🐠 🐡 🦈 🐙 🐚 🪸 🦀 🦞 🦐 🦑
      🐌 🦋 🐛 🐜 🐝 🪲 🐞 🦗 🪳 🕷️ 🕸️ 🦂 🦟 🪰 🪱 🦠 💐 🌸 💮 🪷 🏵️ 🌹 🥀 🌺 🌻 🌼 🌷 🌱 🪴 🌲 🌳 🌴 🌵 🌾 🌿
      ☘️ 🍀 🍁 🍂 🍃 🪹 🪺 🍄 🌰 🌍 🌎 🌏 🌑 🌒 🌓 🌔 🌕 🌖 🌗 🌘 🌙 🌚 🌛 🌜 ☀️ 🌝 🌞 ⭐ 🌟 🌠 ☁️ ⛅ ⛈️ 🌤️ 🌥️
      🌦️ 🌧️ 🌨️ 🌩️ 🌪️ 🌫️ 🌬️ 🌀 🌈 ☂️ ☔ ⚡ ❄️ ☃️ ⛄ ☄️ 🔥 💧 🌊
    `),
  },
  {
    id: 'food',
    title: 'Еда и напитки',
    keywords: 'еда напитки фрукты овощи food drink',
    emojis: list(`
      🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🫘 🥐 🥯 🍞
      🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🫕 🥫 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤
      🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🍯 🥛 🍼 🫖 ☕ 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷
      🫗 🥃 🍸 🍹 🧉 🍾 🧊 🥄 🍴 🍽️ 🥣 🥡 🥢 🧂
    `),
  },
  {
    id: 'activity',
    title: 'Активность',
    keywords: 'спорт игры праздник музыка activity sport games',
    emojis: list(`
      ⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 🎯 🎮 🕹️
      🎰 🎲 🧩 🧸 🪅 🪩 🪆 ♠️ ♥️ ♦️ ♣️ ♟️ 🃏 🀄 🎴 🎭 🖼️ 🎨 🧵 🪡 🧶 🪢 🎃 🎄 🎆 🎇 🧨 ✨ 🎈 🎉 🎊 🎋 🎍 🎎 🎏 🎐
      🎑 🧧 🎀 🎁 🎗️ 🎟️ 🎫 🎖️ 🏆 🏅 🥇 🥈 🥉 🎤 🎧 🎼 🎵 🎶 🎷 🪗 🎸 🎹 🎺 🎻 🪕 🥁 🪘 🎬
    `),
  },
  {
    id: 'travel',
    title: 'Путешествия и места',
    keywords: 'путешествия транспорт машина город места travel places',
    emojis: list(`
      🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🦯 🦽 🦼 🛴 🚲 🛵 🏍️ 🛺 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅
      🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ 🛟 🪝 ⛽ 🚧 🚦 🚥 🚏 🗺️ 🗿 🗽 🗼 🏰 🏯
      🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ ⛺ 🛖 🏠 🏡 🏘️ 🏚️ 🏗️ 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛️ ⛪ 🕌
      🕍 🛕 🕋 ⛩️ 🛤️ 🛣️ 🗾 🏞️ 🌅 🌄 🌇 🌆 🏙️ 🌃 🌌 🌉 🌁
    `),
  },
  {
    id: 'objects',
    title: 'Предметы',
    keywords: 'предметы вещи техника objects',
    emojis: list(`
      ⌚ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🗜️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛
      ⏳ 📡 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🪜 🧰 🪛 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🪤 🧱 ⛓️ 🧲
      🔫 💣 🪓 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬 💈 ⚗️ 🔭 🔬 🩹 🩺 🩻 🩼 💊 💉 🩸 🧬 🧫 🧪 🌡️ 🧹 🪠 🧺 🧻 🚽
      🚰 🚿 🛁 🧼 🪥 🪒 🧽 🪣 🧴 🛎️ 🔑 🗝️ 🚪 🪑 🛋️ 🛏️ 🪞 🪟 🛍️ 🛒 ✉️ 📩 📨 📧 📥 📤 📦 🏷️ 🪧 📪 📫 📬 📭 📮 📯 📜
      📃 📄 📑 🧾 📊 📈 📉 🗒️ 🗓️ 📆 📅 🗑️ 📇 🗃️ 🗳️ 🗄️ 📋 📁 📂 🗂️ 🗞️ 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇️
      📐 📏 🧮 📌 📍 ✂️ 🖊️ 🖋️ ✒️ 🖌️ 🖍️ 📝 ✏️ 🔍 🔎 🔏 🔐 🔒 🔓
    `),
  },
  {
    id: 'symbols',
    title: 'Символы',
    keywords: 'символы знаки стрелки цифры symbols signs arrows',
    emojis: list(`
      🏧 🚮 ♿ 🚹 🚺 🚻 🚼 🚾 🛂 🛃 🛄 🛅 ⚠️ 🚸 ⛔ 🚫 🚳 🚭 🚯 🚱 🚷 📵 🔞 ☢️ ☣️ ⬆️ ↗️ ➡️ ↘️ ⬇️ ↙️ ⬅️ ↖️ ↕️ ↔️ ↩️
      ↪️ ⤴️ ⤵️ 🔃 🔄 🔙 🔚 🔛 🔜 🔝 🛐 ⚛️ 🕉️ ✡️ ☸️ ☯️ ✝️ ☦️ ☪️ ☮️ 🕎 🔯 ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ⛎ 🔀
      🔁 🔂 ▶️ ⏩ ⏭️ ⏯️ ◀️ ⏪ ⏮️ 🔼 ⏫ 🔽 ⏬ ⏸️ ⏹️ ⏺️ ⏏️ 🎦 🔅 🔆 📶 📳 📴 ♀️ ♂️ ⚧️ ✖️ ➕ ➖ ➗ 🟰 ♾️ ‼️ ⁉️ ❓ ❔
      ❕ ❗ 〰️ 💱 💲 ⚕️ ♻️ ⚜️ 🔱 📛 🔰 ⭕ ✅ ☑️ ✔️ ❌ ❎ ➰ ➿ 〽️ ✳️ ✴️ ❇️ ©️ ®️ ™️ #️⃣ *️⃣ 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣
      8️⃣ 9️⃣ 🔟 🔠 🔡 🔢 🔣 🔤 🅰️ 🆎 🅱️ 🆑 🆒 🆓 ℹ️ 🆔 Ⓜ️ 🆕 🆖 🅾️ 🆗 🅿️ 🆘 🆙 🆚 🈁 🈂️ 🈷️ 🈶 🈯 🉐 🈹 🈚 🈲 🉑 🈸
      🈴 🈳 ㊗️ ㊙️ 🈺 🈵 🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚫ ⚪ 🟥 🟧 🟨 🟩 🟦 🟪 🟫 ⬛ ⬜ ◼️ ◻️ ◾ ◽ ▪️ ▫️ 🔶 🔷 🔸 🔹 🔺 🔻
      💠 🔘 🔳 🔲
    `),
  },
  {
    id: 'flags',
    title: 'Флаги',
    keywords: 'флаг флаги страны flags',
    emojis: list(`
      🏁 🚩 🎌 🏴 🏳️ 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇷🇺 🇺🇦 🇧🇾 🇰🇿 🇺🇿 🇰🇬 🇹🇯 🇹🇲 🇦🇿 🇦🇲 🇬🇪 🇲🇩 🇺🇸 🇬🇧 🇩🇪 🇫🇷 🇮🇹 🇪🇸 🇵🇹 🇳🇱 🇧🇪 🇨🇭
      🇦🇹 🇵🇱 🇨🇿 🇸🇰 🇭🇺 🇷🇴 🇧🇬 🇷🇸 🇭🇷 🇸🇮 🇬🇷 🇹🇷 🇨🇾 🇮🇱 🇸🇪 🇳🇴 🇩🇰 🇫🇮 🇪🇪 🇱🇻 🇱🇹 🇮🇪 🇮🇸 🇨🇦 🇲🇽 🇧🇷 🇦🇷 🇨🇱 🇨🇴 🇵🇪
      🇨🇺 🇯🇵 🇰🇷 🇨🇳 🇮🇳 🇮🇩 🇹🇭 🇻🇳 🇵🇭 🇲🇾 🇸🇬 🇦🇪 🇸🇦 🇶🇦 🇪🇬 🇲🇦 🇿🇦 🇳🇬 🇰🇪 🇦🇺 🇳🇿 🇪🇺 🇺🇳
    `),
  },
];

/** Search words for the most used emoji (Russian first, then English). */
const KEYWORDS: Record<string, string> = {
  '😀': 'улыбка радость smile grin', '😃': 'улыбка радость smile', '😄': 'улыбка смех smile', '😁': 'улыбка зубы grin',
  '😆': 'смех хаха laugh', '😅': 'смех пот неловко sweat', '🤣': 'ржу смех катаюсь rofl', '😂': 'смех слезы ржака хаха lol joy',
  '🙂': 'улыбка slight smile', '🙃': 'перевернутый ирония upside', '🫠': 'тает плавлюсь melt', '😉': 'подмигивает wink',
  '😊': 'улыбка милый blush', '😇': 'ангел невинный angel', '🥰': 'любовь влюблен сердечки love', '😍': 'любовь влюблен глаза сердца love heart eyes',
  '🤩': 'звезды восторг вау star', '😘': 'поцелуй kiss', '😋': 'вкусно yum', '😛': 'язык tongue', '😜': 'язык подмигивает дурачусь',
  '🤪': 'безумный crazy zany', '🤑': 'деньги money', '🤗': 'обнимаю обнимашки hug', '🤭': 'упс хихи oops', '🫣': 'подглядываю peek',
  '🤫': 'тихо тсс shh', '🤔': 'думаю хм think', '🫡': 'честь салют salute', '🤐': 'молчу zip', '🤨': 'сомнение бровь raised',
  '😐': 'нейтрально neutral', '😑': 'без эмоций expressionless', '😶': 'нет слов silent', '😏': 'ухмылка smirk', '😒': 'недоволен unamused',
  '🙄': 'закатываю глаза roll eyes', '😬': 'неловко grimace', '😌': 'облегчение relieved', '😔': 'грусть pensive', '😪': 'сонный sleepy',
  '🤤': 'слюни drool', '😴': 'сплю сон sleep', '😷': 'маска болею mask', '🤒': 'болею температура sick', '🤢': 'тошнит nausea',
  '🤮': 'рвота тошнит vomit', '🥵': 'жарко hot', '🥶': 'холодно cold', '🥴': 'пьяный woozy', '🤯': 'взрыв мозга шок mind blown',
  '🤠': 'ковбой cowboy', '🥳': 'праздник вечеринка party', '😎': 'круто очки cool', '🤓': 'ботан nerd', '🧐': 'монокль изучаю monocle',
  '😕': 'растерян confused', '😟': 'беспокойство worried', '🙁': 'грусть frown', '😮': 'удивление wow', '😲': 'шок astonished',
  '😳': 'смущение flushed', '🥺': 'пожалуйста умоляю please pleading', '🥹': 'растроган слезы', '😨': 'страх fear', '😰': 'тревога anxious',
  '😢': 'плачу грусть cry', '😭': 'рыдаю плачу sob cry', '😱': 'крик ужас scream', '😩': 'устал weary', '😫': 'устал tired',
  '🥱': 'зеваю скучно yawn', '😤': 'злюсь пар triumph', '😡': 'злой гнев angry', '😠': 'злой angry', '🤬': 'мат ругаюсь swear',
  '😈': 'дьявол чертик devil', '💀': 'череп умер skull dead', '💩': 'какашка poop', '🤡': 'клоун clown', '👻': 'привидение ghost',
  '👽': 'инопланетянин alien', '🤖': 'робот robot', '😺': 'кот cat', '😹': 'кот смех', '😻': 'кот любовь', '🙈': 'обезьяна не вижу monkey',
  '🙉': 'не слышу', '🙊': 'не говорю', '💋': 'поцелуй губы kiss', '💘': 'сердце стрела', '💖': 'сердце блеск', '💔': 'разбитое сердце broken heart',
  '❤️‍🔥': 'сердце огонь страсть', '❤️': 'сердце любовь heart love red', '🧡': 'сердце оранжевое', '💛': 'сердце желтое', '💚': 'сердце зеленое',
  '💙': 'сердце синее', '💜': 'сердце фиолетовое', '🖤': 'сердце черное', '🤍': 'сердце белое', '💯': 'сто сотка 100 hundred',
  '💥': 'бум взрыв boom', '💫': 'звезды головокружение dizzy', '💦': 'капли брызги', '💨': 'быстро ветер dash', '💬': 'сообщение чат speech',
  '💤': 'сон zzz', '👋': 'привет пока машу wave hi', '✋': 'стоп рука hand', '👌': 'ок окей ok', '🤌': 'итальянец пальцы',
  '✌️': 'мир победа peace victory', '🤞': 'удачи скрестил пальцы luck', '🤟': 'люблю тебя', '🤘': 'рок rock', '🤙': 'позвони call',
  '👈': 'влево left', '👉': 'вправо right', '👆': 'вверх up', '👇': 'вниз down', '🖕': 'фак', '☝️': 'внимание один',
  '👍': 'лайк класс палец вверх like thumbs up', '👎': 'дизлайк плохо dislike thumbs down', '✊': 'кулак fist', '👊': 'удар кулак punch',
  '👏': 'аплодисменты хлопаю браво clap', '🙌': 'ура руки hooray', '🫶': 'сердце руками love hands', '🤝': 'рукопожатие сделка handshake',
  '🙏': 'спасибо пожалуйста молюсь pray thanks', '💅': 'маникюр nails', '💪': 'сила бицепс strong', '🧠': 'мозг brain', '👀': 'глаза смотрю eyes look',
  '👅': 'язык tongue', '👶': 'ребенок малыш baby', '🤦': 'фейспалм facepalm', '🤷': 'не знаю пожимаю shrug', '🎅': 'дед мороз санта santa',
  '🏃': 'бегу run', '💃': 'танец dance', '🕺': 'танец dance', '🫂': 'обнимаю обнимашки hug',
  '🐶': 'собака пес dog', '🐱': 'кот кошка cat', '🦊': 'лиса fox', '🐻': 'медведь bear', '🐼': 'панда panda', '🐸': 'лягушка frog',
  '🐵': 'обезьяна monkey', '🐷': 'свинья pig', '🐰': 'заяц кролик rabbit', '🦄': 'единорог unicorn', '🐳': 'кит whale', '🐬': 'дельфин dolphin',
  '🦋': 'бабочка butterfly', '🐍': 'змея snake', '🐢': 'черепаха turtle', '🐝': 'пчела bee', '🌹': 'роза цветок rose', '🌸': 'сакура цветок',
  '🌻': 'подсолнух sunflower', '🌷': 'тюльпан tulip', '🍀': 'клевер удача clover', '🌈': 'радуга rainbow', '☀️': 'солнце sun', '🌙': 'луна ночь moon',
  '⭐': 'звезда star', '🌟': 'звезда сияет', '⚡': 'молния lightning', '❄️': 'снег снежинка snow', '🔥': 'огонь пламя жара огонек fire lit',
  '💧': 'капля drop', '🌊': 'волна море wave',
  '🍎': 'яблоко apple', '🍌': 'банан banana', '🍓': 'клубника strawberry', '🍉': 'арбуз watermelon', '🍑': 'персик peach', '🍆': 'баклажан',
  '🥑': 'авокадо avocado', '🍕': 'пицца pizza', '🍔': 'бургер burger', '🍟': 'картошка фри fries', '🍣': 'суши sushi', '🍜': 'лапша рамен',
  '🎂': 'торт день рождения cake birthday', '🍰': 'торт пирожное', '🍩': 'пончик donut', '🍫': 'шоколад chocolate', '🍿': 'попкорн popcorn',
  '☕': 'кофе чай coffee', '🍵': 'чай tea', '🍺': 'пиво beer', '🍻': 'пиво тост cheers', '🥂': 'бокалы тост шампанское cheers', '🍷': 'вино wine',
  '🍾': 'шампанское праздник champagne',
  '⚽': 'футбол мяч football soccer', '🏀': 'баскетбол basketball', '🎮': 'игра геймпад game', '🎲': 'кубик игра dice', '🎯': 'цель мишень target',
  '🏆': 'кубок победа trophy', '🥇': 'золото первый gold', '🎉': 'праздник хлопушка поздравляю party tada', '🎊': 'конфетти праздник',
  '🎈': 'шарик праздник balloon', '🎁': 'подарок gift', '🎄': 'елка новый год christmas', '🎃': 'тыква хэллоуин', '✨': 'блеск искры sparkles',
  '🎵': 'музыка нота music', '🎶': 'музыка ноты music', '🎤': 'микрофон петь mic', '🎧': 'наушники музыка headphones', '🎬': 'кино фильм movie',
  '🚗': 'машина авто car', '🚀': 'ракета взлет rocket', '✈️': 'самолет полет plane', '🏠': 'дом home house', '🗿': 'моаи камень moai',
  '🌃': 'ночь город', '🏖️': 'пляж море beach',
  '📱': 'телефон phone', '💻': 'ноутбук компьютер laptop', '📷': 'фото камера camera', '💡': 'идея лампочка idea', '💰': 'деньги мешок money',
  '💸': 'деньги трата money', '💎': 'алмаз бриллиант diamond', '🔑': 'ключ key', '🔒': 'замок закрыто lock', '📌': 'закрепить pin',
  '📎': 'скрепка clip', '✏️': 'карандаш pencil', '📝': 'заметка memo', '📚': 'книги учеба books', '💊': 'таблетка pill', '🔮': 'шар магия',
  '✅': 'готово галочка да done check', '❌': 'нет крест отмена no cross', '❗': 'внимание восклицание', '❓': 'вопрос question',
  '⚠️': 'внимание осторожно warning', '🚫': 'запрещено нельзя', '🆗': 'ок ok', '🆘': 'помощь sos', '🔴': 'красный круг', '🟢': 'зеленый круг',
  '♻️': 'переработка recycle', '🏁': 'финиш флаг finish', '🇷🇺': 'россия russia', '🇺🇦': 'украина ukraine', '🇧🇾': 'беларусь belarus',
  '🇰🇿': 'казахстан kazakhstan', '🇺🇸': 'сша америка usa', '🇬🇧': 'великобритания англия uk', '🇩🇪': 'германия germany',
  '🇫🇷': 'франция france', '🇯🇵': 'япония japan', '🇨🇳': 'китай china',
};

export const ALL_EMOJIS: string[] = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

/**
 * Emoji matching the query: keyword prefix / substring matches first, then
 * whole categories whose name matches. Typing an emoji finds it as well.
 */
export function searchEmojis(query: string, limit = 120): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = (s: string) => s.toLowerCase().split(/\s+/);
  // Lower rank = better: exact emoji, primary keyword, any keyword, substring, category.
  const rank = new Map<string, number>();
  const hit = (e: string, r: number) => {
    if (!rank.has(e) || rank.get(e)! > r) rank.set(e, r);
  };

  for (const e of ALL_EMOJIS) if (e === q || e.startsWith(q)) hit(e, 0);
  for (const [e, kw] of Object.entries(KEYWORDS)) {
    const ws = words(kw);
    if (ws[0].startsWith(q)) hit(e, 1);
    else if (ws.some((w) => w.startsWith(q))) hit(e, 2);
    else if (q.length >= 3 && kw.toLowerCase().includes(q)) hit(e, 3);
  }
  if (q.length >= 3) {
    for (const c of EMOJI_CATEGORIES) {
      if (words(`${c.title} ${c.keywords}`).some((w) => w.startsWith(q))) c.emojis.forEach((e) => hit(e, 4));
    }
  }
  return [...rank.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([e]) => e);
}

// --- Recent ----------------------------------------------------------------

const RECENT_KEY = 'comms_recent_emoji_v1';
export const RECENT_EMOJI_MAX = 32;
/** Shown before the user has picked anything (Telegram seeds it the same way). */
export const DEFAULT_RECENT_EMOJIS = list('😂 ❤️ 👍 😭 🔥 🥰 😊 🙏 😁 🤔 😍 👏 🎉 😎 💯 😅');

/** Moves `emoji` to the front, without duplicates, capped at `max`. */
export function pushRecent(recent: readonly string[], emoji: string, max = RECENT_EMOJI_MAX): string[] {
  return [emoji, ...recent.filter((e) => e !== emoji)].slice(0, max);
}

export function loadRecentEmojis(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.every((e) => typeof e === 'string')) return parsed.slice(0, RECENT_EMOJI_MAX);
  } catch {
    // storage unavailable / corrupted
  }
  return DEFAULT_RECENT_EMOJIS;
}

export function rememberRecentEmoji(emoji: string): string[] {
  const next = pushRecent(loadRecentEmojis(), emoji);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

// --- Composer editing ------------------------------------------------------

function graphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

/** Inserts `insert` over the selection [start, end); returns the new text and caret. */
export function insertAtSelection(text: string, start: number, end: number, insert: string) {
  const a = Math.max(0, Math.min(start, text.length));
  const b = Math.max(a, Math.min(end, text.length));
  return { text: text.slice(0, a) + insert + text.slice(b), caret: a + insert.length };
}

/**
 * Backspace for the emoji panel: removes the selection, or the whole grapheme
 * before the caret (so 👨‍👩‍👧 or 🇷🇺 disappear in one press).
 */
export function deleteBackward(text: string, start: number, end: number) {
  const a = Math.max(0, Math.min(start, text.length));
  const b = Math.max(a, Math.min(end, text.length));
  if (a !== b) return { text: text.slice(0, a) + text.slice(b), caret: a };
  if (a === 0) return { text, caret: 0 };
  const before = graphemes(text.slice(0, a));
  const last = before.pop() ?? '';
  const caret = a - last.length;
  return { text: text.slice(0, caret) + text.slice(a), caret };
}
