/* =====================================================================
   LeoFX — registrar_predicciones.js
   ---------------------------------------------------------------------
   Guarda lo que LeoFX predice HOY (oficial y paralelo, a 1, 7 y 30 días)
   para poder comprobar más adelante si acertó: es el "seguimiento real"
   de las predicciones.

   Lo ejecuta GitHub dos veces al día (con Node.js), justo después de
   guardar el dólar y las noticias. Usa EXACTAMENTE los mismos modelos de
   la página: carga datos.js, cotizaciones_auto.js y app.js y llama a la
   función prediccionesDeHoy().

   Resultado:
     - datos-en-linea/predicciones.json  → lo leen todas las copias.
     - codigo-fuente/predicciones_auto.js → va dentro de LeoFX.html.
   ===================================================================== */

"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const carpeta = __dirname;                       // codigo-fuente
const carpetaLinea = path.join(path.dirname(carpeta), "datos-en-linea");
const archivoJSON = path.join(carpetaLinea, "predicciones.json");
const archivoJS = path.join(carpeta, "predicciones_auto.js");

// Hora de Bolivia (UTC−4), como en el resto de los programas.
function ahoraBolivia() {
  return new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 16); // "AAAA-MM-DDTHH:MM"
}

function leer(nombre) {
  const ruta = path.join(carpeta, nombre);
  return fs.existsSync(ruta) ? fs.readFileSync(ruta, "utf8") : "";
}

// 1) Cargar los archivos de la página en un "espacio aislado" (vm) y
//    pedir las predicciones de hoy.
const codigo = [leer("datos.js"), leer("cotizaciones_auto.js"), leer("app.js"),
  ";globalThis.__leofx = { prediccionesDeHoy: prediccionesDeHoy };"].join("\n");
const contexto = vm.createContext({ console: console });
vm.runInContext(codigo, contexto, { filename: "app.js" });
const nuevas = contexto.__leofx.prediccionesDeHoy();

// 2) Unir con las predicciones guardadas antes. Si ya había una con la
//    misma serie, plazo y fecha de base, se reemplaza por la más reciente.
let anteriores = [];
if (fs.existsSync(archivoJSON)) {
  try {
    anteriores = JSON.parse(fs.readFileSync(archivoJSON, "utf8")).predicciones || [];
  } catch (e) {
    anteriores = [];
  }
}
const clave = (p) => p.serie + "|" + p.plazo + "|" + p.hecha;
const mapa = new Map(anteriores.map((p) => [clave(p), p]));
for (const p of nuevas) mapa.set(clave(p), p);

// Se guardan como máximo las últimas 2000 (unos 6 meses).
const todas = Array.from(mapa.values())
  .sort((a, b) => (a.hecha + a.serie + a.plazo < b.hecha + b.serie + b.plazo ? -1 : 1))
  .slice(-2000);

// 3) Guardar los dos archivos.
const actualizado = ahoraBolivia();
if (!fs.existsSync(carpetaLinea)) fs.mkdirSync(carpetaLinea);
fs.writeFileSync(archivoJSON, JSON.stringify({ actualizado: actualizado, predicciones: todas }, null, 1), "utf8");
fs.writeFileSync(archivoJS,
  "/* LeoFX — predicciones_auto.js\n" +
  "   ARCHIVO GENERADO AUTOMÁTICAMENTE por registrar_predicciones.js (no lo edite).\n" +
  "   Predicciones guardadas cada día para el seguimiento real. */\n" +
  "const PREDICCIONES_AUTOMATICAS_FECHA = " + JSON.stringify(actualizado) + ";\n" +
  "const PREDICCIONES_AUTOMATICAS = " + JSON.stringify(todas) + ";\n", "utf8");

console.log("Predicciones registradas: " + nuevas.length + " nuevas (" + todas.length + " guardadas en total).");
