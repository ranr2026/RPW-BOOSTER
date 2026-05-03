/**
 * Facebook API helper library for Lara Web clone.
 * Handles cookie parsing, token extraction, and all Facebook actions.
 */

import { logger } from "./logger.js";

const UA = "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36";
const MBASIC_UA = "Mozilla/5.0 (Linux; Android 9; SM-A505F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36";

export type CookieJar = Record<string, string>;

export function parseCookie(raw: string): CookieJar {
  const jar: CookieJar = {};

  if (!raw || typeof raw !== "string") return jar;

  raw = raw.trim();

  const lines = raw.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Netscape format: domain\tFLAG\tpath\tsecure\texpiry\tname\tvalue
    const parts = trimmed.split("\t");
    if (parts.length >= 7) {
      jar[parts[5]] = parts[6];
      continue;
    }

    // key=value pairs (semicolon-separated)
    const kvPairs = trimmed.split(";");
    for (const kv of kvPairs) {
      const eqIdx = kv.indexOf("=");
      if (eqIdx === -1) continue;
      const k = kv.slice(0, eqIdx).trim();
      const v = kv.slice(eqIdx + 1).trim();
      if (k) jar[k] = v;
    }
  }

  return jar;
}

export function cookieHeader(jar: CookieJar): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function fbFetch(url: string, jar: CookieJar, options: RequestInit = {}): Promise<Response> {
  const { default: fetch } = await import("node-fetch") as unknown as { default: typeof globalThis.fetch };
  const headers: Record<string, string> = {
    "User-Agent": UA,
    "Cookie": cookieHeader(jar),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    ...((options.headers as Record<string, string>) || {}),
  };
  return fetch(url, { ...options, headers }) as unknown as Response;
}

async function fbFetchMbasic(url: string, jar: CookieJar, options: RequestInit = {}): Promise<Response> {
  const { default: fetch } = await import("node-fetch") as unknown as { default: typeof globalThis.fetch };
  const headers: Record<string, string> = {
    "User-Agent": MBASIC_UA,
    "Cookie": cookieHeader(jar),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
    ...((options.headers as Record<string, string>) || {}),
  };
  return fetch(url, { ...options, headers }) as unknown as Response;
}

export async function extractFbDtsg(jar: CookieJar): Promise<string> {
  try {
    const r = await fbFetch("https://www.facebook.com/", jar);
    const html = await r.text();

    const patterns = [
      /"DTSGInitData".*?"token":"([^"]+)"/,
      /name="fb_dtsg" value="([^"]+)"/,
      /"fb_dtsg":{"value":"([^"]+)"/,
      /\["DTSGInitData",\[\],\{"token":"([^"]+)"/,
    ];

    for (const re of patterns) {
      const m = html.match(re);
      if (m) return m[1];
    }

    // Try mbasic
    const r2 = await fbFetchMbasic("https://mbasic.facebook.com/", jar);
    const html2 = await r2.text();
    for (const re of patterns) {
      const m = html2.match(re);
      if (m) return m[1];
    }

    return "";
  } catch (err) {
    logger.error({ err }, "extractFbDtsg failed");
    return "";
  }
}

