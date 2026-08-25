from pathlib import Path
import re

ROOT = Path('/home/ubuntu/rab7na-store')


def add_assets(text):
    if '/support-chat.css' not in text:
        text = text.replace('</head>', '  <link rel="stylesheet" href="/support-chat.css?v=1">\n</head>', 1)
    if '/support-chat.js' not in text:
        text = text.replace('</body>', '  <script src="/support-chat.js?v=1"></script>\n</body>', 1)
    return text


def remove_whatsapp_links(text):
    # Remove direct WhatsApp anchors, including multiline legacy markup.
    text = re.sub(r'<a\b[^>]*href=["\']https://wa\.me/[^>]*>.*?</a>', '', text, flags=re.I | re.S)
    # Remove public floating widget and its runtime initializer.
    text = re.sub(r'<style>[^<]*\.rab7na-wa-public\{.*?</style>\s*', '', text, flags=re.I | re.S)
    text = re.sub(r'<script>\(function\(\)\{var a=document\.querySelector\("\.rab7na-wa-public"\).*?</script>\s*', '', text, flags=re.I | re.S)
    # Remove the old store2 floating link by class, even when its SVG spans lines.
    text = re.sub(r'<a\b[^>]*class=["\']wa["\'][^>]*>.*?</a>', '', text, flags=re.I | re.S)
    text = re.sub(r'<a\b[^>]*class=["\']rab7na-wa-public["\'][^>]*>.*?</a>', '', text, flags=re.I | re.S)
    text = re.sub(r'\.wa\{[^}]*\}\s*', '', text, count=1)
    text = re.sub(r'\.wa svg\{[^}]*\}\s*', '', text, count=1)
    text = re.sub(r'#waFloat\{[^}]*\}\s*', '', text, count=1)
    text = re.sub(r'<a\b[^>]*id=["\']waFloat["\'][^>]*>.*?</a>', '', text, flags=re.I | re.S)
    # Do not leave WhatsApp-specific public endpoint boot code in active pages.
    text = re.sub(r'<script>[^<]*fetch\(["\']/api/support/whatsapp["\'][\s\S]*?</script>', '', text, flags=re.I)
    text = re.sub(r'<script>\s*var a=document\.getElementById\(["\']waFloat["\']\)[\s\S]*?</script>', '', text, flags=re.I)
    text = re.sub(r'\nfunction setupWA\(\)\{[\s\S]*?\n\}\n', '\n', text, flags=re.I)
    text = text.replace(' setupWA();', '')
    return text


for filename in ('store2.html', 'index.html', 'landing.html', 'storefront.html'):
    path = ROOT / filename
    if not path.exists():
        continue
    text = path.read_text(encoding='utf-8')
    text = remove_whatsapp_links(text)
    text = text.replace('الدعم عبر واتساب', 'شات الدعم')
    text = text.replace('دعم عبر واتساب', 'دعم داخل المنصة')
    text = text.replace('مباشرة على واتساب', 'مباشرة عبر شات الدعم')
    text = text.replace("location.href='https://wa.me/201092876053'", "Rab7naSupport.open()")
    text = text.replace("closeDrw();openWA&&openWA()", "closeDrw();Rab7naSupport.open()")
    text = text.replace("closeSidebar();document.getElementById('waFloat').click()", "closeSidebar();Rab7naSupport.open()")
    text = add_assets(text)
    path.write_text(text, encoding='utf-8')
    print('updated', filename)

premium = ROOT / 'themes' / 'premium.js'
if premium.exists():
    text = premium.read_text(encoding='utf-8')
    text = text.replace('الدعم عبر واتساب', 'شات الدعم')
    text = re.sub(r'window\.openWA\s*=\s*function\(\)\s*\{[^}]*\};?', 'window.openWA=function(){if(window.Rab7naSupport)Rab7naSupport.open();};', text)
    text = text.replace("openWA&&openWA()", "Rab7naSupport&&Rab7naSupport.open()")
    premium.write_text(text, encoding='utf-8')
    print('updated themes/premium.js')

for filename in ('store2.html', 'index.html', 'landing.html', 'storefront.html'):
    path = ROOT / filename
    if path.exists():
        text = path.read_text(encoding='utf-8')
        assert 'support-chat.js' in text, f'{filename}: support script missing'
        assert 'wa.me/' not in text, f'{filename}: WhatsApp link remains'
        assert 'rab7na-wa-public' not in text, f'{filename}: old floating widget remains'
print('WhatsApp replacement assertions passed')
