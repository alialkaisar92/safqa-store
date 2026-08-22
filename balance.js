function deliveredStatus(status) {
  return ['تم التسليم', 'تم التوصيل', 'delivered', 'completed'].includes(String(status || '').trim().toLowerCase());
}

function rejectedStatus(status) {
  return ['rejected', 'مرفوض', 'رفض'].includes(String(status || '').trim().toLowerCase());
}

function availableBalanceFromRecords(user, orders, withdrawals) {
  const deliveredCommission = (Array.isArray(orders) ? orders : [])
    .filter(o => deliveredStatus(o && o.status))
    .reduce((sum, o) => sum + Math.max(0, Number(o && o.commission) || 0), 0);
  const manualCredits = Math.max(0, Number(user && (user.manualCredits != null ? user.manualCredits : user.manual_credits)) || 0);
  const withdrawn = (Array.isArray(withdrawals) ? withdrawals : [])
    .filter(w => !rejectedStatus(w && w.status))
    .reduce((sum, w) => sum + Math.max(0, Number(w && w.amount) || 0), 0);
  return Math.max(0, manualCredits + deliveredCommission - withdrawn);
}

function availableBalance(user, affiliate) {
  const uid = String(user && user.id != null ? user.id : '');
  const orders = ((affiliate && affiliate.orders) || []).filter(o => String(o && o.userId) === uid);
  const withdrawals = ((affiliate && affiliate.withdrawals) || []).filter(w => String(w && w.userId) === uid);
  return availableBalanceFromRecords(user, orders, withdrawals);
}

module.exports = { deliveredStatus, rejectedStatus, availableBalanceFromRecords, availableBalance };
