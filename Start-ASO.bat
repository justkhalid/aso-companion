@echo off
setlocal enableextensions
title ASO Companion
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed on this computer.
  echo The download page opens now. Install the LTS version, then double-click this file again.
  start https://nodejs.org/en/download
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo First start: making the settings file...
  powershell -NoProfile -Command "$s=[guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N'); Set-Content -Path .env.local -Value @('ASO_LOCAL=1','ASO_SESSION_SECRET='+$s,'GITHUB_PAT=','GITHUB_REPO=justkhalid/aso-companion','GITHUB_BRANCH=main','META_APP_ID=','META_APP_SECRET=')"
  echo.
  echo Notepad opens now. After GITHUB_PAT= paste the GitHub token, save the file and close Notepad.
  echo See LOCAL.md for how to make the token.
  notepad .env.local
)

:prepare
rem get the newest version of the app (only a clean fast-forward; nothing of this computer is overwritten)
where git >nul 2>nul && git pull --ff-only origin main >nul 2>nul
set HEAD=
where git >nul 2>nul && for /f %%i in ('git rev-parse HEAD 2^>nul') do set HEAD=%%i
set BUILT=
if exist ".next\aso-built.txt" set /p BUILT=<".next\aso-built.txt"
if not exist "node_modules" goto install
if not exist ".next\BUILD_ID" goto install
if not "%HEAD%"=="%BUILT%" goto install
goto run

:install
echo.
echo Getting the app ready. This takes a few minutes the first time and after an update.
call npm install --no-audit --no-fund
if errorlevel 1 goto fail
call npx next build
if errorlevel 1 goto fail
if defined HEAD echo %HEAD%> ".next\aso-built.txt"

:run
echo.
echo ASO Companion is starting. Keep this window open while you use the app.
start "" /min cmd /c "timeout /t 10 >nul & start http://localhost:3000/admin"
call npx next start -p 3000
if %errorlevel%==3 goto prepare
echo.
echo The app stopped. Close this window, or press a key to start it again.
pause
goto prepare

:fail
echo.
echo Something went wrong. Take a photo of this window and send it to the developer.
pause
exit /b 1
