# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions of **Secure Comms**:

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

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

1. **Environment Secrets**: Never commit real `.env` or API keys (`SUPABASE_SERVICE_ROLE_KEY`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) to source control.
2. **HTTPS & WSS**: Always run client and Socket.io endpoints behind secure TLS/SSL termination (`https://` and `wss://`).
3. **Database RLS Policies**: Keep Row Level Security (RLS) enabled on all PostgreSQL / Supabase tables (`002_rls_policies.sql`).
4. **Token Expiration**: Rotate JWT secrets periodically and enforce short TTLs for access tokens.
