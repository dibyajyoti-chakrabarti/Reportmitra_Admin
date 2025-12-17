// api.js — small helper for tokens + authenticated fetch with refresh
const ACCESS_KEY = "rm_access";
const REFRESH_KEY = "rm_refresh";

export function getAccess() {
  return localStorage.getItem(ACCESS_KEY);
}
export function getRefresh() {
  return localStorage.getItem(REFRESH_KEY);
}
export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/**
 * Attempt to refresh tokens using refresh token.
 * Returns new access (and optionally refresh) or throws.
 */
export async function refreshAccess() {
  const refresh = getRefresh();
  if (!refresh) throw new Error("no refresh token");

  const res = await fetch("/api/token/refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) throw new Error("refresh failed");
  const data = await res.json();
  // SIMPLE JWT returns { access: "..."} usually; keep refresh if present
  setTokens({ access: data.access, refresh: data.refresh || refresh });
  return data.access;
}

/**
 * fetch wrapper that tries to refresh once on 401 and retries.
 */
export async function fetchWithAuth(url, opts = {}) {
  const access = getAccess();
  const headers = new Headers(opts.headers || {});
  if (access) headers.set("Authorization", `Bearer ${access}`);
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");

  let res = await fetch(url, { ...opts, headers });

  if (res.status === 401) {
    try {
      const newAccess = await refreshAccess();
      headers.set("Authorization", `Bearer ${newAccess}`);
      res = await fetch(url, { ...opts, headers });
    } catch (err) {
      clearTokens();
      throw err;
    }
  }
  return res;
}

// append to frontend/src/api.js (after fetchWithAuth)
export async function getCurrentUser() {
  // fetch the current authenticated user from backend endpoint /api/me/
  const res = await fetchWithAuth("/api/me/", {
    method: "GET",
  });

  if (!res.ok) {
    // bubble an error with status + body for easier debugging
    const text = await res.text().catch(() => "");
    const err = new Error(`getCurrentUser failed: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function getIssues(status = null) {
  const qs = status && status !== "all" ? `?status=${status}` : "";
  const res = await fetchWithAuth(`/restapi/issues/${qs}`, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getIssues failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function getIssueDetail(trackingId) {
  const res = await fetchWithAuth(`/restapi/issues/${trackingId}/`, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getIssueDetail failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function getPresignedUpload(file) {
  const res = await fetchWithAuth("/api/presign-s3/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
    }),
  });

  if (!res.ok) throw new Error("Failed to get upload URL");
  return res.json(); // { url, key }
}

export async function resolveIssue(trackingId, completionKey) {
  const res = await fetchWithAuth(
    `/restapi/issues/${trackingId}/resolve/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completion_key: completionKey }),
    }
  );

  if (!res.ok) throw new Error("Failed to resolve issue");
  return res.json();
}

export async function updateIssueStatus(trackingId, status) {
  const res = await fetchWithAuth(
    `/restapi/issues/${trackingId}/status/`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`updateIssueStatus failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function createAccount(payload) {
  const res = await fetchWithAuth("/api/register/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`createAccount failed: ${res.status} ${text}`);
  }

  return res.json();
}
