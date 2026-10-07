/**
 * /api/users — directory search (authenticated; the caller is taken from the token).
 */
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { isUserOnline } from '../services/store.js';
import { searchUsers } from '../services/users.js';

export function createUsersRouter() {
  const router = express.Router();

  router.get('/search', requireAuth, async (req, res) => {
    try {
      const q = String(req.query.q || '').trim().slice(0, 64);
      if (!q) return res.json({ users: [] });
      const users = await searchUsers(q, String(req.auth.userId).toLowerCase(), isUserOnline);
      return res.json({ users });
    } catch (err) {
      console.error('[User Search Error]', err);
      return res.status(500).json({ error: 'Ошибка поиска пользователей' });
    }
  });

  return router;
}
