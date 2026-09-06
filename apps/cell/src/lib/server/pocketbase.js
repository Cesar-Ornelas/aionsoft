import { env } from '$env/dynamic/private';
import PocketBase from 'pocketbase';

export function getPocketBaseUrl() {
  return env.PB_URL || 'http://127.0.0.1:8090';
}

export function createPocketBaseClient() {
  return new PocketBase(getPocketBaseUrl());
}

export async function getAdminPocketBaseClient() {
  const client = createPocketBaseClient();
  const adminEmail = env.PB_ADMIN_EMAIL || env.PB_EMAIL || 'admin@aionsoft.local';
  const adminPassword = env.PB_ADMIN_PASSWORD || env.PB_PASSWORD || 'admin123456';

  try {
    await client.admins.authWithPassword(adminEmail, adminPassword);
  } catch (error) {
    throw new Error(`PocketBase admin authentication failed: ${error.message || 'check PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD.'}`);
  }

  return client;
}
