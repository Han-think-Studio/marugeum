@echo off
rem Marugeum one-click: pull latest, build, open in browser (http://localhost:4173)
chcp 65001 >nul
cd /d "%~dp0"
git pull --rebase --autostash origin main
if not exist node_modules call npm.cmd install
call npm.cmd run build
if errorlevel 1 (echo BUILD FAILED & pause & exit /b 1)
call npm.cmd run preview -- --open
pause
