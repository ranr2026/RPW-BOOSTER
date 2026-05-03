#!/usr/bin/env python3
"""
Lara Web — Facebook helper script.
Called from Node.js API server via child_process.
Reads JSON from stdin, writes JSON result to stdout.
CRITICAL FIX: Uses raw cookie string directly in Cookie header (not individual cookies).
"""
import sys, json, re, time, base64, urllib.parse, random, string

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:
    print(json.dumps({"ok": False, "error": "requests not installed"}))
    sys.exit(0)

# ── User-Agents ──────────────────────────────────────────────────────────────
UA_MOB  = "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
UA_MBX  = "Mozilla/5.0 (Linux; Android 9; SM-A505F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36"
UA_WIN  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
UA_IOS  = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"

# ── Cookie helpers ───────────────────────────────────────────────────────────
def parse_cookie(raw: str) -> dict:
    """Parse cookie string into dict (handles netscape format and key=value; format)."""
    jar = {}
    if not raw or not isinstance(raw, str):
        return jar
    raw = raw.strip()
    for line in raw.split("\n"):
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

def normalize_cookie_str(raw: str) -> str:
    """Normalize cookie string to single-line key=value; format."""
    jar = parse_cookie(raw)
    return "; ".join(f"{k}={v}" for k, v in jar.items())

def make_session(raw_cookie: str) -> requests.Session:
    """Create a requests.Session with the raw cookie string set directly in headers."""
    s = requests.Session()
    # CRITICAL: Set raw cookie as header, NOT individual cookies
    # This preserves URL-encoded values like xs=44%3A... exactly as Facebook expects
    cookie_str = normalize_cookie_str(raw_cookie)
    s.headers.update({
        "User-Agent": UA_MOB,
        "Cookie": cookie_str,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    })
    return s

def make_session_raw(raw_cookie: str) -> requests.Session:
    """Session with raw cookie exactly as provided (preserving original encoding)."""
    s = requests.Session()
    # Strip newlines, keep original format
    cookie_str = " ".join(raw_cookie.split("\n")).strip()
    # If it's netscape format (has tabs), convert to key=value
    if "\t" in cookie_str:
        cookie_str = normalize_cookie_str(raw_cookie)
    s.headers.update({
        "User-Agent": UA_MOB,
        "Cookie": cookie_str,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-PH,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "sec-ch-ua": '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "Upgrade-Insecure-Requests": "1",
    })
    return s

def validate_cookie(jar: dict) -> tuple:
    if "c_user" not in jar:
        return False, "Missing c_user — paste a complete Facebook cookie"
    if "xs" not in jar:
        return False, "Missing xs — paste a complete Facebook cookie (c_user + xs required)"
    return True, ""

def extract_dtsg(html: str) -> str:
    for pat in [
        r'"fb_dtsg","([^"]+)"',
        r'name="fb_dtsg"\s+value="([^"]+)"',
        r'"DTSGInitData".*?"token":"([^"]+)"',
        r'"fb_dtsg":{"value":"([^"]+)"',
        r'\["DTSGInitData",\[\],\{"token":"([^"]+)"',
        r'fb_dtsg=([A-Za-z0-9_\-:]+)',
    ]:
        m = re.search(pat, html, re.S)
        if m:
            return m.group(1)
    return ""

def extract_eaag(html: str) -> str:
    for pat in [
        r'(EAAG[A-Za-z0-9+/=_%]{30,})',
        r'"access_token"\s*:\s*"(EAAG[A-Za-z0-9+/=_%]+)"',
        r'access_token=(EAAG[A-Za-z0-9+/%]+)',
    ]:
        m = re.search(pat, html)
        if m:
            return urllib.parse.unquote(m.group(1))
    return ""

def extract_uid_from_html(html: str) -> str:
    for pat in [r'"USER_ID":"(\d+)"', r'"userID":"(\d+)"', r'"uid":(\d+)', r'"UID":(\d+)', r'"viewerID":"(\d+)"']:
        m = re.search(pat, html)
        if m:
            return m.group(1)
    return ""

