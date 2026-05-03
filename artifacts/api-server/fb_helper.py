#!/usr/bin/env python3
"""
Lara Web — Facebook helper (curl_cffi edition).
Uses curl_cffi with Chrome TLS fingerprint impersonation to bypass
Cloudflare and Facebook bot-detection. Called via stdin/stdout JSON.
"""
import sys, json, re, time, base64, urllib.parse, random, string

# ── curl_cffi Chrome impersonation (TLS + HTTP/2 fingerprint) ───────────────
try:
    from curl_cffi import requests as cf
    CHROME = "chrome120"
    HAS_CFFI = True
except ImportError:
    import requests as cf
    CHROME = None
    HAS_CFFI = False

try:
    import requests as _req
    HAS_REQ = True
except ImportError:
    HAS_REQ = False

# ── Constants ────────────────────────────────────────────────────────────────
UA_CHR  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
UA_MOB  = "Mozilla/5.0 (Linux; Android 12; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
UA_MBX  = "Mozilla/5.0 (Linux; Android 9; SM-A505F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36"

HDR_BASE = {
    "User-Agent": UA_CHR,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "sec-ch-ua": '"Google Chrome";v="120", "Chromium";v="120", "Not-A.Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
}

HDR_MOB = {
    **HDR_BASE,
    "User-Agent": UA_MOB,
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
}

HDR_XHR = {
    "User-Agent": UA_CHR,
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest",
    "sec-ch-ua": '"Google Chrome";v="120", "Chromium";v="120", "Not-A.Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
}

# ── Session factory ──────────────────────────────────────────────────────────
def make_cf_session(raw_cookie: str, mobile: bool = False) -> cf.Session:
    """Create a curl_cffi Session with Chrome TLS fingerprint + raw cookie header."""
    cookie_str = _normalize_cookie(raw_cookie)
    hdrs = dict(HDR_MOB if mobile else HDR_BASE)
    hdrs["Cookie"] = cookie_str
    if HAS_CFFI:
        s = cf.Session(impersonate=CHROME)
    else:
        s = cf.Session()
    s.headers.update(hdrs)
    return s

def make_cf_get(url: str, cookie: str, mobile: bool = False, **kw) -> "cf.Response":
    """One-shot GET with Chrome TLS."""
    s = make_cf_session(cookie, mobile=mobile)
    return s.get(url, timeout=18, **kw)

def make_cf_post(url: str, cookie: str, data: dict, extra_headers: dict = None, **kw) -> "cf.Response":
    """One-shot POST with Chrome TLS."""
    s = make_cf_session(cookie)
    if extra_headers:
        s.headers.update(extra_headers)
    return s.post(url, data=data, timeout=18, **kw)

# ── Cookie helpers ───────────────────────────────────────────────────────────
def _parse_cookie(raw: str) -> dict:
    jar = {}
    if not raw or not isinstance(raw, str):
        return jar
    for line in raw.strip().split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) >= 7:
            jar[parts[5]] = parts[6]
            continue
        for kv in line.split(";"):
            kv = kv.strip()
            eq = kv.find("=")
            if eq > 0:
                k = kv[:eq].strip()
                v = kv[eq+1:].strip()
                if k:
                    jar[k] = v
    return jar

def _normalize_cookie(raw: str) -> str:
    jar = _parse_cookie(raw)
    return "; ".join(f"{k}={v}" for k, v in jar.items())

def _validate_cookie(raw: str) -> tuple:
    jar = _parse_cookie(raw)
    if "c_user" not in jar:
        return False, "Missing c_user — paste a complete Facebook cookie"
    if "xs" not in jar:
        return False, "Missing xs — paste a complete Facebook cookie"
    return True, ""

def _uid_from_cookie(raw: str) -> str:
    jar = _parse_cookie(raw)
    return jar.get("c_user") or jar.get("i_user", "")

# ── HTML extractors ──────────────────────────────────────────────────────────
def _dtsg(html: str) -> str:
    for p in [
        r'"fb_dtsg","([^"]+)"',
        r'name="fb_dtsg"\s+value="([^"]+)"',
        r'"DTSGInitData".*?"token":"([^"]+)"',
        r'\["DTSGInitData",\[\],\{"token":"([^"]+)"',
        r'"fb_dtsg":{"value":"([^"]+)"',
        r'fb_dtsg=([A-Za-z0-9_\-:]+)',
    ]:
        m = re.search(p, html, re.S)
        if m:
            return m.group(1)
    return ""

def _token(html: str) -> str:
    for p in [
        r'(EAAG[A-Za-z0-9+/=_%]{30,})',
        r'"access_token"\s*:\s*"(EAAG[A-Za-z0-9+/=_%]+)"',
        r'access_token=(EAAG[A-Za-z0-9+/%]+)',
    ]:
        m = re.search(p, html)
        if m:
            return urllib.parse.unquote(m.group(1))
    return ""

