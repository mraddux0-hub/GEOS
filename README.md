# LinkStream Share (GitHub Pages MVP)

A Pastebin-style link sharing app focused on video links (`.mp4`, `.webm`, `.m3u8`) with in-browser playback.

## What works on GitHub Pages

This repository now includes a **fully static deployment mode** under `docs/` so you can host directly on GitHub Pages.

- Paste any HTTP/HTTPS URL.
- Set visibility: public/private.
- Generate unique share URL + embed URL.
- Auto-render HTML5 video player for video links.
- HLS (`.m3u8`) playback using `hls.js`.
- Optional expiry check.
- Private link mode uses client-side AES encryption with password.
- Local demo counters for views/reports (browser-local only).

> Important: GitHub Pages cannot run Node/Express. For true server-side persistence, moderation, and global counters, deploy the Express backend separately.

---

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. In **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` (or your branch), folder: `/docs`
3. Save. Your app will be available at:
   - `https://<username>.github.io/<repo>/`

---

## Local run (static mode)

Open `docs/index.html` directly or serve with any static server.

Example:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/docs/
```

---

## Optional backend mode (recommended for production)

Use the existing Express app in `src/server.js` for:

- global persistence (swap in MongoDB)
- server-side password enforcement
- real moderation/report pipeline
- anti-spam/rate-limit policies
- analytics/view counters across users