export async function extractUid(jar: CookieJar): Promise<string | null> {
  // Try cookie first
  if (jar["c_user"]) return jar["c_user"];
  if (jar["i_user"]) return jar["i_user"];

  try {
    const r = await fbFetch("https://www.facebook.com/", jar);
    const html = await r.text();

    const patterns = [
      /"USER_ID":"(\d+)"/,
      /"userID":"(\d+)"/,
      /"id":"(\d{10,})"/,
      /\\"uid\\":(\d+)/,
      /"UID":(\d+)/,
    ];

    for (const re of patterns) {
      const m = html.match(re);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

export async function getProfile(jar: CookieJar, uid: string, fb_dtsg: string): Promise<{
  uid: string; name: string; avatar: string; fb_dtsg: string; token?: string;
}> {
  try {
    const r = await fbFetch(`https://www.facebook.com/profile.php?id=${uid}`, jar);
    const html = await r.text();

    let name = "";
    const namePatterns = [
      /"name":"([^"]+)","__typename":"User"/,
      /og:title.*?content="([^"]+)"/,
      /<title>([^<]+)<\/title>/,
    ];
    for (const re of namePatterns) {
      const m = html.match(re);
      if (m && m[1] !== "Facebook") { name = m[1].trim(); break; }
    }

    let avatar = `https://graph.facebook.com/${uid}/picture?type=large`;

    // Try to get real avatar URL
    const avatarM = html.match(/"uri":"(https:\/\/[^"]+profile_picture[^"]+)"/);
    if (avatarM) avatar = avatarM[1].replace(/\\u0026/g, "&");

    if (!name) {
      // Try mbasic
      const r2 = await fbFetchMbasic(`https://mbasic.facebook.com/profile.php?id=${uid}`, jar);
      const html2 = await r2.text();
      const m2 = html2.match(/<title>([^<]+)<\/title>/);
      if (m2 && m2[1] !== "Facebook") name = m2[1].trim();
    }

    return { uid, name: name || `User ${uid}`, avatar, fb_dtsg };
  } catch (err) {
    logger.error({ err }, "getProfile failed");
    return { uid, name: `User ${uid}`, avatar: `https://graph.facebook.com/${uid}/picture?type=large`, fb_dtsg };
  }
}

function extractPostId(postUrl: string): string {
  // Try various URL patterns
  const patterns = [
    /\/posts\/(\d+)/,
    /story_fbid=(\d+)/,
    /\/(\d{15,})/,
    /fbid=(\d+)/,
  ];
  for (const re of patterns) {
    const m = postUrl.match(re);
    if (m) return m[1];
  }
  return postUrl;
}