def extract_name(html: str) -> str:
    for pat in [
        r'"name":"([A-Za-z][^"]{1,60})","__typename":"User"',
        r'"viewer_name":"([^"]+)"',
        r'"NAME":"([^"]+)"',
        r'<title>([^<|]{2,60})\s*[\|<]',
        r'"actorName":"([^"]+)"',
    ]:
        m = re.search(pat, html, re.S)
        if m:
            cand = m.group(1).strip()
            if cand and cand not in ("Facebook", "Error", "Login", "Home"):
                return cand
    return ""

def get_post_id(url: str) -> str:
    for pat in [r'/posts/(\d+)', r'story_fbid=(\d+)', r'fbid=(\d+)', r'v=(\d+)', r'/(\d{15,})']:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    nums = re.findall(r'\d{10,}', url)
    return nums[-1] if nums else url

def is_checkpoint(html: str) -> bool:
    ck = ["checkpoint", "Checkpoint", "unusual activity", "Confirm Your Identity",
          "security check", "help us confirm it's you", "Error Facebook", "account is restricted"]
    return any(c.lower() in html.lower() for c in ck) or len(html) < 5000

def rand_mutation_id() -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

# ── Profile fetch ────────────────────────────────────────────────────────────
def get_profile(raw_cookie: str) -> dict:
    jar = parse_cookie(raw_cookie)
    uid = jar.get("c_user") or jar.get("i_user", "")
    avatar = f"https://graph.facebook.com/{uid}/picture?type=large"
    name = ""
    fb_dtsg = ""
    token = ""
    logs = []

    s = make_session_raw(raw_cookie)

    # Method 1: www.facebook.com homepage
    try:
        r = s.get("https://www.facebook.com/", timeout=14, allow_redirects=True)
        logs.append(f"[INFO] www.fb status={r.status_code} len={len(r.text)}")
        if r.status_code == 200 and len(r.text) > 5000 and not is_checkpoint(r.text[:1000]):
            fb_dtsg = extract_dtsg(r.text)
            token = extract_eaag(r.text)
            uid2 = extract_uid_from_html(r.text)
            if uid2:
                uid = uid2
            name = extract_name(r.text)
            if fb_dtsg:
                logs.append(f"[OK] fb_dtsg extracted from homepage")
            if name:
                logs.append(f"[OK] Name: {name}")
    except Exception as e:
        logs.append(f"[WARN] www.fb: {e}")

    # Method 2: m.facebook.com
    if not fb_dtsg:
        try:
            s2 = make_session_raw(raw_cookie)
            s2.headers.update({"User-Agent": UA_MBX})
            r2 = s2.get("https://m.facebook.com/", timeout=12)
            logs.append(f"[INFO] m.fb status={r2.status_code} len={len(r2.text)}")
            if r2.status_code == 200 and len(r2.text) > 2000:
                fb_dtsg = fb_dtsg or extract_dtsg(r2.text)
                name = name or extract_name(r2.text)
                if fb_dtsg:
                    logs.append("[OK] fb_dtsg from m.facebook.com")
        except Exception as e:
            logs.append(f"[WARN] m.fb: {e}")

    # Method 3: mbasic.facebook.com profile
    if not name:
        try:
            s3 = make_session_raw(raw_cookie)
            s3.headers.update({"User-Agent": UA_MBX})
            r3 = s3.get(f"https://mbasic.facebook.com/profile.php?id={uid}", timeout=12)
            if r3.status_code == 200 and len(r3.text) > 1000:
                n = extract_name(r3.text)
                if n:
                    name = n
                    logs.append(f"[OK] Name from mbasic: {name}")
                if not fb_dtsg:
                    fb_dtsg = extract_dtsg(r3.text)
        except Exception as e:
            logs.append(f"[WARN] mbasic: {e}")

    # Method 4: profile_pictures from graph API
    try:
        r4 = requests.get(
            f"https://graph.facebook.com/{uid}/picture?type=large&redirect=false",
            headers={"User-Agent": UA_WIN}, timeout=8)
        if r4.status_code == 200:
            d4 = r4.json()
            if "data" in d4 and "url" in d4["data"]:
                avatar = d4["data"]["url"]
    except Exception:
        pass

    if not name:
        name = f"User {uid}"

    authenticated = bool(fb_dtsg)

    logs.extend([
        f"UID: {uid}",
        f"Name: {name}",
        f"fb_dtsg: {'found ✓' if fb_dtsg else 'not found'}",
        f"Token: {'found ✓' if token else 'not found'}",
        f"Authenticated: {authenticated}",
    ])

    return {
        "ok": True,
        "uid": uid,
        "name": name,
        "avatar": avatar,
        "fb_dtsg": fb_dtsg,
        "token": token,
        "authenticated": authenticated,
        "logs": logs,
    }

