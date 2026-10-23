@echo off
rem One-click launcher: installs CBZ Reader the first time (no admin rights needed), then just opens it.
setlocal
title CBZ Reader
set "SETUP=%TEMP%\CBZ-Reader-Setup.exe"
set "URL=https://github.com/kartikay633/cbz-reader/releases/latest/download/CBZ-Reader-Setup.exe"

call :find_app
if defined APP goto run

echo.
echo  Installing CBZ Reader. This only happens once.
echo  Downloading (about 110 MB)...
echo.
curl.exe -L --fail --progress-bar -o "%SETUP%" "%URL%" || powershell -NoProfile -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri $env:URL -OutFile $env:SETUP"
if errorlevel 1 goto failed
if not exist "%SETUP%" goto failed

echo.
echo  Installing...
start "" /wait "%SETUP%" /S
del "%SETUP%" 2>nul
call :find_app
if not defined APP goto failed
echo  Done! You can now also find CBZ Reader in the Start menu.

:run
start "" "%APP%" %*
exit /b 0

rem Sets APP to the installed CBZ Reader.exe, checking the default per-user install folder first.
:find_app
set "APP="
if exist "%LOCALAPPDATA%\Programs\CBZ Reader\CBZ Reader.exe" (
  set "APP=%LOCALAPPDATA%\Programs\CBZ Reader\CBZ Reader.exe"
  exit /b 0
)
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "foreach ($k in @(Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue)) { if ($k.DisplayName -like 'CBZ Reader*' -and $k.DisplayIcon) { $exe = ($k.DisplayIcon -split ',')[0]; if (Test-Path $exe) { $exe; break } } }"`) do set "APP=%%P"
exit /b 0

:failed
del "%SETUP%" 2>nul
echo.
echo  Something went wrong. Check your internet connection and try again, or install the app from
echo  https://github.com/kartikay633/cbz-reader/releases/latest
echo.
pause
exit /b 1
