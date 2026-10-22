@echo off
REM ====================================================================
REM  LeoFX - actualizar_ahora.bat
REM  Doble clic para actualizar LeoFX.html EN ESTE MOMENTO: guarda el
REM  dolar del dia, busca noticias y vuelve a armar el archivo.
REM  (La tarea diaria de Windows ya lo hace sola a las 9:00 y 21:00.)
REM ====================================================================
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0actualizar_leofx.ps1"
echo.
pause
