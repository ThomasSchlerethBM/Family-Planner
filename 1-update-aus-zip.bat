@echo off
setlocal
cd /d "%~dp0"
title Family Planner - Update aus ZIP

echo ================================================
echo  Family Planner - neue Dateien aus ZIP uebernehmen
echo ================================================
echo.

rem --- neueste family-planner*.zip im Downloads-Ordner suchen ---
set "ZIP="
for /f "delims=" %%f in ('dir /b /o-d "%USERPROFILE%\Downloads\family-planner*.zip" 2^>nul') do (
  if not defined ZIP set "ZIP=%USERPROFILE%\Downloads\%%f"
)
if not defined ZIP (
  echo FEHLER: Im Downloads-Ordner wurde keine Datei family-planner*.zip gefunden.
  echo Bitte die ZIP-Datei zuerst herunterladen und dann dieses Skript erneut starten.
  goto :fehler
)
echo Verwende: %ZIP%
echo.

set "STAGE=%TEMP%\fp_update"
if exist "%STAGE%" rmdir /s /q "%STAGE%"

echo Entpacke...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%STAGE%' -Force"
if errorlevel 1 goto :fehler
if not exist "%STAGE%\family-planner\package.json" (
  echo FEHLER: Die ZIP-Datei hat nicht den erwarteten Aufbau.
  goto :fehler
)

rem --- diese Skript-Datei selbst nie ueberschreiben; persoenliche PIN-Datei
rem --- nur dann nicht ueberschreiben, wenn sie hier schon existiert ---
set "XF=1-update-aus-zip.bat"
if exist "%~dp0src\localConfig.js" set "XF=%XF% localConfig.js"

echo Kopiere Dateien in %~dp0
robocopy "%STAGE%\family-planner" "%~dp0." /E /XD node_modules .git dist /XF %XF% /NFL /NDL /NJH /NJS /NP
if errorlevel 8 goto :fehler

rmdir /s /q "%STAGE%"

echo.
echo ================================================
echo  Fertig. Naechster Schritt: 2-lokal-testen.bat
echo ================================================
pause
exit /b 0

:fehler
echo.
echo Es ist ein Fehler aufgetreten. Bitte die Meldung oben lesen.
pause
exit /b 1
