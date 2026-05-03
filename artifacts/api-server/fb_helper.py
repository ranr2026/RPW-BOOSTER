#!/usr/bin/env python3
"""
Lara Web — Facebook helper script.
Called from the Node.js API server via child_process.
Reads JSON from stdin, writes JSON result to stdout.
"""
import sys, json, re, time, base64

try:
    import requests
except ImportError:
    print(json.dumps({"ok": False, "error": "requests not installed"}))
    sys.exit(0)

# ── User-Agents ──────────────────────────────────────────────────────────────
UA_MOB  = "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
UA_MBX  = "Mozilla/5.0 (Linux; Android 9; SM-A505F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36"
UA_WIN  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
UA_APP  = "FBAN/FB4A;FBAV/377.0.0.29.112;FBBV/401122832;FBLC/en_US;FBMF/samsung;FBDV/SM-A515F;FBSV/11;"

# Public app tokens (well-known, non-secret)
APP_TOKEN_1 = "237759909591655|0f140aabedfb65ac27a739ed1a2263b1"
APP_TOKEN_2 = "350685531728|62f8ce9f74b12f84c123cc23437a4a32"

# ── Cookie helpers ───────────────────────────────────────────────────────────
def parse_cookie(raw: str) -> dict:
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

def make_session(jar: dict) -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": UA_MOB})
    for k, v in jar.items():
        s.cookies.set(k, v, domain=".facebook.com", path="/")
    return s

def validate_cookie(jar: dict) -> tuple[bool, str]:
    if "c_user" not in jar:
        return False, "Missing c_user — paste a complete Facebook cookie"
    if "xs" not in jar:
        return False, "Missing xs — paste a complete Facebook cookie (c_user + xs required)"
    return True, ""

def extract_dtsg(html: str) -> str:
    for pat in [
        r'"fb_dtsg","([^"]+)"',
        r'name="fb_dtsg" value="([^"]+)"',
        r'"DTSGInitData".*?"token":"([^"]+)"',
        r'"fb_dtsg":{"value":"([^"]+)"',
        r'\["DTSGInitData",\[\],\{"token":"([^"]+)"',
    ]:
        m = re.search(pat, html)
        if m:
            return m.group(1)
    return ""

def extract_eaag(html: str) -> str:
    m = re.search(r'(EAAG[A-Za-z0-9+/=_%]{30,})', html)
    return m.group(1) if m else ""

def extract_uid_from_html(html: str) -> str:
    for pat in ['"USER_ID":"(\\d+)"', '"userID":"(\\d+)"', r'\"uid\":(\d+)', '"UID":(\d+)']:
        m = re.search(pat, html)
        if m:
            return m.group(1)
    return ""

def get_post_id(url: str) -> str:
    """Extract numeric post ID from any Facebook post URL."""
    for pat in [r'/posts/(\d+)', r'story_fbid=(\d+)', r'fbid=(\d+)', r'/(\d{15,})']:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    # Fallback: return last numeric segment
    nums = re.findall(r'\d{10,}', url)
    return nums[-1] if nums else url

