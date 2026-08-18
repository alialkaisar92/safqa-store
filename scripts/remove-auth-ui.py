from pathlib import Path
import re

root = Path('/home/ubuntu/rab7na-store')

landing = root / 'landing.html'
s = landing.read_text()
s = s.replace('<a class="btn btn-p" href="#" onclick="lauthOpen(\'reg\');return false">ابدأ التسويق مجانًا</a>', '<a class="btn btn-p" href="/store">تصفح المتجر</a>')
s = s.replace('\n<div class="modal-ov" id="authM"></div>', '')
start = s.find('/* ---- auth modal ---- */')
end = s.find('</script>', start)
if start != -1 and end != -1:
    s = s[:start] + "// المتجر متاح للجميع بدون تسجيل أو إنشاء حساب.\nvar startBtn=document.getElementById('startBtn');\nif(startBtn){startBtn.textContent='تصفح المتجر';startBtn.href='/store';startBtn.removeAttribute('onclick');}\n" + s[end:]
landing.write_text(s)

store = root / 'public' / 'store-enh.js'
s = store.read_text()
s = re.sub(r'\n\(function\(\)\{\nvar storePendingEmail=.*?\n\}\)\(\);\n\(function\(\)\{\n/\* === الإشعارات === \*/', '\n(function(){\n', s, count=1, flags=re.S)
s = re.sub(r'\n\(function\(\)\{\n/\* === الإشعارات === \*/.*?\nfunction openFilterSheet\(\)', '\nfunction openFilterSheet()', s, count=1, flags=re.S)
# Remove any residual auth-only page guards and stale client tokens on load.
s = re.sub(r'\n\(function\(\)\{\ndocument\.addEventListener\("click",function\(e\).*?\n\}\)\(\);', '', s, count=1, flags=re.S)
s = re.sub(r'\n\(function\(\)\{function ping\(\).*?\n\}\)\(\);', '', s, count=1, flags=re.S)
store.write_text(s)

# A login page must not remain reachable as an authentication UI.
login = root / 'login.html'
if login.exists():
    login.unlink()
