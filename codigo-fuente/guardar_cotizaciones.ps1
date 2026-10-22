<# =====================================================================
   LeoFX — guardar_cotizaciones.ps1
   ---------------------------------------------------------------------
   Descarga las cotizaciones del día (dólar oficial del BCB y paralelo)
   desde DolarApi Bolivia y las guarda en "cotizaciones_auto.js".

   ¿Para qué? La página guarda el dólar solo los días en que usted la
   abre. Este programa lo hace todos los días por su cuenta (lo ejecuta
   la tarea diaria de Windows), así la serie no queda con huecos y las
   predicciones usan todos los días.

   Mismas reglas que la página:
     - Oficial: el TCO del BCB con su fecha.
     - Paralelo: compra = el valor mayor (lo que se paga por 1 USD),
       venta = el menor (lo que se recibe), con fecha de Bolivia (UTC−4).
     - Fin de semana: si entre el último oficial guardado y el nuevo solo
       hay sábados y domingos, se completan con el valor del viernes
       (regla del BCB). Si falta algún día hábil, no se inventa nada.
   ===================================================================== #>

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$carpeta = $PSScriptRoot
$archivo = Join-Path $carpeta "cotizaciones_auto.js"
$registro = Join-Path $carpeta "actualizacion.log"
$utf8 = New-Object Text.UTF8Encoding($false)
$invariante = [Globalization.CultureInfo]::InvariantCulture

function Escribir-Registro($texto) {
  $linea = ([DateTime]::UtcNow.AddHours(-4)).ToString("yyyy-MM-dd HH:mm") + "  " + $texto
  [IO.File]::AppendAllText($registro, $linea + "`r`n", $utf8)
  Write-Host $texto
}

# ¿Es un valor de tipo de cambio razonable? (evita guardar errores)
function Es-Razonable($x) { return ($x -ge 3 -and $x -le 50) }

# Convierte la fecha que trae DolarApi en un momento en hora universal.
# Hace falta porque el PowerShell nuevo (el de GitHub) convierte solo los
# textos de fecha en objetos de fecha, y el de Windows los deja como texto.
function A-UTC($valor) {
  if ($valor -is [datetime]) { return [DateTimeOffset]$valor.ToUniversalTime() }
  return [DateTimeOffset]::Parse([string]$valor, $invariante, [Globalization.DateTimeStyles]::AssumeUniversal)
}