# ── Profile fetch ────────────────────────────────────────────────────────────
def get_profile(jar: dict) -> dict:
    uid = jar.get("c_user") or jar.get("i_user", "")
    avatar = f"https://graph.facebook.com/{uid}/picture?type=large"
    name = ""
    fb_dtsg = ""
    token = ""

    # Method 1: Graph API with public app tokens
    for app_tok in [APP_TOKEN_1, APP_TOKEN_2]:
        try:
            r = requests.get(
                f"https://graph.facebook.com/{uid}?fields=name,picture.type(large)&access_token={app_tok}",
                headers={"User-Agent": UA_WIN}, timeout=8
            )
            if r.status_code == 200:
                d = r.json()
                if "name" in d:
                    name = d["name"]
                if "picture" in d and "data" in d["picture"]:
                    avatar = d["picture"]["data"].get("url", avatar)
                break
        except Exception:
            pass

    # Method 2: Fetch authenticated session on www.facebook.com
    s = make_session(jar)
    try:
        r2 = s.get("https://www.facebook.com/", headers={"User-Agent": UA_MOB, "Accept-Encoding": "gzip, deflate"},
                   timeout=12, allow_redirects=True)
        if r2.status_code == 200 and len(r2.text) > 500:
            if "Error Facebook" not in r2.text[:500] and "login" not in r2.url:
                fb_dtsg = extract_dtsg(r2.text)
                token = extract_eaag(r2.text)
                if not name:
                    uid2 = extract_uid_from_html(r2.text)
                    if uid2:
                        uid = uid2
                    # Try to get name from page
                    nm = re.search(r'"name":"([^"]{2,60})","__typename":"User"', r2.text)
                    if nm:
                        name = nm.group(1)
    except Exception:
        pass

    # Method 3: Profile page with cookie
    if not name:
        try:
            r3 = s.get(f"https://www.facebook.com/profile.php?id={uid}",
                       headers={"User-Agent": UA_MOB}, timeout=10, allow_redirects=True)
            if r3.status_code == 200 and len(r3.text) > 200:
                t = re.search(r'<title>([^<|]+)', r3.text)
                if t and "Error" not in t.group(1) and "Facebook" != t.group(1).strip():
                    name = t.group(1).strip()
                if not fb_dtsg:
                    fb_dtsg = extract_dtsg(r3.text)
        except Exception:
            pass

    # Method 4: mbasic profile page
    if not name:
        try:
            r4 = s.get(f"https://mbasic.facebook.com/profile.php?id={uid}",
                       headers={"User-Agent": UA_MBX}, timeout=10)
            if r4.status_code == 200:
                t = re.search(r'<title>([^<|]+)', r4.text)
                if t and "Error" not in t.group(1):
                    cand = t.group(1).strip()
                    if cand and cand != "Facebook":
                        name = cand
                if not fb_dtsg:
                    fb_dtsg = extract_dtsg(r4.text)
        except Exception:
            pass

    # Validate login: check if session has a real UID
    if not name:
        name = f"User {uid}"

    # Check if cookie is actually authenticated
    is_authed = bool(fb_dtsg) or bool(token)
    if not is_authed:
        # Check if page is showing as logged-in by looking for user-specific content
        # At minimum, c_user + xs means the cookie claims to be authenticated
        # We'll accept it and warn if actions fail
        pass

    return {
        "ok": True,
        "uid": uid,
        "name": name,
        "avatar": avatar,
        "fb_dtsg": fb_dtsg,
        "token": token,
        "authenticated": is_authed,
        "logs": [f"UID: {uid}", f"Name: {name}", f"fb_dtsg: {'found' if fb_dtsg else 'not found (cookie may be invalid or FB blocking server IP)'}", f"Token: {'found' if token else 'not found'}"],
    }

# ── Reaction ─────────────────────────────────────────────────────────────────
REACTION_MAP = {"LIKE": 1, "LOVE": 2, "HAHA": 4, "WOW": 3, "SAD": 7, "ANGRY": 8, "CARE": 16}

