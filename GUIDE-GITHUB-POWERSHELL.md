# Guide Windows / PowerShell — Video Studio indépendant

## 1. Extraire le ZIP
Décompressez l'archive dans un nouveau dossier, par exemple `C:\Users\ephraim lifanjo\Desktop\video-studio`.

Vérifiez que le dossier contient directement `package.json`, `index.js`, `.gitignore` et `public`.

## 2. Exécuter localement
Ouvrez PowerShell dans le dossier extrait :

```powershell
cd "C:\Users\ephraim lifanjo\Desktop\video-studio"
npm install
npm run setup:local
npm run check
npm test
npm start
```

Le script de configuration crée `.env` et affiche une seule fois un mot de passe administrateur temporaire.
Modifiez `.env` localement pour entrer vos identifiants Cloudinary **actuels**. Ne les transmettez pas par chat et ne les ajoutez jamais à Git.

- Site public : `http://localhost:3000/`
- Dashboard : `http://localhost:3000/admin/`
- API : `http://localhost:3000/api`

`Ctrl + C` pour arrêter le serveur.

## 3. Créer un dépôt GitHub indépendant et publier
Dans GitHub, créez un dépôt vide pour cette plateforme de médias, sans README initial.
Toujours depuis le dossier de projet :

```powershell
git init
git add .
git status
git commit -m "Initial commit: bilingual video and image studio"
git branch -M main
git remote add origin https://github.com/TON_COMPTE/NOM_DU_DEPOT.git
git push -u origin main
```

**Remplacez** `TON_COMPTE/NOM_DU_DEPOT` par le dépôt de votre projet média indépendant. Ne tapez pas `https\://` : la syntaxe correcte est `https://`.

Si `git remote add origin` répond `remote origin already exists`, lancez `git remote -v` pour vérifier son adresse avant toute modification.

Pour les mises à jour suivantes :

```powershell
git add .
git commit -m "Update video studio"
git push
```

## 4. Déploiement Vercel
Connectez le dépôt GitHub de votre projet à Vercel, Framework Preset **Express**, puis configurez dans **Settings > Environment Variables** :

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `JWT_SECRET`

Utilisez les valeurs produites par la configuration locale pour les trois dernières variables, mais ne publiez jamais ces valeurs dans le dépôt. Si un secret a déjà été partagé, renouvelez-le avant la mise en production.

## Endpoints principaux

- `GET /api` — liste des routes
- `GET /api/media` — toutes les images et vidéos
- `GET /api/media?type=video` — vidéos uniquement
- `GET /api/media?type=image` — images uniquement
- `GET /api/media/:type/:id` — un média
- `POST /api/login` — authentification
- `POST /api/upload-signature` — signature d'upload (admin)
- `PATCH /api/admin/media/:type/:id` — modification (admin)
- `POST /api/admin/media/:type/:id/replace` — remplacement (admin)
- `DELETE /api/admin/media/:type/:id` — suppression (admin)

Les opérations Cloudinary nécessitent une configuration valide et des tests en conditions réelles.
