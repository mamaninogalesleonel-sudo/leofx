<# =====================================================================
   LeoFX — activar_noticias_diarias.ps1
   ---------------------------------------------------------------------
   Crea una "tarea programada" de Windows que ejecuta actualizar_leofx.ps1
   todos los días a las 9:00 y a las 21:00 (después de que el BCB publica
   el tipo de cambio): guarda las cotizaciones del día, busca noticias y
   vuelve a armar LeoFX.html. Si la computadora estaba apagada a esa hora,
   lo hace apenas se encienda.

   La tarea es solo para su usuario de Windows y no necesita permisos de
   administrador. Para quitarla: doble clic en desactivar_noticias_diarias.bat
   ===================================================================== #>

$ErrorActionPreference = "Stop"
$nombreTarea = "LeoFX - noticias del dolar"
$script = Join-Path $PSScriptRoot "actualizar_leofx.ps1"

# Qué ejecuta la tarea: PowerShell en ventana oculta con actualizar_leofx.ps1.
$accion = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument ("-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"" + $script + "`"")

# Cuándo: todos los días a las 9:00 y a las 21:00.
$horarios = @(
  (New-ScheduledTaskTrigger -Daily -At "09:00"),
  (New-ScheduledTaskTrigger -Daily -At "21:00")
)

# Ajustes: si la PC estaba apagada, correr al encender; funcionar también
# con batería; cancelar si tarda más de 10 minutos.
$ajustes = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $nombreTarea -Action $accion -Trigger $horarios -Settings $ajustes `
  -Description "Guarda el dólar del día, busca noticias del dólar en Bolivia y actualiza LeoFX.html." -Force | Out-Null

Write-Host ""
Write-Host "Listo: la actualización diaria de LeoFX está ACTIVADA (9:00 y 21:00)." -ForegroundColor Green
Write-Host "Haciendo la primera actualización ahora..."
& $script
