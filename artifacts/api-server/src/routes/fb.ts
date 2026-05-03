import { Router, type IRouter, type Request, type Response } from "express";
import {
  getProfile,
  addReaction,
  sharePost,
  addComment,
  getAccessToken,
  enableGuard,
} from "../lib/facebook.js";

const router: IRouter = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { cookie } = req.body as { cookie: string };
    if (!cookie?.trim()) {
      return res.status(400).json({ error: "MISSING_COOKIE", message: "Paste your Facebook cookie first" });
    }
    const profile = await getProfile(cookie.trim());
    if (!profile.uid) {
      return res.status(400).json({ error: "INVALID_COOKIE", message: "Could not extract UID — make sure you paste the full cookie including c_user and xs" });
    }
    return res.json(profile);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Missing c_user") || msg.includes("Missing xs") || msg.includes("INVALID_COOKIE")) {
      return res.status(400).json({ error: "INVALID_COOKIE", message: msg });
    }
    return res.status(400).json({ error: "LOGIN_FAILED", message: msg });
  }
});

router.post("/react", async (req: Request, res: Response) => {
  try {
    const { cookie, postUrl, reactionType, count = 1 } = req.body as {
      cookie: string; postUrl: string; reactionType: string; count?: number;
    };
    if (!cookie?.trim()) return res.status(400).json({ error: "MISSING_COOKIE", message: "Cookie required" });
    if (!postUrl?.trim()) return res.status(400).json({ error: "MISSING_URL", message: "Post URL required" });
    if (!reactionType) return res.status(400).json({ error: "MISSING_REACTION", message: "Reaction type required" });

    const result = await addReaction(cookie.trim(), postUrl.trim(), reactionType);
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "REACT_FAILED", message: msg });
  }
});

router.post("/share", async (req: Request, res: Response) => {
  try {
    const { cookie, postUrl, count = 1 } = req.body as { cookie: string; postUrl: string; count?: number };
    if (!cookie?.trim()) return res.status(400).json({ error: "MISSING_COOKIE", message: "Cookie required" });
    if (!postUrl?.trim()) return res.status(400).json({ error: "MISSING_URL", message: "Post URL required" });

    const result = await sharePost(cookie.trim(), postUrl.trim(), Math.min(Number(count) || 1, 20));
    return res.json(result);
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
    if (!cookie?.trim()) return res.status(400).json({ error: "MISSING_COOKIE", message: "Cookie required" });
    if (!postUrl?.trim()) return res.status(400).json({ error: "MISSING_URL", message: "Post URL required" });
    if (!comments?.length) return res.status(400).json({ error: "MISSING_COMMENTS", message: "At least one comment required" });

    const result = await addComment(cookie.trim(), postUrl.trim(), comments, Math.min(Number(count) || 1, 20));
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "COMMENT_FAILED", message: msg });
  }
});

router.post("/token", async (req: Request, res: Response) => {
  try {
    const { cookie } = req.body as { cookie: string };
    if (!cookie?.trim()) return res.status(400).json({ error: "MISSING_COOKIE", message: "Cookie required" });

    const result = await getAccessToken(cookie.trim());
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "TOKEN_FAILED", message: msg });
  }
});

router.post("/guard", async (req: Request, res: Response) => {
  try {
    const { cookie, enable = true } = req.body as { cookie: string; enable?: boolean };
    if (!cookie?.trim()) return res.status(400).json({ error: "MISSING_COOKIE", message: "Cookie required" });

    const result = await enableGuard(cookie.trim(), Boolean(enable));
    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: "GUARD_FAILED", message: msg });
  }
});

export default router;
