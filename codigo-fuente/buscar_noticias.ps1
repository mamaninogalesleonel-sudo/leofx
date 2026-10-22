<# =====================================================================
   LeoFX — buscar_noticias.ps1
   ---------------------------------------------------------------------
   Busca en Google News noticias recientes que pueden mover el dólar en
   Bolivia (BCB, FMI, reservas, tipo de cambio, medidas del Gobierno),
   descarta las notas de rutina ("Dólar hoy: cotización…"), y guarda las
   relevantes en "noticias_auto.js". Al final vuelve a armar LeoFX.html,
   así la próxima vez que abra la herramienta ya verá las noticias nuevas.

   ¿Por qué un programa aparte? La página LeoFX.html no puede leer
   Google News por sí sola (el navegador lo bloquea en una página abierta
   con doble clic). Este programa sí puede, porque corre en Windows.

   Cómo se usa:
     - A mano: doble clic en "buscar_noticias.bat".
     - Automático: doble clic en "activar_noticias_diarias.bat" (una sola
       vez). Windows lo ejecutará solo a las 9:00 y a las 21:00.
   ===================================================================== #>

# -SinArmar: no volver a armar LeoFX.html al final (lo usa
# actualizar_leofx.ps1, que arma el archivo una sola vez al terminar todo).
param([switch]$SinArmar)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$carpeta = $PSScriptRoot
$archivo = Join-Path $carpeta "noticias_auto.js"
$registro = Join-Path $carpeta "actualizacion.log"   # bitácora de cada búsqueda
$utf8 = New-Object Text.UTF8Encoding($false)


# ---------- 1. CONFIGURACIÓN ----------

# Búsquedas en Google News (últimos 7 días, en español, edición Bolivia).
# Con 7 días, aunque la computadora esté apagada hasta una semana, al
# encenderla se recuperan las noticias de esos días.
$busquedas = @(
  '(dólar OR "tipo de cambio" OR divisas OR cambiario) Bolivia when:7d',
  '("Banco Central de Bolivia" OR FMI OR "reservas internacionales") Bolivia when:7d'
)

# Notas de RUTINA que solo informan la cotización del día (no explican
# por qué se mueve el dólar): se descartan.
$rutina = 'd[oó]lar hoy|cotizaci[oó]n de (apertura|cierre|hoy)|a cu[aá]nto (se cotiza|est[aá]|cierra|abre)|precio del d[oó]lar hoy|as[ií] (qued[oó]|cerr[oó]|abri[oó]|amaneci[oó]|se cotiza|cierra)|valores registrados|precio y cotizaci[oó]n|mantiene su tendencia|cotiza este|hoy \d{1,2} de|cotizaciones para|c[oó]mo est[aá] la cotizaci[oó]n|cierra este|necesita cambiar d[oó]lares|[uú]ltimas noticias|revisa el reporte|registra un nuevo (incremento|descenso|aumento)|jornadas? de (alza|baja)s?|(sube|baja|cae) a bs|d[oó]lar (oficial|paralelo) (sube|baja|cae|se mantiene|muestra|cierra|abre|registra|vuelve)|revise (primero )?las cotizaciones|estos son los valores|valores (actuales|de compra)|as[ií] (est[aá]|estar[aá]|amanece|se movi[oó])|vuelve a (bajar|subir)|se mantiene en bs|en cu[aá]nto cierra|sub[ií][oó] o baj[oó]|para este (lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)|este fin de semana'

# Noticias de OTROS países: se descartan si el titular no menciona a Bolivia.
$otrosPaises = 'Argentin|Brasil|Per[uú]\b|Chile|M[eé]xico|Colombia|Venezuela|Ecuador|Paraguay|Uruguay|Estados Unidos|EE\.? ?UU'

# Palabras que indican que la noticia es sobre causas del movimiento del
# dólar (al menos una debe aparecer en el titular).
$relevante = 'd[oó]lar|cambiari|tipo de cambio|divisa|BCB|Banco Central|FMI|reservas|USDT|paralelo|devalu|inflaci|combustible|importaci|exportaci|arancel|decreto|deuda|bonos|liquidez|encaje|cr[eé]dito'

# Cuántos días se guardan las noticias automáticas y cuántas como máximo.
$diasGuardar = 180
$maximo = 150


# ---------- 2. FUNCIONES ----------

# ¿El titular vale la pena? (no es rutina, habla de causas del dólar y,
# si menciona otro país, también menciona a Bolivia).
function Es-Relevante($titular) {
  if ($titular -match $rutina) { return $false }
  if ($titular -notmatch $relevante) { return $false }
  if ($titular -match $otrosPaises -and $titular -notmatch 'Bolivia') { return $false }
  return $true
}

function Escribir-Registro($texto) {
  $linea = ([DateTime]::UtcNow.AddHours(-4)).ToString("yyyy-MM-dd HH:mm") + "  " + $texto
  [IO.File]::AppendAllText($registro, $linea + "`r`n", $utf8)
  Write-Host $texto
}

# Quita tildes y signos para comparar titulares (detectar repetidos).
function Normalizar($texto) {
  $sinTildes = $texto.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
  $limpio = ($sinTildes.ToLower() -replace '[^a-z0-9 ]', '' -replace '\s+', ' ').Trim()
  if ($limpio.Length -gt 70) { $limpio = $limpio.Substring(0, 70) }
  return $limpio
}

