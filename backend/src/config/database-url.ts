export function resolveDatabaseUrl() {
  if (process.env.DATABASE_MODE?.trim().toLowerCase() !== 'local') {
    return process.env.DATABASE_URL;
  }

  const password = process.env.LOCAL_DATABASE_PASSWORD;
  if (!password) {
    throw new Error('LOCAL_DATABASE_PASSWORD is required in local database mode');
  }

  const user = encodeURIComponent(process.env.LOCAL_DATABASE_USER?.trim() || 'postgres');
  const encodedPassword = encodeURIComponent(password.trim());
  const host = process.env.LOCAL_DATABASE_HOST?.trim() || '127.0.0.1';
  const port = process.env.LOCAL_DATABASE_PORT?.trim() || '5432';
  const database = encodeURIComponent(process.env.LOCAL_DATABASE_NAME?.trim() || 'saw_requests');
  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;
}
