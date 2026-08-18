from pathlib import Path
import re

p = Path('/home/ubuntu/rab7na-store/storefront.html')
s = p.read_text()
start = s.find('function openWithdraw(){')
end = s.find('function updProfileBtn(){', start)
if start < 0 or end < 0:
    raise SystemExit('account block boundaries not found')
replacement = '''function openWithdraw(){
  ehToast('السحب متاح بعد إنشاء نظام الحسابات في إصدار لاحق.');
}
function openDashboard(){
  ehToast('المتجر العام لا يحتاج إلى لوحة حساب.');
}
function openAcct(){
  ehToast('المتجر متاح مباشرة بدون تسجيل أو إنشاء حساب.');
}
function acctLogout(){}
function acctAuthView(){}
function acctLoadDashboard(){}
function acctWithdrawView(){}
'''
s = s[:start] + replacement + s[end:]
start = s.find('function updProfileBtn(){')
end = s.find('function applyTheme(', start)
if start < 0 or end < 0:
    raise SystemExit('profile block boundaries not found')
replacement = '''function updProfileBtn(){
  var b=document.getElementById('sideUser'),lo=document.getElementById('sideLogout');
  if(b)b.innerHTML='<strong>متجر rab7na العام</strong><span>تصفح المنتجات وأرسل طلبك مباشرة دون حساب.</span>';
  if(lo)lo.style.display='none';
}
updProfileBtn();
updCC();

'''
s = s[:start] + replacement + s[end:]
s = re.sub(r'localStorage\.(getItem|setItem|removeItem)\(["\'](?:etok|euser|ertok)["\']\)', 'null', s)
s = re.sub(r'\b(?:تسجيل الدخول|إنشاء حساب|نسيت كلمة السر|سجّل الدخول)\b', 'المتجر العام', s)
p.write_text(s)