def _uid_html(html: str) -> str:
    for p in [r'"USER_ID":"(\d+)"', r'"userID":"(\d+)"', r'"uid":(\d+)', r'"viewerID":"(\d+)"']:
        m = re.search(p, html)
        if m:
            return m.group(1)
    return ""

_BAD_NAMES = {
    "facebook", "error", "login", "home", "log in",
    "facebook – log in or sign up", "log into facebook",
    "facebook - log in or sign up", "sign up for facebook",
    "facebook | log in or sign up", "facebook – logga in eller registrera dig",
}

def _name(html: str) -> str:
    for p in [
        r'"name":"([A-Za-zÀ-ÿ\u4e00-\u9fff][^"]{1,60})","__typename":"User"',
        r'"viewer_name":"([^"]+)"',
        r'"NAME":"([^"]+)"',
        r'"actorName":"([^"]+)"',
    ]:
        m = re.search(p, html, re.S)
        if m:
            n = m.group(1).strip()
            if n and n.lower() not in _BAD_NAMES and len(n) > 1:
                return n
    # Title as last resort — only if looks like a real name
    m = re.search(r'<title>([^<|]{2,50})\s*[\|<]', html, re.S)
    if m:
        n = m.group(1).strip()
        if n and n.lower() not in _BAD_NAMES and "facebook" not in n.lower():
            return n
    return ""

def _is_login_wall(html: str) -> bool:
    """True when Facebook shows the login/signup wall — cookie invalid/expired."""
    indicators = ['action="/login"', 'name="email"', 'name="pass"',
                  'log in to facebook', 'sign up for facebook',
                  'data-testid="royal_email"', '/login/?next=', 'login.php']
    low = html.lower()
    hits = sum(1 for i in indicators if i in low)
    return hits >= 2

def _checkpoint(html: str) -> bool:
    """True when cookie is invalid OR account has active security checkpoint."""
    if len(html) < 2000:
        return True
    if _is_login_wall(html):
        return True
    signs = ["checkpoint", "unusual activity", "confirm your identity",
             "security check", "help us confirm", "account is restricted",
             "verify your identity", "locked out", "suspicious activity"]
    low = html.lower()
    return any(s in low for s in signs)

def _post_id(url: str) -> str:
    for p in [r'/posts/(\d+)', r'story_fbid=(\d+)', r'fbid=(\d+)', r'v=(\d+)', r'/(\d{15,})']:
        m = re.search(p, url)
        if m:
            return m.group(1)
    nums = re.findall(r'\d{10,}', url)
    return nums[-1] if nums else url

def _rand(n: int = 8) -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=n))

def _feedback_id(post_id: str) -> str:
    return base64.b64encode(f"feedback:{post_id}".encode()).decode()

# ── Get fb_dtsg + uid (core auth) ───────────────────────────────────────────
def _get_auth(cookie: str, logs: list) -> tuple:
    """Returns (fb_dtsg, uid, token, authenticated).
    authenticated is True only when we found the user's UID in the page HTML
    (proving the session is valid, not just a login wall or checkpoint page).
    """
    uid = _uid_from_cookie(cookie)
    fb_dtsg = ""
    tok = ""
    authenticated = False

    attempts = [
        ("https://www.facebook.com/", False),
        ("https://m.facebook.com/",   True),
        ("https://mbasic.facebook.com/", True),
    ]
    for url, mob in attempts:
        try:
            s = make_cf_session(cookie, mobile=mob)
            r = s.get(url, timeout=18, allow_redirects=True)
            logs.append(f"[INFO] GET {url} → {r.status_code} ({len(r.text)}B)")
            html = r.text
            if r.status_code != 200 or len(html) < 2000:
                continue
            if _is_login_wall(html):
                logs.append("[WARN] Login wall detected — cookie invalid or expired")
                # Don't break; try next URL in case of redirect quirk
                continue
            if _checkpoint(html):
                logs.append("[WARN] Account checkpoint — resolve at facebook.com then re-export cookie")
                continue
            # Real session: extract tokens
            t = _dtsg(html)
            if t:
                fb_dtsg = t
            tok = _token(html) or tok
            uid2 = _uid_html(html)
            if uid2:
                uid = uid2
                authenticated = True
                logs.append(f"[OK] Authenticated session · UID {uid}")
                break
            elif uid and uid in html:
                # UID from cookie is present in page — session valid
                authenticated = True
                logs.append(f"[OK] Session confirmed via UID in page · {uid}")
                if t:
                    break
        except Exception as e:
            logs.append(f"[WARN] {url}: {e}")

    return fb_dtsg, uid, tok, authenticated

