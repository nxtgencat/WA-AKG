# Kontribusi ke WA-AKG

Terima kasih tertarik kontribusi! 🎉

## Setup Development

```bash
git clone https://github.com/mrifqidaffaaditya/WA-AKG.git
cd WA-AKG
npm install
cp .env.example .env
# Edit .env sesuai environment kamu
npm run dev
```

Butuh: **Node.js 22+**, **npm 10+**, **MySQL 8.0**

Kalau pakai Docker:
```bash
docker compose up -d
```

## Branch & Commit Convention

| Branch Prefix | Tujuan                    |
|---------------|---------------------------|
| `feat/`       | Fitur baru                |
| `fix/`        | Bug fix                   |
| `chore/`      | Maintenance / dependency  |
| `docs/`       | Dokumentasi               |

**Commit message** pakai format:
```
type: deskripsi singkat

feat: tambah auto-reply AI
fix: perbaiki pairing QR code
chore: update baileys ke 7.0.0
```

## Proses Pull Request

1. Fork repo & bikin branch dari `dev`
2. Implement perubahan + test
3. Pastikan `npm run build` sukses
4. Buka PR ke branch `dev`
5. Isi PR template dengan lengkap
6. Review oleh maintainer

## Code Style

- TypeScript strict mode
- ESLint config bawaan (`eslint.json`)
- TailwindCSS utility-first, hindari custom CSS kecuali perlu
- Nama variabel & fungsi pakai camelCase
- Komponen React pakai PascalCase

## Butuh Bantuan?

- Issue dengan label `good first issue` cocok buat pemula
- Join Telegram: https://t.me/aikeigroup
