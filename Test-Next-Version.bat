@echo off
setlocal enableextensions
title ASO Companion - test copy
cd /d "%~dp0"
rem Tries the next version on port 3100. Edits made here stay in .test-state.json on this computer, never on GitHub.
set BRANCH=%1
if "%BRANCH%"=="" set BRANCH=wa-notext
where node >nul 2>nul || (echo Install Node.js first, see LOCAL.md & pause & exit /b 1)
echo Getting the newest work on %BRANCH%...
git fetch origin || (pause & exit /b 1)
git stash -u -q 2>nul
git checkout %BRANCH% && git pull --ff-only origin %BRANCH% || (echo Could not update. Take a photo of this window. & pause & exit /b 1)
if not exist .test-state.json copy data\state.json .test-state.json >nul
call npm install --no-audit --no-fund || (pause & exit /b 1)
echo.
echo Open http://localhost:3100 (test copy, its own data). Close this window to stop.
start "" cmd /c "timeout /t 8 >nul & start http://localhost:3100"
set ASO_STATE_FILE=%CD%\.test-state.json
set ASO_LOCAL=1
set PORT=3100
call npx next dev -p 3100
