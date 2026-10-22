@echo off
rem Starts the ASO Companion server with no window (used by "ASO Companion.vbs"). The log is in aso.log.
cd /d "%~dp0"

:prepare
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
echo [%date% %time%] installing and building >> aso.log
call npm install --no-audit --no-fund >> aso.log 2>&1
if errorlevel 1 goto fail
call npx next build >> aso.log 2>&1
if errorlevel 1 goto fail
if defined HEAD echo %HEAD%> ".next\aso-built.txt"

:run
echo [%date% %time%] starting >> aso.log
call npx next start -H 127.0.0.1 -p 3000 >> aso.log 2>&1
if %errorlevel%==3 goto prepare
exit /b 0

:fail
echo failed > aso-failed.txt
exit /b 1