# ══════════════════════════════════════════════════════════════════════════════
# PROFILE
# ══════════════════════════════════════════════════════════════════════════════
def get_profile(cookie: str) -> dict:
    logs = []
    uid = _uid_from_cookie(cookie)
    name = ""
    avatar = f"https://graph.facebook.com/{uid}/picture?type=large"
    fb_dtsg = ""
    tok = ""

    fb_dtsg, uid, tok, authenticated = _get_auth(cookie, logs)

    # Try name extraction — only makes sense if session is live
    if authenticated or fb_dtsg:
        for url in [
            f"https://mbasic.facebook.com/profile.php?id={uid}",
            f"https://mbasic.facebook.com/{uid}",
        ]:
            if name:
                break
            try:
                s = make_cf_session(cookie, mobile=True)
                r = s.get(url, timeout=14)
                if r.status_code == 200 and len(r.text) > 1000 and not _is_login_wall(r.text):
                    n = _name(r.text)
                    if n:
                        name = n
                        logs.append(f"[OK] Name: {name}")
                    if not fb_dtsg:
                        fb_dtsg = _dtsg(r.text)
            except Exception as e:
                logs.append(f"[WARN] profile: {e}")

    if not name and authenticated:
        name = f"User {uid}"
    elif not name:
        name = "Unknown (invalid cookie)"

    # Avatar from graph (works without auth for public profiles)
    try:
        r2 = cf.get(f"https://graph.facebook.com/{uid}/picture?type=large&redirect=false",
                     timeout=8, impersonate=CHROME if HAS_CFFI else None)
        d = r2.json()
        if "data" in d and "url" in d["data"]:
            avatar = d["data"]["url"]
    except Exception:
        pass

    logs += [f"UID: {uid}", f"Name: {name}",
             f"fb_dtsg: {'✓' if fb_dtsg else '✗'}", f"Token: {'✓' if tok else '✗'}"]

    if not authenticated:
        return {
            "ok": False,
            "message": "Cookie is invalid or expired — please export a fresh Facebook cookie from your browser",
            "uid": uid, "name": name, "avatar": avatar,
            "fb_dtsg": "", "token": "", "authenticated": False, "logs": logs,
        }

    return {
        "ok": True, "uid": uid, "name": name, "avatar": avatar,
        "fb_dtsg": fb_dtsg, "token": tok,
        "authenticated": True, "logs": logs,
    }

# ══════════════════════════════════════════════════════════════════════════════
# REACT  — the core feature
# ══════════════════════════════════════════════════════════════════════════════
REACTION_MAP = {"LIKE": 1, "LOVE": 2, "HAHA": 4, "WOW": 3, "SAD": 7, "ANGRY": 8, "CARE": 16}
REACTION_STR = {"LIKE": "like", "LOVE": "love", "HAHA": "haha", "WOW": "wow", "SAD": "sad", "ANGRY": "angry", "CARE": "care"}

def do_react(cookie: str, post_url: str, reaction: str, count: int = 1) -> dict:
    logs = []
    post_id = _post_id(post_url)
    uid = _uid_from_cookie(cookie)
    rxn = reaction.upper()
    rxn_id = REACTION_MAP.get(rxn, 1)
    rxn_str = REACTION_STR.get(rxn, "like")
    logs.append(f"[INFO] Post: {post_id}  Reaction: {rxn}  Count: {count}")

    # ── Step 1: Get auth tokens ──────────────────────────────────────────────
    fb_dtsg, uid, access_token, authenticated = _get_auth(cookie, logs)
    if not fb_dtsg or not authenticated:
        return {"ok": True, "success": False,
                "message": "⚠️ Cookie invalid or expired — export a fresh cookie from facebook.com and try again. If you see a security alert on Facebook, resolve it first.",
                "logs": logs}

    reacted = 0

    for attempt in range(count):
        if attempt > 0:
            time.sleep(random.uniform(1.2, 2.5))

        done = False

        # ── Method A: mbasic scrape + follow like link (most reliable) ───────
        if not done:
            done = _react_mbasic(cookie, post_url, post_id, uid, rxn, rxn_id, logs)

        # ── Method B: Desktop GraphQL (CometUFIFeedbackReactMutation) ────────
        if not done:
            done = _react_graphql(cookie, post_id, uid, fb_dtsg, rxn_id, logs)

        # ── Method C: Graph API via access_token ────────────────────────────
        if not done and access_token:
            done = _react_graph_api(access_token, post_id, rxn_str, logs)

        # ── Method D: Mobile UFI endpoint ────────────────────────────────────
        if not done:
            done = _react_ufi(cookie, post_id, uid, fb_dtsg, rxn_id, logs)

        if done:
            reacted += 1
            logs.append(f"[OK] ✓ Attempt {attempt+1}/{count} succeeded")

    if reacted:
        return {"ok": True, "success": True, "count": reacted,
                "message": f"✅ Reacted {rxn} on {reacted}/{count} attempt(s)", "logs": logs}

    # Diagnose
    all_logs = "\n".join(logs)
    if "checkpoint" in all_logs.lower() or "1357054" in all_logs:
        msg = ("❌ Account checkpoint detected.\n\n"
               "Fix: Log in to facebook.com in your browser, resolve the security check, "
               "then re-export a fresh cookie and try again.")
    elif "no like link" in all_logs.lower() or "like_link_not_found" in all_logs.lower():
        msg = "❌ Post not accessible from server IP — post may be private or account needs checkpoint"
    else:
        msg = "❌ Reaction failed — ensure the post URL is public and your cookie is fresh"

    return {"ok": True, "success": False, "message": msg, "logs": logs}


