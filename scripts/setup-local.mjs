import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '.env');
if (existsSync(output)) {
  console.error('Un fichier .env existe déjà. Je ne le remplace pas.');
  process.exitCode = 1;
} else {
  const salt = randomBytes(24);
  const password = randomBytes(18).toString('base64url');
  const digest = pbkdf2Sync(password, salt, 260000, 32, 'sha256').toString('hex');
  const jwt = randomBytes(48).toString('base64url');
  const template = readFileSync(resolve(root, '.env.example'), 'utf8');
  const updated = template
    .replace(/^ADMIN_EMAIL=.*$/m, 'ADMIN_EMAIL=admin@video-studio.local')
    .replace(/^ADMIN_PASSWORD_HASH=.*$/m, `ADMIN_PASSWORD_HASH=${salt.toString('hex')}:${digest}`)
    .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${jwt}`);
  writeFileSync(output, updated, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  console.log('Configuration locale créée : .env');
  console.log('Email administrateur : admin@video-studio.local');
  console.log('Mot de passe temporaire (copiez-le maintenant) : ' + password);
  console.log('Complétez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET dans .env avant l’upload.');
  console.log('Ne commitez jamais .env.');
}
