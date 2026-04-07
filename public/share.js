const content = document.getElementById('content');
const id = window.location.pathname.split('/').pop();

function renderPasswordPrompt(message = 'Password required for this private link.') {
  content.innerHTML = `
    <h2>Private Link</h2>
    <p>${message}</p>
    <form id="pwForm">
      <input type="password" id="pw" placeholder="Enter password" required />
      <button type="submit">Unlock</button>
    </form>
  `;

  const pwForm = document.getElementById('pwForm');
  pwForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = document.getElementById('pw').value;
    loadLink(password);
  });
}

function renderVideo(item) {
  content.innerHTML = `
    <h2>Video Link</h2>
    <video id="video" controls autoplay playsinline></video>
    <p><a href="${item.url}" target="_blank" rel="noopener">Open source URL</a></p>
    <p>Views: ${item.views} | Reports: ${item.reports}</p>
    <p>Embed: <code>${item.embedUrl}</code></p>
    <button id="reportBtn" type="button">Report link</button>
  `;

  const video = document.getElementById('video');
  if (item.isHls && window.Hls?.isSupported()) {
    const hls = new Hls();
    hls.loadSource(item.url);
    hls.attachMedia(video);
  } else {
    video.src = item.url;
  }

  document.getElementById('reportBtn').addEventListener('click', () => reportLink());
}

function renderRegularLink(item) {
  content.innerHTML = `
    <h2>Shared URL</h2>
    <p><a href="${item.url}" target="_blank" rel="noopener">${item.url}</a></p>
    <p>Views: ${item.views} | Reports: ${item.reports}</p>
    <button id="reportBtn" type="button">Report link</button>
  `;

  document.getElementById('reportBtn').addEventListener('click', () => reportLink());
}

async function reportLink() {
  await fetch(`/api/links/${id}/report`, { method: 'POST' });
  alert('Thanks. Report submitted.');
}

async function loadLink(password = '') {
  content.textContent = 'Loading…';
  const query = password ? `?password=${encodeURIComponent(password)}` : '';

  try {
    const response = await fetch(`/api/links/${id}${query}`);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && data.requiresPassword) {
        renderPasswordPrompt();
        return;
      }
      throw new Error(data.error || 'Unable to load shared link.');
    }

    if (data.isVideo) {
      renderVideo(data);
    } else {
      renderRegularLink(data);
    }
  } catch (error) {
    content.innerHTML = `<p>${error.message}</p>`;
  }
}

loadLink();
