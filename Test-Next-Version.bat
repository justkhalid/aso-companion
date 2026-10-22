@echo off
setlocal enableextensions
title ASO Companion - test copy
cd /d "%~dp0"
rem Tries the next version on port 3100. Edits made here go to a separate "sandbox" branch, never to main.
set BRANCH=%1
if "%BRANCH%"=="" set BRANCH=wa-notext
where node >nul 2>nul || (echo Install Node.js first, see LOCAL.md & pause & exit /b 1)
echo Getting the newest work on %BRANCH%...
git fetch origin || (pause & exit /b 1)
git stash -u -q 2>nul
git checkout %BRANCH% && git pull --ff-only origin %BRANCH% || (echo Could not update. Take a photo of this window. & pause & exit /b 1)
git ls-remote --exit-code --heads origin sandbox >nul 2>nul || git push origin origin/main:refs/heads/sandbox
call npm install --no-audit --no-fund || (pause & exit /b 1)
echo.
echo Open http://localhost:3100 (test copy, sandbox data). Close this window to stop.
start "" cmd /c "timeout /t 8 >nul & start http://localhost:3100"
set GITHUB_BRANCH=sandbox
set ASO_LOCAL=1
set PORT=3100
call npx next dev -p 3100