def do_react(jar: dict, post_url: str, reaction: str) -> dict:
    logs = []
    post_id = get_post_id(post_url)
    reaction_id = REACTION_MAP.get(reaction.upper(), 1)
    logs.append(f"[INFO] Post ID: {post_id}")
    logs.append(f"[INFO] Reaction: {reaction} (id={reaction_id})")

    # Step 1: Get fb_dtsg + uid
    uid = jar.get("c_user", "")
    s = make_session(jar)
    fb_dtsg = ""

    try:
        r = s.get("https://www.facebook.com/", headers={"User-Agent": UA_MOB}, timeout=12)
        if r.status_code == 200 and len(r.text) > 500:
            fb_dtsg = extract_dtsg(r.text)
            uid2 = extract_uid_from_html(r.text)
            if uid2:
                uid = uid2
    except Exception as e:
        logs.append(f"[WARN] Fetch homepage: {e}")

    if not fb_dtsg:
        try:
            r2 = s.get("https://mbasic.facebook.com/", headers={"User-Agent": UA_MBX}, timeout=10)
            if r2.status_code == 200:
                fb_dtsg = extract_dtsg(r2.text)
        except Exception as e:
            logs.append(f"[WARN] mbasic: {e}")

    logs.append(f"[INFO] fb_dtsg: {'found' if fb_dtsg else 'not found'}")
    logs.append(f"[INFO] uid: {uid}")

    if not fb_dtsg:
        # Try to get dtsg from the post page itself
        try:
            rp = s.get(post_url, headers={"User-Agent": UA_MOB}, timeout=12)
            if rp.status_code == 200:
                fb_dtsg = extract_dtsg(rp.text)
                logs.append(f"[INFO] Got dtsg from post page: {'yes' if fb_dtsg else 'no'}")
        except Exception as e:
            logs.append(f"[WARN] Post page fetch: {e}")

    # Method 1: UFI GraphQL reaction
    if fb_dtsg and uid:
        try:
            feedback_id = base64.b64encode(f"feedback:{post_id}".encode()).decode()
            logs.append(f"[INFO] Trying GraphQL UFI (feedback_id={feedback_id[:20]}...)")
            rr = s.post("https://www.facebook.com/api/graphql/",
                headers={"User-Agent": UA_MOB, "Content-Type": "application/x-www-form-urlencoded",
                         "Referer": post_url, "Origin": "https://www.facebook.com",
                         "X-FB-Friendly-Name": "CometUFIFeedbackReactMutation"},
                data={
                    "fb_dtsg": fb_dtsg,
                    "variables": json.dumps({"input": {
                        "client_mutation_id": "1",
                        "actor_id": uid,
                        "feedback_id": feedback_id,
                        "feedback_reaction": reaction_id,
                        "feedback_source": "OBJECT",
                        "is_tracking_encrypted": True,
                        "tracking": [],
                    }}),
                    "doc_id": "3451082781643797",
                    "__a": "1",
                    "__user": uid,
                },
                timeout=15
            )
            logs.append(f"[DEBUG] UFI GraphQL → {rr.status_code}")
            txt = rr.text
            if rr.status_code == 200:
                if '"reaction"' in txt or '"feedback"' in txt or '"data"' in txt:
                    logs.append(f"[OK] Reaction {reaction} sent via UFI GraphQL ✓")
                    return {"ok": True, "success": True, "message": f"Reacted with {reaction} ✓", "logs": logs}
                elif '"errors"' in txt or "error" in txt.lower():
                    logs.append(f"[WARN] GraphQL error: {txt[:200]}")
                else:
                    logs.append(f"[OK] Request accepted (status 200) ✓")
                    return {"ok": True, "success": True, "message": f"Reaction sent ✓", "logs": logs}
        except Exception as e:
            logs.append(f"[WARN] GraphQL UFI: {e}")

    # Method 2: UFI legacy endpoint
    if fb_dtsg and uid:
        try:
            logs.append("[INFO] Trying legacy UFI react endpoint...")
            rr2 = s.post("https://www.facebook.com/ufi/react/",
                headers={"User-Agent": UA_MOB, "Content-Type": "application/x-www-form-urlencoded",
                         "Referer": post_url, "X-FB-HTTP-Engine": "Liger"},
                data={
                    "ft_ent_identifier": post_id,
                    "action": "add",
                    "reaction_type": str(reaction_id),
                    "fb_dtsg": fb_dtsg,
                    "__user": uid,
                    "__a": "1",
                },
                timeout=12
            )
            logs.append(f"[DEBUG] UFI legacy → {rr2.status_code}")
            if rr2.status_code in (200, 302):
                logs.append(f"[OK] Reaction sent via UFI legacy ✓")
                return {"ok": True, "success": True, "message": f"Reacted with {reaction} ✓", "logs": logs}
        except Exception as e:
            logs.append(f"[WARN] UFI legacy: {e}")

    # Method 3: mbasic like link scraping
    try:
        murl = post_url.replace("www.facebook.com", "mbasic.facebook.com")
        logs.append(f"[INFO] Trying mbasic like link scraping: {murl[:60]}...")
        rm = s.get(murl, headers={"User-Agent": UA_MBX}, timeout=12, allow_redirects=True)
        logs.append(f"[DEBUG] mbasic post → {rm.status_code}")
        if rm.status_code == 200:
            like_m = re.search(r'href="(/a/like\.php[^"]+|/reactions/react[^"]+)"', rm.text)
            if like_m:
                like_url = "https://mbasic.facebook.com" + like_m.group(1).replace("&amp;", "&")
                logs.append(f"[INFO] Found like link, clicking...")
                rl = s.get(like_url, headers={"User-Agent": UA_MBX}, timeout=10)
                logs.append(f"[DEBUG] Like click → {rl.status_code}")
                if rl.status_code in (200, 302):
                    logs.append("[OK] Liked via mbasic link ✓")
                    return {"ok": True, "success": True, "message": "Reacted via mbasic ✓", "logs": logs}
            else:
                logs.append(f"[WARN] No like link found in mbasic (account may have checkpoint)")
    except Exception as e:
        logs.append(f"[WARN] mbasic scrape: {e}")

    logs.append("[FAIL] All reaction methods failed — check your cookie is valid and account has no checkpoint")
    return {"ok": True, "success": False, "message": "Reaction failed — cookie may be invalid or account has checkpoint", "logs": logs}

