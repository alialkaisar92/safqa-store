const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const postgres = fs.readFileSync(path.join(root, 'lib', 'postgres.js'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'services', 'auth-postgres.js'), 'utf8');
const login = fs.readFileSync(path.join(root, 'login.html'), 'utf8');
const reset = fs.readFileSync(path.join(root, 'reset-password.html'), 'utf8');

assert(server.includes("app.post('/api/auth/forgot-password'"), 'forgot-password endpoint is missing');
assert(server.includes("app.post('/api/auth/reset-password'"), 'reset-password endpoint is missing');
assert(!server.includes("res.status(501).json({ error: 'استعادة كلمة المرور"), 'password reset endpoints are still disabled');
assert(server.includes('RESEND_API_KEY') && server.includes('RESEND_FROM'), 'Resend transport is missing');
assert(server.includes('EMAIL_HOST') && server.includes('EMAIL_PASSWORD'), 'SMTP fallback transport is missing');
assert(server.includes("https://api.resend.com/emails"), 'Resend endpoint is missing');
assert(server.includes("'User-Agent': 'rab7na-store/1.0'"), 'direct Resend calls must identify the client');
assert(server.includes('let resendFailure') && server.includes('if (smtpHost && smtpUser && smtpPassword && smtpFrom)'), 'SMTP fallback after Resend failure is missing');
assert(server.includes('passwordResetRateAllowed'), 'forgot-password rate limiting is missing');
assert(server.includes('const generic = { ok: true'), 'forgot-password response must be generic');
assert(server.includes('revokePasswordResetToken'), 'failed email delivery must invalidate its token');

assert(postgres.includes('crypto.randomBytes(32)'), 'reset token must be generated with cryptographic randomness');
assert(postgres.includes("INSERT INTO password_reset_tokens(user_id,token_hash,expires_at)"), 'only hashed reset token should be stored');
assert(postgres.includes("crypto.createHash('sha256').update(token).digest('hex')"), 'reset token hash is missing');
assert(postgres.includes("used_at IS NULL AND expires_at>NOW() FOR UPDATE"), 'reset token consumption must lock and validate expiry');
assert(postgres.includes("UPDATE password_reset_tokens SET used_at=NOW()"), 'reset token must be single-use');
assert(postgres.includes("DELETE FROM auth_sessions WHERE user_id=$1"), 'reset must revoke all auth sessions');
assert(postgres.includes('module.exports') && postgres.includes('consumePasswordResetToken'), 'reset helpers are not exported');
assert(auth.includes('validatePassword'), 'password validation helper is not exported');

assert(login.includes('نسيت كلمة المرور؟') && login.includes('/api/auth/forgot-password'), 'login forgot-password UI is missing');
assert(login.includes('minlength="8"'), 'registration UI must require eight characters');
assert(reset.includes('/api/auth/reset-password'), 'reset page is not connected to reset endpoint');
assert(reset.includes('autocomplete="new-password"'), 'reset page must use new-password autocomplete');
assert(!reset.includes('localStorage') && !login.includes('localStorage.setItem'), 'auth reset must not store secrets in localStorage');

console.log('password-reset-static: PASS');
