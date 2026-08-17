from pathlib import Path
import re, subprocess, tempfile
root=Path('/home/ubuntu/rab7na-store')
server=root/'server.js'
s=server.read_text(encoding='utf-8')
route="""\napp.get('/api/support/whatsapp', (req, res) => {\n  const raw = String(process.env.WHATSAPP_SUPPORT_NUMBER || process.env.SUPPORT_WHATSAPP || process.env.WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');\n  res.set('Cache-Control', 'public, max-age=300');\n  res.json({ number: raw.length >= 10 ? raw : '' });\n});\n"""
if "'/api/support/whatsapp'" not in s:
    marker='app.listen(PORT, () => {'
    if marker not in s: raise SystemExit('server listen marker not found')
    s=s.replace(marker, route+'\n'+marker,1)
server.write_text(s,encoding='utf-8')

# Storefront: configure floating support button from server-side environment only.
p=root/'storefront.html'; t=p.read_text(encoding='utf-8')
old="""function setupWA(){
  var a=document.getElementById('waFloat');
  if(!a)return;
  var n=a.getAttribute('data-number')||'';
  if(!/^\\d{10,15}$/.test(n)){a.style.display='none';return;}
  a.href='https://wa.me/'+n+'?text='+encodeURIComponent('مرحباً، أريد الاستفسار عن المنتجات');
}
"""
new="""function setupWA(){
  var a=document.getElementById('waFloat'); if(!a)return;
  fetch('/api/support/whatsapp').then(function(r){return r.json()}).then(function(d){var n=String(d.number||'');if(!/^\\d{10,15}$/.test(n)){a.style.display='none';return;}a.href='https://wa.me/'+n+'?text='+encodeURIComponent('مرحباً، أريد الاستفسار عن المنتجات');}).catch(function(){a.style.display='none'});
}
"""
if old in t:
    t=t.replace(old,new,1)
p.write_text(t,encoding='utf-8')

# Public pages use the same endpoint; no hardcoded phone number.
for name in ('index.html','landing.html'):
    q=root/name; x=q.read_text(encoding='utf-8')
    x=x.replace('https://wa.me/201000000000?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D8%A7%D9%84%D9%85%D9%86%D8%B5%D8%A9', '#')
    if 'api/support/whatsapp' not in x:
        x=x.replace('</body>', '<script>(function(){var a=document.querySelector(".rab7na-wa-public");if(!a)return;fetch("/api/support/whatsapp").then(function(r){return r.json()}).then(function(d){var n=String(d.number||"");if(!/^\\d{10,15}$/.test(n)){a.style.display="none";return}a.href="https://wa.me/"+n+"?text="+encodeURIComponent("مرحباً، أريد الاستفسار عن المنصة")}).catch(function(){a.style.display="none"})})()</script>\n</body>',1)
    q.write_text(x,encoding='utf-8')

# Extract the inline storefront script and run a syntax check.
t=p.read_text(encoding='utf-8')
blocks=re.findall(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',t)
if not blocks: raise SystemExit('no inline script found')
js=blocks[-1]
check=root/'scripts/storefront-inline-check.js'; check.write_text(js,encoding='utf-8')
res=subprocess.run(['node','--check',str(check)],capture_output=True,text=True)
print(res.stdout.strip())
if res.returncode:
    print(res.stderr.strip()); raise SystemExit(res.returncode)
print('support endpoint and storefront syntax check passed')
