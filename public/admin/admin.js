const byId = id => document.getElementById(id);
const { t } = window.VideoI18n;
let signedIn = false;
let cloudConfigured = false;
const acceptByType = {
  image: 'image/jpeg,image/png,image/webp,image/gif,image/avif',
  video: 'video/mp4,video/quicktime,video/webm'
};
const maxSize = { image: 15 * 1024 * 1024, video: 90 * 1024 * 1024 };
const say = message => { byId('status').textContent = message; };
async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin', cache: 'no-store',
    headers: { 'Accept-Language': window.VideoI18n.lang() }, ...options
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(result.error || t('genericError'));
  return result;
}
function json(method, data) {
  return { method, headers: { 'Content-Type': 'application/json', 'Accept-Language': window.VideoI18n.lang() }, body: JSON.stringify(data) };
}
const mediaRoute = (type, id, suffix = '') => `/api/admin/media/${encodeURIComponent(type)}/${encodeURIComponent(id)}${suffix}`;
const validTitle = value => value?.trim().length >= 2 && value.trim().length <= 100 && !value.includes('/');
function validateFile(file, type) {
  if (!file || !acceptByType[type]?.split(',').includes(file.type)) throw Error(t('videoType'));
  if (file.size > maxSize[type]) throw Error(t('videoSize'));
}
function updateFileType() {
  const kind = byId('media-type').value;
  byId('file').accept = acceptByType[kind];
  byId('file').value = '';
}
async function session() {
  try {
    const profile = await api('/api/me');
    signedIn = true; cloudConfigured = profile.cloudinaryConfigured;
    byId('login-panel').hidden = true; byId('dashboard').hidden = false;
    byId('cloud-status').textContent = t(cloudConfigured ? 'connected' : 'notConnected');
    await renderMedia();
  } catch {
    signedIn = false; byId('login-panel').hidden = false; byId('dashboard').hidden = true;
  }
}
async function upload(file, title, type) {
  validateFile(file, type);
  if (!validTitle(title)) throw Error(t('titleInvalid'));
  say(t('preparing'));
  const s = await api('/api/upload-signature', json('POST', { type, title }));
  const form = new FormData(); form.append('file', file);
  for (const field of ['timestamp', 'asset_folder', 'public_id_prefix', 'display_name', 'allowed_formats', 'signature']) {
    form.append(field, String(s[field]));
  }
  form.append('api_key', s.api_key);
  const progress = byId('upload-progress'); progress.hidden = false; progress.value = 0;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(s.cloud_name)}/${type}/upload`);
    xhr.timeout = 180000;
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        progress.value = Math.round(event.loaded / event.total * 100);
        say(t('uploading', { count: progress.value }));
      }
    };
    xhr.onerror = () => reject(Error(t('uploadNetwork')));
    xhr.ontimeout = () => reject(Error(t('uploadTimeout')));
    xhr.onload = () => {
      let result; try { result = JSON.parse(xhr.responseText); } catch { result = {}; }
      if (xhr.status < 200 || xhr.status >= 300) reject(Error(result.error?.message || t('uploadRefused')));
      else if (!result.public_id || !result.secure_url || result.resource_type !== type) reject(Error(t('uploadBadResponse')));
      else resolve(result);
    };
    xhr.send(form);
  });
}
function control(label, className, handler) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = `tiny ${className}`; button.textContent = label;
  button.addEventListener('click', handler); return button;
}
async function renderMedia() {
  if (!signedIn) return;
  const grid = byId('admin-videos'), loading = byId('admin-loading');
  grid.replaceChildren(); loading.hidden = false; loading.textContent = t('loading');
  try {
    const result = await api('/api/media?limit=250');
    if (!result.media.length) { loading.textContent = t('empty'); return; }
    loading.hidden = true;
    for (const item of result.media) {
      const card = document.createElement('article'); card.className = 'admin-card';
      let asset;
      if (item.type === 'image') {
        asset = document.createElement('img'); asset.src = item.url; asset.alt = item.title; asset.loading = 'lazy';
      } else {
        asset = document.createElement('video'); asset.src = item.url; asset.controls = true; asset.preload = 'metadata';
      }
      const inside = document.createElement('div'); inside.className = 'admin-card-body';
      const kind = document.createElement('div'); kind.className = 'media-type-tag'; kind.textContent = t(item.type);
      const heading = document.createElement('h3'); heading.textContent = item.title;
      const actions = document.createElement('div'); actions.className = 'actions';
      const edit = control(t('edit'), 'secondary', async () => {
        const next = prompt(t('newTitle'), item.title);
        if (next === null) return;
        if (!validTitle(next)) return say(t('titleInvalid'));
        edit.disabled = true;
        try { await api(mediaRoute(item.type, item.id), json('PATCH', { title: next.trim() })); say(t('updated')); await renderMedia(); }
        catch (error) { say(error.message); } finally { edit.disabled = false; }
      });
      const picker = document.createElement('input'); picker.type = 'file'; picker.accept = acceptByType[item.type];
      picker.className = 'hidden-input'; picker.setAttribute('aria-label', t('selectReplacement'));
      const replace = control(t('replace'), 'secondary', () => picker.click());
      picker.addEventListener('change', async () => {
        const nextFile = picker.files[0]; if (!nextFile) return;
        if (!confirm(t('replaceQuestion', {title:item.title}))) {picker.value='';return;}
        replace.disabled = true;
        try {
          const newer = await upload(nextFile, item.title, item.type);
          await api(mediaRoute(item.type, item.id, '/replace'), json('POST', { newPublicId: newer.public_id }));
          say(t('replaced')); await renderMedia();
        } catch (error) { say(`${t('error')}: ${error.message}`); await renderMedia(); }
        finally { replace.disabled = false; picker.value = ''; }
      });
      const remove = control(t('remove'), 'danger', async () => {
        if (!confirm(t('deleteQuestion', {title:item.title}))) return;
        remove.disabled = true;
        try { await api(mediaRoute(item.type, item.id), json('DELETE', {})); say(t('deleted')); await renderMedia(); }
        catch (error) { say(error.message); } finally {remove.disabled=false;}
      });
      actions.append(edit, replace, remove, picker); inside.append(kind, heading, actions); card.append(asset, inside); grid.append(card);
    }
  } catch (error) { loading.textContent = error.message; }
}
byId('media-type').addEventListener('change', updateFileType);
byId('login-form').addEventListener('submit', async event => {
  event.preventDefault(); say(t('signInWait'));
  try {
    await api('/api/login',json('POST',{email:byId('email').value,password:byId('password').value}));
    byId('password').value=''; say(t('signedIn')); await session();
  } catch (error) {say(error.message)}
});
byId('logout').addEventListener('click', async () => {
  try {await api('/api/logout',json('POST',{}));say(t('signedOut'));await session()}
  catch (error) {say(error.message)}
});
byId('upload-form').addEventListener('submit',async event=>{
  event.preventDefault();byId('upload-button').disabled=true;
  try {
    await upload(byId('file').files[0], byId('title').value, byId('media-type').value);
    say(t('published')); byId('upload-form').reset(); updateFileType(); await renderMedia();
  }catch(error){say(`${t('error')}: ${error.message}`)}
  finally{byId('upload-button').disabled=false}
});
byId('refresh').addEventListener('click',renderMedia);
window.addEventListener('video:languagechange', () => {
  say('');if(signedIn){byId('cloud-status').textContent=t(cloudConfigured?'connected':'notConnected');renderMedia()}
});
updateFileType();session();
