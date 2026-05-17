# Airindiana CRM Deployment Notes

## 1) Environment Variables

Set these in your deployment platform:

- `PORT` (Render/Railway usually inject this automatically)
- `JWT_SECRET` (strong random value)
- `JWT_EXPIRES_IN` (example: `8h`)
- `JWT_ISSUER` (example: `airindiana-crm`)
- `JWT_AUDIENCE` (example: `airindiana-users`)
- `ADMIN_ID`
- `ADMIN_NAME`
- `ADMIN_PASSWORD` (strong password)

Note: `ADMIN_PASSWORD` is used for initial admin seeding. If the database already exists, update admin password through the app flow or rotate it directly in DB.

## 2) Split Deployment (GitHub Pages + Render)

### Frontend on GitHub Pages

1. Static frontend is in `public/`.
2. In `public/js/api.js`, set:
   - `const API_BASE_URL = "https://YOUR-RENDER-BACKEND.onrender.com";`
3. Enable GitHub Pages with **GitHub Actions** as source.
4. The included workflow [`.github/workflows/pages.yml`](./.github/workflows/pages.yml) publishes `public/` as Pages root.
5. Frontend URLs:
   - `https://loen-24.github.io/job/`
   - `https://loen-24.github.io/job/login.html`
   - `https://loen-24.github.io/job/admin.html`
   - `https://loen-24.github.io/job/employee.html`
   - `https://loen-24.github.io/job/track.html`

### Backend on Render

1. Create a new Web Service from this repository.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add environment variables:
   - `ADMIN_ID`
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`
   - `JWT_ISSUER`
   - `JWT_AUDIENCE`
   - `NODE_ENV=production`
   - `PERSISTENT_STORAGE_PATH=/var/data` (recommended)
5. Add a persistent disk and mount it at `/var/data` (or your chosen mount path).
6. App will use persistent storage for:
   - DB file: `/var/data/airindiana.db`
   - uploads: `/var/data/uploads/`
   - backups: `/var/data/backups/`
7. Backend API and uploads stay on Render:
   - `https://YOUR-RENDER-BACKEND.onrender.com/api/...`
   - `https://YOUR-RENDER-BACKEND.onrender.com/uploads/...`
8. CORS allowlist is configured for:
   - `https://loen-24.github.io`
   - `https://loen-24.github.io/job`

## 3) Railway

1. Create a new project and deploy the repository.
2. Set start command: `npm start`.
3. Add all environment variables.
4. Attach a persistent volume and ensure `data/` and `uploads/` are on persistent storage.

## 4) VPS (Ubuntu + PM2 + Nginx)

1. Install Node.js LTS and npm.
2. Clone project and run:
   - `npm install`
3. Create `.env` with production values.
4. Start with PM2:
   - `pm2 start server.js --name airindiana-crm`
   - `pm2 save`
5. Configure Nginx reverse proxy to the app port.
6. Enable HTTPS using Certbot.
7. Ensure only app user can write `data/` and `uploads/`.

## 5) Backup and Export

- DB backup snapshot:
  - `npm run backup`
- Applicant CSV export (admin only):
  - `GET /api/admin/applicants/export.csv`

Recommended cron on VPS (daily backup example):

```bash
0 2 * * * cd /path/to/crm && /usr/bin/npm run backup >> /var/log/airindiana-backup.log 2>&1
```

## 6) Final Production Checklist

- Admin login password changed from default.
- JWT secret changed from default.
- Uploads folder secured:
  - No directory listing.
  - Non-image files rejected.
  - Write permissions restricted.
- Database backup plan in place (`npm run backup` + schedule).
- Employee access tested (cannot access admin routes).
- Public tracking tested (read-only token view).