# ── Share ────────────────────────────────────────────────────────────────────
def do_share(jar: dict, post_url: str, count: int) -> dict:
    logs = []
    post_id = get_post_id(post_url)
    uid = jar.get("c_user", "")
    s = make_session(jar)
    logs.append(f"[INFO] Sharing post {post_id} x{count}")

    fb_dtsg = ""
    token = ""
    try:
        r = s.get("https://www.facebook.com/", headers={"User-Agent": UA_MOB}, timeout=12)
        if r.status_code == 200 and len(r.text) > 500:
            fb_dtsg = extract_dtsg(r.text)
            token = extract_eaag(r.text)
    except Exception as e:
        logs.append(f"[WARN] {e}")

    logs.append(f"[INFO] fb_dtsg: {'found' if fb_dtsg else 'not found'}")
    logs.append(f"[INFO] EAAG token: {'found' if token else 'not found'}")

    shared = 0
    for i in range(count):
        logs.append(f"[INFO] Share attempt {i+1}/{count}")
        ok = False

        # Method 1: Graph API share with EAAG token
        if token:
            try:
                rg = requests.post(
                    f"https://graph.facebook.com/v18.0/me/feed",
                    params={"link": post_url, "published": "1", "access_token": token},
                    headers={"User-Agent": UA_WIN},
                    timeout=15
                )
                logs.append(f"[DEBUG] Graph API share → {rg.status_code}")
                d = rg.json()
                if "id" in d:
                    logs.append(f"[OK] Shared via Graph API (id={d['id']}) ✓")
                    ok = True
                else:
                    logs.append(f"[WARN] Graph API: {d.get('error',{}).get('message','unknown error')}")
            except Exception as e:
                logs.append(f"[WARN] Graph: {e}")

        # Method 2: GraphQL share mutation
        if not ok and fb_dtsg and uid:
            try:
                rs = s.post("https://www.facebook.com/api/graphql/",
                    headers={"User-Agent": UA_MOB, "Content-Type": "application/x-www-form-urlencoded",
                             "Referer": post_url},
                    data={
                        "fb_dtsg": fb_dtsg,
                        "variables": json.dumps({"input": {
                            "client_mutation_id": str(i+2),
                            "actor_id": uid,
                            "story_id": post_id,
                        }}),
                        "doc_id": "4004469316266496",
                        "__a": "1",
                        "__user": uid,
                    },
                    timeout=15
                )
                logs.append(f"[DEBUG] GraphQL share → {rs.status_code}")
                if rs.status_code == 200:
                    if '"data"' in rs.text and '"errors"' not in rs.text:
                        logs.append(f"[OK] Shared via GraphQL ✓")
                        ok = True
                    else:
                        logs.append(f"[WARN] {rs.text[:150]}")
            except Exception as e:
                logs.append(f"[WARN] GraphQL share: {e}")

        if ok:
            shared += 1
        if i < count - 1:
            time.sleep(1)

    success = shared > 0
    return {"ok": True, "success": success, "count": shared, "message": f"Shared {shared}/{count} ✓" if success else f"Sharing failed — {shared}/{count} succeeded", "logs": logs}