def _react_mbasic(cookie: str, post_url: str, post_id: str, uid: str,
                  rxn: str, rxn_id: int, logs: list) -> bool:
    """Scrape mbasic for the like/react link and follow it — Chrome TLS."""
    # Build candidate mbasic URLs for the post
    mbasic_urls = []
    if "mbasic.facebook.com" in post_url:
        mbasic_urls.append(post_url)
    if "facebook.com/permalink" in post_url or "story_fbid" in post_url:
        mbasic_urls.append(post_url.replace("www.facebook.com", "mbasic.facebook.com").replace("m.facebook.com", "mbasic.facebook.com"))
    mbasic_urls += [
        f"https://mbasic.facebook.com/story.php?story_fbid={post_id}&id={uid}",
        f"https://mbasic.facebook.com/{uid}/posts/{post_id}",
        f"https://mbasic.facebook.com/permalink/{post_id}/",
        f"https://mbasic.facebook.com/photo.php?fbid={post_id}",
    ]

    for murl in mbasic_urls:
        try:
            s = make_cf_session(cookie, mobile=True)
            r = s.get(murl, timeout=15, allow_redirects=True)
            logs.append(f"[INFO] mbasic {murl[-60:]} → {r.status_code} ({len(r.text)}B)")
            if r.status_code != 200 or len(r.text) < 1000:
                continue
            html = r.text

            if _checkpoint(html[:500]):
                logs.append("[WARN] Checkpoint page on mbasic")
                continue

            # ── Find reaction link (handles all reaction types) ─────────────
            like_link = None
            fb_dtsg_mb = _dtsg(html)

            # Pattern 1: /ufi/react/ link with reaction type
            m = re.search(r'href="(/ufi/react/[^"]*)"', html)
            if m:
                like_link = "https://mbasic.facebook.com" + m.group(1).replace("&amp;", "&")
                logs.append("[INFO] Found /ufi/react/ link")

            # Pattern 2: /a/like.php link
            if not like_link:
                m = re.search(r'href="(/a/like\.php\?[^"]+)"', html)
                if m:
                    like_link = "https://mbasic.facebook.com" + m.group(1).replace("&amp;", "&")
                    logs.append("[INFO] Found /a/like.php link")

            # Pattern 3: reactions/react link
            if not like_link:
                m = re.search(r'href="(/reactions/react/[^"]+)"', html)
                if m:
                    like_link = "https://mbasic.facebook.com" + m.group(1).replace("&amp;", "&")
                    logs.append("[INFO] Found /reactions/react/ link")

            # Pattern 4: full href with like
            if not like_link:
                m = re.search(r'href="(https://mbasic\.facebook\.com/[^"]*like[^"]*)"', html)
                if m:
                    like_link = m.group(1).replace("&amp;", "&")
                    logs.append("[INFO] Found full like link")

            if not like_link:
                # Pattern 5: form with hidden fields
                form_m = re.search(r'<form[^>]+action="([^"]*(?:like|react)[^"]*)"[^>]*>(.*?)</form>', html, re.S | re.I)
                if form_m:
                    form_url = form_m.group(1).replace("&amp;", "&")
                    if not form_url.startswith("http"):
                        form_url = "https://mbasic.facebook.com" + form_url
                    fields = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', form_m.group(2)))
                    rl = s.post(form_url, data=fields, timeout=12)
                    logs.append(f"[DEBUG] form POST → {rl.status_code}")
                    if rl.status_code in (200, 302):
                        logs.append("[OK] Reacted via mbasic form ✓")
                        return True

            if not like_link:
                logs.append(f"[WARN] like_link_not_found on {murl[-50:]}")
                continue

            # ── Inject reaction type into the link ─────────────────────────
            # For non-LIKE reactions, modify the URL
            if rxn != "LIKE":
                if "/ufi/react/" in like_link or "/reactions/react/" in like_link:
                    # Replace or add reaction_type param
                    like_link = re.sub(r'reaction_type=[^&]+', f'reaction_type={rxn}', like_link)
                    if "reaction_type" not in like_link:
                        like_link += f"&reaction_type={rxn}"
                    like_link = re.sub(r'action=[^&]+', 'action=ADD_REACTION', like_link)
                    if "action" not in like_link:
                        like_link += "&action=ADD_REACTION"
                else:
                    # Build a react URL from scratch using the ft_ent_identifier
                    m2 = re.search(r'ft_ent_identifier=(\d+)', like_link)
                    av_m = re.search(r'av=(\d+)', like_link)
                    ent_id = m2.group(1) if m2 else post_id
                    av_id = av_m.group(1) if av_m else uid
                    if fb_dtsg_mb:
                        like_link = (
                            f"https://mbasic.facebook.com/ufi/react/?ft_ent_identifier={ent_id}"
                            f"&reaction_type={rxn}&action=ADD_REACTION&av={av_id}"
                            f"&fb_dtsg={fb_dtsg_mb}&__a=1"
                        )

            logs.append(f"[INFO] Following react link: ...{like_link[-60:]}")
            rl = s.get(like_link, timeout=14, allow_redirects=True,
                       headers={"Referer": murl})
            logs.append(f"[DEBUG] React GET → {rl.status_code} ({len(rl.text)}B)")

            if rl.status_code in (200, 302):
                rl_low = rl.text.lower()
                if any(x in rl_low for x in ["unlike", "remove reaction", "already", "success", "unreact"]):
                    logs.append("[OK] Reaction confirmed ✓")
                    return True
                if len(rl.text) > 500 and not _checkpoint(rl.text[:500]):
                    logs.append("[OK] Reacted via mbasic link ✓ (status 200)")
                    return True

        except Exception as e:
            logs.append(f"[WARN] mbasic error: {e}")

    return False


