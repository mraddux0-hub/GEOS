# LinkStream Bin MVP

A minimal Pastebin-style app for sharing URLs with automatic in-browser playback for video links.

## Features

- Paste any HTTP/HTTPS URL and generate a unique share link.
- Public or private visibility (password-protected for private links).
- Auto-detects video links by extension and falls back to `Content-Type` HEAD checks.
- Streams video in HTML5 player.
- Supports HLS `.m3u8` playback with `hls.js`.
- Optional expiry time in hours.
- Basic abuse guardrails:
  - API rate limiting
  - URL validation
  - Report endpoint
- Optional embed endpoint for video links.

## Quick start

```bash
npm install
npm run start
```

Open `http://localhost:3000`.

## API

### Create link

`POST /api/links`

```json
{
  "url": "https://example.com/video.m3u8",
  "visibility": "private",
  "password": "secret123",
  "expiresInHours": 24
}
```

### Get link metadata + access

`GET /api/links/:id?password=...`

### Report link

`POST /api/links/:id/report`

## Notes for production hardening

- Replace in-memory `Map` with MongoDB.
- Add stronger anti-spam and moderation workflows.
- Add signed access tokens for embed/private views.
- Add malware/abuse URL checks and allow/deny lists.
