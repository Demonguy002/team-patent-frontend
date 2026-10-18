# Team Patent Portal — Vite + React

Responsive Team Patent frontend built with React, Vite, Framer Motion, and Lucide icons. It uses the existing Render backend and MongoDB API; credentials and scores are not stored as hard-coded frontend secrets.

## Requirements
- Node.js 18+
- npm

## Run locally

```bash
npm install
```

Create `.env` in this folder (or copy `.env.example` to `.env`) with:

```env
VITE_API_BASE_URL=https://team-patent.onrender.com
```

Then run:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

The production files are generated in `dist/`.

## Vercel deployment
1. Push this folder to GitHub.
2. Import the repository into Vercel.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add environment variable `VITE_API_BASE_URL` with value `https://team-patent.onrender.com`.
7. Deploy.
8. Add the final Vercel origin (for example `https://your-project.vercel.app`) to the Render backend's `FRONTEND_URL` environment variable. If `FRONTEND_URL` already contains origins, use a comma-separated list.

## Backend API used
- `GET /api/members`
- `GET /api/leaderboard`
- `POST /api/auth/login`
- `GET /api/admin/scores/:memberId` (admin token required)
- `PUT /api/scores/:memberId` (admin token required)

Admin login uses the existing backend credentials. The frontend does not create an independent admin account. Scores are sent to the backend and persisted in MongoDB through that API.

## Notes
- The frontend uses the eight supplied member portraits and Team Patent logo in `public/assets/`.
- Bright, Dark, and Ocean themes are included.
- Never commit `.env` or secrets. Vite environment variables prefixed with `VITE_` are public client configuration and must not contain passwords or private keys.
