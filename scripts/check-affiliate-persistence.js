const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const postgres = fs.readFileSync(path.join(root, 'lib/postgres.js'), 'utf8');
const firestore = fs.readFileSync(path.join(root, 'firestore.js'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'services/auth-postgres.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const field of ['manual_credits', 'total_earned', 'sales_count', 'sales']) {
  assert(postgres.includes(`ADD COLUMN IF NOT EXISTS ${field}`), `missing users.${field} migration`);
  assert(firestore.includes(field), `firestore does not persist users.${field}`);
}
assert(firestore.includes('if (!user || !user.password_hash)'), 'public session update guard is missing');
assert(firestore.includes('UPDATE users SET'), 'public session update path is missing');
const publicUpdate = firestore.split('if (!user || !user.password_hash)')[1].split('const result = await query(`INSERT INTO users')[0];
assert(!publicUpdate.includes('password_hash'), 'public session path must not overwrite password_hash');
assert(!publicUpdate.includes('email='), 'public session path must not overwrite email');
assert(auth.includes('u.manual_credits,u.total_earned,u.sales_count,u.sales'), 'current session does not load affiliate fields');
assert(auth.includes('manualCredits: Number(row.manual_credits'), 'public user does not expose manual credits');
console.log('affiliate persistence checks: PASS');
console.log('affiliate fields: balance, manualCredits, totalEarned, salesCount, sales');
console.log('public session updates preserve password_hash: YES');
console.log('network/order submitted by this test: NO');
