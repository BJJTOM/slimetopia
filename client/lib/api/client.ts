const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/** Resolve a relative media URL (e.g. /uploads/...) to a full URL */
export function resolveMediaUrl(url: string): string {
  if (!url || url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_BASE}${url}`;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;

  constructor(status: number, data: Record<string, unknown>) {
    super(
      (data.message as string) || (data.error as string) || `API error: ${status}`
    );
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.access_token && data.refresh_token) {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      return data.access_token as string;
    }
    return null;
  } catch {
    return null;
  }
}

function handleAuthFailure() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  // Redirect to login
  if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
}

export async function api<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new ApiError(res.status, data);
  }

  return res.json();
}

// Authenticated API helper with automatic token refresh on 401
export async function authApi<T>(
  endpoint: string,
  token: string,
  options: ApiOptions = {}
): Promise<T> {
  try {
    return await api<T>(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      // Try to refresh the token
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = tryRefreshToken().finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      const newToken = await (refreshPromise || tryRefreshToken());
      if (newToken) {
        // Retry the original request with the new token
        return api<T>(endpoint, {
          ...options,
          headers: {
            Authorization: `Bearer ${newToken}`,
            ...options.headers,
          },
        });
      }

      // Refresh failed — redirect to login
      handleAuthFailure();
    }
    throw err;
  }
}

// Upload API helper for multipart/form-data (video uploads etc.)
export async function uploadApi<T>(
  endpoint: string,
  formData: FormData,
  token: string,
  onProgress?: (pct: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}${endpoint}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data as T);
        } else {
          reject(new ApiError(xhr.status, data));
        }
      } catch {
        reject(new ApiError(xhr.status, { message: "Upload failed" }));
      }
    };

    xhr.onerror = () => {
      reject(new ApiError(0, { message: "Network error" }));
    };

    xhr.send(formData);
  });
}

export async function checkHealth() {
  return api<{ status: string; service: string; version: string }>(
    "/api/health"
  );
}
