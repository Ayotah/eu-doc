(function () {
  'use strict';
  const translations = {
    fr: {
      publicNav: 'Galerie publique', adminNav: 'Espace administrateur', homeNav: 'Accueil',
      publicEyebrow: 'Médias publics', publicTitle: 'Images et vidéos, au même endroit.',
      publicIntro: 'Les nouvelles images et vidéos apparaissent automatiquement dans la galerie.',
      recent: 'Publications récentes', loading: 'Chargement des médias…', empty: 'Aucun média publié pour le moment.',
      cloudMissing: 'Cloudinary n’est pas encore configuré.', unavailable: 'La galerie est indisponible.', error: 'Erreur', videoCount: '{count} média(s)',
      footerPublic: 'Video Studio · Galerie indépendante de médias', footerAdmin: 'Video Studio · Administration privée',
      private: 'Accès privé', administration: 'Administration', adminIntro: 'Ajoutez, modifiez, remplacez et supprimez vos images et vidéos.',
      login: 'Connexion administrateur', email: 'Adresse e-mail', password: 'Mot de passe', signIn: 'Se connecter',
      dashboard: 'Espace administrateur', addVideo: 'Publier un média', logout: 'Déconnexion',
      uploadIntro: 'Les images et vidéos sont stockées sur Cloudinary et apparaissent automatiquement sur la galerie publique.',
      title: 'Titre', titlePlaceholder: 'Ex. : Présentation du projet', file: 'Fichier image ou vidéo (image ≤ 15 Mo, vidéo ≤ 90 Mo)',
      publish: 'Publier', manage: 'Gérer les médias', refresh: 'Actualiser',
      manageIntro: 'Renommer, remplacer ou supprimer les images et vidéos publiées.',
      connected: 'Cloudinary connecté.', notConnected: 'Cloudinary non configuré.',
      edit: 'Modifier le titre', replace: 'Remplacer le fichier', remove: 'Supprimer',
      newTitle: 'Nouveau titre du média :', titleInvalid: 'Le titre doit avoir entre 2 et 100 caractères et ne pas contenir /.',
      updated: 'Titre modifié avec succès.', replaceQuestion: 'Remplacer « {title} » par le fichier choisi ?',
      replaced: 'Le média a été remplacé.', deleteQuestion: 'Supprimer définitivement « {title} » de Cloudinary ?', deleted: 'Média supprimé.',
      uploading: 'Envoi du fichier : {count} %', preparing: 'Préparation de l’upload…', videoType: 'Sélectionnez un fichier image (JPG, PNG, WebP, GIF, AVIF) ou vidéo (MP4, MOV, WebM).',
      videoSize: 'Le fichier dépasse la limite de taille permise.', uploadNetwork: 'Problème réseau lors de l’upload.',
      uploadTimeout: 'Le transfert a expiré. Réessayez.', uploadRefused: 'Cloudinary a refusé le fichier.',
      uploadBadResponse: 'Réponse Cloudinary incomplète.', published: 'Média publié ! Il est maintenant visible dans la galerie.',
      signInWait: 'Connexion…', signedIn: 'Connexion réussie.', signedOut: 'Déconnexion réussie.',
      genericError: 'Une erreur est survenue.', selectReplacement: 'Choisir un fichier de remplacement',
      apiInfo: 'API publique : GET /api/media et GET /api/media/{type}/{id}',
      noVideos: 'Aucune vidéo', languageLabel: 'Langue',
      mediaType: 'Type de fichier',
      image: 'Image',
      video: 'Vidéo',
      allMedia: 'Tous les médias',
      imageFormats: 'Images : JPG, PNG, WebP, GIF, AVIF (≤ 15 Mo)',
      videoFormats: 'Vidéos : MP4, MOV, WebM (≤ 90 Mo)'
    },
    en: {
      publicNav: 'Public gallery', adminNav: 'Admin dashboard', homeNav: 'Home',
      publicEyebrow: 'Public media', publicTitle: 'Images and videos, all in one place.',
      publicIntro: 'New images and videos automatically appear in the public gallery.',
      recent: 'Recent uploads', loading: 'Loading media…', empty: 'No media published yet.',
      cloudMissing: 'Cloudinary has not been configured yet.', unavailable: 'Gallery is unavailable.', error: 'Error', videoCount: '{count} item(s)',
      footerPublic: 'Video Studio · Independent media gallery', footerAdmin: 'Video Studio · Private administration',
      private: 'Private access', administration: 'Administration', adminIntro: 'Upload, edit, replace and delete your images and videos.',
      login: 'Admin sign in', email: 'Email address', password: 'Password', signIn: 'Sign in',
      dashboard: 'Admin dashboard', addVideo: 'Publish media', logout: 'Sign out',
      uploadIntro: 'Images and videos are stored on Cloudinary and automatically appear in the public gallery.',
      title: 'Title', titlePlaceholder: 'e.g. Project introduction', file: 'Image or video file (image ≤ 15 MB, video ≤ 90 MB)',
      publish: 'Publish', manage: 'Manage media', refresh: 'Refresh',
      manageIntro: 'Rename, replace or delete published images and videos.',
      connected: 'Cloudinary connected.', notConnected: 'Cloudinary is not configured.',
      edit: 'Edit title', replace: 'Replace file', remove: 'Delete',
      newTitle: 'New media title:', titleInvalid: 'The title must be 2–100 characters and cannot contain /.',
      updated: 'Title updated successfully.', replaceQuestion: 'Replace “{title}” with the selected file?',
      replaced: 'Media replaced.', deleteQuestion: 'Permanently delete “{title}” from Cloudinary?', deleted: 'Media deleted.',
      uploading: 'Uploading file: {count}%', preparing: 'Preparing upload…', videoType: 'Select an image (JPG, PNG, WebP, GIF, AVIF) or video (MP4, MOV, WebM).',
      videoSize: 'The file exceeds the allowed size.', uploadNetwork: 'Network error during upload.',
      uploadTimeout: 'Upload timed out. Please try again.', uploadRefused: 'Cloudinary rejected the file.',
      uploadBadResponse: 'Incomplete Cloudinary response.', published: 'Media published! It now appears in the gallery.',
      signInWait: 'Signing in…', signedIn: 'Signed in successfully.', signedOut: 'Signed out successfully.',
      genericError: 'Something went wrong.', selectReplacement: 'Select a replacement file',
      apiInfo: 'Public API: GET /api/media and GET /api/media/{type}/{id}',
      noVideos: 'No videos', languageLabel: 'Language',
      mediaType: 'File type',
      image: 'Image',
      video: 'Video',
      allMedia: 'All media',
      imageFormats: 'Images: JPG, PNG, WebP, GIF, AVIF (≤ 15 MB)',
      videoFormats: 'Videos: MP4, MOV, WebM (≤ 90 MB)'
    }
  };
  const query = new URLSearchParams(location.search).get('lang');
  let lang = (query === 'fr' || query === 'en') ? query : (() => { try { return localStorage.getItem('video-studio-language') || (navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en'); } catch { return 'fr'; } })();
  if (!translations[lang]) lang = 'fr';
  function t(key, args = {}) {
    let str = translations[lang][key] || translations.fr[key] || key;
    return str.replace(/\{(\w+)\}/g, (_, k) => String(args[k] ?? ''));
  }
  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    const selection = document.getElementById('language'); if (selection) selection.value = lang;
  }
  function change(next) {
    if (!translations[next]) return;
    lang = next; try { localStorage.setItem('video-studio-language', lang); } catch {}
    apply(); window.dispatchEvent(new Event('video:languagechange'));
  }
  window.VideoI18n = { t, lang: () => lang, apply, change, date: value => new Date(value).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB') };
  function init() {
    apply(); document.getElementById('language')?.addEventListener('change', e => change(e.target.value));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
