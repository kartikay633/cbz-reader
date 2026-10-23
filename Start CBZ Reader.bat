@echo off
rem One-click launcher: downloads the ready-made app on first run, then just opens it.
setlocal
title CBZ Reader
set "APP_DIR=%~dp0app"
set "APP=%APP_DIR%\CBZ-Reader-portable.exe"
set "URL=https://github.com/kartikay633/cbz-reader/releases/latest/download/CBZ-Reader-portable.exe"

if exist "%APP%" goto run

echo.
echo  First run: downloading CBZ Reader (about 110 MB). This only happens once.
echo.
if not exist "%APP_DIR%" mkdir "%APP_DIR%"
curl.exe -L --fail --progress-bar -o "%APP%.part" "%URL%" || powershell -NoProfile -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri $env:URL -OutFile ($env:APP + '.part')"
if errorlevel 1 goto failed
if not exist "%APP%.part" goto failed
move /y "%APP%.part" "%APP%" >nul

:run
start "" "%APP%" %*
exit /b 0

:failed
if exist "%APP%.part" del "%APP%.part"
echo.
echo  Download failed. Check your internet connection and try again, or download the app from
echo  https://github.com/kartikay633/cbz-reader/releases/latest
echo.
pause
exit /b 1
