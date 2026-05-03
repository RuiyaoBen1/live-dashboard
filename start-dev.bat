@echo off
powershell -WindowStyle Hidden -Command "Start-Process 'C:\Users\14546\.cloudflared\cloudflared.exe' -ArgumentList 'tunnel','--config','C:\Users\14546\.cloudflared\config.yml','run' -WindowStyle Hidden"
cd /d E:\live-dashboard-main\packages\frontend
call bun run build
set STATIC_DIR=E:\live-dashboard-main\packages\frontend\out
cd /d E:\live-dashboard-main\packages\backend
bun --watch src/index.ts
