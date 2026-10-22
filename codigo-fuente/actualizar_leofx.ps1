<# =====================================================================
   LeoFX — actualizar_leofx.ps1
   ---------------------------------------------------------------------
   Es lo que ejecuta la tarea diaria de Windows (9:00 y 21:00):
     1) guarda las cotizaciones del día   (guardar_cotizaciones.ps1)
     2) busca noticias del dólar          (buscar_noticias.ps1)
     3) vuelve a armar LeoFX.html con todo (armar_LeoFX.ps1)
   Si un paso falla (por ejemplo, sin internet), los demás siguen y el
   error queda anotado en "actualizacion.log".
   ===================================================================== #>

$carpeta = $PSScriptRoot

& (Join-Path $carpeta "guardar_cotizaciones.ps1")
& (Join-Path $carpeta "buscar_noticias.ps1") -SinArmar
& (Join-Path $carpeta "armar_LeoFX.ps1") | Out-Null

$linea = ([DateTime]::UtcNow.AddHours(-4)).ToString("yyyy-MM-dd HH:mm") + "  LeoFX.html actualizado."
[IO.File]::AppendAllText((Join-Path $carpeta "actualizacion.log"), $linea + "`r`n", (New-Object Text.UTF8Encoding($false)))
Write-Host "LeoFX.html actualizado."
