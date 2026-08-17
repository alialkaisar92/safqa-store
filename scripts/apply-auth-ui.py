from pathlib import Path

ROOT = Path('/home/ubuntu/rab7na-store')

# Storefront: add account recovery UI and interaction states.
p = ROOT / 'storefront.html'
s = p.read_text(encoding='utf-8')
css = r'''
<style>
@keyframes rab7naShake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}
#acctBody.auth-shake{animation:rab7naShake .5s ease-in-out;border:1px solid #e53935;border-radius:16px;padding:4px}
#acctBody.auth-shake .field{border-color:#e53935}
.login-success-overlay{position:fixed;inset:0;background:rgba(4,27,20,.62);display:flex;align-items:center;justify-content:center;z-index:10000;opacity:0;pointer-events:none;transition:opacity .25s ease}
.login-success-overlay.show{opacity:1;pointer-events:auto}
.login-success-card{text-align:center;color:#fff;font-weight:800}
.login-success-card .like-icon{font-size:82px;line-height:1;animation:rab7naPop .6s cubic-bezier(.34,1.56,.64,1) forwards}
@keyframes rab7naPop{0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.18) rotate(8deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
.auth-submit{position:relative;min-height:46px;transition:all .2s ease}
.auth-submit.loading{opacity:.82;pointer-events:none}
.auth-submit.loading:after{content:'';width:16px;height:16px;border:2px solid rgba(255,255,255,.5);border-top-color:#fff;border-radius:50%;animation:rab7naSpin .7s linear infinite;position:absolute;left:18px;top:50%;margin-top:-9px}
@keyframes rab7naSpin{to{transform:rotate(360deg)}}
.forgot-link{display:block;text-align:center;color:var(--forest-d);font-weight:800;font-size:.78rem;margin-top:10px}
</style>
<div id="loginSuccessOverlay" class="login-success-overlay"><div class="login-success-card"><div class="like-icon">👍</div><div style="font-size:1.05rem;margin-top:12px">تم تسجيل الدخول بنجاح</div></div></div>
'''
if 'id="loginSuccessOverlay"' not in s:
    s = s.replace('<script>\nvar P=', css + '\n<script>\nvar P=', 1)
