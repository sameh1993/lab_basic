const crypto = require("crypto");

const SECRET = process.env.AUTH_SECRET || "lab-basic-auth-secret-v1";

// ── توقيع وحماية التوكن ──────────────────────────────────
function signToken(username) {
  const exp = Date.now() + 12 * 60 * 60 * 1000; // 12 ساعة
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return !!(data.exp && data.exp > Date.now());
  } catch (err) {
    return false;
  }
}

// ── باسورد المستخدم (scrypt) ─────────────────────────────
function hashPassword(password) {
  const N = 16384, r = 8, p = 1, keylen = 64;
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, keylen, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  try {
    const [, N, r, p, saltHex, hashHex] = parts;
    const hash = crypto.scryptSync(String(password), Buffer.from(saltHex, "hex"), 64, {
      N: Number(N), r: Number(r), p: Number(p),
    });
    const expected = Buffer.from(hashHex, "hex");
    return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
  } catch (err) {
    return false;
  }
}

// ── قراءة الكوكيز ────────────────────────────────────────
function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

// ── الحماية: رفض أي طلب غير مسجل دخول ───────────────────
function authRequired(req, res, next) {
  if (req.path === "/login" || req.path === "/logout") return next();
  const token = parseCookies(req).auth_token;
  if (verifyToken(token)) return next();
  return res.redirect("/login");
}

module.exports = { signToken, verifyToken, parseCookies, authRequired, hashPassword, verifyPassword };