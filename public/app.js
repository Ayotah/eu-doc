const byId = id => document.getElementById(id);
const { t } = window.VideoI18n;
let cachedMedia = null;
let configured = false;
function renderGallery() {
  const grid = byId('videos'), message = byId('message'), count = byId('count');
  if (!cachedMedia) return;
  grid.replaceChildren();
  count.textContent = t('videoCount', { count: cachedMedia.length });
  if (!configured || !cachedMedia.length) {
    message.hidden = false;
    message.textContent = t(configured ? 'empty' : 'cloudMissing');
    return;
  }
  message.hidden = true;
  for (const item of cachedMedia) {
    const card = document.createElement('article'); card.className = 'video-card';
    let asset;
    if (item.type === 'image') {
      asset = document.createElement('img'); asset.src = item.url; asset.alt = item.title;
      asset.loading = 'lazy'; asset.decoding = 'async';
    } else {
      asset = document.createElement('video'); asset.src = item.url;
      asset.preload = 'metadata'; asset.playsInline = true; asset.controls = true;
    }
    const info = document.createElement('div'); info.className = 'info';
    const kind = document.createElement('div'); kind.className = 'media-type-tag'; kind.textContent = t(item.type);
    const title = document.createElement('h3'); title.textContent = item.title;
    const date = document.createElement('div'); date.className = 'date';
    date.textContent = item.created_at ? window.VideoI18n.date(item.created_at) : '';
    info.append(kind, title, date); card.append(asset, info); grid.append(card);
  }
}
async function loadGallery() {
  try {
    const endpoint = byId('videos').dataset.mediaEndpoint || '/api/media?limit=250';
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
      throw Error(t('unavailable'));
    }
    const data = await response.json();
    configured = data.configured;
    cachedMedia = data.media;
    renderGallery();
  } catch (error) {
    console.error('Unable to load public media:', error);
    byId('message').hidden = false;
    byId('message').textContent = t('unavailable');
    byId('count').textContent = t('error');
  }
}
window.addEventListener('video:languagechange', renderGallery);
loadGallery();