try {
  # ---------- 1. Leer lo que ya estaba guardado ----------
  # Se guarda en un diccionario: fecha → { fecha, oficial, compra, venta }.
  $porFecha = @{}
  if (Test-Path $archivo) {
    $texto = [IO.File]::ReadAllText($archivo, $utf8)
    $m = [regex]::Match($texto, 'const COTIZACIONES_AUTOMATICAS = (\[[\s\S]*?\]);')
    if ($m.Success) {
      foreach ($c in @($m.Groups[1].Value | ConvertFrom-Json)) {
        # Fecha siempre como texto "AAAA-MM-DD"; las que tengan otro formato se descartan.
        $f = if ($c.fecha -is [datetime]) { $c.fecha.ToString("yyyy-MM-dd") } else { [string]$c.fecha }
        if ($f -notmatch '^\d{4}-\d{2}-\d{2}$') { continue }
        $porFecha[$f] = [ordered]@{ fecha = $f; oficial = $c.oficial; compra = $c.compra; venta = $c.venta }
      }
    }
  }
  function Fila($fecha) {
    if (-not $porFecha.ContainsKey($fecha)) { $porFecha[$fecha] = [ordered]@{ fecha = $fecha; oficial = $null; compra = $null; venta = $null } }
    return $porFecha[$fecha]
  }

  # ---------- 2. Descargar las cotizaciones de hoy ----------
  $datos = Invoke-RestMethod -Uri "https://bo.dolarapi.com/v1/dolares" -TimeoutSec 30
  $mensajes = @()

  # Oficial (BCB)
  $oficial = $datos | Where-Object { $_.casa -eq "oficial" } | Select-Object -First 1
  if ($oficial) {
    $valor = [double]$(if ($null -ne $oficial.venta) { $oficial.venta } else { $oficial.compra })
    # El TCO viene con fecha a medianoche en hora universal ("2026-10-22T00:00Z"): se usa esa fecha.
    $fecha = (A-UTC $oficial.fechaActualizacion).ToString("yyyy-MM-dd")
    if (Es-Razonable $valor) {
      # Último oficial conocido antes de esta fecha: en lo guardado o en datos.js.
      $anteriores = @($porFecha.Values | Where-Object { $null -ne $_.oficial -and $_.fecha -lt $fecha } | ForEach-Object { [pscustomobject]@{ fecha = $_.fecha; valor = [double]$_.oficial } })
      $textoDatos = [IO.File]::ReadAllText((Join-Path $carpeta "datos.js"), $utf8)
      foreach ($mm in [regex]::Matches($textoDatos, 'fecha: "(\d{4}-\d{2}-\d{2})", valor: ([\d.]+)')) {
        if ($mm.Groups[1].Value -lt $fecha) { $anteriores += [pscustomobject]@{ fecha = $mm.Groups[1].Value; valor = [double]::Parse($mm.Groups[2].Value, $invariante) } }
      }
      $previo = $anteriores | Sort-Object fecha | Select-Object -Last 1

      # Completar sábado y domingo con el valor del viernes (solo si el hueco es de fin de semana).
      if ($previo) {
        $huecos = @()
        $d = [datetime]::ParseExact($previo.fecha, "yyyy-MM-dd", $invariante).AddDays(1)
        $hasta = [datetime]::ParseExact($fecha, "yyyy-MM-dd", $invariante)
        while ($d -lt $hasta) { $huecos += $d; $d = $d.AddDays(1) }
        $soloFinDeSemana = $huecos.Count -gt 0 -and -not ($huecos | Where-Object { $_.DayOfWeek -ne "Saturday" -and $_.DayOfWeek -ne "Sunday" })
        if ($soloFinDeSemana) {
          foreach ($h in $huecos) { (Fila $h.ToString("yyyy-MM-dd")).oficial = $previo.valor }
        }
      }
      (Fila $fecha).oficial = $valor
      $mensajes += "oficial " + $fecha + " = " + $valor.ToString("0.00", $invariante)
    }
  }

  # Paralelo (referencia P2P)
  $paralelo = $datos | Where-Object { $_.casa -eq "binance" } | Select-Object -First 1
  if ($paralelo -and (Es-Razonable ([double]$paralelo.compra)) -and (Es-Razonable ([double]$paralelo.venta))) {
    $fecha = (A-UTC $paralelo.fechaActualizacion).ToOffset([TimeSpan]::FromHours(-4)).ToString("yyyy-MM-dd")
    $fila = Fila $fecha
    $fila.compra = [Math]::Max([double]$paralelo.compra, [double]$paralelo.venta)
    $fila.venta = [Math]::Min([double]$paralelo.compra, [double]$paralelo.venta)
    $mensajes += "paralelo " + $fecha + " = " + $fila.compra.ToString("0.00", $invariante) + "/" + $fila.venta.ToString("0.00", $invariante)
  }

  if (-not $mensajes.Count) { throw "el servicio no trajo valores válidos" }

  # ---------- 3. Guardar ----------
  $lista = @($porFecha.Values | Sort-Object { $_.fecha } | ForEach-Object { [pscustomobject]$_ })
  $json = ConvertTo-Json -InputObject $lista -Depth 3
  $ahora = ([DateTime]::UtcNow.AddHours(-4)).ToString("yyyy-MM-ddTHH:mm")
  $contenido = "/* LeoFX — cotizaciones_auto.js`n" +
    "   ARCHIVO GENERADO AUTOMÁTICAMENTE por guardar_cotizaciones.ps1 (no lo edite).`n" +
    "   Cotizaciones guardadas cada día por la tarea de Windows (fuente: DolarApi Bolivia). */`n" +
    "const COTIZACIONES_AUTOMATICAS_FECHA = `"$ahora`";`n" +
    "const COTIZACIONES_AUTOMATICAS = $json;`n"
  [IO.File]::WriteAllText($archivo, $contenido, $utf8)

  # Copia en JSON para las copias de LeoFX.html (ver buscar_noticias.ps1).
  $carpetaLinea = Join-Path (Split-Path $carpeta -Parent) "datos-en-linea"
  if (-not (Test-Path $carpetaLinea)) { New-Item -ItemType Directory -Path $carpetaLinea | Out-Null }
  $jsonLinea = "{`"actualizado`": `"$ahora`", `"cotizaciones`": $json}"
  [IO.File]::WriteAllText((Join-Path $carpetaLinea "cotizaciones.json"), $jsonLinea, $utf8)

  Escribir-Registro ("Cotizaciones guardadas: " + ($mensajes -join " · ") + " (" + $lista.Count + " días en total).")
} catch {
  Escribir-Registro ("No se pudieron guardar las cotizaciones: " + $_.Exception.Message)
}
