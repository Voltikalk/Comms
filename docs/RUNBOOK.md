# 📖 Operations & Engineering Runbook

This document serves as the operational handbook for running, debugging, testing, and maintaining the **Secure Comms** real-time messenger.

---

## 🛠 1. Development & Local Setup

### Prerequisites
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher
* **Supabase Account / Project**: PostgreSQL database with Auth, Storage, and Realtime enabled.

### Fast Launch Sequence
```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment variables
cp .env.example .env

# 3. Apply schema migrations
npm run migrate:up

# 4. Start backend Socket.io / Express server (Port 3001)
npm run server

# 5. In a separate terminal, start frontend dev server (Port 5173)
npm run dev
```

---

## 🗄 2. Database Migrations Management

Migrations are stored in `supabase/migrations/` and managed via the custom CLI in `scripts/migrate.js`.

| Command | Description |
| ------- | ----------- |
| `npm run migrate:up` | Applies all pending SQL migrations sequentially |
| `npm run migrate:down` | Rolls back the last applied migration batch |
| `npm run migrate:status` | Shows status of all applied and pending migrations |
| `npm run migrate:create <name>` | Scaffolds a new migration SQL template with up/down sections |

---

## 🔍 3. Common Troubleshooting & Diagnostics

### A. Socket.io Connection Issues
* **Symptom**: Chat status shows "Connecting..." or messages are not synchronizing in real time.
* **Checks**:
  1. Verify the backend server is active on `http://localhost:3001`.
  2. Verify CORS settings in `server.js` allow `http://localhost:5173`.
  3. Inspect the browser console for WebSocket connection failures.

### B. Supabase Auth / Storage Failures
* **Symptom**: File uploads fail with 401/403 or auth tokens expire.
* **Checks**:
  1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.
  2. Verify storage bucket `attachments` is created in your Supabase dashboard and public read policy is enabled.
  3. Ensure RLS policies in `002_rls_policies.sql` match your auth roles.

### C. TypeScript Build & Linting Errors
* **Command**: `npm run build`
* **Checks**:
  1. Run `npx tsc --noEmit` to verify type completeness.
  2. Run `npm run lint` (`oxlint`) to catch syntax and lint issues.

---

## 🎨 4. Storybook Component Workshop

We maintain an isolated Storybook design system environment for developing and reviewing components.

```bash
# Start Storybook on port 6006
npm run storybook
```

---

## 🚀 5. Production Deployment Notes

1. **Build Artifacts**:
   ```bash
   npm run build
   ```
   Generates production bundle in `dist/`.
2. **Reverse Proxy (Nginx / Caddy)**:
   * Route `/` to static frontend build `dist/`.
   * Route `/socket.io/` and `/api/` to backend server `http://127.0.0.1:3001` with WebSocket upgrade headers (`Upgrade: websocket`, `Connection: Upgrade`).
3. **Environment Security**:
   * Set `NODE_ENV=production`.
   * Generate high-entropy 64-character JWT secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).