# Add forgot link and stable button id in the generated login view.
s = s.replace("'<button class=\"addbtn\" onclick=\"acctDoLogin()\" style=\"margin-top:14px\">دخول</button>'", "'<button id=\"acctLoginBtn\" class=\"addbtn auth-submit\" onclick=\"acctDoLogin()\" style=\"margin-top:14px\">دخول</button><a href=\"#\" class=\"forgot-link\" onclick=\"acctForgotView();return false\">نسيت كلمة السر؟</a>'")
old = """function acctDoLogin(){
  var contact=document.getElementById('aContact').value.trim(), pass=document.getElementById('aPass').value;
  if(!contact||!pass) return acctMsg('اكمل البيانات',false);
  fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contact:contact,password:pass})})
  .then(function(r){return r.json()}).then(function(d){
    if(d.ok){ localStorage.setItem('etok',d.token); localStorage.setItem('euser',JSON.stringify(d.user)); updProfileBtn(); acctLoadDashboard(); }
    else acctMsg(d.error||'فشل الدخول',false);
  }).catch(function(){acctMsg('تعذر الاتصال',false)});
}
"""
new = """function acctDoLogin(){
  var contact=document.getElementById('aContact').value.trim(), pass=document.getElementById('aPass').value, box=document.getElementById('acctBody'), btn=document.getElementById('acctLoginBtn');
  if(!contact||!pass) return acctMsg('أكمل البريد أو الهاتف وكلمة السر',false);
  box.classList.remove('auth-shake'); if(btn) btn.classList.add('loading');
  fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contact:contact,password:pass})})
  .then(function(r){return r.json().then(function(d){return {ok:r.ok,data:d}})}).then(function(x){
    var d=x.data||{};
    if(d.ok){ localStorage.setItem('etok',d.token); localStorage.setItem('euser',JSON.stringify(d.user)); updProfileBtn(); var ov=document.getElementById('loginSuccessOverlay'); if(ov) ov.classList.add('show'); setTimeout(function(){if(ov) ov.classList.remove('show'); acctLoadDashboard();},850); }
    else { if(btn) btn.classList.remove('loading'); box.classList.add('auth-shake'); acctMsg(d.error||'بيانات الدخول غير صحيحة',false); setTimeout(function(){box.classList.remove('auth-shake')},550); }
  }).catch(function(){if(btn) btn.classList.remove('loading');box.classList.add('auth-shake');acctMsg('تعذر الاتصال بالخادم، حاول مرة أخرى',false);setTimeout(function(){box.classList.remove('auth-shake')},550)});
}
function acctForgotView(){
  var b=document.getElementById('acctBody');
  b.innerHTML='<h3 class="pm-name">استرجاع كلمة السر</h3><p style="color:var(--muted);font-size:.8rem;line-height:1.8">اكتب بريدك المسجل، وسنرسل لك رمز تحقق صالحًا لمدة 10 دقائق.</p><label>البريد الإلكتروني</label><input class="field" id="forgotEmail" type="email" autocomplete="email" placeholder="name@example.com"><button id="forgotRequestBtn" class="addbtn auth-submit" onclick="acctForgotRequest()" style="margin-top:14px">إرسال رمز التحقق</button><div class="msg" id="aMsg"></div><div style="text-align:center;margin-top:14px;font-size:.82rem"><a href="#" onclick="acctAuthView('login');return false" style="color:var(--forest-d);font-weight:800">العودة لتسجيل الدخول</a></div>';
}
function acctForgotRequest(){
  var email=(document.getElementById('forgotEmail').value||'').trim().toLowerCase(), btn=document.getElementById('forgotRequestBtn');
  if(!/^\\S+@\\S+\\.\\S+$/.test(email)) return acctMsg('اكتب بريدًا إلكترونيًا صحيحًا',false);
  if(btn) btn.classList.add('loading');
  fetch('/api/auth/password/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email})}).then(function(r){return r.json().then(function(d){return {ok:r.ok,data:d}})}).then(function(x){var d=x.data||{};if(btn)btn.classList.remove('loading');if(d.ok){acctResetView(email);}else acctMsg(d.error||'تعذر إرسال الرمز حاليًا',false)}).catch(function(){if(btn)btn.classList.remove('loading');acctMsg('تعذر الاتصال بالخادم',false)});
}
function acctResetView(email){
  var b=document.getElementById('acctBody');
  b.innerHTML='<h3 class="pm-name">تعيين كلمة سر جديدة</h3><p style="color:var(--muted);font-size:.8rem;line-height:1.8">تم إرسال الرمز إلى <b>'+esc(email)+'</b>.</p><label>رمز التحقق</label><input class="field" id="resetCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"><label>كلمة السر الجديدة</label><input class="field" id="resetPass" type="password" autocomplete="new-password" placeholder="6 أحرف على الأقل"><label>تأكيد كلمة السر</label><input class="field" id="resetPass2" type="password" autocomplete="new-password" placeholder="أعد كتابة كلمة السر"><button id="resetBtn" class="addbtn auth-submit" onclick="acctDoReset(\\''+esc(email).replace(/'/g,"\\\\'")+"\\')" style=\"margin-top:14px\">حفظ كلمة السر الجديدة</button><div class=\"msg\" id=\"aMsg\"></div>";
}
function acctDoReset(email){
  var code=(document.getElementById('resetCode').value||'').trim(), pass=document.getElementById('resetPass').value, pass2=document.getElementById('resetPass2').value, btn=document.getElementById('resetBtn');
  if(!/^\\d{6}$/.test(code))return acctMsg('اكتب رمز التحقق المكوّن من 6 أرقام',false); if(pass.length<6)return acctMsg('كلمة السر 6 أحرف على الأقل',false); if(pass!==pass2)return acctMsg('كلمتا السر غير متطابقتين',false); if(btn)btn.classList.add('loading');
  fetch('/api/auth/password/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,code:code,password:pass,password2:pass2})}).then(function(r){return r.json().then(function(d){return {ok:r.ok,data:d}})}).then(function(x){var d=x.data||{};if(btn)btn.classList.remove('loading');if(d.ok){acctAuthView('login');acctMsg('تم تغيير كلمة السر بنجاح، سجّل الدخول الآن',true)}else acctMsg(d.error||'تعذر تغيير كلمة السر',false)}).catch(function(){if(btn)btn.classList.remove('loading');acctMsg('تعذر الاتصال بالخادم',false)});
}
"""
if old not in s:
    raise SystemExit('acctDoLogin block not found')
s=s.replace(old,new,1)
# Put the WhatsApp button above the browser safe area on mobile.
s=s.replace('#waFloat{position:fixed;bottom:88px;', '#waFloat{position:fixed;bottom:calc(24px + env(safe-area-inset-bottom));', 1)
p.write_text(s, encoding='utf-8')

# Add a public support button to both public landing variants. The number remains an environment-driven placeholder.
wa_css = '<style>.rab7na-wa-public{position:fixed;right:18px;bottom:calc(20px + env(safe-area-inset-bottom));z-index:90;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#25D366;color:#fff;font-size:25px;box-shadow:0 10px 24px rgba(0,0,0,.2);text-decoration:none;transition:transform .2s ease}.rab7na-wa-public:hover{transform:scale(1.06)}@media(min-width:800px){.rab7na-wa-public{right:28px;bottom:28px}}</style>'
wa_html = '<a class="rab7na-wa-public" href="https://wa.me/201000000000?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D8%A7%D9%84%D9%85%D9%86%D8%B5%D8%A9" target="_blank" rel="noopener" aria-label="الدعم عبر واتساب">💬</a>'
for name in ('index.html','landing.html'):
    q=ROOT/name; t=q.read_text(encoding='utf-8')
    if 'class="rab7na-wa-public"' not in t:
        t=t.replace('</body>', wa_css+wa_html+'\n</body>',1)
    q.write_text(t,encoding='utf-8')

# Add password recovery to the standalone login page by including the same compact UI script if the page exists.
q=ROOT/'login.html'; t=q.read_text(encoding='utf-8')
if 'id="loginSuccessOverlay"' not in t:
    t=t.replace('</body>', '<div id="loginSuccessOverlay" class="login-success-overlay" style="display:none"></div>\n</body>',1)
q.write_text(t,encoding='utf-8')
print('updated auth UI and public WhatsApp entry points')
