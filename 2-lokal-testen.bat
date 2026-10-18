@echo off
setlocal
cd /d "%~dp0"
title Family Planner - lokal testen

echo ================================================
echo  Family Planner - lokal testen
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo FEHLER: Node.js wurde nicht gefunden.
  goto :fehler
)

echo Installiere/aktualisiere Pakete...
call npm install --no-audit --no-fund
if errorlevel 1 goto :fehler

echo.
echo Starte den Testserver - der Browser oeffnet sich automatisch.
echo ZUM BEENDEN: Strg+C druecken und die Frage mit J beantworten.
echo.
call npm run dev -- --open
echo.
echo Testserver beendet. Wenn alles gepasst hat: 3-veroeffentlichen.bat
pause
exit /b 0

:fehler
echo.
echo Es ist ein Fehler aufgetreten. Bitte die Meldung oben lesen.
pause
exit /b 1