# ── Comment ──────────────────────────────────────────────────────────────────
def do_comment(jar: dict, post_url: str, comments: list, count: int) -> dict:
    logs = []
    post_id = get_post_id(post_url)
    uid = jar.get("c_user", "")
    s = make_session(jar)
    logs.append(f"[INFO] Commenting on post {post_id} x{count}")

    fb_dtsg = ""
    try:
        r = s.get("https://www.facebook.com/", headers={"User-Agent": UA_MOB}, timeout=12)
        if r.status_code == 200:
            fb_dtsg = extract_dtsg(r.text)
    except Exception as e:
        logs.append(f"[WARN] {e}")

    logs.append(f"[INFO] fb_dtsg: {'found' if fb_dtsg else 'not found'}")

    commented = 0
    for i in range(count):
        text = comments[i % len(comments)]
        logs.append(f"[INFO] Comment {i+1}/{count}: '{text[:40]}'")
        ok = False

        if fb_dtsg and uid:
            try:
                feedback_id = base64.b64encode(f"feedback:{post_id}".encode()).decode()
                rc = s.post("https://www.facebook.com/api/graphql/",
                    headers={"User-Agent": UA_MOB, "Content-Type": "application/x-www-form-urlencoded",
                             "Referer": post_url, "X-FB-Friendly-Name": "CometUFICreateCommentMutation"},
                    data={
                        "fb_dtsg": fb_dtsg,
                        "variables": json.dumps({"input": {
                            "client_mutation_id": str(i+1),
                            "actor_id": uid,
                            "feedback_id": feedback_id,
                            "message": {"text": text},
                        }}),
                        "doc_id": "4778700432218822",
                        "__a": "1",
                        "__user": uid,
                    },
                    timeout=15
                )
                logs.append(f"[DEBUG] GraphQL comment → {rc.status_code}")
                if rc.status_code == 200 and '"errors"' not in rc.text:
                    logs.append(f"[OK] Commented ✓")
                    ok = True
            except Exception as e:
                logs.append(f"[WARN] GraphQL comment: {e}")

        # mbasic fallback
        if not ok:
            try:
                rm = s.post("https://mbasic.facebook.com/a/comment.php",
                    headers={"User-Agent": UA_MBX, "Content-Type": "application/x-www-form-urlencoded"},
                    data={"fb_dtsg": fb_dtsg, "id": post_id, "comment_text": text, "__user": uid, "__a": "1"},
                    timeout=12
                )
                logs.append(f"[DEBUG] mbasic comment → {rm.status_code}")
                if rm.status_code in (200, 302):
                    logs.append(f"[OK] Commented via mbasic ✓")
                    ok = True
            except Exception as e:
                logs.append(f"[WARN] mbasic comment: {e}")

        if ok:
            commented += 1
        if i < count - 1:
            time.sleep(1)

    success = commented > 0
    return {"ok": True, "success": success, "count": commented, "message": f"Commented {commented}/{count} ✓" if success else "Comments failed", "logs": logs}

# ── Token extraction ─────────────────────────────────────────────────────────
def do_token(jar: dict) -> dict:
    uid = jar.get("c_user", "")
    s = make_session(jar)
    logs = []
    token = ""

    # Method 1: Extract EAAG from homepage
    try:
        r = s.get("https://www.facebook.com/", headers={"User-Agent": UA_MOB}, timeout=12)
        if r.status_code == 200 and len(r.text) > 500:
            token = extract_eaag(r.text)
            if token:
                logs.append("[OK] Token extracted from homepage ✓")
    except Exception as e:
        logs.append(f"[WARN] Homepage: {e}")

    # Method 2: Ads manager page
    if not token:
        try:
            r2 = s.get("https://adsmanager.facebook.com/adsmanager/manage",
                       headers={"User-Agent": UA_WIN}, timeout=12)
            if r2.status_code == 200:
                token = extract_eaag(r2.text)
                if token:
                    logs.append("[OK] Token extracted from Ads Manager ✓")
        except Exception as e:
            logs.append(f"[WARN] Ads manager: {e}")

    # Method 3: Try b-api auth endpoint
    if not token:
        try:
            tok_url = f"https://b-api.facebook.com/method/auth.login?access_token={APP_TOKEN_2}&format=json&sdk_version=2&email={uid}&locale=en_US&password=token_extract&sdk=ios&generate_session_cookies=1"
            r3 = requests.get(tok_url, headers={"User-Agent": UA_MOB}, timeout=8)
            d3 = r3.json()
            if "access_token" in d3:
                token = d3["access_token"]
                logs.append("[OK] Token from b-api ✓")
            else:
                logs.append(f"[WARN] b-api: {d3.get('error_msg', 'no token')}")
        except Exception as e:
            logs.append(f"[WARN] b-api: {e}")

    if token:
        return {"ok": True, "token": token, "uid": uid, "expires": "Session-based", "logs": logs}
    return {"ok": True, "token": "", "uid": uid, "expires": "", "logs": logs + ["[FAIL] Could not extract token — cookie may be invalid"]}

