/**
 * Public user profiles: name, bio, avatar, status emoji, profile color,
 * birthday and phone. The username is the account id and cannot be changed
 * here. Phone and birthday are only shared with contacts (people who share
 * a chat).
 */
import { checkSocketRateLimit } from '../middleware/rateLimit.js';
import { contactsOf } from '../services/store.js';
import { resolveUserUuid, supabase } from '../services/supabase.js';
import { getUser } from '../services/users.js';

const MAX_NAME = 64;
const MAX_BIO = 70;
const MAX_PHONE = 20;
const MAX_EMOJI = 16;
const MAX_REQUESTED = 200;

/** Telegram-like palette ids; the client maps them to actual colors. */
export const PROFILE_COLORS = ['red', 'orange', 'violet', 'green', 'cyan', 'blue', 'pink'];

/**
 * Birthday as `MM-DD` or `YYYY-MM-DD` (year is optional, like in Telegram).
 * Returns the normalised value, `''` to clear, or `null` when invalid.
 */
export function normalizeBirthday(value) {
  const v = value.trim();
  if (!v) return '';
  const m = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  // 2000 is a leap year, so «29 февраля» without a year stays valid.
  const year = m[1] ? Number(m[1]) : 2000;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (m[1] && (year < 1900 || date.getTime() > Date.now())) return null;
  return v;
}

/** Avatars must already be uploaded: empty (remove), a server path or an https URL. */
const isAvatarUrl = (v) => v === '' || (v.length <= 2048 && (/^\/uploads\/[\w.-]+$/.test(v) || /^https:\/\//.test(v)));

/** Profile as seen by `viewer`; `null` for unknown users. */
export function publicProfile(userId, viewer) {
  const doc = getUser(userId);
  if (!doc) return null;
  const id = String(doc.userId || userId).toLowerCase();
  const me = String(viewer || '').toLowerCase();
  const isContact = id === me || contactsOf(me).has(id);
  return {
    userId: id,
    username: doc.username || id,
    firstName: doc.firstName || doc.username || id,
    lastName: doc.lastName || '',
    bio: doc.bio || '',
    avatarUrl: doc.avatarUrl || '',
    statusEmoji: doc.statusEmoji || '',
    profileColor: doc.profileColor || '',
    ...(isContact ? { phoneNumber: doc.phoneNumber || '', birthday: doc.birthday || '' } : {}),
  };
}

/** Self plus every contact, keyed by userId. */
export function profilesStateFor(viewer) {
  const state = {};
  for (const id of [viewer, ...contactsOf(viewer)]) {
    const p = publicProfile(id, viewer);
    if (p) state[p.userId] = p;
  }
  return state;
}

/**
 * Validates a partial profile update. Returns `{ error }` or `{ changes }`
 * with only the recognised, normalised fields.
 */
export function validateProfileUpdate(payload) {
  const changes = {};
  const str = (key) => (typeof payload[key] === 'string' ? payload[key] : undefined);

  const firstName = str('firstName');
  if (firstName !== undefined) {
    const v = firstName.trim();
    if (!v) return { error: 'Имя не может быть пустым.' };
    if (v.length > MAX_NAME) return { error: 'Имя слишком длинное.' };
    changes.firstName = v;
  }
  const lastName = str('lastName');
  if (lastName !== undefined) {
    const v = lastName.trim();
    if (v.length > MAX_NAME) return { error: 'Фамилия слишком длинная.' };
    changes.lastName = v;
  }
  const bio = str('bio');
  if (bio !== undefined) {
    const v = bio.replace(/\s*\n\s*/g, ' ').trim();
    if ([...v].length > MAX_BIO) return { error: `«О себе» — не больше ${MAX_BIO} символов.` };
    changes.bio = v;
  }
  const phone = str('phoneNumber');
  if (phone !== undefined) {
    const v = phone.trim();
    if (v.length > MAX_PHONE || !/^[+\d\s()-]*$/.test(v)) return { error: 'Неверный номер телефона.' };
    changes.phoneNumber = v;
  }
  const emoji = str('statusEmoji');
  if (emoji !== undefined) {
    const v = emoji.trim();
    if (v.length > MAX_EMOJI || /[\w<>]/.test(v)) return { error: 'Неверный эмодзи-статус.' };
    changes.statusEmoji = v;
  }
  const avatar = str('avatarUrl');
  if (avatar !== undefined) {
    if (!isAvatarUrl(avatar)) return { error: 'Фото профиля должно быть загружено на сервер.' };
    changes.avatarUrl = avatar;
  }
  const color = str('profileColor');
  if (color !== undefined) {
    if (color !== '' && !PROFILE_COLORS.includes(color)) return { error: 'Неверный цвет профиля.' };
    changes.profileColor = color;
  }
  const birthday = str('birthday');
  if (birthday !== undefined) {
    const v = normalizeBirthday(birthday);
    if (v === null) return { error: 'Неверная дата рождения.' };
    changes.birthday = v;
  }
  if (Object.keys(changes).length === 0) return { error: 'Нет изменений.' };
  return { changes };
}

export function registerProfileHandlers({ io, socket, user, on }) {
  /** Profiles of specific users (e.g. members of a newly joined group). */
  on('get_profiles', ({ userIds }, ack) => {
    if (!ack) return;
    if (!checkSocketRateLimit(socket.id, 'get_profiles', 30, 10000)) return ack({ profiles: {} });
    const ids = Array.isArray(userIds) ? userIds.filter((id) => typeof id === 'string' && id.length <= 64).slice(0, MAX_REQUESTED) : [];
    const profiles = {};
    for (const id of ids) {
      const p = publicProfile(id, user);
      if (p) profiles[p.userId] = p;
    }
    ack({ profiles });
  });

  on('update_profile', async (payload, ack) => {
    if (!checkSocketRateLimit(socket.id, 'update_profile', 10, 60000)) {
      return ack?.({ ok: false, error: 'Слишком часто. Попробуйте через минуту.' });
    }
    const doc = getUser(user);
    if (!doc) return ack?.({ ok: false, error: 'Пользователь не найден.' });

    const { error, changes } = validateProfileUpdate(payload);
    if (error) return ack?.({ ok: false, error });

    Object.assign(doc, changes, { updatedAt: new Date() });

    // Everyone who can see this profile gets the new version; contacts also see the phone.
    const self = publicProfile(user, user);
    io.to(user).emit('profile_updated', self);
    for (const contact of contactsOf(user)) io.to(contact).emit('profile_updated', publicProfile(user, contact));

    ack?.({ ok: true, profile: self });

    const row = {};
    if ('firstName' in changes || 'lastName' in changes) row.display_name = `${doc.firstName || ''} ${doc.lastName || ''}`.trim();
    if ('bio' in changes) row.bio = doc.bio;
    if ('avatarUrl' in changes) row.avatar_url = doc.avatarUrl;
    if (Object.keys(row).length === 0) return;
    try {
      const uuid = await resolveUserUuid(user);
      if (uuid) await supabase.from('users').update(row).eq('id', uuid);
    } catch (err) {
      console.warn('[Supabase Profile Update Warning]', err.message);
    }
  });
}