# Descarga una búsqueda de Google News y devuelve sus noticias.
function Buscar($consulta) {
  $url = "https://news.google.com/rss/search?q=" + [Uri]::EscapeDataString($consulta) + "&hl=es-419&gl=BO&ceid=BO:es-419"
  $respuesta = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 40
  [xml]$xml = [Text.Encoding]::UTF8.GetString($respuesta.RawContentStream.ToArray())
  return @($xml.rss.channel.item)
}

# Lee las noticias automáticas guardadas antes (para no perderlas).
function Leer-Anteriores {
  if (-not (Test-Path $archivo)) { return @() }
  $texto = [IO.File]::ReadAllText($archivo, $utf8)
  $m = [regex]::Match($texto, 'const NOTICIAS_AUTOMATICAS = (\[[\s\S]*?\]);')
  if (-not $m.Success) { return @() }
  $lista = $m.Groups[1].Value | ConvertFrom-Json
  return @($lista)
}


# ---------- 3. BÚSQUEDA ----------

try {
  # Las guardadas antes se vuelven a revisar con el filtro actual (así,
  # si el filtro se mejora, también se limpian las viejas).
  $anteriores = @(Leer-Anteriores | Where-Object { Es-Relevante $_.titular })
  $vistas = @{}                         # titulares ya guardados (normalizados)
  foreach ($n in $anteriores) { $vistas[(Normalizar $n.titular)] = $true }

  $nuevas = @()
  foreach ($consulta in $busquedas) {
    foreach ($item in (Buscar $consulta)) {
      $fuente = [string]$item.source.'#text'
      # Google agrega " - Fuente" al final del titular: se quita.
      $titular = [string]$item.title
      if ($fuente -and $titular.EndsWith(" - " + $fuente)) { $titular = $titular.Substring(0, $titular.Length - $fuente.Length - 3) }
      $titular = $titular.Trim()

      if (-not (Es-Relevante $titular)) { continue }     # rutina, otro país o sin relación
      $clave = Normalizar $titular
      if ($vistas.ContainsKey($clave)) { continue }      # ya la tenemos
      $vistas[$clave] = $true

      # Fecha de publicación pasada a hora de Bolivia (UTC−4).
      $fecha = ([DateTimeOffset]::Parse([string]$item.pubDate)).ToOffset([TimeSpan]::FromHours(-4)).ToString("yyyy-MM-dd")

      $nuevas += [pscustomobject]@{
        fecha   = $fecha
        titular = $titular
        fuente  = $fuente
        enlace  = [string]$item.link
      }
    }
  }

  # Unir nuevas + anteriores, quitar las muy viejas y dejar las más recientes.
  $limite = ([DateTime]::UtcNow.AddHours(-4)).AddDays(-$diasGuardar).ToString("yyyy-MM-dd")
  $todas = @($nuevas) + @($anteriores) |
    Where-Object { $_.fecha -ge $limite } |
    Sort-Object -Property fecha -Descending |
    Select-Object -First $maximo

  # Guardar como archivo JavaScript que la página puede leer.
  $json = ConvertTo-Json -InputObject @($todas) -Depth 3
  $ahora = ([DateTime]::UtcNow.AddHours(-4)).ToString("yyyy-MM-ddTHH:mm")
  $contenido = "/* LeoFX — noticias_auto.js`n" +
    "   ARCHIVO GENERADO AUTOMÁTICAMENTE por buscar_noticias.ps1 (no lo edite).`n" +
    "   Noticias de Google News relacionadas con el dólar en Bolivia. */`n" +
    "const NOTICIAS_AUTOMATICAS_FECHA = `"$ahora`";`n" +
    "const NOTICIAS_AUTOMATICAS = $json;`n"
  [IO.File]::WriteAllText($archivo, $contenido, $utf8)

  # Copia en formato JSON en la carpeta "datos-en-linea": es el archivo
  # que, una vez publicado en GitHub, leen TODAS las copias de LeoFX.html
  # al abrirse (así reciben las noticias nuevas sin reenviar el archivo).
  $carpetaLinea = Join-Path (Split-Path $carpeta -Parent) "datos-en-linea"
  if (-not (Test-Path $carpetaLinea)) { New-Item -ItemType Directory -Path $carpetaLinea | Out-Null }
  $jsonLinea = "{`"actualizado`": `"$ahora`", `"noticias`": $json}"
  [IO.File]::WriteAllText((Join-Path $carpetaLinea "noticias.json"), $jsonLinea, $utf8)

  Escribir-Registro ("Búsqueda terminada: " + $nuevas.Count + " noticias nuevas, " + @($todas).Count + " guardadas en total.")

  # Volver a armar LeoFX.html con las noticias nuevas.
  if (-not $SinArmar) {
    & (Join-Path $carpeta "armar_LeoFX.ps1") | Out-Null
    Escribir-Registro "LeoFX.html actualizado."
  }
} catch {
  # Sin internet o Google cambió algo: no se toca nada y se anota el error.
  Escribir-Registro ("No se pudo buscar noticias: " + $_.Exception.Message)
  if (-not $SinArmar) { exit 1 }
}
