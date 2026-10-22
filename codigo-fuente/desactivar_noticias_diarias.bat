@echo off
REM ====================================================================
REM  LeoFX - desactivar_noticias_diarias.bat
REM  Doble clic para QUITAR la busqueda diaria automatica de noticias.
REM  Las noticias ya guardadas no se borran.
REM ====================================================================
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Unregister-ScheduledTask -TaskName 'LeoFX - noticias del dolar' -Confirm:$false; Write-Host 'Busqueda diaria de noticias DESACTIVADA.'"
echo.
pause
