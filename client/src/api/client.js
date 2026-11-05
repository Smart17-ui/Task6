// A small wrapper around fetch used for every API call. It adds the login token,
// parses the JSON, and turns failed requests into errors the UI can display.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'lantern_token';

// The token is kept in localStorage so a login survives page reloads.
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // storage can be blocked in some private browsing modes
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Without storage the user simply stays logged out after a reload.
  }
}

// AuthContext registers a function here, to be called if the server rejects our token.
let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// An error with extra details: the HTTP status and any per-field validation messages.
export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request(method, path, body) {
  const token = getToken();
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only throws when no response arrived at all.
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // We sent a token and it was refused, so it has expired or the user was removed.
    if (response.status === 401 && token) onUnauthorized();

    // Turn [{ field, message }] into { field: message } for easy use in forms.
    const fieldErrors = {};
    for (const { field, message } of data.errors || []) fieldErrors[field] = message;
    throw new ApiError(data.message || 'Something went wrong', response.status, fieldErrors);
  }

  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
};
