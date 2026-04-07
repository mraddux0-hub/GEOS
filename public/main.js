const form = document.getElementById('createForm');
const result = document.getElementById('result');
const visibility = document.getElementById('visibility');
const passwordRow = document.getElementById('passwordRow');
const passwordInput = document.getElementById('password');

visibility.addEventListener('change', () => {
  const isPrivate = visibility.value === 'private';
  passwordRow.classList.toggle('hidden', !isPrivate);
  passwordInput.required = isPrivate;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  result.classList.remove('hidden');
  result.textContent = 'Creating…';

  const payload = {
    url: document.getElementById('url').value.trim(),
    visibility: visibility.value,
    password: passwordInput.value,
    expiresInHours: document.getElementById('expiry').value || 0
  };

  try {
    const response = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create link.');
    }

    result.innerHTML = `
      <h2>Created</h2>
      <p><strong>Share URL:</strong> <a href="${data.shareUrl}" target="_blank" rel="noopener">${data.shareUrl}</a></p>
      <p><strong>Embed URL:</strong> <a href="${data.embedUrl}" target="_blank" rel="noopener">${data.embedUrl}</a></p>
      <p><strong>Detected type:</strong> ${data.isVideo ? (data.isHls ? 'HLS stream video' : 'Video') : 'Regular URL'}</p>
      ${data.expiresAt ? `<p><strong>Expires:</strong> ${new Date(data.expiresAt).toLocaleString()}</p>` : ''}
    `;
  } catch (error) {
    result.textContent = error.message;
  }
});
