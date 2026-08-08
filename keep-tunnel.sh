#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
while true; do
  cloudflared tunnel --url http://localhost:3000 >> tunnel.log 2>&1
  sleep 2
done
