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
echo [1/2] Pruefe, ob sich die App fehlerfrei bauen laesst...
call npm run build
if errorlevel 1 (
  echo.
  echo Der Build ist fehlgeschlagen - es wurde NICHTS hochgeladen.
  goto :fehler
)

echo.
echo [2/2] Lade den Stand zu GitHub hoch...
git add .
git commit -m "%MSG%"
git push
if errorlevel 1 (
  echo.
  echo Push abgelehnt - auf GitHub liegen Aenderungen, die hier fehlen.
  echo Versuche, sie automatisch zusammenzufuehren...
  git pull --no-rebase --no-edit
  if errorlevel 1 (
    git merge --abort >nul 2>nul
    echo.
    echo Automatisches Zusammenfuehren ist nicht moeglich, weil sich Dateien
    echo auf GitHub und hier unterschiedlich geaendert haben.
    echo Es wurde nichts veraendert. Bitte Screenshot an Claude schicken.
    goto :fehler
  )
  git push
  if errorlevel 1 goto :fehler
)

echo.
echo ================================================
echo  FERTIG. GitHub baut und veroeffentlicht die Seite jetzt selbst.
echo.
echo  Fortschritt (gruener Haken = fertig, dauert ca. 1-2 Minuten):
echo  https://github.com/ThomasSchlerethBM/Family-Planner/actions
echo.
echo  Danach ist die Seite aktuell - mit Strg+Shift+R neu laden:
echo  https://thomasschlerethbm.github.io/Family-Planner/
echo ================================================
pause
exit /b 0

:fehler
echo.
echo Es ist ein Fehler aufgetreten. Bitte die Meldung oben lesen
echo oder einen Screenshot an Claude schicken.
pause
exit /b 1
