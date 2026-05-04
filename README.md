# Airindiana CRM

Production-focused CRM web app for **Airindiana** Airport Ground Staff applications with strict role separation:

- Admin Panel
- Employee Panel
- Customer/Applicant token tracking

## Features

- Secure login for admin and employees (JWT + hashed passwords)
- Admin can:
  - Create employee login IDs/passwords
  - Enable/disable/remove employees
  - View/search all applicant records
  - Edit/delete applicant records
  - Update application status
  - See dashboard stats and recent applications
- Employees can:
  - Add applicant entries with photo upload
  - Get auto-generated reference token (`AIR-YYYY-000001`)
  - View only self-submitted applicants
- Applicants can:
  - Track application using reference token without login
  - View details + current status

## Tech Stack

- Backend: Node.js, Express
- Database: SQLite
- Auth: JWT + bcrypt
- Uploads: Multer (JPG/PNG/WEBP, max 2MB)
- Frontend: Responsive HTML/CSS/JavaScript

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
copy .env.example .env
```

3. Update `.env` for production (especially `JWT_SECRET`, admin credentials).

4. Run the app:

```bash
npm start
```

5. Open:

- `http://localhost:4000`

## Default Admin (from `.env.example`)

- Login ID: `admin`
- Password: `Admin@12345`

Change these before production deployment.

## Status Values

- Submitted
- Under Review
- Selected
- Rejected
- Pending Documents

## Backup / Export

- Backup SQLite DB snapshot:
  - `npm run backup`
- Export applicants CSV (admin token required):
  - `GET /api/admin/applicants/export.csv`
  - Optional filter: `/api/admin/applicants/export.csv?search=<keyword>`

## Deployment

- See full production deployment notes in [DEPLOYMENT.md](./DEPLOYMENT.md)
