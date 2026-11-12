import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const read=p=>readFileSync(join(dir,'..',p),'utf8');
const api=read('index.js');
const html=read('public/admin.html');
const client=read('public/admin/admin.js');
const publicJs=read('public/app.js');
const locales=read('public/i18n.js');
test('Public JSON endpoints cover both image and video media',()=>{
  for(const route of ["app.get('/api/media'", "app.get('/api/media/:type/:id'", "app.get('/api/videos'"])assert.ok(api.includes(route),route);
  assert.ok(api.includes("type==='all'?['video','image']"));
});
test('All media modifications are behind admin authentication',()=>{
  for(const route of ['patch','delete','post']) assert.match(api,new RegExp("app\\."+route+"\\('/api/admin/media/[^']*',requireAdmin,requireCloudinary"));
});
test('Image and video restrictions are applied in the browser and signing route',()=>{
  assert.ok(client.includes('maxSize = { image: 15 * 1024 * 1024, video: 90 * 1024 * 1024 }'));
  assert.ok(api.includes('allowed_formats: rule.formats'));
  assert.ok(api.includes('api_sign_request(params, env.CLOUDINARY_API_SECRET)'));
  assert.ok(client.includes('${type}/upload'));
});
test('Bilingual admin has media type selector',()=>{
  assert.ok(html.includes('id="media-type"'));
  assert.ok(html.includes('data-i18n="video"'));
  assert.ok(html.includes('data-i18n="image"'));
  assert.ok(locales.includes("fr: {")&&locales.includes("en: {"));
});
test('Gallery and admin routes open the correct pages',()=>{
  assert.ok(api.includes("app.get('/admin', (req, res) => res.redirect(308, '/admin.html'))"));
  assert.ok(api.includes("app.get('/admin/', (req, res) => res.redirect(308, '/admin.html'))"));
  assert.ok(html.includes('href="/index.html" data-i18n="publicNav"'));
});
test('Homepage contains the media gallery and independent guidance',()=>{
  const homepage=read('public/index.html');
  assert.ok(homepage.includes('Guide indépendant'));
  assert.ok(homepage.includes('Carte nationale d’identité'));
  assert.ok(homepage.includes('class="id-card-illustration"'));
  assert.ok(homepage.includes('VISUEL NON OFFICIEL'));
  assert.ok(homepage.includes('class="guide-menu-toggle"'));
  assert.ok(homepage.includes('aria-label="Ouvrir le menu de navigation"'));
  assert.ok(homepage.includes('id="primary-navigation"'));
  assert.ok(read('public/menu.js').includes("event.key === 'Escape'"));
  assert.ok(!homepage.includes('id="paiement"'));
  assert.ok(homepage.includes('href="#publications">Vidéos et photos</a>'));
  assert.ok(homepage.includes('href="#demarches">Découvrir les étapes'));
  assert.ok(homepage.includes('class="home-info-visual"'));
  assert.ok(homepage.includes('id="demarches"'));
  assert.ok(homepage.includes('id="publications"'));
  assert.ok(homepage.includes('id="videos"'));
  assert.ok(homepage.includes('data-media-endpoint="/api/media?type=all&amp;limit=1000"'));
  assert.ok(homepage.includes('href="./admin.html">Ouvrir l’administration'));
  assert.ok(homepage.includes('src="./app.js"'));
  assert.ok(homepage.includes('src="./i18n.js"'));
  assert.ok(homepage.includes('data-aos="fade-up"'));
  assert.ok(homepage.includes('AOS.init'));
  assert.ok(homepage.includes('id="message"'));
  assert.ok(!homepage.includes('guide-cards'));
  assert.ok(!homepage.includes('guide-steps'));
  assert.ok(!homepage.includes('gallery.html'));
  assert.throws(()=>read('public/gallery.html'),{code:'ENOENT'});
});
test('Homepage provides floating WhatsApp and Telegram share buttons',()=>{
  const homepage=read('public/index.html');
  const share=read('public/share.js');
  assert.ok(homepage.includes('class="floating-share"'));
  assert.ok(homepage.includes('id="whatsapp-share"'));
  assert.ok(homepage.includes('id="telegram-share"'));
  assert.ok(homepage.includes('src="./share.js"'));
  assert.ok(share.includes("https://wa.me/"));
  assert.ok(share.includes("https://t.me/share/url"));
});
test('Homepage contains practical guidance and an illustrative image without payment content',()=>{
  const homepage=read('public/index.html');
  assert.ok(!homepage.includes('paiement'));
  assert.ok(homepage.includes('https://www.service-public.fr/'));
  assert.ok(homepage.includes('Préparez votre demande en quelques étapes'));
  assert.ok(homepage.includes('Illustration des étapes de préparation d’une demande'));
  assert.ok(read('public/home-sections.css').includes('.home-info-layout{display:grid'));
  assert.throws(()=>read('public/paiement.html'),{code:'ENOENT'});
});
test('Public page renders images and videos safely as DOM elements',()=>{
  assert.ok(publicJs.includes("document.createElement('img')"));
  assert.ok(publicJs.includes("document.createElement('video')"));
  assert.ok(publicJs.includes('title.textContent = item.title'));
});
test('Homepage shows a friendly message when the media API returns HTML or fails',()=>{
  assert.ok(publicJs.includes("response.headers.get('content-type')?.includes('application/json')"));
  assert.ok(publicJs.includes("byId('message').textContent = t('unavailable')"));
  assert.ok(!publicJs.includes("byId('message').textContent = error.message"));
});
