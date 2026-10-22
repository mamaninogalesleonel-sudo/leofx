@echo off
REM ====================================================================
REM  LeoFX - armar_LeoFX.bat
REM  Doble clic para volver a crear ..\LeoFX.html (un solo archivo con
REM  todo adentro) a partir de los archivos de esta carpeta.
REM  Solo hace falta si modifico index.html, styles.css, datos.js o app.js.
REM  "-ExecutionPolicy Bypass" permite ejecutar solo este script, sin
REM  cambiar la configuracion de Windows.
REM ====================================================================
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0armar_LeoFX.ps1"
echo.
pause
