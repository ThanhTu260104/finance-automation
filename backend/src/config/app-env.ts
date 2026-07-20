import 'dotenv/config';
import { isAbsolute, join, resolve } from 'path';

function envValue(key: string, fallback: string) {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function numberEnv(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
}

function booleanEnv(key: string, fallback: boolean) {
  const value = process.env[key]?.trim().toLowerCase();
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value);
}

function resolveFromCwd(pathValue: string) {
  return isAbsolute(pathValue) ? pathValue : resolve(process.cwd(), pathValue);
}

function normalizeApiPrefix(prefix: string) {
  return prefix.replace(/^\/+|\/+$/g, '');
}

function normalizePublicPrefix(prefix: string) {
  const withLeadingSlash = prefix.startsWith('/') ? prefix : `/${prefix}`;
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

function corsOrigin() {
  const raw = envValue('CORS_ORIGIN', 'http://localhost:3000');
  if (raw === '*') return true;
  const origins = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return origins.length > 1 ? origins : origins[0];
}

const apiPrefix = normalizeApiPrefix(envValue('API_PREFIX', 'api'));
const uploadDir = resolveFromCwd(envValue('UPLOAD_DIR', 'uploads'));
const uploadUrlPrefix = normalizePublicPrefix(
  envValue(
    'UPLOAD_URL_PREFIX',
    apiPrefix ? `/${apiPrefix}/uploads/` : '/uploads/',
  ),
);

export const appEnv = {
  nodeEnv: envValue('NODE_ENV', 'development'),
  host: process.env.HOST?.trim() || undefined,
  port: numberEnv('PORT', 4001),
  apiPrefix,
  corsOrigin: corsOrigin(),
  corsCredentials: booleanEnv('CORS_CREDENTIALS', true),
  appName: envValue('APP_NAME', 'SAW - REQUESTS API'),
  swaggerEnabled: booleanEnv('SWAGGER_ENABLED', true),
  swaggerPath: envValue('SWAGGER_PATH', apiPrefix ? `${apiPrefix}/docs` : 'docs'),
  uploadDir,
  proposalUploadDir: join(uploadDir, 'proposals'),
  uploadUrlPrefix,
  maxUploadFileSizeBytes: numberEnv('MAX_UPLOAD_FILE_SIZE_MB', 15) * 1024 * 1024,
  bcryptSaltRounds: numberEnv('BCRYPT_SALT_ROUNDS', 10),
  smtpHost: process.env.SMTP_HOST?.trim(),
  smtpPort: numberEnv('SMTP_PORT', 587),
  smtpSecure: booleanEnv('SMTP_SECURE', false),
  smtpUser: process.env.SMTP_USER?.trim(),
  smtpPassword: process.env.SMTP_PASSWORD?.trim(),
  smtpFrom: process.env.SMTP_FROM?.trim(),
  frontendUrl: envValue('FRONTEND_URL', 'https://saw.sicom.com.vn'),
};
