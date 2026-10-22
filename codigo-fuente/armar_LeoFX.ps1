<# =====================================================================
   LeoFX — armar_LeoFX.ps1
   ---------------------------------------------------------------------
   Une los 4 archivos del código fuente en UN SOLO archivo:

       index.html + styles.css + datos.js + noticias_auto.js + app.js
         →  ..\LeoFX.html

   ¿Por qué? Si se envía solo index.html (por ejemplo, al celular por
   WhatsApp), la página llega sin diseño ni lógica, porque styles.css,
   datos.js y app.js se quedan atrás. LeoFX.html lleva todo adentro y
   funciona solo, en computadora o en celular.

   Cuándo usarlo: SOLO si modifica algún archivo de esta carpeta. Haga
   doble clic en "armar_LeoFX.bat" y se vuelve a crear LeoFX.html.
   ===================================================================== #>

$ErrorActionPreference = "Stop"   # detenerse ante cualquier error
$carpeta = $PSScriptRoot           # esta carpeta (codigo-fuente)
$destino = Join-Path (Split-Path $carpeta -Parent) "LeoFX.html"
$utf8 = New-Object Text.UTF8Encoding($false)   # UTF-8 (tildes y eñes)

# Lee un archivo de esta carpeta como texto.
function Leer($nombre) {
  return [IO.File]::ReadAllText((Join-Path $carpeta $nombre), $utf8)
}

# Reemplaza un texto exacto; si no lo encuentra, avisa (así no se genera
# un archivo incompleto sin darnos cuenta).
function Reemplazar($html, $buscar, $nuevo) {
  if (-not $html.Contains($buscar)) { throw "No se encontró en index.html: $buscar" }
  return $html.Replace($buscar, $nuevo)
}

$html = Leer "index.html"

# 1) La hoja de estilos se copia dentro de una etiqueta <style>.
$html = Reemplazar $html '<link rel="stylesheet" href="styles.css">' ("<style>`n" + (Leer "styles.css") + "`n</style>")

# 2) Los datos y la lógica se copian dentro de etiquetas <script>.
$html = Reemplazar $html '<script src="datos.js"></script>' ("<script>`n" + (Leer "datos.js") + "`n</script>")
$html = Reemplazar $html '<script src="app.js"></script>' ("<script>`n" + (Leer "app.js") + "`n</script>")

# Cotizaciones guardadas por la tarea diaria (lista vacía si todavía no hay).
$cotizaciones = "const COTIZACIONES_AUTOMATICAS_FECHA = null;`nconst COTIZACIONES_AUTOMATICAS = [];"
if (Test-Path (Join-Path $carpeta "cotizaciones_auto.js")) { $cotizaciones = Leer "cotizaciones_auto.js" }
$html = Reemplazar $html '<script src="cotizaciones_auto.js"></script>' ("<script>`n" + $cotizaciones + "`n</script>")

# Noticias automáticas (si todavía no se buscó ninguna, va una lista vacía).
$noticias = "const NOTICIAS_AUTOMATICAS_FECHA = null;`nconst NOTICIAS_AUTOMATICAS = [];"
if (Test-Path (Join-Path $carpeta "noticias_auto.js")) { $noticias = Leer "noticias_auto.js" }
$html = Reemplazar $html '<script src="noticias_auto.js"></script>' ("<script>`n" + $noticias + "`n</script>")

# 3) Nota al inicio para no editar el archivo generado por error.
$nota = "<!-- ARCHIVO GENERADO AUTOMÁTICAMENTE: no lo edite. Edite los archivos de la carpeta`n     codigo-fuente y luego haga doble clic en codigo-fuente\armar_LeoFX.bat -->"
$html = Reemplazar $html "<!DOCTYPE html>" ("<!DOCTYPE html>`n" + $nota)

[IO.File]::WriteAllText($destino, $html, $utf8)

$kb = [Math]::Round((Get-Item $destino).Length / 1KB)
Write-Host ""
Write-Host "Listo: se creó LeoFX.html ($kb KB) con todo incluido." -ForegroundColor Green
Write-Host "Ese es el archivo que debe abrir o enviar al celular."
