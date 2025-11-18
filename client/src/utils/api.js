// Utility for making authenticated API requests for SuperAdmin
// Usage: import { superAdminApi } from './api';
// superAdminApi('/your-endpoint', { method: 'GET' })

import { getCookie } from "./cookies";

export async function superAdminApi(endpoint, options = {}) {
  const token = getCookie("superadmin_token");
  const headers = {
    ...(options.headers || {}),
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
  const response = await fetch(endpoint, {
    ...options,
    headers,
  });
  return response;
}
