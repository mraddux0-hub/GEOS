const app = document.getElementById('app');
const id = window.location.pathname.split('/').pop();

async function loadEmbed() {
  const response = await fetch(`/api/links/${id}`);
  const data = await response.json();

  if (!response.ok) {
    app.textContent = data.error || 'Unable to load embed.';
    return;
  }

  if (!data.isVideo) {
    app.innerHTML = '<div class="msg">This link is not a video.</div>';
    return;
  }

  app.outerHTML = '<video id="v" controls autoplay playsinline></video>';
  const video = document.getElementById('v');

  if (data.isHls && window.Hls?.isSupported()) {
    const hls = new Hls();
    hls.loadSource(data.url);
    hls.attachMedia(video);
  } else {
    video.src = data.url;
  }
}

loadEmbed().catch(() => {
  app.textContent = 'Unable to load embed player.';
});