export async function addReaction(
  jar: CookieJar, fb_dtsg: string, uid: string, postUrl: string,
  reactionType: string, logs: string[]
): Promise<boolean> {
  const postId = extractPostId(postUrl);
  logs.push(`[INFO] Attempting ${reactionType} on post ${postId}`);

  const reactionMap: Record<string, number> = {
    LIKE: 1, LOVE: 2, HAHA: 4, WOW: 3, SAD: 7, ANGRY: 8, CARE: 16
  };
  const typeId = reactionMap[reactionType] || 1;

  // Method 1: GraphQL UFI endpoint
  const endpoints = [
    {
      url: "https://www.facebook.com/api/graphql/",
      body: new URLSearchParams({
        fb_dtsg,
        variables: JSON.stringify({
          input: {
            client_mutation_id: "1",
            actor_id: uid,
            feedback_id: Buffer.from(`feedback:${postId}`).toString("base64"),
            feedback_reaction: typeId,
            feedback_source: "OBJECT",
            is_tracking_encrypted: true,
            tracking: [],
          }
        }),
        doc_id: "3451082781643797",
        __a: "1",
      }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded", "X-FB-Friendly-Name": "CometUFIFeedbackReactMutation" },
    },
    {
      url: "https://www.facebook.com/reactions/react/",
      body: new URLSearchParams({
        ft_ent_identifier: postId,
        action: "add",
        reaction_type: String(typeId),
        fb_dtsg,
        __a: "1",
        __user: uid,
      }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
    {
      url: "https://mbasic.facebook.com/reactions/react/",
      body: new URLSearchParams({
        ft_ent_identifier: postId,
        action: "add",
        reaction_type: String(typeId),
        fb_dtsg,
        __a: "1",
        __user: uid,
      }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": MBASIC_UA },
    },
  ];

  for (const ep of endpoints) {
    try {
      const { default: fetch } = await import("node-fetch") as unknown as { default: typeof globalThis.fetch };
      const r = await fetch(ep.url, {
        method: "POST",
        headers: {
          "Cookie": cookieHeader(jar),
          "User-Agent": UA,
          "Referer": postUrl,
          "Origin": "https://www.facebook.com",
          ...ep.headers,
        } as Record<string, string>,
        body: ep.body,
      }) as unknown as Response;
      const txt = await r.text();
      const status = (r as unknown as { status: number }).status;
      logs.push(`[DEBUG] ${ep.url.replace("https://", "")} → ${status}`);

      if (status === 200 && (txt.includes('"reaction"') || txt.includes('"feedback"') || txt.includes("feedback_reaction"))) {
        logs.push(`[OK] Reaction ${reactionType} sent successfully`);
        return true;
      }
      if (status === 200 && !txt.includes("error")) {
        logs.push(`[OK] Request accepted (${status})`);
        return true;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logs.push(`[WARN] ${msg}`);
    }
  }

  // Method: mbasic like link scraping
  try {
    const r = await fbFetchMbasic(postUrl.replace("facebook.com", "mbasic.facebook.com"), jar);
    const html = await r.text();
    const likeMatch = html.match(/href="(\/reactions\/react\/[^"]+)"/);
    if (likeMatch) {
      const likeUrl = "https://mbasic.facebook.com" + likeMatch[1].replace(/&amp;/g, "&");
      const r2 = await fbFetchMbasic(likeUrl, jar);
      const s2 = (r2 as unknown as { status: number }).status;
      logs.push(`[OK] mbasic like link → ${s2}`);
      return s2 === 200 || s2 === 302;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logs.push(`[WARN] mbasic scrape: ${msg}`);
  }

  logs.push("[FAIL] All reaction methods failed");
  return false;
}

export async function sharePost(
  jar: CookieJar, fb_dtsg: string, uid: string, postUrl: string, logs: string[]
): Promise<boolean> {
  const postId = extractPostId(postUrl);
  logs.push(`[INFO] Sharing post ${postId}`);

  try {
    const { default: fetch } = await import("node-fetch") as unknown as { default: typeof globalThis.fetch };
    const body = new URLSearchParams({
      fb_dtsg,
      __user: uid,
      __a: "1",
      story_id: postId,
      story_location: "6",
      description: "",
      composer_type: "DEFAULT",
    }).toString();

    const r = await fetch("https://www.facebook.com/share_story/", {
      method: "POST",
      headers: {
        "Cookie": cookieHeader(jar),
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": postUrl,
        "Origin": "https://www.facebook.com",
      } as Record<string, string>,
      body,
    }) as unknown as Response;

    const txt = await r.text();
    const status = (r as unknown as { status: number }).status;
    logs.push(`[DEBUG] share → ${status}`);

    if (status === 200) {
      logs.push("[OK] Post shared successfully");
      return true;
    }

    // Alt: GraphQL share
    const body2 = new URLSearchParams({
      fb_dtsg,
      variables: JSON.stringify({
        input: {
          client_mutation_id: "2",
          actor_id: uid,
          story_id: postId,
        }
      }),
      doc_id: "4004469316266496",
      __a: "1",
    }).toString();

    const r2 = await fetch("https://www.facebook.com/api/graphql/", {
      method: "POST",
      headers: {
        "Cookie": cookieHeader(jar),
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
      } as Record<string, string>,
      body: body2,
    }) as unknown as Response;

    const s2 = (r2 as unknown as { status: number }).status;
    const t2 = await r2.text();
    logs.push(`[DEBUG] graphql share → ${s2}`);
    const ok = s2 === 200 && !t2.includes("error");
    if (ok) logs.push("[OK] Shared via GraphQL");
    else logs.push(`[WARN] Share may have failed: ${t2.slice(0, 100)}`);
    return ok;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logs.push(`[FAIL] Share error: ${msg}`);
    return false;
  }
}

export async function addComment(
  jar: CookieJar, fb_dtsg: string, uid: string, postUrl: string,
  text: string, logs: string[]
): Promise<boolean> {
  const postId = extractPostId(postUrl);
  logs.push(`[INFO] Commenting on post ${postId}: "${text.slice(0, 30)}"`);

  try {
    const { default: fetch } = await import("node-fetch") as unknown as { default: typeof globalThis.fetch };

    const body = new URLSearchParams({
      fb_dtsg,
      __user: uid,
      __a: "1",
      feedback_id: Buffer.from(`feedback:${postId}`).toString("base64"),
      message: JSON.stringify({ text }),
      input_name: "comment_text",
    }).toString();

    const r = await fetch("https://www.facebook.com/api/graphql/", {
      method: "POST",
      headers: {
        "Cookie": cookieHeader(jar),
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": postUrl,
        "X-FB-Friendly-Name": "CometUFICreateCommentMutation",
      } as Record<string, string>,
      body,
    }) as unknown as Response;

    const txt = await r.text();
    const status = (r as unknown as { status: number }).status;
    logs.push(`[DEBUG] comment → ${status}`);

    // Try mbasic comment
    const r2 = await fetch("https://mbasic.facebook.com/a/comment.php", {
      method: "POST",
      headers: {
        "Cookie": cookieHeader(jar),
        "User-Agent": MBASIC_UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": postUrl,
      } as Record<string, string>,
      body: new URLSearchParams({
        fb_dtsg,
        id: postId,
        comment_text: text,
        __a: "1",
        __user: uid,
      }).toString(),
    }) as unknown as Response;

    const s2 = (r2 as unknown as { status: number }).status;
    logs.push(`[DEBUG] mbasic comment → ${s2}`);

    const ok = status === 200 || s2 === 200 || s2 === 302;
    if (ok) logs.push("[OK] Comment posted");
    else logs.push("[FAIL] Comment failed");
    return ok;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logs.push(`[FAIL] Comment error: ${msg}`);
    return false;
  }
}

export async function enableGuard(
  jar: CookieJar, fb_dtsg: string, uid: string, enable: boolean, logs: string[]
): Promise<boolean> {
  const action = enable ? "enable" : "disable";
  logs.push(`[INFO] ${action} profile guard for uid ${uid}`);

  try {
    const { default: fetch } = await import("node-fetch") as unknown as { default: typeof globalThis.fetch };

    const body = new URLSearchParams({
      fb_dtsg,
      __user: uid,
      __a: "1",
      variables: JSON.stringify({
        input: {
          actor_id: uid,
          is_enabled: enable,
          client_mutation_id: "3",
        }
      }),
      doc_id: "4600640019986242",
    }).toString();

    const r = await fetch("https://www.facebook.com/api/graphql/", {
      method: "POST",
      headers: {
        "Cookie": cookieHeader(jar),
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-FB-Friendly-Name": "ProfileGuardMutation",
      } as Record<string, string>,
      body,
    }) as unknown as Response;

    const status = (r as unknown as { status: number }).status;
    const txt = await r.text();
    logs.push(`[DEBUG] guard → ${status}`);

    const ok = status === 200 && !txt.includes('"errors"');
    if (ok) logs.push(`[OK] Profile guard ${action}d`);
    else logs.push(`[WARN] Guard response: ${txt.slice(0, 150)}`);
    return ok;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logs.push(`[FAIL] Guard error: ${msg}`);
    return false;
  }
}

export async function getAccessToken(jar: CookieJar): Promise<string> {
  try {
    const { default: fetch } = await import("node-fetch") as unknown as { default: typeof globalThis.fetch };

    const r = await fetch("https://adsmanager.facebook.com/adsmanager/manage", {
      headers: {
        "Cookie": cookieHeader(jar),
        "User-Agent": UA,
      } as Record<string, string>,
    }) as unknown as Response;

    const html = await r.text();

    const patterns = [
      /accessToken":"([^"]+)"/,
      /"access_token":"([^"]+)"/,
      /EAABs[A-Za-z0-9+/=]{30,}/,
      /token=([A-Za-z0-9]+)/,
    ];

    for (const re of patterns) {
      const m = html.match(re);
      if (m) return m[1] || m[0];
    }

    // Try the token endpoint
    const r2 = await fetch("https://www.facebook.com/connect/login_success.html", {
      headers: {
        "Cookie": cookieHeader(jar),
        "User-Agent": UA,
      } as Record<string, string>,
    }) as unknown as Response;

    const h2 = await r2.text();
    const m2 = h2.match(/access_token=([^&"]+)/);
    if (m2) return m2[1];

    return "Token extraction requires OAuth flow";
  } catch (err) {
    logger.error({ err }, "getAccessToken failed");
    return "Token extraction failed";
  }
}
