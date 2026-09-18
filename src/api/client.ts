// HTTP client for the Tasko/Propzel CRM.
//
// Requests go through our backend gateway (`/api/crm/...`) which forwards them
// to the CRM unchanged. The CRM's session lives in HttpOnly cookies that
// browser JS can't read and its own origin blocks CORS, so the gateway moves
// the session token through a readable `X-Session-Cookie` header. We persist
// that token in secure storage and send it back on every request — this works
// identically on web preview and on-device.

import { storage } from "@/src/utils/storage";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/crm`;
const COOKIE_KEY = "propzel.session.cookie";

let cookie: string | null = null;

export async function loadCookie(): Promise<void> {
  const stored = await storage.secureGet<string>(COOKIE_KEY, "");
  cookie = stored && stored.length > 0 ? stored : null;
}

export async function setSessionCookie(value: string | null): Promise<void> {
  cookie = value && value.length > 0 ? value : null;
  if (cookie) await storage.secureSet(COOKIE_KEY, cookie);
  else await storage.secureRemove(COOKIE_KEY);
}

export function hasSession(): boolean {
  return !!cookie;
}

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: any;
  params?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  let url = BASE + path;
  if (params) {
    const q = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (q) url += (url.includes("?") ? "&" : "?") + q;
  }
  return url;
}

export async function api<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params } = opts;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers["X-Session-Cookie"] = cookie;

  const res = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // The gateway echoes any refreshed session token here.
  const sessionHeader =
    (typeof (res.headers as any).get === "function" &&
      (res.headers as any).get("x-session-cookie")) ||
    null;
  if (sessionHeader) await setSessionCookie(sessionHeader);

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401) await setSessionCookie(null);
    const message =
      (data && (data.detail || data.message || data.error)) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, String(message), data);
  }

  return data as T;
}
