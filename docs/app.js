const createView = document.getElementById('createView');
const shareView = document.getElementById('shareView');

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.m3u8'];

function detectByExtension(rawUrl) {
  try {
    const pathname = new URL(rawUrl).pathname.toLowerCase();
    const ext = VIDEO_EXTENSIONS.find((item) => pathname.endsWith(item));
    return { isVideo: Boolean(ext), isHls: ext === '.m3u8' };
  } catch {
    return { isVideo: false, isHls: false };
  }
}

function validUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function b64urlEncodeText(text) {
  return btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecodeText(encoded) {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return decodeURIComponent(escape(atob(normalized + padding)));
}

async function deriveKey(password, saltBytes) {
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: 150000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bytesToB64url(bytes) {
  let binary = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 1) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(str) {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function encryptText(text, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  return {
    encrypted: true,
    salt: bytesToB64url(salt),
    iv: bytesToB64url(iv),
    cipher: bytesToB64url(new Uint8Array(cipher))
  };
}

async function decryptText(bundle, password) {
  const key = await deriveKey(password, b64urlToBytes(bundle.salt));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64urlToBytes(bundle.iv) },
    key,
    b64urlToBytes(bundle.cipher)
  );
  return new TextDecoder().decode(plain);
}

function incrementLocalCounter(token, field) {
  const key = `ls:${field}:${token}`;
  const current = Number(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, String(current));
  return current;
}

function createForm() {
  createView.innerHTML = `
    <h2>Create link</h2>
    <form id="createForm">
      <label>URL
        <input id="url" type="url" required placeholder="https://example.com/video.m3u8" />
      </label>
      <div class="row">
        <label>Visibility
          <select id="visibility">
            <option value="public">Public</option>
            <option value="private">Private (password)</option>
          </select>
        </label>
        <label>Expires in hours (optional)
          <input id="expires" type="number" min="0" placeholder="0 = never" />
        </label>
      </div>
      <label id="pwWrap" class="hidden">Password
        <input id="password" type="password" minlength="4" placeholder="required for private" />
      </label>
      <button type="submit">Generate share URL</button>
    </form>
    <div id="result"></div>
    <p class="note">GitHub Pages mode: this app does not host files; it only shares links. Private mode encrypts link metadata client-side.</p>
  `;

  const visibility = document.getElementById('visibility');
  const pwWrap = document.getElementById('pwWrap');
  const password = document.getElementById('password');

  visibility.addEventListener('change', () => {
    const isPrivate = visibility.value === 'private';
    pwWrap.classList.toggle('hidden', !isPrivate);
    password.required = isPrivate;
  });

  document.getElementById('createForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = document.getElementById('result');

    const url = document.getElementById('url').value.trim();
    const visibilityMode = visibility.value;
    const passwordText = password.value;
    const expiresHrs = Number(document.getElementById('expires').value || '0');

    if (!validUrl(url)) {
      result.innerHTML = '<p>Invalid URL. Please enter a valid http(s) link.</p>';
      return;
    }

    if (visibilityMode === 'private' && !passwordText) {
      result.innerHTML = '<p>Password required for private links.</p>';
      return;
    }

    const media = detectByExtension(url);
    const now = Date.now();

    const payload = {
      id: crypto.randomUUID().slice(0, 8),
      createdAt: now,
      expiresAt: expiresHrs > 0 ? now + expiresHrs * 3600000 : null,
      visibility: visibilityMode,
      url: visibilityMode === 'public' ? url : null,
      secret: null,
      isVideo: media.isVideo,
      isHls: media.isHls
    };

    if (visibilityMode === 'private') {
      payload.secret = await encryptText(url, passwordText);
    }

    const token = b64urlEncodeText(JSON.stringify(payload));
    const shareUrl = `${location.origin}${location.pathname}#/s/${token}`;
    const embedUrl = `${location.origin}${location.pathname}#/e/${token}`;

    result.innerHTML = `
      <hr />
      <p><strong>Share:</strong> <a href="${shareUrl}">${shareUrl}</a></p>
      <p><strong>Embed:</strong> <a href="${embedUrl}">${embedUrl}</a></p>
      <p><strong>Type:</strong> ${payload.isVideo ? (payload.isHls ? 'HLS video' : 'Video') : 'Regular URL'}</p>
      <p class="note">For private links, share the password separately.</p>
    `;
  });
}

function parseRoute() {
  const hash = location.hash || '';
  const shareMatch = hash.match(/^#\/s\/(.+)$/);
  const embedMatch = hash.match(/^#\/e\/(.+)$/);
  if (shareMatch) return { mode: 'share', token: shareMatch[1] };
  if (embedMatch) return { mode: 'embed', token: embedMatch[1] };
  return { mode: 'create' };
}

function renderLink(url, token, meta, isEmbed) {
  const views = incrementLocalCounter(token, 'views');
  const reports = Number(localStorage.getItem(`ls:reports:${token}`) || '0');

  if (!meta.isVideo) {
    shareView.innerHTML = `<h2>Shared URL</h2><p><a href="${url}" target="_blank" rel="noopener">${url}</a></p><p>Views: ${views} | Reports: ${reports}</p>`;
    return;
  }

  shareView.innerHTML = `
    ${isEmbed ? '' : '<h2>Video stream</h2>'}
    <video id="video" controls autoplay playsinline></video>
    ${isEmbed ? '' : `<p><a href="${url}" target="_blank" rel="noopener">Open source URL</a></p><p>Views: ${views} | Reports: ${reports}</p><button id="report">Report</button>`}
  `;

  const video = document.getElementById('video');
  if (meta.isHls && window.Hls?.isSupported()) {
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
  } else {
    video.src = url;
  }

  if (!isEmbed) {
    const reportButton = document.getElementById('report');
    reportButton.addEventListener('click', () => {
      const next = reports + 1;
      localStorage.setItem(`ls:reports:${token}`, String(next));
      alert('Report submitted (local demo mode).');
      location.reload();
    });
  }
}

async function loadShared(mode, token) {
  createView.classList.add('hidden');
  shareView.classList.remove('hidden');

  let meta;
  try {
    meta = JSON.parse(b64urlDecodeText(token));
  } catch {
    shareView.innerHTML = '<p>Invalid share token.</p>';
    return;
  }

  if (meta.expiresAt && Date.now() > meta.expiresAt) {
    shareView.innerHTML = '<p>This link has expired.</p>';
    return;
  }

  const isEmbed = mode === 'embed';
  if (meta.visibility === 'public') {
    renderLink(meta.url, token, meta, isEmbed);
    return;
  }

  shareView.innerHTML = `
    <h2>Private link</h2>
    <p>Password required.</p>
    <form id="unlockForm">
      <input id="unlockPw" type="password" placeholder="Enter password" required />
      <button type="submit">Unlock</button>
    </form>
  `;

  document.getElementById('unlockForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const password = document.getElementById('unlockPw').value;
      const url = await decryptText(meta.secret, password);
      renderLink(url, token, meta, isEmbed);
    } catch {
      shareView.insertAdjacentHTML('beforeend', '<p>Wrong password or corrupt link token.</p>');
    }
  });
}

function init() {
  const route = parseRoute();
  createForm();

  if (route.mode === 'create') {
    createView.classList.remove('hidden');
    shareView.classList.add('hidden');
  } else {
    loadShared(route.mode, route.token);
  }
}

window.addEventListener('hashchange', init);
init();
