import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';

const app = express();
const env = process.env;
const VIDEO_PREFIX = 'video-studio-public/';
const VIDEO_FOLDER = 'video-studio-public';
const MEDIA_TYPES = {video:{folder:'video-studio-public',prefix:'video-studio-public/',formats:'mp4,mov,webm'},image:{folder:'video-studio-images',prefix:'video-studio-images/',formats:'jpg,jpeg,png,webp,gif,avif'}};
const mediaType = value => Object.hasOwn(MEDIA_TYPES,value)?value:null;
const mediaIdValid = (kind,id) => mediaType(kind) && typeof id==='string' && id.startsWith(MEDIA_TYPES[kind].prefix) && id.length <=255 && /^[a-zA-Z0-9_.\/-]+$/.test(id) && !id.split('/').some(p=>p==='.'||p==='..');

const publicCors = (req, res, next) => { res.set('Access-Control-Allow-Origin', '*'); res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS'); next(); };
const apiLanguage = req => /^en(?:[-_,;]|$)/i.test(req.query.lang || req.get('accept-language') || '') ? 'en' : 'fr';
const localError = (req, fr, en) => apiLanguage(req) === 'en' ? en : fr;

app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '16kb' }));

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'DENY');
  res.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' https://res.cloudinary.com data:",
    "media-src 'self' https://res.cloudinary.com",
    "connect-src 'self' https://api.cloudinary.com",
    "base-uri 'self'",
    "frame-ancestors 'none'"
  ].join('; '));

  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    const host = req.get('x-forwarded-host') || req.get('host');
    const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
    if (origin && host && origin !== `${protocol}://${host}`) {
      return res.status(403).json({ error: 'Origine non autorisée' });
    }
    if (req.get('content-type')?.split(';')[0].trim() !== 'application/json') {
      return res.status(415).json({ error: 'Utilisez application/json' });
    }
  }
  next();
});

