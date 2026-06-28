# 🔐 Environment Variables Guide

This document provides a comprehensive reference for all configuration options in **WA-AKG**.

> [!WARNING]
> Never commit your `.env` file to version control (Git). It contains sensitive credentials that could compromise your system.

---

## 🗄️ Database Configuration

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Yes | Connection string for MySQL or PostgreSQL. |

**Format:**
- **MySQL**: `mysql://user:pass@host:3306/db`
- **PostgreSQL**: `postgresql://user:pass@host:5432/db?schema=public`

---

## 🔐 Authentication & Security

### `AUTH_SECRET` (WAJIB)
Used for NextAuth.js session encryption. **Tidak memiliki fallback** — server akan gagal startup jika tidak diset.
> [!IMPORTANT]
> Generate dengan: `openssl rand -base64 32`

### `NEXTAUTH_URL`
The base URL where your application is hosted. Essential for callback redirects.
- **Dev**: `http://localhost:3000`
- **Prod**: `https://your-domain.com`

---

## 🚀 Application Settings

| Variable | Default | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | App environment (`development` | `production`). |
| `PORT` | `3000` | Port for the web server. |
| `TZ` | `UTC` | Default timezone for scheduling (e.g., `Asia/Jakarta`). |
| `LOCALE` | `en-US` | Locale for date/time formatting. |

---

## 🔌 WhatsApp Core (Baileys)

### `BAILEYS_LOG_LEVEL`
Controls the verbosity of the WhatsApp engine logs.
- **Recommended**: `error` (Prod), `debug` (Dev).
- **Values**: `trace`, `debug`, `info`, `warn`, `error`, `fatal`.

---

## 📚 Documentation & Swagger

| Variable | Default | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SWAGGER_ENABLED` | `true` | Enable/disable the `/docs` page. |
| `NEXT_PUBLIC_SWAGGER_USERNAME` | `admin` | Username for Swagger UI auth. |
| `NEXT_PUBLIC_SWAGGER_PASSWORD` | `admin123` | Password for Swagger UI auth. |

> [!CAUTION]
> Always change the default Swagger credentials or disable it entirely in production environments.

---

## 🔧 Feature Flags & Integrations

- **`REMOVE_BG_API_KEY`**: API key from [remove.bg](https://remove.bg) for automatic sticker background removal.
- **`ENABLE_NOTIFICATIONS`**: Set to `false` to silence system-wide UI alerts.
- **`ENABLE_AUTO_UPDATE_CHECK`**: Periodically checks for new version releases.

---

## 🐳 Docker Compose Variables

Variable-variable berikut khusus diperlukan jika menggunakan `docker-compose.yml`:

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `MYSQL_ROOT_PASSWORD` | **Yes** | — | Password untuk root MySQL |
| `MYSQL_DATABASE` | No | `wa_akg` | Nama database MySQL |
| `ADMIN_EMAIL` | **Yes** | — | Email SuperAdmin untuk first-run setup |
| `ADMIN_PASSWORD` | **Yes** | — | Password SuperAdmin |

> [!CAUTION]
> Jangan gunakan nilai default. Ubah `MYSQL_ROOT_PASSWORD`, `ADMIN_PASSWORD`, dan `NEXT_PUBLIC_SWAGGER_PASSWORD` sebelum production.

---

## 📝 Contoh Konfigurasi (Production)

```env
NODE_ENV="production"
DATABASE_URL="mysql://user:pass@db-host:3306/wa_akg"
AUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="https://wa.api.com"
BAILEYS_LOG_LEVEL="error"
TZ="Asia/Jakarta"

# Docker-specific (wajib jika pakai docker-compose)
MYSQL_ROOT_PASSWORD="strong-mysql-password"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="strong-admin-password"
NEXT_PUBLIC_SWAGGER_PASSWORD="strong-swagger-password"
```

---

<div align="center">
  **Last Updated**: June 2026 | **Version**: 1.6.1
</div>
