const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const postgres = fs.readFileSync(path.join(root, 'lib', 'postgres.js'), 'utf8');
const { availableBalance } = require(path.join(root, 'balance.js'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const user = { id: 'affiliate-1', balance: 9999, manualCredits: 25 };
const affiliate = {
  orders: [
    { id: 'o1', userId: 'affiliate-1', status: 'تم التسليم', commission: 100 },
    { id: 'o2', userId: 'affiliate-1', status: 'قيد التأكيد', commission: 50 },
    { id: 'other', userId: 'affiliate-2', status: 'تم التسليم', commission: 1000 }
  ],
  withdrawals: [
    { id: 'w1', userId: 'affiliate-1', status: 'pending', amount: 30 },
    { id: 'w2', userId: 'affiliate-1', status: 'rejected', amount: 500 },
    { id: 'other-w', userId: 'affiliate-2', status: 'pending', amount: 900 }
  ]
};

assert(availableBalance(user, affiliate) === 95, 'availableBalance must be manual credits + delivered commission - active withdrawals');
assert(server.includes('const balance = await syncUserBalanceScoped(user, { orders, withdrawals });'), 'affiliate dashboard must use the central scoped balance calculation');
assert(!server.includes('Number(user.balance || 0) - pendingWithdrawals'), 'affiliate dashboard must not subtract withdrawals twice');
assert(server.includes('postgres.createAffiliateWithdrawal({ userId: user.id, amount, method, details, requestKey })'), 'withdrawal must use the atomic PostgreSQL reservation');
assert(!server.includes('Number(user.balance || 0) - reserved'), 'withdrawal validation must not subtract withdrawals twice');
assert(postgres.includes("UPDATE users SET balance=$2, updated_at=NOW()"), 'post-withdrawal balance must be persisted atomically');
console.log('affiliate balance checks: PASS');
console.log('expected available balance: 95');
console.log('dashboard and withdrawal double-subtraction: NO');
console.log('network/order submitted by this test: NO');
