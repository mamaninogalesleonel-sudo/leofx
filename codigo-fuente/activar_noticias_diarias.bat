@echo off
REM ====================================================================
REM  LeoFX - activar_noticias_diarias.bat
REM  Doble clic UNA SOLA VEZ: todos los dias a las 9:00 y a las 21:00
REM  Windows guardara el dolar, buscara noticias y actualizara LeoFX.html.
REM  Para quitarlo: desactivar_noticias_diarias.bat
REM ====================================================================
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0activar_noticias_diarias.ps1"
echo.
pause
