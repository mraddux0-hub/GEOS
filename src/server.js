const crypto = require('crypto');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

app.use('/api', apiLimiter);
app.use(express.static(path.join(__dirname, '..', 'public')));

/** @type {Map<string, {
 * id: string;
 * url: string;
 * visibility: 'public' | 'private';
 * passwordHash: string | null;
 * createdAt: number;
 * expiresAt: number | null;
 * views: number;
 * reports: number;
 * isVideo: boolean;
 * isHls: boolean;
 * contentType: string | null;
 *
 * }>} */
const store = new Map();

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.m3u8'];

function isValidHttpUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateId() {
  return crypto.randomBytes(6).toString('base64url');
}

function detectByExtension(rawUrl) {
  const pathname = new URL(rawUrl).pathname.toLowerCase();
  const extension = VIDEO_EXTENSIONS.find((ext) => pathname.endsWith(ext));

  if (!extension) {
    return { isVideo: false, isHls: false };
  }

  return {
    isVideo: true,
    isHls: extension === '.m3u8'
  };
}

async function detectByContentType(rawUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(rawUrl, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow'
    });

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const isVideo = contentType.startsWith('video/') || contentType.includes('application/vnd.apple.mpegurl');
    const isHls = contentType.includes('application/vnd.apple.mpegurl');

    return { isVideo, isHls, contentType: contentType || null };
  } catch {
    return { isVideo: false, isHls: false, contentType: null };
  } finally {
    clearTimeout(timeout);
  }
}

function purgeExpired() {
  const now = Date.now();
  for (const [id, item] of store.entries()) {
    if (item.expiresAt && item.expiresAt <= now) {
      store.delete(id);
    }
  }
}

setInterval(purgeExpired, 5 * 60 * 1000).unref();

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/share/:id', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'share.html'));
});

app.get('/embed/:id', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'embed.html'));
});

app.post('/api/links', async (req, res) => {
  const { url, visibility = 'public', password = '', expiresInHours = 0 } = req.body;

  if (!url || !isValidHttpUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL. Use a valid http(s) link.' });
  }

  if (!['public', 'private'].includes(visibility)) {
    return res.status(400).json({ error: 'Visibility must be public or private.' });
  }

  if (visibility === 'private' && !password) {
    return res.status(400).json({ error: 'Private links must include a password.' });
  }

  const expiresHoursInt = Number.parseInt(expiresInHours, 10);
  const hasExpiry = Number.isInteger(expiresHoursInt) && expiresHoursInt > 0;
  const expiresAt = hasExpiry ? Date.now() + expiresHoursInt * 60 * 60 * 1000 : null;

  const extensionDetection = detectByExtension(url);
  const contentTypeDetection = extensionDetection.isVideo
    ? { isVideo: extensionDetection.isVideo, isHls: extensionDetection.isHls, contentType: null }
    : await detectByContentType(url);

  let id = generateId();
  while (store.has(id)) {
    id = generateId();
  }

  const record = {
    id,
    url,
    visibility,
    passwordHash: password ? hashPassword(password) : null,
    createdAt: Date.now(),
    expiresAt,
    views: 0,
    reports: 0,
    isVideo: extensionDetection.isVideo || contentTypeDetection.isVideo,
    isHls: extensionDetection.isHls || contentTypeDetection.isHls,
    contentType: contentTypeDetection.contentType
  };

  store.set(id, record);

  return res.status(201).json({
    id,
    shareUrl: `${BASE_URL}/share/${id}`,
    embedUrl: `${BASE_URL}/embed/${id}`,
    visibility: record.visibility,
    isVideo: record.isVideo,
    isHls: record.isHls,
    expiresAt: record.expiresAt
  });
});

app.get('/api/links/:id', (req, res) => {
  const item = store.get(req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Link not found.' });
  }

  if (item.expiresAt && item.expiresAt <= Date.now()) {
    store.delete(item.id);
    return res.status(404).json({ error: 'Link expired.' });
  }

  if (item.visibility === 'private') {
    const providedPassword = req.query.password || '';
    if (!providedPassword || hashPassword(String(providedPassword)) !== item.passwordHash) {
      return res.status(401).json({ error: 'Password required for this link.', requiresPassword: true });
    }
  }

  item.views += 1;

  return res.json({
    id: item.id,
    url: item.url,
    visibility: item.visibility,
    isVideo: item.isVideo,
    isHls: item.isHls,
    views: item.views,
    reports: item.reports,
    contentType: item.contentType,
    embedUrl: `${BASE_URL}/embed/${item.id}`
  });
});

app.post('/api/links/:id/report', (req, res) => {
  const item = store.get(req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Link not found.' });
  }

  item.reports += 1;

  return res.status(202).json({ message: 'Report submitted.', reports: item.reports });
});

app.listen(PORT, () => {
  console.log(`Server running on ${BASE_URL}`);
});
