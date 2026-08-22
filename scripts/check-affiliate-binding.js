const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const store = fs.readFileSync(path.join(root, 'store2.html'), 'utf8');
const login = fs.readFileSync(path.join(root, 'login.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(server.includes("const affiliateUser=await currentAuthUser(req);"), 'missing server session lookup');
assert(server.includes("if(!affiliateUser)return res.status(401)"), 'guest orders are not blocked');
assert(server.includes('const affiliateUser=await currentAuthUser(req);') && server.includes('if(!affiliateUser)return res.status(401)'), 'verified session user is not used');
assert(server.includes('userId:affiliateUser.id'), 'order is not bound to the verified user');
assert(!/userId\s*:\s*[^,\n]*req\.ip/.test(server), 'order still binds affiliate identity to IP');
assert(store.includes("fetch('/api/auth/me',{credentials:'include',cache:'no-store'})"), 'checkout does not verify the server session');
assert(store.includes("credentials:'include'") && store.includes("fetch('/api/create-order',requestOptions)"), 'checkout does not explicitly send the session cookie');
assert(!store.includes("if(r.ok&&d.ok){saveOrder(body);"), 'legacy local saveOrder still runs after order success');
assert(login.includes('جلسة المصادقة تُدار عبر HttpOnly cookie'), 'login page still documents client-side token storage');
assert(!login.includes('localStorage.setItem'), 'login page still writes auth data to localStorage');
console.log('affiliate binding checks: PASS');
console.log('identity source: authenticated server session');
console.log('IP used for affiliate identity: NO');
console.log('new order submitted by this test: NO');