def _react_graphql(cookie: str, post_id: str, uid: str, fb_dtsg: str, rxn_id: int, logs: list) -> bool:
    """Desktop GraphQL CometUFIFeedbackReactMutation with Chrome TLS."""
    feedback_id = _feedback_id(post_id)
    for doc_id in ["3451082781643797", "7202203336474537", "2667888406626267"]:
        try:
            s = make_cf_session(cookie)
            s.headers.update({
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": "https://www.facebook.com",
                "Referer": "https://www.facebook.com/",
                "X-FB-Friendly-Name": "CometUFIFeedbackReactMutation",
                "X-ASBD-ID": "198387",
                "X-FB-LSD": _rand(10),
            })
            r = s.post("https://www.facebook.com/api/graphql/", data={
                "fb_dtsg": fb_dtsg,
                "variables": json.dumps({"input": {
                    "client_mutation_id": _rand(),
                    "actor_id": uid,
                    "feedback_id": feedback_id,
                    "feedback_reaction": rxn_id,
                    "feedback_source": "OBJECT",
                    "is_tracking_encrypted": True,
                    "tracking": [],
                    "action": "ADD_REACTION",
                }}),
                "doc_id": doc_id,
                "__a": "1",
                "__user": uid,
                "__req": _rand(4),
                "dpr": "2",
            }, timeout=15)
            logs.append(f"[DEBUG] GraphQL doc={doc_id} → {r.status_code}")
            if r.status_code == 200:
                txt = r.text
                if '"reaction"' in txt or ('"data"' in txt and "errors" not in txt[:200]):
                    logs.append("[OK] Reacted via GraphQL ✓")
                    return True
                if "1357054" in txt:
                    logs.append("[WARN] GraphQL 1357054 — checkpoint/IP block")
                    break
                logs.append(f"[DEBUG] response: {txt[:150]}")
        except Exception as e:
            logs.append(f"[WARN] GraphQL: {e}")
    return False


def _react_graph_api(token: str, post_id: str, rxn_str: str, logs: list) -> bool:
    """Use EAAG access token with Graph API likes endpoint."""
    try:
        if HAS_CFFI:
            r = cf.post(
                f"https://graph.facebook.com/v18.0/{post_id}/reactions",
                params={"type": rxn_str.upper(), "access_token": token},
                impersonate=CHROME, timeout=12
            )
        elif HAS_REQ:
            r = _req.post(f"https://graph.facebook.com/v18.0/{post_id}/reactions",
                          params={"type": rxn_str.upper(), "access_token": token}, timeout=12)
        else:
            return False
        logs.append(f"[DEBUG] Graph API reactions → {r.status_code}")
        d = r.json()
        if d.get("success") or "true" in str(d).lower():
            logs.append("[OK] Reacted via Graph API ✓")
            return True
        logs.append(f"[DEBUG] Graph API: {d}")
    except Exception as e:
        logs.append(f"[WARN] Graph API: {e}")
    return False


