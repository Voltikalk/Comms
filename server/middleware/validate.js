/**
 * Input validation helpers shared by HTTP routes and socket handlers.
 */
import validator from 'validator';

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
export const CLIENT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const MAX_MESSAGE_LENGTH = 10000;

export function validateRegistration({ email, username, password }) {
  if (!email || !username || !password) return 'Заполните все обязательные поля.';
  const cleanEmail = String(email).toLowerCase().trim();
  const cleanUsername = String(username).toLowerCase().trim();
  if (!validator.isEmail(cleanEmail)) return 'Некорректный формат email.';
  if (!USERNAME_RE.test(cleanUsername)) return 'Имя пользователя: 3–32 символа (a-z, 0-9, _).';
  if (String(password).length < 8) return 'Пароль должен содержать минимум 8 символов.';
  return null;
}

export const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

export const optionalString = (v, max) => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : undefined);

/** Express middleware: rejects non-object JSON bodies. */
export function requireJsonBody(req, res, next) {
  if (req.body !== undefined && !isPlainObject(req.body)) {
    return res.status(400).json({ error: 'Некорректное тело запроса.' });
  }
  next();
}
