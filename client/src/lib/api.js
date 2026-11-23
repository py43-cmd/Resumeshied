import axios from 'axios';

import { isSessionInvalidCode } from './sessionStatus.js';

// Set by SessionContext. Kept here so every request gets the token
// without components having to pass it around.
let sessionToken = null;

export function setSessionToken(token) {
  sessionToken = token ?? null;
}

// Registered by SessionContext. Invoked when the server reports the cached
// session is gone (e.g. after a backend restart), so the stale token is dropped
// and the user is guided to start a new session instead of seeing a broken page.
let sessionInvalidHandler = null;

export function setSessionInvalidHandler(handler) {
  sessionInvalidHandler = handler ?? null;
}

export class ApiClientError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 30000,
  // No default Content-Type: axios sets application/json for objects and
  // multipart/form-data with the correct boundary for FormData in Phase 4.
});

api.interceptors.request.use((config) => {
  if (sessionToken) {
    config.headers['X-Session-Token'] = sessionToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0;
    const code = error.response?.data?.error?.code ?? 'NETWORK_ERROR';
    const message =
      error.response?.data?.error?.message ??
      'Cannot reach the server. Check your connection and try again.';

    if (isSessionInvalidCode(code) && sessionInvalidHandler) {
      sessionInvalidHandler();
    }

    return Promise.reject(new ApiClientError(code, message, status));
  },
);

/** Unwrap the { success, data, meta } envelope in one place. */
export async function apiRequest(config) {
  const response = await api.request(config);
  return response.data;
}

export default api;
