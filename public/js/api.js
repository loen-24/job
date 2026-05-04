const SESSION_KEY = "airindiana_session";
const API_BASE_URL = "https://job-311m.onrender.com";

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getToken() {
  return getSession()?.token || null;
}

function getUser() {
  return getSession()?.user || null;
}

function showMessage(elementId, text, kind = "error") {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = text ? `<div class="message ${kind}">${text}</div>` : "";
}

function statusClass(status) {
  return `status-${String(status || "").toLowerCase().replace(/\s+/g, "-")}`;
}

function buildApiUrl(path) {
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

function resolveAssetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

async function apiRequest(url, options = {}) {
  const token = getToken();
  const headers = options.headers ? { ...options.headers } : {};

  const skipJson = options.body instanceof FormData;
  if (!skipJson && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildApiUrl(url), {
    ...options,
    headers,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(data?.message || "Request failed");
    error.status = response.status;
    throw error;
  }

  return data;
}