# ── Reaction ─────────────────────────────────────────────────────────────────
REACTION_MAP = {"LIKE": 1, "LOVE": 2, "HAHA": 4, "WOW": 3, "SAD": 7, "ANGRY": 8, "CARE": 16}
# Map reaction names to GraphQL enum values
REACTION_ENUM = {"LIKE": "LIKE", "LOVE": "LOVE", "HAHA": "HAHA", "WOW": "WOW", "SAD": "SAD", "ANGRY": "ANGRY", "CARE": "CARE"}

def do_react(raw_cookie: str, post_url: str, reaction: str, count: int = 1) -> dict:
    logs = []
    post_id = get_post_id(post_url)
    jar = parse_cookie(raw_cookie)
    uid = jar.get("c_user", "")
    reaction_id = REACTION_MAP.get(reaction.upper(), 1)
    reaction_enum = REACTION_ENUM.get(reaction.upper(), "LIKE")
    logs.append(f"[INFO] Post ID: {post_id}")
    logs.append(f"[INFO] Reaction: {reaction} (id={reaction_id})")

    s = make_session_raw(raw_cookie)
    fb_dtsg = ""

    # Get fb_dtsg
    for attempt_url in ["https://www.facebook.com/", "https://m.facebook.com/"]:
        try:
            ua = UA_MOB if "www" in attempt_url else UA_MBX
            r = s.get(attempt_url, headers={"User-Agent": ua}, timeout=13, allow_redirects=True)
            logs.append(f"[INFO] {attempt_url} → {r.status_code} ({len(r.text)}B)")
            if r.status_code == 200 and len(r.text) > 3000:
                fb_dtsg = extract_dtsg(r.text)
                uid2 = extract_uid_from_html(r.text)
                if uid2:
                    uid = uid2
                if fb_dtsg:
                    logs.append(f"[OK] fb_dtsg found")
                    break
                if is_checkpoint(r.text):
                    logs.append(f"[WARN] Account checkpoint detected on {attempt_url}")
        except Exception as e:
            logs.append(f"[WARN] {attempt_url}: {e}")

    logs.append(f"[INFO] fb_dtsg: {'found' if fb_dtsg else 'NOT found'}")
    logs.append(f"[INFO] uid: {uid}")

    if not fb_dtsg:
        logs.append("[FAIL] Could not get fb_dtsg — cookie is invalid or account is checkpointed")
        return {"ok": True, "success": False, "message": "Invalid cookie or account checkpoint — please verify your cookie is active", "logs": logs}

    reacted = 0
    errors = []

    for i in range(count):
        if i > 0:
            time.sleep(random.uniform(0.8, 2.0))
        
        success_this = False
        feedback_id = base64.b64encode(f"feedback:{post_id}".encode()).decode()

        # Method 1: UFI React GraphQL (multiple doc_ids)
        doc_ids = ["3451082781643797", "7202203336474537", "2667888406626267"]
        for doc_id in doc_ids:
            if success_this:
                break
            try:
                rr = s.post("https://www.facebook.com/api/graphql/",
                    headers={
                        "User-Agent": UA_MOB,
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Referer": post_url,
                        "Origin": "https://www.facebook.com",
                        "X-FB-Friendly-Name": "CometUFIFeedbackReactMutation",
                        "X-ASBD-ID": "198387",
                        "X-FB-LSD": "".join(random.choices(string.ascii_letters, k=10)),
                    },
                    data={
                        "fb_dtsg": fb_dtsg,
                        "variables": json.dumps({"input": {
                            "client_mutation_id": rand_mutation_id(),
                            "actor_id": uid,
                            "feedback_id": feedback_id,
                            "feedback_reaction": reaction_id,
                            "feedback_source": "OBJECT",
                            "is_tracking_encrypted": True,
                            "tracking": [],
                            "action": "ADD_REACTION",
                        }}),
                        "doc_id": doc_id,
                        "__a": "1",
                        "__user": uid,
                        "__req": rand_mutation_id(),
                        "dpr": "2",
                        "__comet_req": "15",
                    },
                    timeout=15
                )
                txt = rr.text
                logs.append(f"[DEBUG] GraphQL doc={doc_id} → {rr.status_code}")
                if rr.status_code == 200:
                    if '"reaction"' in txt or ('"data"' in txt and '"errors"' not in txt and "error" not in txt[:50]):
                        logs.append(f"[OK] Reacted {reaction} via GraphQL ✓")
                        success_this = True
                    elif "1357054" in txt:
                        logs.append(f"[WARN] Error 1357054 (checkpoint/IP block) — trying next method")
                        errors.append("1357054")
                        break
                    elif '"errors"' in txt:
                        logs.append(f"[WARN] GraphQL errors: {txt[50:200]}")
            except Exception as e:
                logs.append(f"[WARN] GraphQL: {e}")

        # Method 2: mbasic like/react link scraping
        if not success_this:
            try:
                murl = post_url.replace("www.facebook.com", "mbasic.facebook.com").replace("https://facebook.com", "https://mbasic.facebook.com")
                if "mbasic.facebook.com" not in murl:
                    murl = f"https://mbasic.facebook.com/{uid}/posts/{post_id}"
                
                s_mb = make_session_raw(raw_cookie)
                s_mb.headers.update({"User-Agent": UA_MBX})
                rm = s_mb.get(murl, timeout=13, allow_redirects=True)
                logs.append(f"[DEBUG] mbasic post → {rm.status_code} ({len(rm.text)}B)")

                if rm.status_code == 200 and len(rm.text) > 2000 and not is_checkpoint(rm.text[:500]):
                    # Find like/react links
                    like_m = re.search(r'href="(/a/like\.php[^"]+)"', rm.text)
                    react_m = re.search(r'href="(/reactions/react[^"]+)"', rm.text)
                    confirm_m = re.search(r'action="(https://mbasic\.facebook\.com/a/like\.php)"', rm.text)

                    chosen = like_m or react_m
                    if chosen:
                        like_url = "https://mbasic.facebook.com" + chosen.group(1).replace("&amp;", "&")
                        logs.append(f"[INFO] Found react link, clicking...")
                        rl = s_mb.get(like_url, headers={"User-Agent": UA_MBX}, timeout=12)
                        logs.append(f"[DEBUG] React click → {rl.status_code}")
                        if rl.status_code in (200, 302):
                            logs.append(f"[OK] Reacted via mbasic ✓")
                            success_this = True
                    else:
                        # Try POST form submission
                        form_action = re.search(r'<form[^>]+action="([^"]*like[^"]*)"', rm.text, re.I)
                        if form_action:
                            form_url = form_action.group(1).replace("&amp;", "&")
                            hidden_inputs = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', rm.text))
                            rl2 = s_mb.post(form_url, data=hidden_inputs, headers={"User-Agent": UA_MBX}, timeout=12)
                            logs.append(f"[DEBUG] Form submit → {rl2.status_code}")
                            if rl2.status_code in (200, 302):
                                logs.append(f"[OK] Reacted via form ✓")
                                success_this = True
                        else:
                            logs.append(f"[WARN] No react link found — account may have checkpoint or post is restricted")
                            errors.append("no_like_link")
                else:
                    logs.append(f"[WARN] mbasic: checkpoint or error page detected")
                    errors.append("checkpoint")
            except Exception as e:
                logs.append(f"[WARN] mbasic: {e}")

        # Method 3: Legacy UFI endpoint
        if not success_this:
            try:
                for ufi_path in ["/ufi/react/", "/reactions/add/"]:
                    rr3 = s.post(f"https://www.facebook.com{ufi_path}",
                        headers={"User-Agent": UA_MBX, "Content-Type": "application/x-www-form-urlencoded",
                                 "Referer": post_url, "X-Requested-With": "XMLHttpRequest"},
                        data={"ft_ent_identifier": post_id, "reaction_type": str(reaction_id),
                              "action": "add", "fb_dtsg": fb_dtsg, "__user": uid, "__a": "1"},
                        timeout=12)
                    logs.append(f"[DEBUG] UFI{ufi_path} → {rr3.status_code}")
                    if rr3.status_code == 200 and "error" not in rr3.text.lower()[:100]:
                        logs.append(f"[OK] Reacted via UFI legacy ✓")
                        success_this = True
                        break
            except Exception as e:
                logs.append(f"[WARN] UFI legacy: {e}")

        if success_this:
            reacted += 1

    if reacted > 0:
        return {"ok": True, "success": True, "count": reacted,
                "message": f"✓ Reacted {reaction} on {reacted}/{count} attempt(s)", "logs": logs}

    # Diagnose failure reason
    if "checkpoint" in errors or "1357054" in errors:
        msg = "Account has a checkpoint/restriction. Please log in to Facebook in a browser and resolve any security checks, then try again with a fresh cookie."
    elif "no_like_link" in errors:
        msg = "Post is not accessible or already reacted. Check the post URL and try with a different account."
    else:
        msg = "Reaction failed — please verify your cookie is valid and the account has no active checkpoint"

    return {"ok": True, "success": False, "message": msg, "logs": logs}

