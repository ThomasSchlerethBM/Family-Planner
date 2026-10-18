@echo off
setlocal
cd /d "%~dp0"
title Family Planner - veroeffentlichen

echo ================================================
echo  Family Planner - veroeffentlichen
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo FEHLER: Node.js wurde nicht gefunden.
  goto :fehler
)
where git >nul 2>nul
if errorlevel 1 (
  echo FEHLER: Git wurde nicht gefunden.
  goto :fehler
)

if not exist node_modules (
  echo Installiere Pakete - nur beim ersten Mal...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :fehler
)

set "MSG="
set /p "MSG=Kurze Beschreibung der Aenderung (Enter = Update): "
if not defined MSG set "MSG=Update"
set "MSG=%MSG:"=%"

echo.
echo [1/2] Baue die App und veroeffentliche die Webseite...
call npm run deploy
if errorlevel 1 goto :fehler

echo.
echo [2/2] Sichere den Quellcode auf GitHub...
git add .
git commit -m "%MSG%"
git push
if errorlevel 1 goto :fehler

echo.
echo ================================================
echo  FERTIG. In 1-2 Minuten ist die Seite aktuell:
echo  https://thomasschlerethbm.github.io/Family-Planner/
echo  Dort mit Strg+Shift+R neu laden.
echo ================================================
pause
exit /b 0

:fehler
echo.
echo Es ist ein Fehler aufgetreten. Bitte die Meldung oben lesen
echo oder einen Screenshot an Claude schicken.
pause
exit /b 1
