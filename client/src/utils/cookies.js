// Small cookie helper used for migrating from localStorage
const isProduction = process.env.NODE_ENV === "production";

export function setCookie(name, value, days = 7, opts = {}) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  const cookieParts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Expires=${expires.toUTCString()}`,
    `Path=/`,
  ];

  // Security defaults for production
  if (isProduction) {
    cookieParts.push("Secure");
    cookieParts.push("SameSite=Lax");
  } else if (opts.sameSite) {
    cookieParts.push(`SameSite=${opts.sameSite}`);
  }

  if (opts.domain) cookieParts.push(`Domain=${opts.domain}`);

  document.cookie = cookieParts.join("; ");
}

export function getCookie(name) {
  const nameEq = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(";").map((p) => p.trim());
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith(nameEq)) {
      return decodeURIComponent(parts[i].substring(nameEq.length));
    }
  }
  return null;
}

export function removeCookie(name, opts = {}) {
  // To remove, set expiry in the past
  const cookieParts = [
    `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    `Path=/`,
  ];
  if (opts.domain) cookieParts.push(`Domain=${opts.domain}`);
  if (isProduction) {
    cookieParts.push("Secure");
    cookieParts.push("SameSite=Lax");
  }
  document.cookie = cookieParts.join("; ");
}

// Helpers for JSON values
export function setJsonCookie(name, valueObj, days = 7, opts = {}) {
  try {
    setCookie(name, JSON.stringify(valueObj), days, opts);
  } catch (e) {
    console.error("Failed to set JSON cookie", e);
  }
}

export function getJsonCookie(name) {
  const val = getCookie(name);
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch (e) {
    return null;
  }
}

export default {
  setCookie,
  getCookie,
  removeCookie,
  setJsonCookie,
  getJsonCookie,
};