# ── Share ────────────────────────────────────────────────────────────────────
def do_share(raw_cookie: str, post_url: str, count: int) -> dict:
    logs = []
    post_id = get_post_id(post_url)
    jar = parse_cookie(raw_cookie)
    uid = jar.get("c_user", "")
    s = make_session_raw(raw_cookie)
    logs.append(f"[INFO] Share target: {post_id} × {count}")

    fb_dtsg = ""
    token = ""
    try:
        r = s.get("https://www.facebook.com/", timeout=13)
        if r.status_code == 200 and len(r.text) > 3000:
            fb_dtsg = extract_dtsg(r.text)
            token = extract_eaag(r.text)
            uid2 = extract_uid_from_html(r.text)
            if uid2:
                uid = uid2
    except Exception as e:
        logs.append(f"[WARN] homepage: {e}")

    logs.append(f"[INFO] fb_dtsg: {'found' if fb_dtsg else 'not found'}")

    if not fb_dtsg:
        return {"ok": True, "success": False, "count": 0,
                "message": "Invalid cookie or account checkpoint", "logs": logs}

    shared = 0
    for i in range(count):
        if i > 0:
            time.sleep(random.uniform(1.0, 2.5))
        logs.append(f"[INFO] Share {i+1}/{count}")
        ok = False

        # Method 1: Graph API
        if token:
            try:
                rg = requests.post("https://graph.facebook.com/v18.0/me/feed",
                    params={"link": post_url, "published": "1", "access_token": token},
                    headers={"User-Agent": UA_WIN}, timeout=15)
                d = rg.json()
                if "id" in d:
                    logs.append(f"[OK] Shared via Graph API ✓ (id={d['id']})")
                    ok = True
                else:
                    logs.append(f"[WARN] Graph: {d.get('error', {}).get('message', str(d)[:100])}")
            except Exception as e:
                logs.append(f"[WARN] Graph: {e}")

        # Method 2: GraphQL share
        if not ok and fb_dtsg:
            try:
                feedback_id = base64.b64encode(f"feedback:{post_id}".encode()).decode()
                rs = s.post("https://www.facebook.com/api/graphql/",
                    headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA_MOB},
                    data={
                        "fb_dtsg": fb_dtsg,
                        "variables": json.dumps({"input": {
                            "client_mutation_id": rand_mutation_id(),
                            "actor_id": uid,
                            "feedback_id": feedback_id,
                            "story_id": post_id,
                            "privacy": {"allow": [], "deny": [], "base_state": "EVERYONE"},
                        }}),
                        "doc_id": "4004469316266496",
                        "__a": "1",
                        "__user": uid,
                    }, timeout=15)
                logs.append(f"[DEBUG] GraphQL share → {rs.status_code}")
                if rs.status_code == 200 and '"data"' in rs.text and '"errors"' not in rs.text:
                    logs.append(f"[OK] Shared via GraphQL ✓")
                    ok = True
                else:
                    logs.append(f"[WARN] {rs.text[:150]}")
            except Exception as e:
                logs.append(f"[WARN] GraphQL share: {e}")

        # Method 3: mbasic share
        if not ok:
            try:
                s_mb = make_session_raw(raw_cookie)
                s_mb.headers.update({"User-Agent": UA_MBX})
                rm = s_mb.get(f"https://mbasic.facebook.com/{post_id}", timeout=12)
                share_m = re.search(r'href="(/sharer[^"]+)"', rm.text)
                if share_m:
                    share_url = "https://mbasic.facebook.com" + share_m.group(1).replace("&amp;", "&")
                    rl = s_mb.get(share_url, timeout=12)
                    if rl.status_code == 200:
                        # Submit the share form
                        form_action = re.search(r'<form[^>]+action="([^"]+)"', rl.text)
                        if form_action:
                            hidden = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', rl.text))
                            rp = s_mb.post(form_action.group(1).replace("&amp;", "&"),
                                data=hidden, headers={"User-Agent": UA_MBX}, timeout=12)
                            if rp.status_code in (200, 302):
                                logs.append(f"[OK] Shared via mbasic ✓")
                                ok = True
            except Exception as e:
                logs.append(f"[WARN] mbasic share: {e}")

        if ok:
            shared += 1

    return {
        "ok": True, "success": shared > 0, "count": shared,
        "message": f"Shared {shared}/{count} times ✓" if shared > 0 else "Share failed — check cookie and post URL",
        "logs": logs
    }

