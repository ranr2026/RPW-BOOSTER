/**
 * Facebook API wrapper — delegates all FB operations to fb_helper.py
 * via child_process spawn. Python's requests library handles gzip,
 * redirects, and cookies correctly; node-fetch has issues with FB's
 * compressed / custom-protocol responses from server IPs.
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// fb_helper.py lives at artifacts/api-server/fb_helper.py
// dist/index.mjs → dist/ → api-server/
const HELPER_PATH = path.resolve(__dirname, "../fb_helper.py");

export interface FbProfile {
  uid: string;
  name: string;
  avatar: string;
  fb_dtsg: string;
  token?: string;
  authenticated?: boolean;
}

export interface FbActionResult {
  success: boolean;
  count?: number;
  message: string;
  logs: string[];
}

export interface FbTokenResult {
  token: string;
  uid: string;
  expires: string;
  logs?: string[];
}

async function callPython(input: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", [HELPER_PATH], {
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    py.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    py.on("close", (code) => {
      if (code !== 0 && !stdout) {
        reject(new Error(`Python helper failed (exit ${code}): ${stderr.slice(0, 300)}`));
        return;
      }
      try {
        const out = stdout.trim();
        if (!out) {
          reject(new Error(`Python helper returned empty output. stderr: ${stderr.slice(0, 200)}`));
          return;
        }
        const result = JSON.parse(out) as Record<string, unknown>;
        if (result.ok === false) {
          const err = new Error((result.message as string) || (result.error as string) || "Python helper error");
          reject(err);
          return;
        }
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse helper output: ${stdout.slice(0, 200)}`));
      }
    });

    py.on("error", (err) => {
      reject(new Error(`Failed to spawn python3: ${err.message}. Make sure python3 is installed.`));
    });

    py.stdin.write(JSON.stringify(input));
    py.stdin.end();
  });
}

export async function getProfile(cookie: string): Promise<FbProfile> {
  const result = await callPython({ action: "login", cookie }) as FbProfile & { ok: boolean };
  return {
    uid: result.uid ?? "",
    name: result.name ?? "",
    avatar: result.avatar ?? "",
    fb_dtsg: result.fb_dtsg ?? "",
    token: result.token ?? "",
    authenticated: result.authenticated ?? false,
  };
}

export async function addReaction(cookie: string, postUrl: string, reactionType: string): Promise<FbActionResult> {
  const result = await callPython({ action: "react", cookie, postUrl, reactionType }) as FbActionResult & { ok: boolean };
  return {
    success: result.success ?? false,
    message: result.message ?? "",
    logs: result.logs ?? [],
  };
}

export async function sharePost(cookie: string, postUrl: string, count: number): Promise<FbActionResult> {
  const result = await callPython({ action: "share", cookie, postUrl, count }) as FbActionResult & { ok: boolean };
  return {
    success: result.success ?? false,
    count: result.count ?? 0,
    message: result.message ?? "",
    logs: result.logs ?? [],
  };
}

export async function addComment(cookie: string, postUrl: string, comments: string[], count: number): Promise<FbActionResult> {
  const result = await callPython({ action: "comment", cookie, postUrl, comments, count }) as FbActionResult & { ok: boolean };
  return {
    success: result.success ?? false,
    count: result.count ?? 0,
    message: result.message ?? "",
    logs: result.logs ?? [],
  };
}

export async function getAccessToken(cookie: string): Promise<FbTokenResult> {
  const result = await callPython({ action: "token", cookie }) as FbTokenResult & { ok: boolean };
  return {
    token: result.token ?? "",
    uid: result.uid ?? "",
    expires: result.expires ?? "",
    logs: result.logs ?? [],
  };
}

export async function enableGuard(cookie: string, enable: boolean): Promise<FbActionResult> {
  const result = await callPython({ action: "guard", cookie, enable }) as FbActionResult & { ok: boolean };
  return {
    success: result.success ?? false,
    message: result.message ?? "",
    logs: result.logs ?? [],
  };
}