def _react_ufi(cookie: str, post_id: str, uid: str, fb_dtsg: str, rxn_id: int, logs: list) -> bool:
    """Mobile UFI /ufi/react/ endpoint."""
    for ufi_url in [
        "https://www.facebook.com/ufi/react/",
        "https://m.facebook.com/ufi/react/",
        "https://www.facebook.com/reactions/add/",
    ]:
        try:
            s = make_cf_session(cookie, mobile=True)
            s.headers.update({"Content-Type": "application/x-www-form-urlencoded",
                              "Origin": "https://www.facebook.com",
                              "Referer": f"https://www.facebook.com/{uid}/posts/{post_id}"})
            r = s.post(ufi_url, data={
                "ft_ent_identifier": post_id,
                "reaction_type": str(rxn_id),
                "action": "ADD_REACTION",
                "fb_dtsg": fb_dtsg,
                "__user": uid,
                "__a": "1",
            }, timeout=12)
            logs.append(f"[DEBUG] UFI {ufi_url} → {r.status_code}")
            if r.status_code == 200 and "error" not in r.text.lower()[:100]:
                logs.append(f"[OK] Reacted via UFI ✓")
                return True
        except Exception as e:
            logs.append(f"[WARN] UFI {ufi_url}: {e}")
    return False


# ══════════════════════════════════════════════════════════════════════════════
# SHARE
# ══════════════════════════════════════════════════════════════════════════════
def do_share(cookie: str, post_url: str, count: int) -> dict:
    logs = []
    post_id = _post_id(post_url)
    logs.append(f"[INFO] Sharing {post_id} × {count}")
    fb_dtsg, uid, access_token, authenticated = _get_auth(cookie, logs)
    if not fb_dtsg or not authenticated:
        return {"ok": True, "success": False, "count": 0,
                "message": "❌ Cookie invalid or expired — re-export a fresh cookie from facebook.com", "logs": logs}

    shared = 0
    for i in range(count):
        if i > 0:
            time.sleep(random.uniform(1.5, 3.0))
        logs.append(f"[INFO] Share {i+1}/{count}")
        done = False

        # Method A: Graph API share
        if access_token and not done:
            try:
                r = cf.post("https://graph.facebook.com/v18.0/me/feed",
                            params={"link": post_url, "published": "1", "access_token": access_token},
                            impersonate=CHROME if HAS_CFFI else None, timeout=12)
                d = r.json()
                if "id" in d:
                    logs.append(f"[OK] Shared via Graph API ✓ id={d['id']}")
                    done = True
                else:
                    logs.append(f"[WARN] Graph API: {d.get('error', {}).get('message', str(d)[:80])}")
            except Exception as e:
                logs.append(f"[WARN] Graph: {e}")

        # Method B: mbasic share form
        if not done:
            try:
                murl = f"https://mbasic.facebook.com/sharer/mbasic/share/?u={urllib.parse.quote(post_url)}&refid=8"
                s = make_cf_session(cookie, mobile=True)
                rm = s.get(murl, timeout=13)
                logs.append(f"[DEBUG] mbasic share page → {rm.status_code}")
                if rm.status_code == 200 and len(rm.text) > 500:
                    fa = re.search(r'<form[^>]+action="([^"]+)"', rm.text)
                    if fa:
                        form_url = fa.group(1).replace("&amp;", "&")
                        if not form_url.startswith("http"):
                            form_url = "https://mbasic.facebook.com" + form_url
                        hidden = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', rm.text))
                        rp = s.post(form_url, data=hidden, timeout=12)
                        logs.append(f"[DEBUG] share POST → {rp.status_code}")
                        if rp.status_code in (200, 302):
                            logs.append("[OK] Shared via mbasic ✓")
                            done = True
            except Exception as e:
                logs.append(f"[WARN] mbasic share: {e}")

        # Method C: GraphQL createShareStory
        if not done:
            try:
                s = make_cf_session(cookie)
                r = s.post("https://www.facebook.com/api/graphql/", data={
                    "fb_dtsg": fb_dtsg,
                    "variables": json.dumps({"input": {
                        "actor_id": uid, "client_mutation_id": _rand(),
                        "story_id": post_id,
                        "privacy": {"base_state": "EVERYONE", "allow": [], "deny": []},
                    }}),
                    "doc_id": "4004469316266496",
                    "__a": "1", "__user": uid,
                }, timeout=14)
                logs.append(f"[DEBUG] GraphQL share → {r.status_code}")
                if r.status_code == 200 and '"data"' in r.text and "errors" not in r.text:
                    logs.append("[OK] Shared via GraphQL ✓")
                    done = True
            except Exception as e:
                logs.append(f"[WARN] GraphQL share: {e}")

        if done:
            shared += 1

    return {
        "ok": True, "success": shared > 0, "count": shared,
        "message": f"✅ Shared {shared}/{count} times" if shared > 0 else "❌ Share failed — check cookie and post URL",
        "logs": logs
    }