# ── Comment ──────────────────────────────────────────────────────────────────
def do_comment(raw_cookie: str, post_url: str, comments: list, count: int) -> dict:
    logs = []
    post_id = get_post_id(post_url)
    jar = parse_cookie(raw_cookie)
    uid = jar.get("c_user", "")
    s = make_session_raw(raw_cookie)
    logs.append(f"[INFO] Comment on {post_id} × {count}")

    fb_dtsg = ""
    try:
        r = s.get("https://www.facebook.com/", timeout=13)
        if r.status_code == 200 and len(r.text) > 3000:
            fb_dtsg = extract_dtsg(r.text)
            uid2 = extract_uid_from_html(r.text)
            if uid2:
                uid = uid2
    except Exception as e:
        logs.append(f"[WARN] {e}")

    logs.append(f"[INFO] fb_dtsg: {'found' if fb_dtsg else 'not found'}")

    if not fb_dtsg:
        return {"ok": True, "success": False, "count": 0,
                "message": "Invalid cookie or account checkpoint", "logs": logs}

    commented = 0
    feedback_id = base64.b64encode(f"feedback:{post_id}".encode()).decode()

    for i in range(count):
        if i > 0:
            time.sleep(random.uniform(1.5, 3.0))
        text = comments[i % len(comments)] if comments else "nice"
        logs.append(f"[INFO] Comment {i+1}/{count}: '{text[:40]}'")
        ok = False

        # Method 1: GraphQL create comment
        if fb_dtsg and uid:
            try:
                rc = s.post("https://www.facebook.com/api/graphql/",
                    headers={"Content-Type": "application/x-www-form-urlencoded",
                             "User-Agent": UA_MOB, "Referer": post_url,
                             "X-FB-Friendly-Name": "CometUFICreateCommentMutation"},
                    data={
                        "fb_dtsg": fb_dtsg,
                        "variables": json.dumps({"input": {
                            "client_mutation_id": rand_mutation_id(),
                            "actor_id": uid,
                            "feedback_id": feedback_id,
                            "message": {"text": text},
                            "feedback_source": "OBJECT",
                        }}),
                        "doc_id": "4778700432218822",
                        "__a": "1",
                        "__user": uid,
                    }, timeout=15)
                logs.append(f"[DEBUG] GraphQL comment → {rc.status_code}")
                if rc.status_code == 200 and '"errors"' not in rc.text and "1357054" not in rc.text:
                    logs.append(f"[OK] Commented via GraphQL ✓")
                    ok = True
                else:
                    logs.append(f"[WARN] {rc.text[:150]}")
            except Exception as e:
                logs.append(f"[WARN] GraphQL comment: {e}")

        # Method 2: mbasic comment form
        if not ok:
            try:
                s_mb = make_session_raw(raw_cookie)
                s_mb.headers.update({"User-Agent": UA_MBX})
                rm = s_mb.get(f"https://mbasic.facebook.com/{uid}/posts/{post_id}", timeout=12)
                if rm.status_code == 200:
                    form_m = re.search(r'<form[^>]+action="([^"]*comment[^"]*)"[^>]*>(.*?)</form>', rm.text, re.S | re.I)
                    if form_m:
                        form_url = form_m.group(1).replace("&amp;", "&")
                        if not form_url.startswith("http"):
                            form_url = "https://mbasic.facebook.com" + form_url
                        hidden = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', form_m.group(2)))
                        hidden["comment_text"] = text
                        rp = s_mb.post(form_url, data=hidden, headers={"User-Agent": UA_MBX}, timeout=12)
                        logs.append(f"[DEBUG] mbasic comment → {rp.status_code}")
                        if rp.status_code in (200, 302):
                            logs.append(f"[OK] Commented via mbasic ✓")
                            ok = True
            except Exception as e:
                logs.append(f"[WARN] mbasic comment: {e}")

        if ok:
            commented += 1

    return {
        "ok": True, "success": commented > 0, "count": commented,
        "message": f"Commented {commented}/{count} times ✓" if commented > 0 else "Comments failed — check cookie and post URL",
        "logs": logs
    }

