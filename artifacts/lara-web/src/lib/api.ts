const BASE = "/api/fb";

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || data.error || `HTTP ${r.status}`);
  return data as T;
}

export interface FbProfile {
  uid: string;
  name: string;
  avatar: string;
  fb_dtsg: string;
}

export interface ActionResult {
  success: boolean;
  count?: number;
  message: string;
  logs?: string[];
}

export interface TokenResult {
  token: string;
  uid: string;
  expires: string;
}

export const api = {
  login: (cookie: string) => post<FbProfile>("/login", { cookie }),

  react: (cookie: string, postUrl: string, reactionType: string, count = 1) =>
    post<ActionResult>("/react", { cookie, postUrl, reactionType, count }),

  share: (cookie: string, postUrl: string, count: number) =>
    post<ActionResult>("/share", { cookie, postUrl, count }),

  comment: (cookie: string, postUrl: string, comments: string[], count: number) =>
    post<ActionResult>("/comment", { cookie, postUrl, comments, count }),

  token: (cookie: string) =>
    post<TokenResult>("/token", { cookie }),

  guard: (cookie: string, enable: boolean) =>
    post<ActionResult>("/guard", { cookie, enable }),
};
