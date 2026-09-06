# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions of **Secure Comms**:

| Version | Supported          |
| ------- | ------------------ |
| 3.x.x   | :white_check_mark: |
| 2.x.x   | :x:                |
| 1.x.x   | :x:                |

---

## Security Architecture & Defenses

Secure Comms implements a defense-in-depth architecture adhering to cybersecurity standards (OWASP Top 10, ASVS, RFC 6455 / CSWSH mitigations, and JWT best practices):

### 1. Frontend Security & XSS Neutralization
* **HTML Sanitization Suite (`src/lib/sanitize.ts`)**: All user-controlled text rendered via rich elements (e.g. search query highlights, admin headlines, archive data) passes through strict HTML entity encoding. Only safe `<mark class="...">` tags are preserved.
* **URL Protocol Validation**: Links and media URLs are strictly verified to only allow `http:`, `https:`, and `data:` schemes, blocking `javascript:` and malicious pseudo-protocols.
* **Component Hardening**: Direct assignments to `dangerouslySetInnerHTML` in `SearchResultCard.tsx` and `AdminArchive.tsx` are sanitized before rendering.

### 2. WebSocket & Real-Time Security
* **Cross-Site WebSocket Hijacking (CSWSH) Prevention**: Every incoming WebSocket connection validates the HTTP `Origin` header against explicit server-configured whitelists (`CLIENT_ORIGIN`, `PRODUCTION_ORIGIN`, `ALLOWED_ORIGINS`). Cross-origin browser connection attempts from unauthorized domains are rejected.
* **Handshake JWT Authentication (`io.use`)**: Socket handshakes require a valid Bearer token in `auth.token` or the `Authorization` header. Expired, invalid, or revoked tokens are rejected with authentication errors before the connection is established.
* **Per-Socket Sliding Window Rate Limiting**: Real-time events (`send_message`, `edit_message`, `delete_message`, `toggle_reaction`, `send_story`, `typing`) are constrained by sliding-window rate limiters to prevent flooding, spamming, and denial of service.
* **Payload Size Constraints**: Text messages are capped at 10,000 characters and story captions at 1,000 characters to prevent buffer exhaustion.

### 3. Authentication & JWT Hardening
* **Cryptographic Secrets & Algorithms**: Access and refresh tokens enforce explicit `HS256` verification. Hardcoded fallback secrets are completely removed. If environment secrets are missing in non-production, high-entropy random keys are generated dynamically.
* **Token Rotation & Revocation**: `POST /api/auth/refresh` rotates tokens and revokes previous tokens. `POST /api/auth/logout` invalidates tokens server-side using an in-memory TTL-based revocation blocklist with periodic cleanup.
* **Password Hashing**: Passwords are saved and verified strictly using `bcrypt` with 12 salt rounds.

### 4. HTTP & Reverse Proxy Hardening
* **Nginx Reverse Proxy**:
  * `server_tokens off;` suppresses server version disclosure.
  * `Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;` enforces HTTPS.
  * `X-Content-Type-Options: nosniff` protects uploaded media and assets against MIME-sniffing.
* **Express & Helmet**:
  * `app.disable('x-powered-by')` prevents Express fingerprinting.
  * Helmet applies strict Content-Security-Policy (CSP), Referrer-Policy, and Permissions-Policy.
  * Express rate limiters protect authentication (`/api/auth/*`), uploads, and general API endpoints.

---

## Reporting a Vulnerability

The Secure Comms team takes all security vulnerabilities seriously. We appreciate your efforts to responsibly disclose any findings.

### How to Report

1. **Do NOT report vulnerabilities through public GitHub issues, discussions, or pull requests.**
2. Please report security concerns directly via email to: **security@voltikalk.com** (or open a private security advisory on GitHub if enabled).
3. Include as much detail as possible in your report:
   * **Description**: Detailed description of the vulnerability and its potential impact.
   * **Reproduction Steps**: Step-by-step instructions or Proof of Concept (PoC) scripts.
   * **Affected Components**: Specific files, API endpoints, WebSocket events, or client components.
   * **Suggested Mitigation**: If known, any proposed fixes or workarounds.

### Response Timeline

* **Initial Response**: Within 48 hours acknowledging receipt of your report.
* **Assessment & Status Updates**: Within 5 business days with vulnerability confirmation and triage status.
* **Fix & Release**: Security patches are prioritized and released promptly with appropriate version tagging.

---

## Security Best Practices for Self-Hosting

When deploying Secure Comms to production, please ensure:

1. **Environment Secrets**: Generate 64-character random secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Never commit `.env` files to git.
2. **HTTPS & WSS**: Always run behind TLS/SSL termination with Let's Encrypt certificates (`https://` and `wss://`).
3. **Database RLS Policies**: Ensure Row Level Security (RLS) remains enabled on all Supabase tables.
4. **CORS & WebSocket Origins**: Configure `CLIENT_ORIGIN` and `PRODUCTION_ORIGIN` to match your production domain.