# ── Token extraction ─────────────────────────────────────────────────────────
def do_token(raw_cookie: str) -> dict:
    jar = parse_cookie(raw_cookie)
    uid = jar.get("c_user", "")
    s = make_session_raw(raw_cookie)
    logs = []
    token = ""

    # Method 1: Extract from homepage
    try:
        r = s.get("https://www.facebook.com/", timeout=13)
        logs.append(f"[INFO] homepage → {r.status_code} ({len(r.text)}B)")
        if r.status_code == 200:
            token = extract_eaag(r.text)
            if token:
                logs.append("[OK] Token extracted from homepage ✓")
    except Exception as e:
        logs.append(f"[WARN] homepage: {e}")

    # Method 2: Marketplace page (contains token sometimes)
    if not token:
        try:
            r2 = s.get("https://www.facebook.com/marketplace/", timeout=12)
            if r2.status_code == 200:
                token = extract_eaag(r2.text)
                if token:
                    logs.append("[OK] Token from marketplace ✓")
        except Exception as e:
            logs.append(f"[WARN] marketplace: {e}")

    # Method 3: Ads manager
    if not token:
        try:
            s3 = make_session_raw(raw_cookie)
            s3.headers.update({"User-Agent": UA_WIN})
            r3 = s3.get("https://adsmanager.facebook.com/adsmanager/manage", timeout=12)
            if r3.status_code == 200:
                token = extract_eaag(r3.text)
                if token:
                    logs.append("[OK] Token from Ads Manager ✓")
        except Exception as e:
            logs.append(f"[WARN] ads manager: {e}")

    # Method 4: b-api (mobile app auth endpoint)
    if not token:
        try:
            app_token = "350685531728|62f8ce9f74b12f84c123cc23437a4a32"
            r4 = s.get(
                f"https://b-api.facebook.com/method/auth.login?email={uid}&format=json&access_token={app_token}&generate_session_cookies=1&locale=en_US",
                headers={"User-Agent": "FBAN/FB4A;FBAV/377.0.0.29.112;FBMF/samsung;FBDV/SM-A515F"},
                timeout=10)
            d4 = r4.json()
            if "access_token" in d4:
                token = d4["access_token"]
                logs.append("[OK] Token from b-api ✓")
            else:
                logs.append(f"[WARN] b-api: {d4.get('error_msg', str(d4)[:100])}")
        except Exception as e:
            logs.append(f"[WARN] b-api: {e}")

    if token:
        return {"ok": True, "token": token, "uid": uid, "expires": "Session-based", "logs": logs}
    return {"ok": True, "token": "", "uid": uid, "expires": "",
            "logs": logs + ["[FAIL] Token not found — account may have checkpoint or cookie is expired"]}