const isCloudinaryReady = () => Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
function cloud() {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true
  });
  return cloudinary;
}
function secureCookie(req) {
  return req.secure || req.get('x-forwarded-proto') === 'https' || env.NODE_ENV === 'production';
}
function parseCookie(req, key) {
  const pair = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${key}=`));
  return pair?.slice(key.length + 1) || null;
}
function verifyPassword(password) {
  const [salt, encoded] = String(env.ADMIN_PASSWORD_HASH || '').split(':');
  if (!salt || !encoded || typeof password !== 'string' || password.length > 512) return false;
  try {
    const expected = Buffer.from(encoded, 'hex');
    if (expected.length !== 32) return false;
    const computed = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), 260000, expected.length, 'sha256');
    return crypto.timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}
function requireAdmin(req, res, next) {
  try {
    if (!env.JWT_SECRET) throw Error('No secret configured');
    const token = parseCookie(req, 'video_studio_token');
    if (!token) throw Error('Missing token');
    const payload = jwt.verify(token, env.JWT_SECRET, { audience: 'video-studio', issuer: 'video-studio' });
    if (payload.scope !== 'admin') throw Error('Wrong scope');
    next();
  } catch {
    res.status(401).json({ error: 'Connexion administrateur requise' });
  }
}
function requireCloudinary(req, res, next) {
  if (!isCloudinaryReady()) return res.status(503).json({ error: 'Cloudinary n’est pas encore configuré.' });
  next();
}
function validTitle(value) {
  return typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 100 && !value.includes('/');
}
function validPublicId(value) {
  return typeof value === 'string'
    && value.startsWith(VIDEO_PREFIX)
    && value.length <= 255
    && /^video-studio-public\/[a-zA-Z0-9_.\-/]+$/.test(value)
    && !value.split('/').some(part => part === '..' || part === '.');
}
async function readVideos() {
  const c = cloud();
  const collected = [];
  let nextCursor;
  for (let page = 0; page < 4; page += 1) {
    const opts = { resource_type: 'video', type: 'upload', prefix: VIDEO_PREFIX, max_results: 250 };
    if (nextCursor) opts.next_cursor = nextCursor;
    const result = await c.api.resources(opts);
    for (const video of result.resources || []) {
      if (!validPublicId(video.public_id) || !video.secure_url) continue;
      collected.push({
        id: video.public_id,
        url: video.secure_url,
        title: video.display_name || video.public_id.split('/').pop().replaceAll('_', ' '),
        created_at: video.created_at,
        format: video.format || null
      });
    }
    nextCursor = result.next_cursor;
    if (!nextCursor) break;
  }
  return collected.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}
function apiError(res, e, description) {
  // The server logs details; never expose cloud account metadata or credentials to the browser.
  console.error(description, e?.http_code || e?.message || 'Unknown error');
  return res.status(e?.http_code === 404 ? 404 : 502).json({ error: description });
}

// Public read-only API. GET requests are safe for external consumers; admin APIs never expose CORS.
app.use((req,res,next)=>{
  const publiclyReadable = req.path === '/api' || req.path === '/api/health' || req.path === '/api/videos' || req.path.startsWith('/api/videos/') || req.path === '/api/media' || req.path.startsWith('/api/media/');
  if (publiclyReadable && ['GET','HEAD','OPTIONS'].includes(req.method)) publicCors(req,res,next);
  else next();
});
app.options(['/api/health', '/api/videos', '/api/videos/:id', '/api/media', '/api/media/:type/:id', '/api'], (req, res) => res.sendStatus(204));
app.get('/api', (req, res) => res.json({
  name: 'Video Studio Public API', version: '1.3.0', languages: ['fr', 'en'],
  endpoints: [
    { method: 'GET', path: '/api/health', auth: false, description: 'Server status' },
    { method: 'GET', path: '/api/videos', auth: false, description: 'List public videos', query: ['limit', 'q', 'lang'] },
    { method: 'GET', path: '/api/videos/{id}', auth: false, description: 'Get one published video by public ID' },
    { method: 'GET', path: '/api/media', auth: false, description: 'List photos and videos; ?type=image|video|all, ?q=, ?limit=' },
    { method: 'GET', path: '/api/media/{type}/{id}', auth: false, description: 'Get one image or video' },
    { method: 'POST', path: '/api/login', auth: false },
    { method: 'POST', path: '/api/logout', auth: false },
    { method: 'GET', path: '/api/me', auth: true },
    { method: 'POST', path: '/api/upload-signature', auth: true },
    { method: 'PATCH', path: '/api/admin/videos/{id}', auth: true },
    { method: 'DELETE', path: '/api/admin/videos/{id}', auth: true },
    { method: 'PATCH', path: '/api/admin/media/{type}/{id}', auth: true },
    { method: 'DELETE', path: '/api/admin/media/{type}/{id}', auth: true },
    { method: 'POST', path: '/api/admin/media/{type}/{id}/replace', auth: true },
    { method: 'POST', path: '/api/admin/videos/{id}/replace', auth: true }
  ],
  note: 'For video {id}, URL-encode the entire Cloudinary public_id, e.g. video-studio-public%2Fexample'
}));
app.get('/api/health', (req, res) => res.json({ ok: true, cloudinaryConfigured: isCloudinaryReady() }));
app.post('/api/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const valid = email === String(env.ADMIN_EMAIL || '').toLowerCase() && verifyPassword(req.body?.password);
  if (!valid || !env.JWT_SECRET) return res.status(401).json({ error: 'Identifiants incorrects' });
  const token = jwt.sign({ scope: 'admin' }, env.JWT_SECRET, {
    expiresIn: '6h', audience: 'video-studio', issuer: 'video-studio'
  });
  res.cookie('video_studio_token', token, {
    httpOnly: true, secure: secureCookie(req), sameSite: 'strict', path: '/', maxAge: 6 * 60 * 60 * 1000
  });
  res.json({ ok: true });
});
app.post('/api/logout', (req, res) => {
  res.clearCookie('video_studio_token', { path: '/', secure: secureCookie(req), sameSite: 'strict' });
  res.json({ ok: true });
});
app.get('/api/me', requireAdmin, (req, res) => {
  res.json({ email: env.ADMIN_EMAIL, cloudinaryConfigured: isCloudinaryReady() });
});
app.get('/api/videos', async (req, res) => {
  if (!isCloudinaryReady()) return res.json({ configured: false, videos: [], total: 0 });
  try {
    const videos = await readVideos();
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLocaleLowerCase().slice(0, 100) : '';
    const matching = q ? videos.filter(v => v.title.toLocaleLowerCase().includes(q)) : videos;
    const rawLimit = Number(req.query.limit);
    const limit = req.query.limit === undefined ? 100 : Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= 250 ? rawLimit : null;
    if (limit === null) return res.status(400).json({ error: localError(req, 'La limite doit être comprise entre 1 et 250.', 'Limit must be between 1 and 250.') });
    res.set('Cache-Control', 'no-store');
    res.json({ configured: true, videos: matching.slice(0, limit), total: matching.length, limit });
  } catch (e) { apiError(res, e, localError(req, 'Impossible de charger la galerie vidéo.', 'Could not load the video gallery.')); }
});
app.get('/api/videos/:id', requireCloudinary, async (req, res) => {
  const id = req.params.id;
  if (!validPublicId(id)) return res.status(400).json({ error: localError(req, 'Identifiant vidéo invalide.', 'Invalid video ID.') });
  try {
    const asset = await cloud().api.resource(id, { resource_type: 'video', type: 'upload' });
    if (!asset.secure_url || asset.public_id !== id) return res.status(404).json({ error: localError(req, 'Vidéo introuvable.', 'Video not found.') });
    res.set('Cache-Control', 'no-store');
    res.json({ video: { id: asset.public_id, url: asset.secure_url, title: asset.display_name || asset.public_id.split('/').pop().replaceAll('_', ' '), created_at: asset.created_at, format: asset.format || null } });
  } catch (e) { apiError(res, e, localError(req, 'Impossible de récupérer cette vidéo.', 'Unable to retrieve this video.')); }
});
app.post('/api/upload-signature', requireAdmin, requireCloudinary, (req, res) => {
  const kind = mediaType(req.body?.type || 'video');
  const title = req.body?.title;
  if (!kind || !validTitle(title)) return res.status(400).json({ error: 'Type ou titre invalide / Invalid type or title.' });
  const rule = MEDIA_TYPES[kind];
  const params = {
    timestamp: Math.floor(Date.now() / 1000),
    asset_folder: rule.folder,
    public_id_prefix: rule.folder,
    display_name: title.trim(),
    allowed_formats: rule.formats
  };
  const signature = cloud().utils.api_sign_request(params, env.CLOUDINARY_API_SECRET);
  res.json({ ...params, signature, type:kind, api_key: env.CLOUDINARY_API_KEY, cloud_name: env.CLOUDINARY_CLOUD_NAME });
});
app.patch('/api/admin/videos/:id', requireAdmin, requireCloudinary, async (req, res) => {
  const id = req.params.id;
  if (!validPublicId(id)) return res.status(400).json({ error: 'Identifiant vidéo invalide.' });
  if (!validTitle(req.body?.title)) return res.status(400).json({ error: 'Titre invalide (2 à 100 caractères, sans /).' });
  try {
    const result = await cloud().api.update(id, {
      resource_type: 'video', type: 'upload', display_name: req.body.title.trim()
    });
    res.json({ ok: true, id, title: result.display_name || req.body.title.trim() });
  } catch (e) { apiError(res, e, 'Impossible de modifier cette vidéo.'); }
});
app.delete('/api/admin/videos/:id', requireAdmin, requireCloudinary, async (req, res) => {
  const id = req.params.id;
  if (!validPublicId(id)) return res.status(400).json({ error: 'Identifiant vidéo invalide.' });
  try {
    const result = await cloud().uploader.destroy(id, {
      resource_type: 'video', type: 'upload', invalidate: true
    });
    if (result.result !== 'ok') return res.status(404).json({ error: 'La vidéo est introuvable.' });
    res.json({ ok: true, deletedId: id });
  } catch (e) { apiError(res, e, 'Impossible de supprimer cette vidéo.'); }
});
app.post('/api/admin/videos/:id/replace', requireAdmin, requireCloudinary, async (req, res) => {
  const oldId = req.params.id;
  const newId = req.body?.newPublicId;
  if (!validPublicId(oldId) || !validPublicId(newId) || oldId === newId) {
    return res.status(400).json({ error: 'Identifiants de remplacement invalides.' });
  }
  try {
    // Verify the newly uploaded file exists before deleting the original one.
    const asset = await cloud().api.resource(newId, { resource_type: 'video', type: 'upload' });
    if (asset.public_id !== newId || !asset.secure_url) {
      return res.status(409).json({ error: 'La nouvelle vidéo n’est pas prête.' });
    }
    const result = await cloud().uploader.destroy(oldId, {
      resource_type: 'video', type: 'upload', invalidate: true
    });
    if (result.result !== 'ok') {
      return res.status(409).json({ error: 'Nouvelle vidéo publiée, mais l’ancienne n’a pas pu être supprimée.' });
    }
    res.json({ ok: true, replacedId: oldId, newId });
  } catch (e) { apiError(res, e, 'Impossible de finaliser le remplacement.'); }
});

// Independent, public media API: images and videos share a single collection response.
function mediaRecord(kind,a) {
  return {
    id:a.public_id, type:kind, url:a.secure_url,
    title:a.display_name||a.public_id.split('/').pop().replaceAll('_',' '),
    created_at:a.created_at, format:a.format||null
  };
}
async function listMediaKind(kind) {
  let cursor, media=[];
  for(let page=0;page<4;page++){
    const params={resource_type:kind,type:'upload',prefix:MEDIA_TYPES[kind].prefix,max_results:250};
    if(cursor)params.next_cursor=cursor;
    const result=await cloud().api.resources(params);
    media.push(...(result.resources||[]).filter(a=>mediaIdValid(kind,a.public_id)&&a.secure_url).map(a=>mediaRecord(kind,a)));
    cursor=result.next_cursor;if(!cursor)break;
  }
  return media;
}
app.get('/api/media', async(req,res)=>{
  if(!isCloudinaryReady())return res.json({configured:false,media:[],total:0});
  const type=req.query.type===undefined?'all':req.query.type;
  if(!['all','video','image'].includes(type))return res.status(400).json({error:localError(req,'Type invalide.','Invalid media type.')});
  const limit=req.query.limit===undefined?100:Number(req.query.limit);
  if(!Number.isInteger(limit)||limit<1||limit>1000)return res.status(400).json({error:localError(req,'Limite invalide (1 à 1000).','Invalid limit (1 to 1000).')});
  try{
    const groups=await Promise.all((type==='all'?['video','image']:[type]).map(listMediaKind));
    let media=groups.flat().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
    const q=typeof req.query.q==='string'?req.query.q.trim().toLocaleLowerCase().slice(0,100):'';
    if(q)media=media.filter(a=>a.title.toLocaleLowerCase().includes(q));
    res.set('Cache-Control','no-store');res.json({configured:true,media:media.slice(0,limit),total:media.length,limit});
  }catch(e){apiError(res,e,localError(req,'Impossible de récupérer les médias.','Could not load media.'));}
});
app.get('/api/media/:type/:id',requireCloudinary,async(req,res)=>{
  const {type,id}=req.params;
  if(!mediaIdValid(type,id))return res.status(400).json({error:localError(req,'Identifiant invalide.','Invalid media ID.')});
  try{
    const asset=await cloud().api.resource(id,{resource_type:type,type:'upload'});
    if(asset.public_id!==id||!asset.secure_url)return res.status(404).json({error:'Média introuvable / Media not found'});
    res.set('Cache-Control','no-store');res.json({media:mediaRecord(type,asset)});
  }catch(e){apiError(res,e,localError(req,'Impossible de récupérer ce média.','Could not fetch media.'));}
});
app.patch('/api/admin/media/:type/:id',requireAdmin,requireCloudinary,async(req,res)=>{
  const {type,id}=req.params;
  if(!mediaIdValid(type,id)||!validTitle(req.body?.title))return res.status(400).json({error:'Identifiant ou titre invalide / Invalid ID or title'});
  try{
    const changed=await cloud().api.update(id,{resource_type:type,type:'upload',display_name:req.body.title.trim()});
    res.json({ok:true,id,type,title:changed.display_name||req.body.title.trim()});
  }catch(e){apiError(res,e,'Modification impossible / Could not update media');}
});
app.delete('/api/admin/media/:type/:id',requireAdmin,requireCloudinary,async(req,res)=>{
  const {type,id}=req.params;
  if(!mediaIdValid(type,id))return res.status(400).json({error:'Identifiant invalide / Invalid ID'});
  try{
    const result=await cloud().uploader.destroy(id,{resource_type:type,type:'upload',invalidate:true});
    if(result.result!=='ok')return res.status(404).json({error:'Média introuvable / Media not found'});
    res.json({ok:true,type,deletedId:id});
  }catch(e){apiError(res,e,'Suppression impossible / Could not delete media');}
});
app.post('/api/admin/media/:type/:id/replace',requireAdmin,requireCloudinary,async(req,res)=>{
  const {type,id:oldId}=req.params,newId=req.body?.newPublicId;
  if(!mediaIdValid(type,oldId)||!mediaIdValid(type,newId)||oldId===newId)return res.status(400).json({error:'Identifiants invalides / Invalid media IDs'});
  try{
    const replacement=await cloud().api.resource(newId,{resource_type:type,type:'upload'});
    if(replacement.public_id!==newId||!replacement.secure_url)return res.status(409).json({error:'Nouveau fichier indisponible / New file unavailable'});
    const removed=await cloud().uploader.destroy(oldId,{resource_type:type,type:'upload',invalidate:true});
    if(removed.result!=='ok')return res.status(409).json({error:'Nouveau média disponible, ancien non supprimé / New media available, old not deleted'});
    res.json({ok:true,type,replacedId:oldId,newId});
  }catch(e){apiError(res,e,'Remplacement impossible / Could not replace media');}
});
app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url))));
app.get('/', (req, res) => res.redirect(302, '/index.html'));
app.get('/admin', (req, res) => res.redirect(308, '/admin.html'));
app.get('/admin/', (req, res) => res.redirect(308, '/admin.html'));
app.use((err, req, res, next) => {
  console.error('Unhandled request error:', err?.message || err);
  res.status(err.status || 500).json({ error: 'Erreur serveur.' });
});
export default app;

// Local development; Vercel automatically imports the Express app.
if (!process.env.VERCEL && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`Video Studio running on http://localhost:${port}`));
}
