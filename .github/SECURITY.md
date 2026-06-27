# Security Policy — WA-AKG

## Versi yang Didukung

| Versi | Status         |
|-------|----------------|
| 1.6.x | ✅ Didukung    |
| < 1.6 | ❌ Tidak didukung |

## Melaporkan Vulnerability

**JANGAN buka public issue untuk vulnerability.**

Laporkan melalui:

1. **GitHub Security Advisory** — Buka tab **Security** > **Report a vulnerability** di repo ini (direkomendasikan)
2. **Email** — Kirim detail ke email yang tertera di profil GitHub maintainer

## Response Timeline

| Tahap           | Target     |
|-----------------|------------|
| Acknowledgment  | < 48 jam   |
| Investigation   | < 3 hari   |
| Patch released  | < 7 hari   |
| Disclosure      | Setelah patch dirilis & pengguna update |

## Scope

- Vulnerability di kode WA-AKG (Next.js, Baileys integration, API)
- Dependency dengan CVE kritis
- Credential leak atau exposure

## Out of Scope

- Vulnerability di dependency upstream (tetap boleh dilaporkan, prioritas rendah)
- Social engineering / phishing
- DOS karena konfigurasi user sendiri