# ── Profile guard ─────────────────────────────────────────────────────────────
def do_guard(raw_cookie: str) -> dict:
    jar = parse_cookie(raw_cookie)
    uid = jar.get("c_user", "")
    s = make_session_raw(raw_cookie)
    logs = []
    logs.append(f"[INFO] Enabling profile guard for UID: {uid}")

    fb_dtsg = ""
    try:
        r = s.get("https://www.facebook.com/", timeout=13)
        if r.status_code == 200 and len(r.text) > 3000:
            fb_dtsg = extract_dtsg(r.text)
            uid2 = extract_uid_from_html(r.text)
            if uid2:
                uid = uid2
    except Exception as e:
        logs.append(f"[WARN] homepage: {e}")

    logs.append(f"[INFO] fb_dtsg: {'found' if fb_dtsg else 'not found'}")

    if not fb_dtsg:
        return {"ok": True, "success": False, "message": "Invalid cookie or account checkpoint", "logs": logs}

    # Method 1: GraphQL profile guard mutation
    try:
        rg = s.post("https://www.facebook.com/api/graphql/",
            headers={"Content-Type": "application/x-www-form-urlencoded",
                     "User-Agent": UA_MOB, "X-FB-Friendly-Name": "ProfileGuardMutation"},
            data={
                "fb_dtsg": fb_dtsg,
                "variables": json.dumps({
                    "input": {
                        "actor_id": uid,
                        "privacy_setting": "PROFILE_GUARD",
                        "value": "1",
                        "client_mutation_id": rand_mutation_id(),
                    }
                }),
                "doc_id": "4847946388580875",
                "__a": "1",
                "__user": uid,
            }, timeout=15)
        logs.append(f"[DEBUG] Guard GraphQL → {rg.status_code}")
        if rg.status_code == 200 and '"errors"' not in rg.text and "error" not in rg.text.lower()[:100]:
            logs.append("[OK] Profile guard enabled via GraphQL ✓")
            return {"ok": True, "success": True, "message": "Profile guard enabled ✓", "logs": logs}
        else:
            logs.append(f"[WARN] {rg.text[:200]}")
    except Exception as e:
        logs.append(f"[WARN] GraphQL guard: {e}")

    # Method 2: Privacy settings endpoint
    try:
        rp = s.post("https://www.facebook.com/privacy/settings/profile_guard/enable/",
            headers={"Content-Type": "application/x-www-form-urlencoded",
                     "User-Agent": UA_MOB, "X-Requested-With": "XMLHttpRequest"},
            data={"fb_dtsg": fb_dtsg, "__user": uid, "__a": "1"},
            timeout=12)
        logs.append(f"[DEBUG] Privacy endpoint → {rp.status_code}")
        if rp.status_code == 200:
            logs.append("[OK] Profile guard enabled via privacy endpoint ✓")
            return {"ok": True, "success": True, "message": "Profile guard enabled ✓", "logs": logs}
    except Exception as e:
        logs.append(f"[WARN] Privacy endpoint: {e}")

    logs.append("[FAIL] Profile guard failed — this feature requires direct browser interaction for some accounts")
    return {"ok": True, "success": False, "message": "Profile guard requires browser interaction — please enable it manually at facebook.com/settings", "logs": logs}

