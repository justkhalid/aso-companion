@echo off
rem Starts the ASO Companion server with no window (used by "ASO Companion.vbs"). The log is in aso.log.
cd /d "%~dp0"

:prepare
call :selfupdate
set HEAD=
rem a copy that updates itself from Google Drive (.aso\release.json) is not a git folder: git must not be asked about it
if not exist ".aso\release.json" where git >nul 2>nul && for /f %%i in ('git rev-parse HEAD 2^>nul') do set HEAD=%%i
set BUILT=
if exist ".next\aso-built.txt" set /p BUILT=<".next\aso-built.txt"
if not exist "node_modules" goto install
if not exist ".next\BUILD_ID" goto install
if not "%HEAD%"=="%BUILT%" goto install
goto run

:install
echo [%date% %time%] installing and building >> aso.log
call npm install --no-audit --no-fund >> aso.log 2>&1
if errorlevel 1 goto fail
call npx next build >> aso.log 2>&1
if errorlevel 1 goto fail
if defined HEAD echo %HEAD%> ".next\aso-built.txt"

:run
echo [%date% %time%] starting >> aso.log
if not exist ".aso\ASO Companion.exe" call :makeexe
if exist ".aso\ASO Companion.exe" (
  ".aso\ASO Companion.exe" node_modules\next\dist\bin\next start -H 127.0.0.1 -p 3000 >> aso.log 2>&1
) else (
  call npx next start -H 127.0.0.1 -p 3000 >> aso.log 2>&1
)
if %errorlevel%==3 goto prepare
exit /b 0

:fail
echo failed > aso-failed.txt
exit /b 1

:makeexe
rem a copy of Node with our name and icon, so Task Manager shows "ASO Companion" (the app works the same without it)
if not exist ".aso" mkdir ".aso"
for /f "delims=" %%n in ('where node') do if not exist ".aso\ASO Companion.exe" copy /y "%%n" ".aso\ASO Companion.exe" >nul
call npx --yes rcedit ".aso\ASO Companion.exe" --set-icon "public\aso-logo.ico" --set-version-string FileDescription "ASO Companion" --set-version-string ProductName "ASO Companion" --set-version-string CompanyName "American Space Oujda" >> aso.log 2>&1
exit /b 0

:selfupdate
rem pull the newest version quietly: with the GitHub token from .env.local, and never ask for a login
rem once updates come from Google Drive (.aso\release.json exists) the app updates itself and git must not touch the files
if exist ".aso\release.json" exit /b 0
where git >nul 2>nul || exit /b 0
set "GIT_TERMINAL_PROMPT=0"
set "GCM_INTERACTIVE=never"
set "PAT="
if exist ".env.local" for /f "tokens=1,* delims==" %%a in ('findstr /b /c:"GITHUB_PAT=" ".env.local"') do set "PAT=%%b"
if not defined PAT goto su_plain
set "B64="
for /f %%b in ('powershell -NoProfile -Command "[Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes('x-access-token:%PAT%'))"') do set "B64=%%b"
git -c credential.helper= -c "http.https://github.com/.extraheader=AUTHORIZATION: basic %B64%" pull --ff-only origin main >nul 2>nul
exit /b 0
:su_plain
git pull --ff-only origin main >nul 2>nul
exit /b 0
