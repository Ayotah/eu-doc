# Video Studio Media — FR / EN

A small **independent, lawful-media** application built with HTML, CSS, JavaScript, Express.js and Cloudinary. Supports videos and images, with single-admin authentication, public read-only APIs, add/rename/replace/delete actions, and a French/English language switch.

This project is **not** integrated with any third-party sales website. It does not include external website branding, content, admin accounts or secrets.

## Public API

| Method | Route | Result |
|---|---|---|
| GET | `/api` | JSON route index |
| GET | `/api/health` | `{ok,cloudinaryConfigured}` |
| GET | `/api/media?type=all&limit=100&q=` | `{configured,media,total,limit}` sorted newest-first |
| GET | `/api/media?type=image` | All images (up to configured limit) |
| GET | `/api/media?type=video` | All videos (up to configured limit) |
| GET | `/api/media/:type/:id` | One published image/video |
| GET | `/api/videos` | Legacy videos list |
| GET | `/api/videos/:id` | Legacy single-video lookup |

For `:id`, URL-encode the **full** Cloudinary public ID (including its `/`), for example `video-studio-images%2Fexample-id`. Allowed values for `:type` are `image` and `video`. `limit` is 1–1000; default 100. `q` filters by title. Public GET routes support cross-origin reading; private routes do not.

## Admin API

All admin media routes require a signed JWT in a secure, HttpOnly, SameSite cookie. They are not accessible to unauthenticated browsers.

| Method | Route | Body |
|---|---|---|
| POST | `/api/login` | `{email,password}` |
| POST | `/api/logout` | `{}` |
| GET | `/api/me` | n/a |
| POST | `/api/upload-signature` | `{title,type}` (`type=image|video`) |
| PATCH | `/api/admin/media/:type/:id` | `{title}` |
| POST | `/api/admin/media/:type/:id/replace` | `{newPublicId}` after new upload |
| DELETE | `/api/admin/media/:type/:id` | `{}` |

All mutations require `Content-Type: application/json`. There are also legacy `/api/admin/videos/...` endpoints.

The upload signature endpoint sends **only signed parameters** to the browser. The Cloudinary secret is server-only. Uploads go from browser to Cloudinary directly. Assets are organized in `video-studio-public` (videos) and `video-studio-images` (images), under dynamic folders. An admin can edit the display name, replace the file, or delete it; a replacement verifies the new asset before deleting the prior one. If deletion of the old asset fails, the new upload remains accessible, and the API reports that condition.

## Formats and size limits

- Images: JPEG, PNG, WebP, GIF, AVIF, up to **15 MiB** in browser.
- Videos: MP4, MOV, WebM, up to **90 MiB** in browser.
- Cloudinary may impose independent account quotas and plan-dependent upload limits. Files larger than these limits require a separate chunked-upload implementation.

## Environment setup

Copy `.env.example` into `.env` and fill server variables from the respective provider dashboards. Do **not** commit `.env` or put credentials in HTML/JS. `ADMIN_PASSWORD_HASH` expects `salt_hex:pbkdf2_sha256_hex` with 260,000 iterations and a 32-byte result. Use a securely randomized password and JWT secret.

```bash
npm install
npm run setup:local
npm run check
npm test
npm start
```

Open `http://localhost:3000/` and `http://localhost:3000/admin/`.

On Vercel, configure the same env variables in the project settings. A new production deployment is necessary after a secret change.

## Security notes

- After sharing a Cloudinary API secret or admin password in chat or any other insecure channel, **rotate it** in Cloudinary/Vercel before publishing.
- Use origin checks and signed JWT cookies; these are safeguards but **not a substitute for security review**. For sustained traffic, add provider-backed rate limiting for admin logins and server-side file scanning/moderation as appropriate.
- Only public assets are listed in the gallery. There is no moderation workflow or database in this minimal example.
- Cloudinary availability, live uploads, and delete/replace actions must be tested with the owner's credentials in the intended deployment.

Consultez `GUIDE-GITHUB-POWERSHELL.md` pour l’installation Windows et les commandes Git.