# ── Main dispatch ─────────────────────────────────────────────────────────────
def main():
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            print(json.dumps({"ok": False, "error": "Empty input"}))
            return
        data = json.loads(raw)
        action = data.get("action", "")
        cookie = data.get("cookie", "")

        if not cookie:
            print(json.dumps({"ok": False, "error": "No cookie provided"}))
            return

        jar = parse_cookie(cookie)
        valid, err = validate_cookie(jar)
        if not valid:
            print(json.dumps({"ok": False, "error": err}))
            return

        if action == "login":
            result = get_profile(cookie)
        elif action == "react":
            count = int(data.get("count", 1))
            result = do_react(cookie, data.get("postUrl", ""), data.get("reactionType", "LIKE"), count)
        elif action == "share":
            count = int(data.get("count", 1))
            result = do_share(cookie, data.get("postUrl", ""), count)
        elif action == "comment":
            comments = data.get("comments", ["nice"])
            count = int(data.get("count", 1))
            result = do_comment(cookie, data.get("postUrl", ""), comments, count)
        elif action == "token":
            result = do_token(cookie)
        elif action == "guard":
            result = do_guard(cookie)
        else:
            result = {"ok": False, "error": f"Unknown action: {action}"}

        print(json.dumps(result))
    except json.JSONDecodeError as e:
        print(json.dumps({"ok": False, "error": f"Invalid JSON input: {e}"}))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))

if __name__ == "__main__":
    main()