# ══════════════════════════════════════════════════════════════════════════════
# COMMENT
# ══════════════════════════════════════════════════════════════════════════════
def do_comment(cookie: str, post_url: str, comments: list, count: int) -> dict:
    logs = []
    post_id = _post_id(post_url)
    logs.append(f"[INFO] Commenting on {post_id} × {count}")
    fb_dtsg, uid, _, authenticated = _get_auth(cookie, logs)
    if not fb_dtsg or not authenticated:
        return {"ok": True, "success": False, "count": 0,
                "message": "❌ Cookie invalid or expired — re-export a fresh cookie from facebook.com", "logs": logs}

    commented = 0
    feedback_id = _feedback_id(post_id)

    for i in range(count):
        if i > 0:
            time.sleep(random.uniform(2.0, 4.0))
        text = comments[i % len(comments)] if comments else "nice"
        logs.append(f"[INFO] Comment {i+1}/{count}: '{text[:40]}'")
        done = False

        # Method A: GraphQL CometUFICreateCommentMutation
        if not done:
            try:
                s = make_cf_session(cookie)
                s.headers.update({"Origin": "https://www.facebook.com",
                                  "Referer": post_url,
                                  "X-FB-Friendly-Name": "CometUFICreateCommentMutation"})
                r = s.post("https://www.facebook.com/api/graphql/", data={
                    "fb_dtsg": fb_dtsg,
                    "variables": json.dumps({"input": {
                        "client_mutation_id": _rand(),
                        "actor_id": uid,
                        "feedback_id": feedback_id,
                        "message": {"text": text},
                        "feedback_source": "OBJECT",
                    }}),
                    "doc_id": "4778700432218822",
                    "__a": "1", "__user": uid,
                }, timeout=14)
                logs.append(f"[DEBUG] GraphQL comment → {r.status_code}")
                if r.status_code == 200 and '"errors"' not in r.text and "1357054" not in r.text:
                    logs.append("[OK] Commented via GraphQL ✓")
                    done = True
                else:
                    logs.append(f"[DEBUG] {r.text[:120]}")
            except Exception as e:
                logs.append(f"[WARN] GraphQL comment: {e}")

        # Method B: mbasic comment form
        if not done:
            try:
                murl = f"https://mbasic.facebook.com/{uid}/posts/{post_id}"
                s = make_cf_session(cookie, mobile=True)
                rm = s.get(murl, timeout=13)
                if rm.status_code == 200:
                    fm = re.search(r'<form[^>]+action="([^"]*(?:comment|reply)[^"]*)"[^>]*>(.*?)</form>',
                                   rm.text, re.S | re.I)
                    if fm:
                        furl = fm.group(1).replace("&amp;", "&")
                        if not furl.startswith("http"):
                            furl = "https://mbasic.facebook.com" + furl
                        hidden = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', fm.group(2)))
                        hidden["comment_text"] = text
                        rp = s.post(furl, data=hidden, timeout=12)
                        logs.append(f"[DEBUG] mbasic comment → {rp.status_code}")
                        if rp.status_code in (200, 302):
                            logs.append("[OK] Commented via mbasic ✓")
                            done = True
            except Exception as e:
                logs.append(f"[WARN] mbasic comment: {e}")

        if done:
            commented += 1

    return {
        "ok": True, "success": commented > 0, "count": commented,
        "message": f"✅ Commented {commented}/{count} times" if commented > 0 else "❌ Comments failed",
        "logs": logs
    }