# ── Profile guard ─────────────────────────────────────────────────────────────
def do_guard(jar: dict, enable: bool) -> dict:
    uid = jar.get("c_user", "")
    s = make_session(jar)
    logs = [f"[INFO] {'Enable' if enable else 'Disable'} profile guard for UID {uid}"]
    fb_dtsg = ""

    try:
        r = s.get("https://www.facebook.com/", headers={"User-Agent": UA_MOB}, timeout=12)
        if r.status_code == 200:
            fb_dtsg = extract_dtsg(r.text)
    except Exception as e:
        logs.append(f"[WARN] {e}")

    logs.append(f"[INFO] fb_dtsg: {'found' if fb_dtsg else 'not found'}")

    if not fb_dtsg:
        return {"ok": True, "success": False, "message": "Cannot proceed — fb_dtsg not found. Cookie may be invalid.", "logs": logs}

    try:
        rg = s.post("https://www.facebook.com/api/graphql/",
            headers={"User-Agent": UA_MOB, "Content-Type": "application/x-www-form-urlencoded",
                     "X-FB-Friendly-Name": "ProfileGuardMutation"},
            data={
                "fb_dtsg": fb_dtsg,
                "variables": json.dumps({"input": {
                    "actor_id": uid,
                    "is_enabled": enable,
                    "client_mutation_id": "3",
                }}),
                "doc_id": "4600640019986242",
                "__a": "1",
                "__user": uid,
            },
            timeout=15
        )
        logs.append(f"[DEBUG] Guard mutation → {rg.status_code}")
        if rg.status_code == 200 and '"errors"' not in rg.text:
            action = "enabled" if enable else "disabled"
            logs.append(f"[OK] Profile guard {action} ✓")
            return {"ok": True, "success": True, "message": f"Profile guard {action} ✓", "logs": logs}
        else:
            logs.append(f"[WARN] Response: {rg.text[:200]}")
    except Exception as e:
        logs.append(f"[FAIL] {e}")

    return {"ok": True, "success": False, "message": "Guard mutation failed — account may need browser login", "logs": logs}

# ── Main dispatcher ───────────────────────────────────────────────────────────
def main():
    try:
        inp = json.loads(sys.stdin.read())
    except Exception as e:
        print(json.dumps({"ok": False, "error": f"Invalid JSON input: {e}"}))
        sys.exit(0)

    action = inp.get("action", "")
    cookie_raw = inp.get("cookie", "")
    jar = parse_cookie(cookie_raw)

    # Validate cookie
    valid, err_msg = validate_cookie(jar)
    if not valid and action != "test":
        print(json.dumps({"ok": False, "error": "INVALID_COOKIE", "message": err_msg}))
        sys.exit(0)

    result = {}
    if action == "login":
        result = get_profile(jar)
    elif action == "react":
        result = do_react(jar, inp.get("postUrl", ""), inp.get("reactionType", "LIKE"))
    elif action == "share":
        result = do_share(jar, inp.get("postUrl", ""), int(inp.get("count", 1)))
    elif action == "comment":
        result = do_comment(jar, inp.get("postUrl", ""), inp.get("comments", ["Hello"]), int(inp.get("count", 1)))
    elif action == "token":
        result = do_token(jar)
    elif action == "guard":
        result = do_guard(jar, bool(inp.get("enable", True)))
    else:
        result = {"ok": False, "error": "UNKNOWN_ACTION", "message": f"Unknown action: {action}"}

    print(json.dumps(result))

if __name__ == "__main__":
    main()
