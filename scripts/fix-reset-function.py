from pathlib import Path
p=Path('/home/ubuntu/rab7na-store/storefront.html')
s=p.read_text(encoding='utf-8')
start=s.find('function acctResetView(email){')
end=s.find('function acctDoReset(email){', start)
if start<0 or end<0:
    raise SystemExit('reset function boundaries not found')
new=r'''var acctResetEmail='';
function acctResetView(email){
  acctResetEmail=email;
  var b=document.getElementById('acctBody');
  b.innerHTML='<h3 class="pm-name">تعيين كلمة سر جديدة</h3><p style="color:var(--muted);font-size:.8rem;line-height:1.8">تم إرسال الرمز إلى <b>'+esc(email)+'</b>.</p><label>رمز التحقق</label><input class="field" id="resetCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"><label>كلمة السر الجديدة</label><input class="field" id="resetPass" type="password" autocomplete="new-password" placeholder="6 أحرف على الأقل"><label>تأكيد كلمة السر</label><input class="field" id="resetPass2" type="password" autocomplete="new-password" placeholder="أعد كتابة كلمة السر"><button id="resetBtn" class="addbtn auth-submit" onclick="acctDoResetFromForm()" style="margin-top:14px">حفظ كلمة السر الجديدة</button><div class="msg" id="aMsg"></div>';
}
function acctDoResetFromForm(){acctDoReset(acctResetEmail);}
'''
s=s[:start]+new+s[end:]
p.write_text(s,encoding='utf-8')
print('reset function replaced')
