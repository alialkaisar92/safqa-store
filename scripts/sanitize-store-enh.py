from pathlib import Path

p = Path('/home/ubuntu/rab7na-store/public/store-enh.js')
s = p.read_text()
markers = ["\n(function(){\n\nfunction ensureNotif", "\n(function(){\n/* === الإشعارات === */", "\n(function(){\nvar storePendingEmail="]
cut = min([i for i in (s.find(m) for m in markers) if i >= 0], default=-1)
prefix = s[:cut] if cut >= 0 else s
filter_start = s.find("function openFilterSheet()")
push_start = s.find("/* rab7na push permission control")
if filter_start >= 0:
    suffix = s[filter_start:push_start if push_start >= 0 else len(s)]
else:
    suffix = ""
clean = prefix.rstrip() + "\n\n" + suffix.lstrip()
p.write_text(clean)
