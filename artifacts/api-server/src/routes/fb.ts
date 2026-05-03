import { Router, type IRouter, type Request, type Response } from "express";
import { parseCookie, extractFbDtsg, extractUid, getProfile, addReaction, sharePost, addComment, enableGuard, getAccessToken } from "../lib/facebook.js";

const router: IRouter = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { cookie } = req.body as { cookie: string };
    if (!cookie) return res.status(400).json({ error: "MISSING_COOKIE", message: "Cookie is required" });

    const jar = parseCookie(cookie);
    const fb_dtsg = await extractFbDtsg(jar);
    const uid = await extractUid(jar);
    if (!uid) return res.status(400).json({ error: "INVALID_COOKIE", message: "Cookie is invalid or expired" });

    const profile = await getProfile(jar, uid, fb_dtsg);
    return res.json(profile);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: "LOGIN_FAILED", message: msg });
  }
});

router.post("/react", async (req: Request, res: Response) => {
  try {
    const { cookie, postUrl, reactionType, count = 1 } = req.body as {
      cookie: string; postUrl: string; reactionType: string; count?: number;
    };
    if (!cookie || !postUrl || !reactionType) {
      return res.status(400).json({ error: "MISSING_PARAMS", message: "cookie, postUrl, reactionType required" });
    }

    const jar = parseCookie(cookie);
    const fb_dtsg = await extractFbDtsg(jar);
    const uid = await extractUid(jar);
    if (!uid) return res.status(400).json({ error: "INVALID_COOKIE", message: "Cookie invalid" });

    const logs: string[] = [];
    let success = 0;

    for (let i = 0; i < Math.min(count, 1); i++) {
      const result = await addReaction(jar, fb_dtsg, uid, postUrl, reactionType, logs);
      if (result) success++;
    }

    return res.json({ success: success > 0, count: success, message: success > 0 ? `Reacted with ${reactionType}` : "Reaction failed", logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "REACT_FAILED", message: msg });
  }
});

router.post("/share", async (req: Request, res: Response) => {
  try {
    const { cookie, postUrl, count = 1 } = req.body as { cookie: string; postUrl: string; count?: number };
    if (!cookie || !postUrl) {
      return res.status(400).json({ error: "MISSING_PARAMS", message: "cookie and postUrl required" });
    }

    const jar = parseCookie(cookie);
    const fb_dtsg = await extractFbDtsg(jar);
    const uid = await extractUid(jar);
    if (!uid) return res.status(400).json({ error: "INVALID_COOKIE", message: "Cookie invalid" });

    const logs: string[] = [];
    let shared = 0;

    for (let i = 0; i < Math.min(count, 20); i++) {
      const ok = await sharePost(jar, fb_dtsg, uid, postUrl, logs);
      if (ok) shared++;
    }

    return res.json({ success: shared > 0, count: shared, message: `Shared ${shared}/${count} times`, logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "SHARE_FAILED", message: msg });
  }
});

router.post("/comment", async (req: Request, res: Response) => {
  try {
    const { cookie, postUrl, comments, count = 1 } = req.body as {
      cookie: string; postUrl: string; comments: string[]; count?: number;
    };
    if (!cookie || !postUrl || !comments?.length) {
      return res.status(400).json({ error: "MISSING_PARAMS", message: "cookie, postUrl, comments required" });
    }

    const jar = parseCookie(cookie);
    const fb_dtsg = await extractFbDtsg(jar);
    const uid = await extractUid(jar);
    if (!uid) return res.status(400).json({ error: "INVALID_COOKIE", message: "Cookie invalid" });

    const logs: string[] = [];
    let commented = 0;

    for (let i = 0; i < Math.min(count, 20); i++) {
      const text = comments[i % comments.length];
      const ok = await addComment(jar, fb_dtsg, uid, postUrl, text, logs);
      if (ok) commented++;
    }

    return res.json({ success: commented > 0, count: commented, message: `Commented ${commented}/${count} times`, logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "COMMENT_FAILED", message: msg });
  }
});

router.post("/token", async (req: Request, res: Response) => {
  try {
    const { cookie } = req.body as { cookie: string };
    if (!cookie) return res.status(400).json({ error: "MISSING_COOKIE", message: "Cookie required" });

    const jar = parseCookie(cookie);
    const uid = await extractUid(jar);
    if (!uid) return res.status(400).json({ error: "INVALID_COOKIE", message: "Cookie invalid" });

    const token = await getAccessToken(jar);
    return res.json({ token, uid, expires: "N/A" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "TOKEN_FAILED", message: msg });
  }
});

router.post("/guard", async (req: Request, res: Response) => {
  try {
    const { cookie, enable = true } = req.body as { cookie: string; enable?: boolean };
    if (!cookie) return res.status(400).json({ error: "MISSING_COOKIE", message: "Cookie required" });

    const jar = parseCookie(cookie);
    const fb_dtsg = await extractFbDtsg(jar);
    const uid = await extractUid(jar);
    if (!uid) return res.status(400).json({ error: "INVALID_COOKIE", message: "Cookie invalid" });

    const logs: string[] = [];
    const ok = await enableGuard(jar, fb_dtsg, uid, enable, logs);
    const action = enable ? "enabled" : "disabled";
    return res.json({ success: ok, message: ok ? `Profile guard ${action}` : `Failed to ${action} profile guard`, logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "GUARD_FAILED", message: msg });
  }
});

export default router;