# ══════════════════════════════════════════════════════════════════════════════
# TOKEN
# ══════════════════════════════════════════════════════════════════════════════
def do_token(cookie: str) -> dict:
    logs = []
    uid = _uid_from_cookie(cookie)
    tok = ""

    # Try multiple pages
    for url, mob in [
        ("https://www.facebook.com/", False),
        ("https://www.facebook.com/marketplace/", False),
        ("https://adsmanager.facebook.com/adsmanager/manage", False),
        ("https://m.facebook.com/", True),
    ]:
        if tok:
            break
        try:
            s = make_cf_session(cookie, mobile=mob)
            r = s.get(url, timeout=14)
            logs.append(f"[INFO] {url} → {r.status_code} ({len(r.text)}B)")
            if r.status_code == 200:
                t = _token(r.text)
                if t:
                    tok = t
                    logs.append(f"[OK] Token found on {url} ✓")
        except Exception as e:
            logs.append(f"[WARN] {url}: {e}")

    # b-api fallback
    if not tok:
        try:
            app_token = "350685531728|62f8ce9f74b12f84c123cc23437a4a32"
            if HAS_CFFI:
                r = cf.get(
                    f"https://b-api.facebook.com/method/auth.login?email={uid}&format=json&access_token={app_token}&generate_session_cookies=1&locale=en_US",
                    headers={"User-Agent": "FBAN/FB4A;FBAV/377.0.0.29.112"},
                    impersonate=CHROME, timeout=10)
            else:
                r = _req.get(f"https://b-api.facebook.com/method/auth.login?email={uid}&format=json&access_token={app_token}&generate_session_cookies=1&locale=en_US",
                             headers={"User-Agent": "FBAN/FB4A;FBAV/377.0.0.29.112"}, timeout=10)
            d = r.json()
            if "access_token" in d:
                tok = d["access_token"]
                logs.append("[OK] Token via b-api ✓")
        except Exception as e:
            logs.append(f"[WARN] b-api: {e}")

    return {
        "ok": True, "token": tok, "uid": uid, "expires": "Session-based",
        "logs": logs + (["[OK] Token extracted ✓"] if tok else ["[FAIL] Token not found — checkpoint or expired cookie"])
    }


# ══════════════════════════════════════════════════════════════════════════════
# GUARD
# ══════════════════════════════════════════════════════════════════════════════
def do_guard(cookie: str) -> dict:
    logs = []
    uid = _uid_from_cookie(cookie)
    fb_dtsg, uid, _, authenticated = _get_auth(cookie, logs)
    logs.append(f"[INFO] Enabling profile guard for {uid}")
    if not fb_dtsg or not authenticated:
        return {"ok": True, "success": False, "message": "❌ Cookie invalid or expired — re-export from facebook.com", "logs": logs}

    # GraphQL profile guard mutation
    try:
        s = make_cf_session(cookie)
        r = s.post("https://www.facebook.com/api/graphql/", data={
            "fb_dtsg": fb_dtsg,
            "variables": json.dumps({"input": {
                "actor_id": uid, "privacy_setting": "PROFILE_GUARD",
                "value": "1", "client_mutation_id": _rand(),
            }}),
            "doc_id": "4847946388580875",
            "__a": "1", "__user": uid,
        }, timeout=14)
        logs.append(f"[DEBUG] Guard GraphQL → {r.status_code}")
        if r.status_code == 200 and '"errors"' not in r.text:
            logs.append("[OK] Profile guard enabled via GraphQL ✓")
            return {"ok": True, "success": True, "message": "✅ Profile guard enabled!", "logs": logs}
    except Exception as e:
        logs.append(f"[WARN] GraphQL guard: {e}")

    # Privacy endpoint
    try:
        s = make_cf_session(cookie)
        r = s.post("https://www.facebook.com/privacy/settings/profile_guard/enable/", data={
            "fb_dtsg": fb_dtsg, "__user": uid, "__a": "1",
        }, timeout=12)
        if r.status_code == 200:
            logs.append("[OK] Profile guard enabled via privacy endpoint ✓")
            return {"ok": True, "success": True, "message": "✅ Profile guard enabled!", "logs": logs}
    except Exception as e:
        logs.append(f"[WARN] Privacy endpoint: {e}")

    return {"ok": True, "success": False,
            "message": "❌ Guard failed — enable manually at facebook.com/settings", "logs": logs}


# ══════════════════════════════════════════════════════════════════════════════
# MAIN DISPATCH
# ══════════════════════════════════════════════════════════════════════════════
def main():
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({"ok": False, "error": "Empty input"})); return
        data = json.loads(raw)
        action = data.get("action", "")
        cookie = data.get("cookie", "")
        if not cookie:
            print(json.dumps({"ok": False, "error": "No cookie"})); return
        valid, err = _validate_cookie(cookie)
        if not valid:
            print(json.dumps({"ok": False, "error": err})); return

        if   action == "login":
            result = get_profile(cookie)
        elif action == "react":
            result = do_react(cookie, data.get("postUrl",""), data.get("reactionType","LIKE"), int(data.get("count",1)))
        elif action == "share":
            result = do_share(cookie, data.get("postUrl",""), int(data.get("count",1)))
        elif action == "comment":
            result = do_comment(cookie, data.get("postUrl",""), data.get("comments",["nice"]), int(data.get("count",1)))
        elif action == "token":
            result = do_token(cookie)
        elif action == "guard":
            result = do_guard(cookie)
        else:
            result = {"ok": False, "error": f"Unknown action: {action}"}

        print(json.dumps(result))
    except json.JSONDecodeError as e:
        print(json.dumps({"ok": False, "error": f"JSON decode: {e}"}))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))

if __name__ == "__main__":
    main()
