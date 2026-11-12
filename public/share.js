const pageUrl = new URL(window.location.href);
pageUrl.hash = '';
const pageTitle = document.title;

const whatsappUrl = new URL('https://wa.me/');
whatsappUrl.searchParams.set('text', `${pageTitle} ${pageUrl.href}`);
document.getElementById('whatsapp-share').href = whatsappUrl.href;

const telegramUrl = new URL('https://t.me/share/url');
telegramUrl.searchParams.set('url', pageUrl.href);
telegramUrl.searchParams.set('text', pageTitle);
document.getElementById('telegram-share').href = telegramUrl.href;
