#!/data/data/com.termux/files/usr/bin/bash
cd ~/safqa-store
termux-wake-lock
pkill -f "node server.js" 2>/dev/null
pkill -f cloudflared 2>/dev/null
pkill -f keep-tunnel 2>/dev/null
sleep 1
nohup node server.js > eo_boot.log 2>&1 &
sleep 3
> tunnel.log
nohup bash keep-tunnel.sh > /dev/null 2>&1 &
sleep 12
echo "✅ السيرفر: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/store)"
echo "🔗 رابطك العام:"
grep -o "https://[a-z0-9-]*\.trycloudflare\.com" tunnel.log | tail -1
