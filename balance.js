function deliveredStatus(status) {
  return ['تم التسليم', 'تم التوصيل', 'delivered', 'completed'].includes(String(status || '').trim().toLowerCase());
}

function rejectedStatus(status) {
  return ['rejected', 'مرفوض', 'رفض'].includes(String(status || '').trim().toLowerCase());
}

function availableBalance(user, affiliate) {
  const uid = String(user && user.id != null ? user.id : '');
  const orders = (affiliate && affiliate.orders) || [];
  const withdrawals = (affiliate && affiliate.withdrawals) || [];
  const deliveredCommission = orders
    .filter(o => String(o.userId) === uid && deliveredStatus(o.status))
    .reduce((sum, o) => sum + Math.max(0, Number(o.commission) || 0), 0);
  const manualCredits = Math.max(0, Number(user && user.manualCredits) || 0);
  const withdrawn = withdrawals
    .filter(w => String(w.userId) === uid && !rejectedStatus(w.status))
    .reduce((sum, w) => sum + Math.max(0, Number(w.amount) || 0), 0);
  return Math.max(0, manualCredits + deliveredCommission - withdrawn);
}

module.exports = { deliveredStatus, rejectedStatus, availableBalance };
