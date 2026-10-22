/* =====================================================================
   LeoFX — app.js
   ---------------------------------------------------------------------
   Este archivo contiene TODA la lógica de la herramienta:

     1. Configuración general (parámetros que usted puede ajustar).
     2. Utilidades: fechas y formato de números al estilo boliviano.
     3. Datos: unir los históricos (datos.js) con los que usted registra
        (guardados en el navegador con localStorage).
     4. Modelos de predicción: promedio móvil, regresión lineal, Holt
        y el "último valor" como referencia.
     5. Backtest: probar cada modelo con datos pasados y medir su error
        (MAPE). Elegir el mejor y calcular el rango de la predicción.
     6. Interfaz: dibujar tarjetas, gráfico, tablas y calculadora.
     7. Registro de cotizaciones, exportar e importar CSV.
     8. Actualización automática: descargar las cotizaciones del día.
     9. Noticias e impacto: cuánto se movió el dólar en cada noticia.
    10. Navegación: menú lateral y un apartado a la vez.
    11. Arranque: lo que se ejecuta al abrir la página.

   Consejo para leerlo: cada "function" es una pequeña receta con un
   nombre. Primero se definen las recetas y al final (sección 11) se usan.
   ===================================================================== */

"use strict"; // Modo estricto: JavaScript avisa de más errores comunes.


/* =====================================================================
   1. CONFIGURACIÓN GENERAL
   Si quiere cambiar algún parámetro del análisis, hágalo aquí.
   ===================================================================== */
const CONFIG = {
  // Plazos de predicción, en días calendario.
  horizontes: [1, 7, 30],

  // Promedio móvil: cuántas observaciones recientes se promedian.
  // El oficial tiene dato diario; el paralelo tiene menos datos y en
  // fechas irregulares, por eso se usa una ventana más corta.
  ventanaPromedio: { oficial: 7, paralelo: 3 },

  // Regresión lineal: solo se usan los datos de los últimos N días,
  // para que la recta refleje la tendencia reciente y no la de julio.
  ventanaRegresionDias: 30,

  // Backtest: cuántas observaciones como mínimo debe tener la historia
  // antes de empezar a "predecir el pasado".
  minimoHistorial: { oficial: 14, paralelo: 4 },

  // Tolerancia del backtest (en días). Como el paralelo no tiene dato
  // todos los días, se acepta comparar con el dato real más cercano al
  // plazo, dentro de esta tolerancia. La predicción se hace para la
  // fecha exacta de ese dato real.
  tolerancia: { 1: 0, 7: 1, 30: 3 },

  // ¿Puede el modelo de referencia ("último valor") ser elegido como
  // ganador? false = solo compite entre los 3 métodos del proyecto y la
  // referencia se muestra únicamente para comparar. Cambie a true si
  // quiere que también pueda ser elegido.
  referenciaPuedeGanar: false,

  // Factor del rango: esperado ± z × desviación de los errores.
  // z = 1,28 equivale aproximadamente a un 80 % de confianza.
  z: 1.28,

  // Si el dólar esperado cambia menos de este porcentaje, se considera
  // "estable" (0,005 = 0,5 %).
  umbralCambio: 0.005,

  // Si el ancho del rango (máximo − mínimo) supera este porcentaje del
  // valor esperado, se avisa "alta incertidumbre" (0,05 = 5 %).
  umbralIncertidumbre: 0.05,

  // Nombre con el que se guardan sus registros en el navegador.
  // (Conserva el nombre anterior del proyecto a propósito: si se cambia,
  // el navegador no encontraría los datos ya guardados.)
  claveAlmacen: "proyectoLeo_registros_v1",

  // Noticias e impacto:
  noticias: {
    diasDespues: 5,     // se mide el dólar hasta 5 días después de la noticia
    diasParalelo: 7,    // el paralelo tiene huecos: se busca dato hasta 7 días
    moderado: 1,        // movimiento ≥ 1 vez el normal → "moderado"
    fuerte: 2.5,        // movimiento ≥ 2,5 veces el normal → "fuerte"
    claveAlmacen: "leofx_noticias_v1"  // noticias agregadas por el usuario
  }
};


/* ---------------------------------------------------------------------
   MERCADOS Y SERIES
   - Un MERCADO es cada pestaña: Oficial y Paralelo.
   - Una SERIE es cada línea de datos que se predice por separado
     (por ejemplo, "Paralelo – compra").
   La "clave" de cada serie (oficial, compra, venta) es también el
   nombre del campo en la tabla de datos.
   "perfil" indica qué parámetros de CONFIG usa (ver ventanaPromedio).
   Para agregar otro mercado en el futuro, se añade aquí y en datos.js.
   --------------------------------------------------------------------- */
const SERIES = {
  oficial:       { nombre: "Oficial (BCB)",         tarjeta: "Tipo de Cambio Oficial (TCO) — 1 USD",   mercado: "oficial",  perfil: "oficial",  color: "#059669" },
  compra:        { nombre: "Paralelo – compra",     tarjeta: "Paralelo — precio de COMPRA de 1 USD",   mercado: "paralelo", perfil: "paralelo", color: "#0d9488" },
  venta:         { nombre: "Paralelo – venta",      tarjeta: "Paralelo — precio de VENTA de 1 USD",    mercado: "paralelo", perfil: "paralelo", color: "#65a30d" }
};

const MERCADOS = {
  oficial: {
    titulo: "Evolución del tipo de cambio oficial (BCB)",
    descripcion: "Tipo de Cambio Oficial (TCO) publicado por el Banco Central de Bolivia cada día hábil a las 20:00.",
    series: ["oficial"]
  },
  paralelo: {
    titulo: "Evolución del dólar paralelo",
    descripcion: "Dólar del mercado informal, según cierres reportados en prensa. Precio de compra y de venta.",
    series: ["compra", "venta"]
  }
};

// Lista de todos los campos con valores (en el orden de las columnas del CSV).
const CAMPOS = Object.keys(SERIES); // ["oficial", "compra", "venta"]


/* =====================================================================
   2. UTILIDADES: FECHAS Y NÚMEROS
   ===================================================================== */

// Milisegundos que tiene un día (24 h × 60 min × 60 s × 1000 ms).
const MS_DIA = 86400000;

// Convierte "2026-10-14" en un número de día (días desde 01/01/1970).
// Así es fácil restar fechas: día2 − día1 = días de diferencia.
function fechaADia(fechaISO) {
  const partes = fechaISO.split("-").map(Number); // [2026, 10, 14]
  return Math.round(Date.UTC(partes[0], partes[1] - 1, partes[2]) / MS_DIA);
}

// Lo inverso: convierte un número de día en texto "AAAA-MM-DD".
function diaAFecha(dia) {
  return new Date(dia * MS_DIA).toISOString().slice(0, 10);
}

// Suma (o resta) días a una fecha en texto.
function sumarDias(fechaISO, n) {
  return diaAFecha(fechaADia(fechaISO) + n);
}

// "2026-10-14" → "14/10/2026" (formato boliviano).
function formatoFecha(fechaISO) {
  const p = fechaISO.split("-");
  return p[2] + "/" + p[1] + "/" + p[0];
}

// "2026-10-14" → "14/10" (corto, para el eje del gráfico).
function formatoFechaCorta(fechaISO) {
  const p = fechaISO.split("-");
  return p[2] + "/" + p[1];
}

// Fecha de HOY según el reloj de la computadora, en "AAAA-MM-DD".
function fechaHoyLocal() {
  const h = new Date();
  const mes = String(h.getMonth() + 1).padStart(2, "0");
  const dia = String(h.getDate()).padStart(2, "0");
  return h.getFullYear() + "-" + mes + "-" + dia;
}

// Formateador de números al estilo boliviano: coma decimal y punto de miles.
// Intl.NumberFormat es una herramienta que ya viene en el navegador.
const FORMATO_2 = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always" // para que 1000 se escriba 1.000
});

// 11.7 → "11,70"
function num(n) {
  return FORMATO_2.format(n);
}

// 11.7 → "Bs 11,70"
function bs(n) {
  return "Bs " + FORMATO_2.format(n);
}

// 0.0125 → "1,25 %"  (recibe una fracción)
function pct(fraccion) {
  return FORMATO_2.format(fraccion * 100) + " %";
}

// Igual que pct pero con signo: +1,25 % / −0,40 %
function pctConSigno(fraccion) {
  const signo = fraccion > 0 ? "+" : fraccion < 0 ? "−" : "";
  return signo + pct(Math.abs(fraccion));
}

// Igual que bs pero con signo: +Bs 0,12 / −Bs 0,05
function bsConSigno(n) {
  const signo = n > 0 ? "+" : n < 0 ? "−" : "";
  return signo + bs(Math.abs(n));
}

// Convierte el texto que escribe el usuario en número.
// Acepta formato boliviano ("11,70", "10.000", "10.000,50")
// y también formato con punto decimal ("11.70").
// Devuelve NaN ("no es un número") si el texto no es válido.
function leerNumero(texto) {
  let t = String(texto).trim().replace(/\s/g, "").replace(/^Bs/i, "");
  if (t === "") return NaN;
  if (t.includes(",")) {
    // Hay coma: la coma es el decimal y los puntos son miles.
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    // Solo puntos en grupos de 3 cifras (ej. 10.000): son miles.
    t = t.replace(/\./g, "");
  }
  // Number() devuelve NaN si el texto todavía no es un número válido.
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

// Acepta fechas "2026-10-14" o "14/10/2026" y devuelve "2026-10-14".
// Devuelve null si el texto no es una fecha válida.
function leerFecha(texto) {
  const t = String(texto).trim();
  let a, m, d;
  let r = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (r) { a = +r[1]; m = +r[2]; d = +r[3]; }
  r = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (r) { d = +r[1]; m = +r[2]; a = +r[3]; }
  if (!a) return null;
  const iso = a + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  // Comprobamos que la fecha exista de verdad (ej. no 31/02).
  return diaAFecha(fechaADia(iso)) === iso ? iso : null;
}

// Promedio de una lista de números.
function promedio(lista) {
  let suma = 0;
  for (const x of lista) suma += x;
  return suma / lista.length;
}

// Evita que un texto escrito por el usuario se interprete como HTML.
function escaparHTML(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}


/* =====================================================================
   3. DATOS: HISTÓRICOS + REGISTROS DEL USUARIO
   ---------------------------------------------------------------------
   localStorage es una pequeña "memoria" del navegador. Lo que se guarda
   ahí sigue disponible aunque cierre la página, pero SOLO en ese
   navegador y esa computadora. Por eso existe el botón "Exportar CSV"
   para hacer respaldos.
   ===================================================================== */

// Lee la lista de registros que el usuario agregó (o lista vacía).
// try/catch: si el navegador bloquea localStorage, no se rompe la página.
function leerRegistrosUsuario() {
  try {
    const texto = localStorage.getItem(CONFIG.claveAlmacen);
    const lista = texto ? JSON.parse(texto) : [];
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

// Guarda la lista de registros del usuario. Devuelve true si funcionó.
function guardarRegistrosUsuario(lista) {
  try {
    lista.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    localStorage.setItem(CONFIG.claveAlmacen, JSON.stringify(lista));
    return true;
  } catch (e) {
    mostrarMensaje("No se pudo guardar en este navegador (almacenamiento bloqueado). Use “Exportar CSV” para no perder sus datos.", "error");
    return false;
  }
}

// Crea una fila vacía para una fecha: todos los campos en null
// (null significa "sin dato ese día").
function filaVacia(fecha) {
  const f = { fecha: fecha, origen: "Histórico" };
  for (const campo of CAMPOS) f[campo] = null;
  return f;
}

// Lee SOLO los datos históricos de datos.js y los pone en un Map
// (un Map es como un diccionario: fecha → fila).
function datosHistoricos() {
  const mapa = new Map();
  function fila(fecha) {
    if (!mapa.has(fecha)) mapa.set(fecha, filaVacia(fecha));
    return mapa.get(fecha);
  }

  for (const d of DATOS_OFICIAL) fila(d.fecha).oficial = d.valor;
  for (const d of DATOS_PARALELO) {
    const f = fila(d.fecha);
    f.compra = d.compra;
    f.venta = d.venta;
  }
  return mapa;
}

// Datos AUTOMÁTICOS: cotizaciones y noticias que guarda la actualización
// diaria (en GitHub o en la computadora). Empiezan con lo que trae este
// archivo y se reemplazan si al abrir la página se descarga de internet
// una versión más nueva (ver sección 8). "typeof" evita errores si esos
// archivos no existen.
const datosAutomaticos = {
  cotizaciones: typeof COTIZACIONES_AUTOMATICAS !== "undefined" && Array.isArray(COTIZACIONES_AUTOMATICAS) ? COTIZACIONES_AUTOMATICAS : [],
  fechaCotizaciones: typeof COTIZACIONES_AUTOMATICAS_FECHA !== "undefined" ? COTIZACIONES_AUTOMATICAS_FECHA : null,
  noticias: typeof NOTICIAS_AUTOMATICAS !== "undefined" && Array.isArray(NOTICIAS_AUTOMATICAS) ? NOTICIAS_AUTOMATICAS : [],
  fechaNoticias: typeof NOTICIAS_AUTOMATICAS_FECHA !== "undefined" ? NOTICIAS_AUTOMATICAS_FECHA : null,
  predicciones: typeof PREDICCIONES_AUTOMATICAS !== "undefined" && Array.isArray(PREDICCIONES_AUTOMATICAS) ? PREDICCIONES_AUTOMATICAS : [],
  fechaPredicciones: typeof PREDICCIONES_AUTOMATICAS_FECHA !== "undefined" ? PREDICCIONES_AUTOMATICAS_FECHA : null,
  desdeInternet: false   // true cuando se usan los datos descargados de GitHub
};

// Une los datos históricos (datos.js) con los registros del usuario.
// Resultado: una tabla ordenada por fecha, una fila por día:
// { fecha, oficial, compra, venta, origen }
function combinarDatos() {
  const mapa = datosHistoricos();

  // Cotizaciones guardadas por la actualización diaria (en GitHub o en la
  // computadora), aunque ese día no se haya abierto la página.
  for (const c of datosAutomaticos.cotizaciones) {
    if (!leerFecha(c.fecha)) continue;
    if (!mapa.has(c.fecha)) mapa.set(c.fecha, filaVacia(c.fecha));
    const f = mapa.get(c.fecha);
    for (const campo of CAMPOS) {
      if (c[campo] != null && valorRazonable(c[campo])) f[campo] = c[campo];
    }
    f.origen = "Automático";
  }

  // Los registros del usuario se aplican al final: si coinciden con una
  // fecha histórica, el valor del usuario reemplaza al histórico.
  for (const u of leerRegistrosUsuario()) {
    if (!mapa.has(u.fecha)) mapa.set(u.fecha, filaVacia(u.fecha));
    const f = mapa.get(u.fecha);
    for (const campo of CAMPOS) {
      if (u[campo] != null) f[campo] = u[campo];
    }
    f.origen = u.origen || "Manual"; // "Automático" (de internet) o "Manual"
  }

  return Array.from(mapa.values()).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
}

// De la tabla completa, extrae una "serie" (solo los días con dato) de un
// campo: "oficial", "compra" o "venta".
// Cada punto: { fecha, t (número de día), y (valor) }.
function crearSerie(tabla, campo) {
  return tabla
    .filter((fila) => fila[campo] != null)
    .map((fila) => ({ fecha: fila.fecha, t: fechaADia(fila.fecha), y: fila[campo] }));
}


/* =====================================================================
   4. MODELOS DE PREDICCIÓN
   ---------------------------------------------------------------------
   Todos los modelos reciben:
     - historia: lista de puntos {t, y} ordenados por fecha (solo pasado).
     - d: cuántos días hacia adelante (desde el último dato) se predice.
     - opciones: parámetros (por ejemplo, el tamaño de la ventana).
   Y devuelven un número: el valor esperado del dólar en ese día.

   Se usa "t" (número de día) en lugar de la posición en la lista porque
   el paralelo no tiene dato todos los días: así los modelos respetan la
   distancia real en días entre los datos.
   ===================================================================== */

// ---- 4.1 Último valor (modelo "ingenuo", sirve de REFERENCIA) --------
// Supone que mañana el dólar estará igual que hoy. Un buen modelo
// debería equivocarse menos que esta regla tan simple.
function predecirUltimoValor(historia) {
  return historia[historia.length - 1].y;
}

// ---- 4.2 Promedio móvil ----------------------------------------------
// Promedia las últimas k observaciones. Suaviza los saltos diarios,
// pero no sigue tendencias: predice el mismo valor para cualquier plazo.
function predecirPromedioMovil(historia, d, opciones) {
  const k = Math.min(opciones.ventanaPromedio, historia.length);
  const ultimos = historia.slice(-k).map((p) => p.y);
  return promedio(ultimos);
}

// ---- 4.3 Regresión lineal --------------------------------------------
// Dibuja la recta que mejor pasa por los datos recientes (mínimos
// cuadrados):  y = a + b·t   (a = intercepto, b = pendiente por día)
// y la prolonga hacia el futuro.
function ajustarRecta(puntos) {
  const n = puntos.length;
  const mediaT = promedio(puntos.map((p) => p.t));
  const mediaY = promedio(puntos.map((p) => p.y));
  let sumaXY = 0;
  let sumaXX = 0;
  for (const p of puntos) {
    sumaXY += (p.t - mediaT) * (p.y - mediaY);
    sumaXX += (p.t - mediaT) * (p.t - mediaT);
  }
  // Si todos los puntos tienen la misma fecha no hay pendiente.
  const b = n > 1 && sumaXX > 0 ? sumaXY / sumaXX : 0;
  const a = mediaY - b * mediaT;
  return { a: a, b: b };
}

function predecirRegresion(historia, d) {
  const ultimo = historia[historia.length - 1];
  // Solo los puntos de los últimos N días...
  let puntos = historia.filter((p) => p.t > ultimo.t - CONFIG.ventanaRegresionDias);
  // ...pero al menos 3 puntos, para que la recta tenga sentido.
  if (puntos.length < 3) puntos = historia.slice(-3);
  const recta = ajustarRecta(puntos);
  return recta.a + recta.b * (ultimo.t + d);
}

// ---- 4.4 Suavizamiento exponencial doble (método de Holt) -------------
// Lleva dos "memorias" que se actualizan con cada dato nuevo:
//   Nivel (L): el valor "de fondo" del dólar.
//   Tendencia (T): cuánto sube o baja por día.
// Ecuaciones (Δt = días desde el dato anterior):
//   L_t = α·y_t + (1 − α)·(L_{t−1} + T_{t−1}·Δt)
//   T_t = β·(L_t − L_{t−1})/Δt + (1 − β)·T_{t−1}
//   Predicción a d días = L + T·d
// α y β (entre 0 y 1) dicen cuánto peso se da a lo más reciente.
function ajustarHolt(historia, alfa, beta) {
  let nivel = historia[0].y;
  let tendencia = 0;
  if (historia.length > 1) {
    tendencia = (historia[1].y - historia[0].y) / (historia[1].t - historia[0].t);
  }
  let sumaErrores2 = 0; // suma de errores al cuadrado (para elegir α y β)

  for (let i = 1; i < historia.length; i++) {
    const dt = historia[i].t - historia[i - 1].t;
    const pronostico = nivel + tendencia * dt; // lo que el modelo esperaba
    const error = historia[i].y - pronostico;
    if (i > 1) sumaErrores2 += error * error;   // el dato 1 se usó para iniciar

    const nivelAnterior = nivel;
    nivel = alfa * historia[i].y + (1 - alfa) * pronostico;
    tendencia = beta * (nivel - nivelAnterior) / dt + (1 - beta) * tendencia;
  }
  return { nivel: nivel, tendencia: tendencia, sumaErrores2: sumaErrores2 };
}

// Prueba varias combinaciones de α y β y se queda con la que comete
// menos error al predecir el día siguiente dentro de la historia.
function optimizarHolt(historia) {
  let mejor = null;
  for (let alfa = 0.1; alfa <= 0.91; alfa += 0.1) {
    for (let beta = 0.05; beta <= 0.51; beta += 0.05) {
      const ajuste = ajustarHolt(historia, alfa, beta);
      if (!mejor || ajuste.sumaErrores2 < mejor.sumaErrores2) {
        mejor = { alfa: alfa, beta: beta, nivel: ajuste.nivel, tendencia: ajuste.tendencia, sumaErrores2: ajuste.sumaErrores2 };
      }
    }
  }
  return mejor;
}

// Memoria temporal de ajustes ya calculados. Ajustar Holt exige probar
// muchas combinaciones de parámetros; como el backtest pide varias veces
// la misma historia, se guarda el resultado para no repetir el cálculo.
// Se vacía al empezar a analizar cada serie (ver analizarSerie).
const memoriaAjustes = new Map();

function predecirHolt(historia, d) {
  if (historia.length < 2) return historia[historia.length - 1].y;
  const clave = "holt|" + historia.length;
  if (!memoriaAjustes.has(clave)) memoriaAjustes.set(clave, optimizarHolt(historia));
  const ajuste = memoriaAjustes.get(clave);
  return ajuste.nivel + ajuste.tendencia * d;
}

// ---- 4.5 Holt amortiguado (tendencia que se "frena") -------------------
// Igual que Holt, pero la tendencia se va apagando con el tiempo según un
// factor φ (phi, entre 0 y 1). Así, a 1 día sigue la tendencia reciente y
// a 30 días no la prolonga sin límite. Es una mejora clásica de Holt
// (Gardner y McKenzie, 1985) que suele predecir mejor a plazos largos.
//   Predicción a d días = L + T·(φ + φ² + … + φ^d)
// Suma φ + φ² + … + φ^d (cuánto "pesa" la tendencia en d días).
function sumaAmortiguada(phi, d) {
  return phi === 1 ? d : phi * (1 - Math.pow(phi, d)) / (1 - phi);
}

function ajustarHoltAmortiguado(historia, alfa, beta, phi) {
  let nivel = historia[0].y;
  let tendencia = (historia[1].y - historia[0].y) / (historia[1].t - historia[0].t);
  let sumaErrores2 = 0;

  for (let i = 1; i < historia.length; i++) {
    const dt = historia[i].t - historia[i - 1].t;
    const pronostico = nivel + tendencia * sumaAmortiguada(phi, dt);
    const error = historia[i].y - pronostico;
    if (i > 1) sumaErrores2 += error * error;

    const nivelAnterior = nivel;
    nivel = alfa * historia[i].y + (1 - alfa) * pronostico;
    tendencia = beta * (nivel - nivelAnterior) / dt + (1 - beta) * Math.pow(phi, dt) * tendencia;
  }
  return { nivel: nivel, tendencia: tendencia, sumaErrores2: sumaErrores2 };
}

// Prueba combinaciones de α, β y φ y se queda con la de menor error.
function optimizarHoltAmortiguado(historia) {
  let mejor = null;
  for (let alfa = 0.1; alfa <= 0.91; alfa += 0.1) {
    for (let beta = 0.05; beta <= 0.51; beta += 0.05) {
      for (const phi of [0.8, 0.85, 0.9, 0.95, 0.98]) {
        const ajuste = ajustarHoltAmortiguado(historia, alfa, beta, phi);
        if (!mejor || ajuste.sumaErrores2 < mejor.sumaErrores2) {
          mejor = { alfa: alfa, beta: beta, phi: phi, nivel: ajuste.nivel, tendencia: ajuste.tendencia, sumaErrores2: ajuste.sumaErrores2 };
        }
      }
    }
  }
  return mejor;
}

function predecirHoltAmortiguado(historia, d) {
  if (historia.length < 2) return historia[historia.length - 1].y;
  const clave = "amortiguado|" + historia.length;
  if (!memoriaAjustes.has(clave)) memoriaAjustes.set(clave, optimizarHoltAmortiguado(historia));
  const ajuste = memoriaAjustes.get(clave);
  return ajuste.nivel + ajuste.tendencia * sumaAmortiguada(ajuste.phi, d);
}

// ---- 4.6 Combinación de métodos -----------------------------------------
// Promedio de dos métodos que se complementan: el promedio móvil (nivel
// estable, sin tendencia) y Holt amortiguado (sigue la tendencia). Combinar
// pronósticos suele reducir el error (Bates y Granger, 1969).
function predecirCombinacion(historia, d, opciones) {
  return (predecirPromedioMovil(historia, d, opciones) + predecirHoltAmortiguado(historia, d)) / 2;
}

// Lista de métodos que se comparan. Para agregar otro método, basta con
// añadir un elemento aquí. "referencia: true" marca el modelo que solo
// sirve de punto de comparación (ver CONFIG.referenciaPuedeGanar).
// "corto" es un nombre breve para las tarjetas de predicción.
const METODOS = [
  { id: "promedio",    nombre: "Promedio móvil",                          corto: "Promedio móvil",   predecir: predecirPromedioMovil },
  { id: "regresion",   nombre: "Regresión lineal",                        corto: "Regresión lineal", predecir: predecirRegresion },
  { id: "holt",        nombre: "Suavizamiento exponencial doble (Holt)",  corto: "Holt",             predecir: predecirHolt },
  { id: "amortiguado", nombre: "Holt amortiguado",                        corto: "Holt amortiguado", predecir: predecirHoltAmortiguado },
  { id: "combinacion", nombre: "Combinación (promedio móvil + Holt amortiguado)", corto: "Combinación", predecir: predecirCombinacion },
  { id: "ingenuo",     nombre: "Último valor (referencia)",               corto: "Último valor",     predecir: predecirUltimoValor, referencia: true }
];


/* =====================================================================
   5. BACKTEST, ELECCIÓN DEL MEJOR MÉTODO Y RANGO DE PREDICCIÓN
   ---------------------------------------------------------------------
   Backtest = "predecir el pasado". Para cada día de la historia:
     1) se esconden los datos posteriores a ese día,
     2) el modelo predice el valor a 1, 7 o 30 días,
     3) se compara con lo que realmente pasó.
   Con todas esas comparaciones se calcula el MAPE:
     MAPE = promedio de |real − predicho| / real × 100
   ===================================================================== */

function backtest(serie, metodo, h, opciones) {
  const tolerancia = CONFIG.tolerancia[h];
  const comparaciones = [];

  for (let i = opciones.minimoHistorial - 1; i < serie.length - 1; i++) {
    const origen = serie[i];

    // Buscar el dato real más cercano a "origen + h días".
    let elegido = null;
    for (let j = i + 1; j < serie.length; j++) {
      const dias = serie[j].t - origen.t;
      if (dias > h + tolerancia) break; // ya nos pasamos del plazo
      if (Math.abs(dias - h) <= tolerancia &&
          (!elegido || Math.abs(dias - h) < Math.abs(elegido.dias - h))) {
        elegido = { j: j, dias: dias };
      }
    }
    if (!elegido) continue; // no hay dato real para comparar

    const historia = serie.slice(0, i + 1); // solo el pasado
    const predicho = metodo.predecir(historia, elegido.dias, opciones);
    const real = serie[elegido.j].y;
    comparaciones.push({ real: real, predicho: predicho });
  }

  const n = comparaciones.length;
  if (n === 0) return { n: 0, mape: NaN, desviacion: NaN };

  // MAPE (error porcentual absoluto medio), en %.
  const mape = promedio(comparaciones.map((c) => Math.abs(c.real - c.predicho) / c.real)) * 100;

  // Desviación de los errores relativos: raíz del promedio de los
  // errores relativos al cuadrado. Sirve para construir el rango.
  const desviacion = Math.sqrt(promedio(comparaciones.map((c) => {
    const e = (c.real - c.predicho) / c.real;
    return e * e;
  })));

  return { n: n, mape: mape, desviacion: desviacion };
}

// Analiza una serie completa: backtest de todos los métodos, elección
// del mejor método PARA CADA PLAZO y predicción para los próximos 30 días
// con su rango.
// tipo: "oficial" o "paralelo" (el "perfil" de la serie, para usar la
// configuración que le toca).
function analizarSerie(serie, tipo) {
  if (serie.length < 3) return null; // muy pocos datos para analizar
  memoriaAjustes.clear(); // la memoria de ajustes es de la serie anterior

  const opciones = {
    ventanaPromedio: CONFIG.ventanaPromedio[tipo],
    minimoHistorial: Math.min(CONFIG.minimoHistorial[tipo], serie.length - 1)
  };

  // 5.1 Backtest de cada método en cada plazo.
  const resultados = METODOS.map((metodo) => {
    const porPlazo = {};
    for (const h of CONFIG.horizontes) porPlazo[h] = backtest(serie, metodo, h, opciones);
    const mapes = CONFIG.horizontes.map((h) => porPlazo[h].mape).filter((x) => isFinite(x));
    return {
      metodo: metodo,
      porPlazo: porPlazo,
      mapePromedio: mapes.length ? promedio(mapes) : NaN
    };
  });

  // 5.2 Ganador DE CADA PLAZO = el método con menor MAPE en ese plazo.
  // Un método puede ser el mejor para mañana y otro para dentro de un mes
  // (por ejemplo, seguir la tendencia ayuda a 1 día, pero a 30 días suele
  // ser mejor no exagerarla). Por eso se elige uno por plazo.
  // (La referencia solo compite si CONFIG.referenciaPuedeGanar es true.)
  const candidatos = resultados.filter((r) => !r.metodo.referencia || CONFIG.referenciaPuedeGanar);
  const ganadores = {};
  for (const h of CONFIG.horizontes) {
    let mejor = null;
    for (const r of candidatos) {
      if (isFinite(r.porPlazo[h].mape) && (!mejor || r.porPlazo[h].mape < mejor.porPlazo[h].mape)) mejor = r;
    }
    // Si en un plazo no hubo con qué comparar, se usa el ganador del plazo anterior.
    const previo = CONFIG.horizontes.filter((k) => k < h).pop();
    ganadores[h] = mejor || (previo ? ganadores[previo] : resultados.find((r) => r.metodo.id === "promedio"));
  }

  // ¿La referencia se equivocó menos que el mejor método en todos los
  // plazos? (dato útil para la tesis)
  const referencia = resultados.find((r) => r.metodo.referencia);
  const referenciaMejor = !!referencia && CONFIG.horizontes.every((h) =>
    ganadores[h] !== referencia && isFinite(referencia.porPlazo[h].mape) &&
    referencia.porPlazo[h].mape < ganadores[h].porPlazo[h].mape);

  // 5.3 Desviación de errores del ganador de cada plazo.
  // Si en algún plazo hubo menos de 3 comparaciones (pasa en el paralelo
  // a 30 días), se estima a partir del plazo más corto disponible,
  // creciendo con la raíz del tiempo (regla habitual en finanzas).
  const desviaciones = {};
  const desviacionEstimada = {};
  for (const h of CONFIG.horizontes) {
    const b = ganadores[h].porPlazo[h];
    if (b.n >= 3) {
      desviaciones[h] = b.desviacion;
      desviacionEstimada[h] = false;
    } else {
      const base = CONFIG.horizontes.filter((k) => k < h && desviaciones[k] != null).pop();
      desviaciones[h] = base ? desviaciones[base] * Math.sqrt(h / base) : 0.01 * Math.sqrt(h);
      desviacionEstimada[h] = true;
    }
    // La incertidumbre no puede ser menor a un plazo más largo: si con
    // pocos datos sale más chica, se usa la del plazo anterior.
    const previo = CONFIG.horizontes.filter((k) => k < h).pop();
    if (previo && desviaciones[h] < desviaciones[previo]) desviaciones[h] = desviaciones[previo];
  }

  // Desviación para cualquier día d entre 0 y 30, interpolando en línea
  // recta entre los plazos conocidos (en el día 0 la desviación es 0).
  function desviacionDia(d) {
    const puntos = [[0, 0]].concat(CONFIG.horizontes.map((h) => [h, desviaciones[h]]));
    for (let i = 1; i < puntos.length; i++) {
      if (d <= puntos[i][0]) {
        const [x0, y0] = puntos[i - 1];
        const [x1, y1] = puntos[i];
        return y0 + (y1 - y0) * (d - x0) / (x1 - x0);
      }
    }
    return puntos[puntos.length - 1][1];
  }

  // 5.4 Predicción día por día (0 a 30).
  // En cada plazo (1, 7, 30) se usa exactamente su método ganador. Entre
  // plazos, la curva pasa suavemente de un método al siguiente (mezcla
  // ponderada), para que la línea del gráfico no dé saltos.
  //   Ejemplo, día 4: está a mitad de camino entre 1 y 7 → 50 % el
  //   método del día 1 y 50 % el del día 7.
  function esperadoDia(d) {
    const plazos = CONFIG.horizontes;
    if (d <= plazos[0]) return ganadores[plazos[0]].metodo.predecir(serie, d, opciones);
    for (let i = 1; i < plazos.length; i++) {
      if (d <= plazos[i]) {
        const peso = (d - plazos[i - 1]) / (plazos[i] - plazos[i - 1]);
        const antes = ganadores[plazos[i - 1]].metodo.predecir(serie, d, opciones);
        const despues = ganadores[plazos[i]].metodo.predecir(serie, d, opciones);
        return (1 - peso) * antes + peso * despues;
      }
    }
    return ganadores[plazos[plazos.length - 1]].metodo.predecir(serie, d, opciones);
  }

  const ultimo = serie[serie.length - 1];
  const maxPlazo = Math.max.apply(null, CONFIG.horizontes);
  const curva = [];
  for (let d = 0; d <= maxPlazo; d++) {
    const esperado = d === 0 ? ultimo.y : esperadoDia(d);
    const s = desviacionDia(d);
    curva.push({
      d: d,
      fecha: sumarDias(ultimo.fecha, d),
      esperado: esperado,
      minimo: esperado * (1 - CONFIG.z * s),
      maximo: esperado * (1 + CONFIG.z * s)
    });
  }

  // Lo que predice CADA método para 1, 7 y 30 días (para mostrar la
  // tabla "¿Qué predice cada método?").
  const prediccionesPorMetodo = resultados.map((r) => ({
    metodo: r.metodo,
    valores: CONFIG.horizontes.map((h) => r.metodo.predecir(serie, h, opciones))
  }));

  // Parámetros de Holt y Holt amortiguado con toda la serie (para mostrarlos).
  const holt = serie.length >= 2 ? optimizarHolt(serie) : null;
  const amortiguado = serie.length >= 2 ? optimizarHoltAmortiguado(serie) : null;

  return {
    tipo: tipo,
    serie: serie,
    ultimo: ultimo,
    anterior: serie.length > 1 ? serie[serie.length - 2] : null,
    resultados: resultados,
    ganadores: ganadores,
    prediccionesPorMetodo: prediccionesPorMetodo,
    referenciaMejor: referenciaMejor,
    curva: curva,
    desviacionEstimada: desviacionEstimada,
    holt: holt,
    amortiguado: amortiguado,
    opciones: opciones
  };
}

// Extrae de la curva la predicción para un plazo concreto (1, 7 o 30).
function prediccionPlazo(analisis, h) {
  return analisis.curva[h];
}

// Predicciones de HOY para el "seguimiento real": lo que la herramienta
// predice para mañana, 7 y 30 días, del oficial y del paralelo (compra).
// Lo usa registrar_predicciones.js en GitHub dos veces al día para ir
// guardando las predicciones y, cuando llegue la fecha, compararlas con
// el valor real (ver sección 6.10).
function prediccionesDeHoy() {
  const redondear = (x) => Math.round(x * 10000) / 10000;
  const tabla = combinarDatos();
  const lista = [];
  for (const clave of ["oficial", "compra"]) {
    const a = analizarSerie(crearSerie(tabla, clave), SERIES[clave].perfil);
    if (!a) continue;
    for (const h of CONFIG.horizontes) {
      const p = a.curva[h];
      lista.push({
        serie: clave,            // "oficial" o "compra" (paralelo)
        hecha: a.ultimo.fecha,   // fecha del último dato usado
        base: a.ultimo.y,        // valor de ese último dato
        plazo: h,                // 1, 7 o 30 días
        objetivo: p.fecha,       // fecha que se está prediciendo
        esperado: redondear(p.esperado),
        minimo: redondear(p.minimo),
        maximo: redondear(p.maximo),
        metodo: a.ganadores[h].metodo.id
      });
    }
  }
  return lista;
}


/* =====================================================================
   6. INTERFAZ (lo que se ve en pantalla)
   ===================================================================== */

// "Estado" de la página: lo que el usuario eligió en este momento.
const estado = {
  mercado: "oficial",      // pestaña activa: "oficial" o "paralelo"
  lado: "compra",          // en el paralelo: predecir "compra" o "venta"
  comparar: false,         // mostrar los otros mercados en el gráfico
  rango: "90",             // zoom del gráfico: "30", "90" (días) o "todo"
  graficoBrecha: null,     // el gráfico de la brecha oficial-paralelo
  mostrarPrediccion: true, // dibujar la predicción en el gráfico
  tabla: [],               // todos los datos combinados
  series: {},              // puntos con dato de cada serie (clave → lista)
  analisis: {},            // resultados del análisis de cada serie
  grafico: null            // el objeto del gráfico de Chart.js
};

// Atajo para buscar un elemento de la página por su id.
function $(id) {
  return document.getElementById(id);
}

// Convierte un color "#rrggbb" en uno semitransparente.
function transparente(hex, alfa) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return "rgba(" + r + "," + g + "," + b + "," + alfa + ")";
}

// Relleno degradado bajo una línea del gráfico: el color de la línea,
// semitransparente arriba y transparente abajo. Chart.js llama a esta
// función cuando ya conoce el tamaño del gráfico (chartArea).
function degradadoBajoLinea(color) {
  return (contexto) => {
    const { ctx, chartArea } = contexto.chart;
    if (!chartArea) return transparente(color, 0.1); // todavía no se dibujó
    const degradado = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    degradado.addColorStop(0, transparente(color, 0.28));
    degradado.addColorStop(1, transparente(color, 0));
    return degradado;
  };
}

// Nombre legible de cada serie (ej. "Paralelo – compra").
function nombreSerie(clave) {
  return SERIES[clave].nombre;
}

// Serie que se predice en la pestaña activa.
// En el oficial hay una sola; en el paralelo depende de "lado".
function claveSerieActiva() {
  const lista = MERCADOS[estado.mercado].series;
  if (lista.length === 1) return lista[0];
  return estado.lado === "compra" ? lista[0] : lista[1];
}

// Muestra un mensaje temporal abajo de la pantalla.
let temporizadorMensaje = null;
function mostrarMensaje(texto, tipo) {
  const caja = $("mensaje");
  if (!caja) return;
  caja.textContent = texto;
  caja.className = "mensaje visible " + (tipo || "ok");
  clearTimeout(temporizadorMensaje);
  temporizadorMensaje = setTimeout(() => { caja.className = "mensaje"; }, 4500);
}

// Recalcula TODO a partir de los datos (se llama al abrir la página y
// cada vez que se agregan, borran o importan datos).
function recalcular() {
  estado.tabla = combinarDatos();
  for (const clave of CAMPOS) {
    estado.series[clave] = crearSerie(estado.tabla, clave);
    estado.analisis[clave] = analizarSerie(estado.series[clave], SERIES[clave].perfil);
  }
  dibujarTodo();
}

function dibujarTodo() {
  dibujarPestanas();
  dibujarAvisoDatos();
  dibujarTarjetaHoy();
  dibujarGrafico();
  dibujarGraficoBrecha();
  dibujarPredicciones();
  dibujarBacktest();
  dibujarSeguimiento();
  dibujarRegistros();
  dibujarNoticias();
  dibujarMetodologiaDinamica();
  if (calculadoraUsada) calcular(); // actualiza la calculadora si ya se usó
}

// ---- 6.1 Pestañas ----------------------------------------------------
function dibujarPestanas() {
  document.querySelectorAll(".pestana").forEach((boton) => {
    const activa = boton.dataset.mercado === estado.mercado;
    boton.classList.toggle("activa", activa);
    boton.setAttribute("aria-selected", activa ? "true" : "false");
  });
  const m = MERCADOS[estado.mercado];
  // El selector compra/venta solo tiene sentido si el mercado tiene dos series.
  $("grupoLado").hidden = m.series.length === 1;
  $("tituloGrafico").textContent = m.titulo;
  $("descripcionMercado").textContent = m.descripcion;
}

// ---- 6.2 Avisos: pocos datos o datos desactualizados -------------------
function dibujarAvisoDatos() {
  const clave = claveSerieActiva();
  const serie = estado.series[clave];
  const caja = $("avisoDesactualizado");

  if (serie.length < 3) {
    caja.hidden = false;
    caja.textContent = (serie.length === 0
      ? "Todavía no hay datos de " + nombreSerie(clave) + "."
      : "Solo hay " + serie.length + " dato(s) de " + nombreSerie(clave) + ".") +
      " Puede agregarlos en “Datos y respaldo”: se necesitan al menos 3 para predecir, y con 15 o más el backtest es más confiable.";
    return;
  }

  // ¿Cuántos días de atraso tiene el último dato?
  // En el oficial solo cuentan los días hábiles (el BCB no publica sábados
  // ni domingos); el paralelo opera todos los días.
  const ultimo = serie[serie.length - 1];
  const hoy = fechaADia(fechaHoyLocal());
  const atraso = SERIES[clave].perfil === "oficial" ? diasHabilesEntre(ultimo.t, hoy) : hoy - ultimo.t;
  if (atraso >= 1) {
    caja.hidden = false;
    caja.textContent = "El último dato de " + nombreSerie(clave) + " es del " + formatoFecha(ultimo.fecha) +
      ". Pulse “Actualizar ahora” (necesita internet) o agregue el valor en “Datos y respaldo”.";
  } else {
    caja.hidden = true;
  }
}

// Cuenta los días hábiles (lunes a viernes) después de diaDesde y hasta
// diaHasta, inclusive. Recibe números de día (ver fechaADia).
function diasHabilesEntre(diaDesde, diaHasta) {
  let n = 0;
  for (let d = diaDesde + 1; d <= diaHasta; d++) {
    if (!esFinDeSemana(d)) n++;
  }
  return n;
}

// true si el número de día cae en sábado o domingo.
function esFinDeSemana(dia) {
  const diaSemana = new Date(dia * MS_DIA).getUTCDay(); // 0 = domingo, 6 = sábado
  return diaSemana === 0 || diaSemana === 6;
}

// ---- 6.3 Tarjeta "Cotización de hoy" -----------------------------------
// Devuelve el HTML de una tarjeta con valor, variación y flecha.
// Usa directamente la serie, así funciona aunque haya 1 o 2 datos.
function htmlTarjetaValor(clave) {
  const serie = estado.series[clave];
  const titulo = SERIES[clave].tarjeta;
  // El color de la serie se pasa al CSS como variable (--color-serie):
  // pinta la franja superior y el brillo de la tarjeta.
  const borde = ' style="--color-serie:' + SERIES[clave].color + '"';

  if (!serie.length) {
    return '<div class="tarjeta-valor"' + borde + '><div class="tv-titulo">' + titulo + "</div>" +
      '<div class="tv-numero vacio">—</div><p class="nota">Sin datos todavía.</p></div>';
  }
  const ultimo = serie[serie.length - 1];
  const anterior = serie.length > 1 ? serie[serie.length - 2] : null;

  let variacionHTML = '<div class="tv-variacion neutra">Sin dato anterior</div>';
  if (anterior) {
    const dif = ultimo.y - anterior.y;
    const rel = dif / anterior.y;
    // Flecha: ▲ sube (rojo), ▼ baja (verde), ▬ sin cambio (gris).
    const clase = dif > 0 ? "sube" : dif < 0 ? "baja" : "neutra";
    const flecha = dif > 0 ? "▲" : dif < 0 ? "▼" : "▬";
    const texto = dif === 0 ? "Sin cambio" : bsConSigno(dif) + " (" + pctConSigno(rel) + ")";
    variacionHTML =
      '<div class="tv-variacion ' + clase + '"><span class="flecha" aria-hidden="true">' + flecha + "</span> " + texto + "</div>" +
      '<div class="tv-pie">respecto al ' + formatoFecha(anterior.fecha) + " (" + bs(anterior.y) + ")</div>";
  }
  return '<div class="tarjeta-valor"' + borde + ">" +
    '<div class="tv-titulo">' + titulo + "</div>" +
    '<div class="tv-numero">' + bs(ultimo.y) + "</div>" +
    '<div class="tv-fecha">Dato del ' + formatoFecha(ultimo.fecha) + "</div>" +
    variacionHTML + "</div>";
}

function dibujarTarjetaHoy() {
  const contenedor = $("tarjetaHoy");
  const lista = MERCADOS[estado.mercado].series;
  contenedor.className = "grid-hoy " + (lista.length === 1 ? "una" : "dos");
  let html = lista.map(htmlTarjetaValor).join("");

  // Brecha: cuánto más caro está este mercado (compra) que el oficial ese día.
  if (estado.mercado !== "oficial") {
    const serie = estado.series[lista[0]];
    const ultimo = serie[serie.length - 1];
    const filaOficial = ultimo ? estado.tabla.find((f) => f.fecha === ultimo.fecha && f.oficial != null) : null;
    if (filaOficial) {
      const brecha = (ultimo.y - filaOficial.oficial) / filaOficial.oficial;
      html += '<p class="nota brecha">Brecha del precio de compra frente al oficial el ' + formatoFecha(ultimo.fecha) +
        ": <strong>" + pctConSigno(brecha) + "</strong> (oficial " + bs(filaOficial.oficial) + ").</p>";
    }
  }
  contenedor.innerHTML = html;
}

// ---- 6.4 Gráfico histórico con predicción ------------------------------

// Zoom del gráfico: "todo", "90" (3 meses) o "30" (1 mes) días hacia atrás
// desde el último dato. Devuelve la primera fecha que se dibuja.
function inicioDelGrafico(fechas) {
  if (estado.rango === "todo") return fechas[0];
  const desde = sumarDias(fechas[fechas.length - 1], -parseInt(estado.rango, 10));
  return desde > fechas[0] ? desde : fechas[0];
}

// Gráfico de la BRECHA: cuánto más caro (en %) está el paralelo (compra)
// que el oficial, en los días que tienen los dos datos.
function dibujarGraficoBrecha() {
  const lienzo = $("graficoBrecha");
  if (!lienzo || typeof Chart === "undefined") return;
  const fechas = estado.tabla.map((f) => f.fecha);
  if (!fechas.length) return;
  const desde = inicioDelGrafico(fechas);
  const puntos = estado.tabla
    .filter((f) => f.fecha >= desde && f.oficial != null && f.compra != null)
    .map((f) => ({ fecha: f.fecha, brecha: (f.compra - f.oficial) / f.oficial * 100, oficial: f.oficial, compra: f.compra }));

  const resumen = $("resumenBrecha");
  if (puntos.length) {
    const ultimo = puntos[puntos.length - 1];
    const prom = promedio(puntos.map((p) => p.brecha));
    resumen.innerHTML = "Brecha al " + formatoFecha(ultimo.fecha) + ": <strong>" + pctConSigno(ultimo.brecha / 100) +
      "</strong> (paralelo " + bs(ultimo.compra) + " frente a oficial " + bs(ultimo.oficial) + ") · promedio del período: " +
      pctConSigno(prom / 100) + ".";
  } else {
    resumen.textContent = "No hay días con dato oficial y paralelo a la vez en este período.";
  }

  if (estado.graficoBrecha) estado.graficoBrecha.destroy();
  estado.graficoBrecha = new Chart(lienzo, {
    type: "line",
    data: {
      labels: puntos.map((p) => p.fecha),
      datasets: [{
        label: "Brecha paralelo vs. oficial (%)",
        data: puntos.map((p) => p.brecha),
        borderColor: "#0d9488",
        backgroundColor: degradadoBajoLinea("#0d9488"),
        fill: "origin",                // sombreado hasta la línea del 0 %
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: "#0d9488",
        pointBorderColor: "#fff",
        cubicInterpolationMode: "monotone"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(2, 44, 34, 0.94)", padding: 10, cornerRadius: 10,
          callbacks: {
            title: (items) => (items.length ? formatoFecha(puntos[items[0].dataIndex].fecha) : ""),
            label: (item) => {
              const p = puntos[item.dataIndex];
              return "Brecha " + pctConSigno(p.brecha / 100) + " (paralelo " + num(p.compra) + " · oficial " + num(p.oficial) + ")";
            }
          }
        }
      },
      scales: {
        x: { ticks: { maxTicksLimit: window.innerWidth < 600 ? 4 : 8, maxRotation: 0, callback: function (v) { return formatoFechaCorta(this.getLabelForValue(v)); } }, grid: { display: false }, border: { display: false } },
        y: { ticks: { callback: (v) => num(v) + " %" }, grid: { color: (c) => (c.tick.value === 0 ? "rgba(2,44,34,0.35)" : "rgba(5,150,105,0.08)") }, border: { display: false } }
      }
    }
  });
}
function dibujarGrafico() {
  const lienzo = $("grafico");

  // Si Chart.js no cargó (por ejemplo, sin internet), se avisa.
  if (typeof Chart === "undefined") {
    $("avisoGrafico").hidden = false;
    lienzo.hidden = true;
    return;
  }

  // Series que se dibujan: las del mercado activo y, si se pide comparar,
  // la serie principal (oficial o compra) de los otros mercados.
  const series = MERCADOS[estado.mercado].series.slice();
  if (estado.comparar) {
    for (const nombre in MERCADOS) {
      if (nombre !== estado.mercado) series.push(MERCADOS[nombre].series[0]);
    }
  }
  const claveActiva = claveSerieActiva();
  const analisisActivo = estado.analisis[claveActiva];

  // Eje X: todos los días desde el primer dato hasta el último (+30 días
  // si se muestra la predicción).
  const fechas = estado.tabla.map((f) => f.fecha);
  if (!fechas.length) return;
  let fin = fechas[fechas.length - 1];
  if (estado.mostrarPrediccion && analisisActivo) {
    const finPred = analisisActivo.curva[analisisActivo.curva.length - 1].fecha;
    if (finPred > fin) fin = finPred;
  }
  const etiquetas = [];
  for (let f = inicioDelGrafico(fechas); f <= fin; f = sumarDias(f, 1)) etiquetas.push(f);
  const posicion = {}; // fecha → posición en el eje
  etiquetas.forEach((f, i) => { posicion[f] = i; });

  // Crea un arreglo del largo del eje con los valores (null = sin dato).
  // Los datos anteriores al inicio del gráfico (zoom) se omiten.
  function arregloDeSerie(clave) {
    const datos = new Array(etiquetas.length).fill(null);
    for (const p of estado.series[clave]) {
      if (posicion[p.fecha] != null) datos[posicion[p.fecha]] = p.y;
    }
    return datos;
  }

  const datasets = [];
  for (const clave of series) {
    if (!estado.series[clave].length) continue; // sin datos, no se dibuja
    const diario = SERIES[clave].perfil === "oficial";
    const color = SERIES[clave].color;
    // La serie principal de la pestaña lleva una sombra de color debajo.
    const principal = clave === claveActiva;
    datasets.push({
      label: nombreSerie(clave),
      data: arregloDeSerie(clave),
      borderColor: color,
      backgroundColor: principal ? degradadoBajoLinea(color) : color,
      pointBackgroundColor: color,
      pointBorderColor: "#fff",
      fill: principal ? "start" : false,
      borderWidth: principal ? 2.5 : 2,
      // En el paralelo se marcan los días con dato real; la línea
      // entre ellos es solo una unión visual (spanGaps).
      pointRadius: diario ? 0 : 3.5,
      pointHoverRadius: 6,
      spanGaps: true,
      // Curva suave que nunca "se pasa" de los valores reales.
      cubicInterpolationMode: "monotone"
    });
  }

  // Predicción: línea punteada + banda sombreada (mínimo a máximo).
  if (estado.mostrarPrediccion && analisisActivo) {
    const esperado = new Array(etiquetas.length).fill(null);
    const minimo = new Array(etiquetas.length).fill(null);
    const maximo = new Array(etiquetas.length).fill(null);
    for (const p of analisisActivo.curva) {
      const i = posicion[p.fecha];
      esperado[i] = p.esperado;
      minimo[i] = p.minimo;
      maximo[i] = p.maximo;
    }
    const color = SERIES[claveActiva].color;
    datasets.push({
      label: "Rango mínimo", esBanda: true,
      data: minimo, borderWidth: 0, pointRadius: 0, fill: false
    });
    datasets.push({
      label: "Rango de predicción (mín.–máx.)", esBanda: true,
      data: maximo, borderWidth: 0, pointRadius: 0,
      fill: "-1", // rellena hasta el conjunto anterior (el mínimo)
      backgroundColor: transparente(color, 0.15)
    });
    datasets.push({
      label: "Predicción (mejor método por plazo)", esPrediccion: true,
      data: esperado, borderColor: color, backgroundColor: color,
      borderWidth: 2.5, borderDash: [7, 6], pointRadius: 0, pointHoverRadius: 5
    });
  }

  // Noticias: un rombo amarillo sobre la línea principal en la fecha de
  // cada noticia (al pasar el mouse se ve el titular).
  const lineaBase = estado.series[MERCADOS[estado.mercado].series[0]];
  const marcas = new Array(etiquetas.length).fill(null);
  const titulares = new Array(etiquetas.length).fill(null);
  // (Solo las noticias clave y las del usuario; las automáticas son muchas
  // y llenarían el gráfico de rombos.)
  for (const n of todasLasNoticias()) {
    if (n.tipo === "automatica") continue;
    const i = posicion[n.fecha];
    if (i == null) continue;                             // fuera del gráfico
    const dato = datoAntes(lineaBase, fechaADia(n.fecha) + 1, 7); // valor de ese día o el anterior
    if (!dato) continue;
    marcas[i] = dato.y;
    titulares[i] = titulares[i] ? titulares[i] + " | " + n.titular : n.titular;
  }
  if (marcas.some((m) => m != null)) {
    datasets.push({
      label: "Noticias", esNoticia: true, titulares: titulares,
      data: marcas, showLine: false,
      pointStyle: "rectRot", pointRadius: 7, pointHoverRadius: 9,
      backgroundColor: "#f59e0b", borderColor: "#ffffff", borderWidth: 2
    });
  }

  // Si ya había un gráfico, se destruye para dibujar uno nuevo.
  if (estado.grafico) estado.grafico.destroy();

  // Letra y color de los textos del gráfico, iguales a los de la página.
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.color = "#64748b";

  estado.grafico = new Chart(lienzo, {
    type: "line",
    data: { labels: etiquetas, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      animation: { duration: 900, easing: "easeOutQuart" },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            boxHeight: 6,
            // No mostrar el borde inferior de la banda en la leyenda.
            filter: (item, datos) => datos.datasets[item.datasetIndex].label !== "Rango mínimo"
          }
        },
        tooltip: {
          // Ventanita oscura con esquinas redondeadas.
          backgroundColor: "rgba(2, 44, 34, 0.94)",
          padding: 12,
          cornerRadius: 10,
          titleFont: { weight: "700" },
          usePointStyle: true,
          boxPadding: 4,
          // No repetir las líneas de la banda en la ventanita.
          filter: (item) => !item.dataset.esBanda && item.raw != null,
          callbacks: {
            title: (items) => (items.length ? formatoFecha(etiquetas[items[0].dataIndex]) : ""),
            label: (item) => {
              // Rombo de noticia: se muestra el titular (recortado si es largo).
              if (item.dataset.esNoticia) {
                const t = item.dataset.titulares[item.dataIndex] || "";
                return "Noticia: " + (t.length > 70 ? t.slice(0, 67) + "…" : t);
              }
              let texto = item.dataset.label + ": " + bs(item.raw);
              if (item.dataset.esPrediccion) {
                const p = analisisActivo.curva.find((c) => c.fecha === etiquetas[item.dataIndex]);
                if (p && p.d > 0) texto += "  (rango " + num(p.minimo) + " – " + num(p.maximo) + ")";
              }
              return texto;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            // Menos fechas en pantallas angostas (celular) para que no se amontonen.
            maxTicksLimit: window.innerWidth < 600 ? 5 : 10,
            autoSkipPadding: 12,
            maxRotation: 0,
            callback: function (valor) { return formatoFechaCorta(this.getLabelForValue(valor)); }
          },
          grid: { display: false },
          border: { display: false }
        },
        y: {
          ticks: { callback: (valor) => num(valor) },
          title: { display: true, text: "Bs por 1 USD" },
          grid: { color: "rgba(5, 150, 105, 0.08)" },
          border: { display: false }
        }
      }
    }
  });
}

// ---- 6.5 Tarjetas de predicción a 1, 7 y 30 días -----------------------
function dibujarPredicciones() {
  const clave = claveSerieActiva();
  const a = estado.analisis[clave];
  const contenedor = $("predicciones");
  if (!a) {
    contenedor.innerHTML = '<p class="nota">No hay datos suficientes para predecir ' + nombreSerie(clave) +
      " (hay " + estado.series[clave].length + "; se necesitan al menos 3).</p>";
    $("metodoElegido").textContent = "";
    $("resumenTendencia").hidden = true;
    $("tablaMetodos").innerHTML = "";
    return;
  }

  // Texto de un plazo: "1 día" / "7 días".
  const textoPlazo = (h) => h + (h === 1 ? " día" : " días");

  // --- Tarjetas: una por plazo, cada una con su propio método ---
  let html = "";
  const cambios = [];
  for (const h of CONFIG.horizontes) {
    const p = prediccionPlazo(a, h);
    const difBs = p.esperado - a.ultimo.y;
    const cambio = difBs / a.ultimo.y;
    cambios.push(cambio);
    const clase = cambio > CONFIG.umbralCambio ? "sube" : cambio < -CONFIG.umbralCambio ? "baja" : "neutra";
    const flecha = difBs > 0.005 ? "▲" : difBs < -0.005 ? "▼" : "▬";
    const ancho = (p.maximo - p.minimo) / p.esperado;
    const incierto = ancho > CONFIG.umbralIncertidumbre;
    html += '<div class="tarjeta-pred">' +
      '<div class="tp-plazo">' + (h === 1 ? "Mañana (1 día)" : "En " + h + " días") +
      ' <span class="tp-fecha">' + formatoFecha(p.fecha) + "</span></div>" +
      '<div class="tp-esperado">' + bs(p.esperado) + "</div>" +
      '<div class="tv-variacion ' + clase + '"><span class="flecha" aria-hidden="true">' + flecha + "</span> " +
        bsConSigno(difBs) + " (" + pctConSigno(cambio) + ")</div>" +
      '<div class="tp-rango"><span>Mín. ' + num(p.minimo) + "</span><span>Máx. " + num(p.maximo) + "</span></div>" +
      '<div class="tp-metodo">Método: <strong>' + a.ganadores[h].metodo.corto + "</strong></div>" +
      (incierto ? '<div class="etiqueta-alerta">Alta incertidumbre</div>' : "") +
      (a.desviacionEstimada[h] ? '<div class="nota">Rango estimado: pocos datos para medir el error a ' + textoPlazo(h) + ".</div>" : "") +
      "</div>";
  }
  contenedor.innerHTML = html;

  // --- Resumen en palabras: ¿qué se espera? ---
  const p30 = prediccionPlazo(a, CONFIG.horizontes[CONFIG.horizontes.length - 1]);
  let resumen;
  if (cambios.every((c) => Math.abs(c) <= CONFIG.umbralCambio)) {
    resumen = "<strong>Sin tendencia fuerte:</strong> los métodos más precisos esperan que el dólar se mantenga cerca de " +
      bs(a.ultimo.y) + " (cambios menores a ±" + pct(CONFIG.umbralCambio) + "). Lo que más cambia con el plazo es la " +
      "<strong>incertidumbre</strong>: en 30 días podría estar entre " + bs(p30.minimo) + " y " + bs(p30.maximo) + ".";
  } else {
    const ultimoCambio = cambios[cambios.length - 1];
    resumen = "<strong>Tendencia " + (ultimoCambio > 0 ? "al alza" : "a la baja") + ":</strong> se espera que el dólar pase de " +
      bs(a.ultimo.y) + " a " + bs(p30.esperado) + " en 30 días (" + pctConSigno(ultimoCambio) + "), dentro de un rango de " +
      bs(p30.minimo) + " a " + bs(p30.maximo) + ".";
  }
  $("resumenTendencia").hidden = false;
  $("resumenTendencia").innerHTML = resumen;

  $("metodoElegido").innerHTML = "Serie: <strong>" + nombreSerie(clave) + "</strong>. Para cada plazo se usa el método que " +
    "tuvo <strong>menor error</strong> en el backtest. El rango es el valor esperado ± " + num(CONFIG.z) +
    " veces la desviación de los errores pasados (≈ 80 % de confianza).";

  // --- Tabla: qué predice cada método en cada plazo ---
  let tabla = "<thead><tr><th>Método</th>";
  for (const h of CONFIG.horizontes) tabla += "<th>" + (h === 1 ? "Mañana" : "En " + textoPlazo(h)) + "</th>";
  tabla += "</tr></thead><tbody>";
  for (const fila of a.prediccionesPorMetodo) {
    tabla += '<tr class="' + (fila.metodo.referencia ? "referencia" : "") + '"><td>' + fila.metodo.nombre + "</td>";
    CONFIG.horizontes.forEach((h, i) => {
      const valor = fila.valores[i];
      const dif = valor - a.ultimo.y;
      const flecha = dif > 0.005 ? '<span class="sube">▲</span>' : dif < -0.005 ? '<span class="baja">▼</span>' : '<span class="neutra">▬</span>';
      const elegido = a.ganadores[h].metodo === fila.metodo;
      tabla += '<td class="' + (elegido ? "celda-elegida" : "") + '">' + flecha + " " + num(valor) +
        (elegido ? ' <span class="insignia">Usado</span>' : "") + "</td>";
    });
    tabla += "</tr>";
  }
  $("tablaMetodos").innerHTML = tabla + "</tbody>";
}

// ---- 6.6 Tabla del backtest ---------------------------------------------
function dibujarBacktest() {
  const clave = claveSerieActiva();
  const a = estado.analisis[clave];
  const tabla = $("tablaBacktest");
  if (!a) {
    tabla.innerHTML = "";
    $("notaBacktest").textContent = "El backtest se mostrará cuando haya datos suficientes de " + nombreSerie(clave) + ".";
    return;
  }

  // Menor MAPE de cada columna (para resaltarlo en negrita).
  const mejores = {};
  for (const h of CONFIG.horizontes) {
    mejores[h] = Math.min.apply(null, a.resultados.map((r) => r.porPlazo[h].mape).filter((x) => isFinite(x)));
  }

  let html = "<thead><tr><th>Método</th>";
  for (const h of CONFIG.horizontes) html += "<th>MAPE " + h + (h === 1 ? " día" : " días") + "</th>";
  html += "<th>MAPE promedio</th></tr></thead><tbody>";

  for (const r of a.resultados) {
    html += '<tr class="' + (r.metodo.referencia ? "referencia" : "") + '"><td>' + r.metodo.nombre + "</td>";
    for (const h of CONFIG.horizontes) {
      const b = r.porPlazo[h];
      const texto = isFinite(b.mape) ? num(b.mape) + " %" : "—";
      const negrita = isFinite(b.mape) && b.mape === mejores[h];
      // La celda del método elegido para ese plazo se resalta en verde.
      const elegido = a.ganadores[h] === r;
      html += '<td class="' + (elegido ? "celda-elegida" : "") + '">' + (negrita ? "<strong>" + texto + "</strong>" : texto) +
        (elegido ? ' <span class="insignia">Elegido</span>' : "") + "</td>";
    }
    html += "<td>" + (isFinite(r.mapePromedio) ? num(r.mapePromedio) + " %" : "—") + "</td></tr>";
  }

  // Fila con la cantidad de comparaciones realizadas en cada plazo.
  html += '<tr class="fila-n"><td>Comparaciones (n)</td>';
  for (const h of CONFIG.horizontes) html += "<td>" + a.resultados[0].porPlazo[h].n + "</td>";
  html += "<td></td></tr></tbody>";
  tabla.innerHTML = html;

  let nota = "Datos usados: " + a.serie.length + " observaciones de " + nombreSerie(clave) +
    " (" + formatoFecha(a.serie[0].fecha) + " al " + formatoFecha(a.ultimo.fecha) + "). " +
    "Promedio móvil de " + a.opciones.ventanaPromedio + " observaciones; regresión con los últimos " +
    CONFIG.ventanaRegresionDias + " días";
  if (a.holt) nota += "; Holt con α = " + num(a.holt.alfa) + " y β = " + num(a.holt.beta);
  if (a.amortiguado) nota += "; Holt amortiguado con α = " + num(a.amortiguado.alfa) + ", β = " + num(a.amortiguado.beta) +
    " y φ = " + num(a.amortiguado.phi);
  nota += " (parámetros optimizados). En verde, el método elegido para cada plazo (el de menor error). " +
    "El “último valor” es solo una referencia y no se elige.";
  if (a.referenciaMejor) {
    nota += " Observación: la referencia tuvo menor error que el mejor método en todos los plazos. Esto sugiere que, con la historia disponible, " +
      "el tipo de cambio se comporta casi como una “caminata aleatoria” (el mejor pronóstico simple es el último valor), algo frecuente en mercados cambiarios.";
  }
  if (SERIES[clave].perfil !== "oficial") {
    nota += " Como este mercado no tiene dato todos los días, cada predicción se compara con el dato real más cercano al plazo (±" +
      CONFIG.tolerancia[7] + " día a 7 días, ±" + CONFIG.tolerancia[30] + " días a 30 días); si n es pequeño, los resultados deben leerse con cautela.";
  }
  $("notaBacktest").textContent = nota;
}

// ---- 6.6 B Seguimiento real: ¿acertaron las predicciones? ----------------
// GitHub guarda cada día lo que LeoFX predijo (registrar_predicciones.js).
// Cuando llega la fecha predicha, aquí se compara con el valor real. A
// diferencia del backtest, estas predicciones se hicieron SIN conocer el
// futuro: es la prueba más honesta de la herramienta.
function evaluarSeguimiento(clave) {
  const serie = estado.series[clave];
  const ultimoDia = serie.length ? serie[serie.length - 1].t : -Infinity;
  const evaluadas = [];
  const pendientes = [];
  for (const p of datosAutomaticos.predicciones) {
    if (p.serie !== clave || !leerFecha(p.objetivo)) continue;
    const dia = fechaADia(p.objetivo);
    if (dia > ultimoDia) { pendientes.push(p); continue; }   // todavía no llegó la fecha
    // Dato real de la fecha predicha (o el más cercano, con la misma
    // tolerancia que el backtest, porque el paralelo tiene huecos).
    const tolerancia = CONFIG.tolerancia[p.plazo] || 0;
    let real = null;
    for (const d of serie) {
      if (Math.abs(d.t - dia) <= tolerancia && (!real || Math.abs(d.t - dia) < Math.abs(real.t - dia))) real = d;
    }
    if (!real) continue;
    evaluadas.push({
      p: p,
      real: real,
      error: (real.y - p.esperado) / real.y,                 // + = el real fue mayor
      dentro: real.y >= p.minimo && real.y <= p.maximo         // ¿cayó dentro del rango?
    });
  }
  evaluadas.sort((a, b) => (a.p.objetivo < b.p.objetivo ? 1 : -1)); // las más recientes primero
  return { evaluadas: evaluadas, pendientes: pendientes };
}

function dibujarSeguimiento() {
  const contenedor = $("resumenSeguimiento");
  if (!contenedor) return;
  // Se guardan predicciones del oficial y del paralelo (compra).
  const clave = estado.mercado === "oficial" ? "oficial" : "compra";
  const { evaluadas, pendientes } = evaluarSeguimiento(clave);
  const a = estado.analisis[clave];
  const textoPlazo = (h) => (h === 1 ? "Mañana (1 día)" : h + " días");

  // Resumen por plazo.
  let html = '<p class="nota">Serie: <strong>' + nombreSerie(clave) + "</strong>. " +
    evaluadas.length + " predicciones ya comprobadas · " + pendientes.length + " esperando su fecha.</p>";
  html += '<div class="grid-3">';
  for (const h of CONFIG.horizontes) {
    const delPlazo = evaluadas.filter((e) => e.p.plazo === h);
    let cuerpo;
    if (delPlazo.length) {
      const mape = promedio(delPlazo.map((e) => Math.abs(e.error))) * 100;
      const dentro = delPlazo.filter((e) => e.dentro).length / delPlazo.length;
      const mapeBacktest = a ? a.ganadores[h].porPlazo[h].mape : NaN;
      cuerpo = '<div class="tp-esperado">' + num(mape) + " %</div>" +
        '<div class="nota">error medio real (MAPE) en ' + delPlazo.length + (delPlazo.length === 1 ? " predicción" : " predicciones") +
        (isFinite(mapeBacktest) ? " · en el backtest fue " + num(mapeBacktest) + " %" : "") + "</div>" +
        '<div class="tp-rango"><span>Dentro del rango</span><span><strong>' + pct(dentro) + "</strong></span></div>";
    } else {
      const proxima = pendientes.filter((p) => p.plazo === h).map((p) => p.objetivo).sort()[0];
      cuerpo = '<div class="tp-esperado vacio">—</div><div class="nota">' +
        (proxima ? "La primera se podrá comprobar el " + formatoFecha(proxima) + "." : "Todavía no hay predicciones guardadas para este plazo.") + "</div>";
    }
    html += '<div class="tarjeta-pred"><div class="tp-plazo">' + textoPlazo(h) + "</div>" + cuerpo + "</div>";
  }
  html += "</div>";
  contenedor.innerHTML = html;

  // Tabla con las últimas predicciones comprobadas.
  const tabla = $("tablaSeguimiento");
  if (!evaluadas.length) {
    tabla.innerHTML = "";
    return;
  }
  let filas = "<thead><tr><th>Predicha el</th><th>Para el</th><th>Plazo</th><th>Predicción (rango)</th><th>Real</th><th>Error</th><th>¿En el rango?</th></tr></thead><tbody>";
  for (const e of evaluadas.slice(0, 15)) {
    filas += "<tr><td>" + formatoFecha(e.p.hecha) + "</td><td>" + formatoFecha(e.p.objetivo) + "</td><td>" + textoPlazo(e.p.plazo) + "</td>" +
      "<td>" + bs(e.p.esperado) + '<div class="sub">' + num(e.p.minimo) + " – " + num(e.p.maximo) + "</div></td>" +
      "<td>" + bs(e.real.y) + "</td><td>" + pctConSigno(e.error) + "</td>" +
      '<td class="' + (e.dentro ? "baja" : "sube") + '">' + (e.dentro ? "✓ Sí" : "✗ No") + "</td></tr>";
  }
  tabla.innerHTML = filas + "</tbody>";
}

// ---- 6.7 Calculadora "¿Compro hoy o espero?" ----------------------------
let calculadoraUsada = false;

// Clasifica lo que se espera para un plazo y redacta un texto sencillo.
// "factor" convierte el TCO en el precio real del banco (1 + margen).
function recomendacionPlazo(monto, hoy, p, h, factor) {
  const cambio = (p.esperado - hoy) / hoy;
  const ancho = (p.maximo - p.minimo) / p.esperado;
  const incierto = ancho > CONFIG.umbralIncertidumbre;
  const difEsperada = monto * (p.esperado - hoy) * factor; // + = esperar cuesta más
  const plazo = h + " días";
  let tipo;
  let texto;

  if (cambio > CONFIG.umbralCambio) {
    tipo = "sube";
    texto = "En " + plazo + " se espera que el dólar suba de " + bs(hoy * factor) + " a " + bs(p.esperado * factor) + " (" + pctConSigno(cambio) + "). " +
      "Comprar hoy te ahorraría aproximadamente <strong>" + bs(difEsperada) + "</strong>.";
    if (p.minimo < hoy) {
      texto += " Aun así, el rango incluye la posibilidad de que baje (hasta " + bs(p.minimo * factor) + ").";
    }
  } else if (cambio < -CONFIG.umbralCambio) {
    tipo = "baja";
    texto = "En " + plazo + " se espera que el dólar baje de " + bs(hoy * factor) + " a " + bs(p.esperado * factor) + " (" + pctConSigno(cambio) + "). " +
      "Esperar podría ahorrarte aproximadamente <strong>" + bs(-difEsperada) + "</strong>.";
    if (p.maximo > hoy) {
      texto += " Riesgo: si el dólar llega al máximo del rango (" + bs(p.maximo * factor) + "), pagarías " + bs(monto * (p.maximo - hoy) * factor) + " más que hoy.";
    }
  } else if (!incierto) {
    tipo = "estable";
    texto = "En " + plazo + " se espera estabilidad (cambio esperado de " + pctConSigno(cambio) + "). " +
      "Puedes esperar sin mucho riesgo: la diferencia esperada es de unos " + bs(Math.abs(difEsperada)) + ".";
  } else {
    // Sin tendencia clara, pero con un rango amplio: esperar NO es "sin riesgo".
    tipo = "estable";
    texto = "En " + plazo + " no se espera una tendencia clara (cambio esperado de " + pctConSigno(cambio) + "), " +
      "pero el dólar podría moverse bastante en cualquier dirección.";
  }

  if (incierto) {
    texto += " <span class=\"etiqueta-alerta\">Alta incertidumbre</span> El rango posible es amplio (de " + bs(p.minimo * factor) + " a " + bs(p.maximo * factor) +
      " por dólar). En el peor caso pagarías " + bs(monto * (p.maximo - hoy) * factor) + " más que hoy. " +
      "Considera comprar por partes (ver simulación abajo) para repartir el riesgo.";
  }
  return { tipo: tipo, texto: texto, incierto: incierto, cambio: cambio, dif: difEsperada };
}

// Recomendación principal, diciendo QUÉ plazo sube o baja y CUÁNTO se
// ahorraría o se pagaría de más (en Bs, para el monto ingresado).
function recomendacionGeneral(r7, r30) {
  const t7 = pctConSigno(r7.cambio) + " (" + bsConSigno(r7.dif) + ")";
  const t30 = pctConSigno(r30.cambio) + " (" + bsConSigno(r30.dif) + ")";
  const incierto = r7.incierto || r30.incierto;
  const avisoIncierto = incierto ? " Ojo: la incertidumbre es alta, así que estos montos son aproximados." : "";
  let r;

  if (r7.tipo === "sube" && r30.tipo === "sube") {
    r = { clase: "sube", titulo: "Conviene comprar hoy",
      texto: "Se espera que el dólar suba en 7 días " + t7 + " y en 30 días " + t30 + ". Comprar hoy te ahorraría unos " +
        bs(r7.dif) + " frente a esperar una semana, o " + bs(r30.dif) + " frente a esperar un mes." };
  } else if (r7.tipo === "baja" && r30.tipo === "baja") {
    r = { clase: "baja", titulo: "Podrías esperar",
      texto: "Se espera que el dólar baje en 7 días " + t7 + " y en 30 días " + t30 + ". Esperar una semana podría ahorrarte unos " +
        bs(-r7.dif) + "; esperar un mes, unos " + bs(-r30.dif) + ". Revisa la predicción cada día antes de decidir." };
  } else if (r7.tipo === "sube") {
    r = { clase: "sube", titulo: "Sube a corto plazo: si lo necesitas pronto, compra hoy",
      texto: "En 7 días se espera que el dólar suba " + t7 + ", pero a 30 días se espera " +
        (r30.tipo === "baja" ? "que baje " : "que vuelva a un nivel parecido al de hoy ") + t30 +
        ". Si necesitas los dólares esta semana, conviene comprar hoy; si puedes esperar un mes, no hay apuro." };
  } else if (r30.tipo === "sube") {
    r = { clase: "sube", titulo: "Sube a mediano plazo: compra dentro de los próximos días",
      texto: "En 7 días se espera " + (r7.tipo === "baja" ? "una leve baja " : "casi el mismo valor ") + t7 +
        ", pero en 30 días se espera que suba " + t30 + ". Tienes margen de unos días, pero no conviene esperar un mes." };
  } else if (r7.tipo === "baja") {
    r = { clase: "baja", titulo: "Baja pasajera: podrías esperar alrededor de una semana",
      texto: "En 7 días se espera que el dólar baje " + t7 + ", pero a 30 días vuelve a un nivel parecido al de hoy " + t30 +
        ". Si puedes, espera unos días; no hace falta esperar un mes." };
  } else if (r30.tipo === "baja") {
    r = { clase: "baja", titulo: "Baja a mediano plazo: podrías esperar",
      texto: "En 7 días se espera casi el mismo valor " + t7 + ", y en 30 días una baja " + t30 +
        ". Si el pago puede esperar un mes, podrías ahorrar algo." };
  } else if (incierto) {
    r = { clase: "neutra", titulo: "Sin tendencia clara, pero con alta incertidumbre",
      texto: "No se espera que el dólar suba ni baje de forma marcada (7 días: " + t7 + "; 30 días: " + t30 + "), pero el rango posible es amplio. " +
        "Si el pago es importante, una opción prudente es comprar por partes (ver simulación abajo)." };
    return r;
  } else {
    r = { clase: "neutra", titulo: "Sin urgencia: se espera estabilidad",
      texto: "No se esperan cambios importantes (7 días: " + t7 + "; 30 días: " + t30 + "). Compra cuando lo necesites." };
  }
  r.texto += avisoIncierto;
  return r;
}

// Precio de 1 USD en el banco = TCO × (1 + margen). Lee el margen escrito
// por el usuario (en %); si está vacío o es inválido, usa 0.
function leerMargenBanco() {
  const m = leerNumero($("margenBanco").value);
  return isFinite(m) && m >= 0 && m <= 20 ? m / 100 : 0;
}

// Compara el costo de hoy en el banco y en el paralelo.
function htmlComparacionMercados(monto, margen) {
  const o = estado.analisis.oficial;
  const c = estado.analisis.compra;
  if (!o || !c) return "";
  const precioBanco = o.ultimo.y * (1 + margen);
  const precioParalelo = c.ultimo.y;
  const costoBanco = monto * precioBanco;
  const costoParalelo = monto * precioParalelo;
  const dif = costoBanco - costoParalelo;
  const masBarato = Math.abs(dif) < 0.005 * costoBanco ? null : dif < 0 ? "banco" : "paralelo";
  return '<h3>¿Dónde conviene comprar hoy?</h3>' +
    '<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Mercado</th><th>Precio de 1 USD</th><th>Costo de USD ' + FORMATO_2.format(monto) + "</th></tr></thead><tbody>" +
    '<tr><td>Banco (TCO ' + bs(o.ultimo.y) + " + margen " + pct(margen) + ')<div class="sub">TCO del ' + formatoFecha(o.ultimo.fecha) + "</div></td><td>" +
      bs(precioBanco) + "</td><td" + (masBarato === "banco" ? ' class="celda-elegida"' : "") + "><strong>" + bs(costoBanco) + "</strong></td></tr>" +
    '<tr><td>Paralelo (compra)<div class="sub">dato del ' + formatoFecha(c.ultimo.fecha) + "</div></td><td>" + bs(precioParalelo) + "</td><td" +
      (masBarato === "paralelo" ? ' class="celda-elegida"' : "") + "><strong>" + bs(costoParalelo) + "</strong></td></tr>" +
    "</tbody></table></div>" +
    '<p class="nota">' + (masBarato === null
      ? "Hoy los dos cuestan prácticamente lo mismo (diferencia de " + bs(Math.abs(dif)) + ")."
      : "Hoy es más barato comprar en el <strong>" + masBarato + "</strong>: ahorras " + bs(Math.abs(dif)) + ".") +
    " El paralelo es un mercado informal: antes de usarlo, considere el respaldo contable y tributario de la operación (facturas y bancarización).</p>";
}

// Simula comprar el monto en varias partes, cada cierto número de días,
// usando la predicción día por día (y su rango).
function htmlCompraEscalonada(monto, a, factor) {
  const partes = parseInt($("partesCompra").value, 10) || 4;
  const cada = parseInt($("intervaloCompra").value, 10) || 7;
  const maxDia = a.curva.length - 1;   // 30 días
  const montoParte = monto / partes;
  let esperado = 0;
  let minimo = 0;
  let maximo = 0;
  let filas = "";
  let recortado = false;
  for (let i = 0; i < partes; i++) {
    let d = i * cada;
    if (d > maxDia) { d = maxDia; recortado = true; }
    const p = a.curva[d];
    esperado += montoParte * p.esperado * factor;
    minimo += montoParte * p.minimo * factor;
    maximo += montoParte * p.maximo * factor;
    filas += "<tr><td>Compra " + (i + 1) + '<div class="sub">' + formatoFecha(p.fecha) + (d === 0 ? " (hoy)" : "") + "</div></td>" +
      "<td>USD " + FORMATO_2.format(montoParte) + "</td><td>" + bs(p.esperado * factor) +
      (d > 0 ? '<div class="sub">' + num(p.minimo * factor) + " – " + num(p.maximo * factor) + "</div>" : "") + "</td>" +
      "<td>" + bs(montoParte * p.esperado * factor) + "</td></tr>";
  }
  const hoyTotal = monto * a.ultimo.y * factor;
  const p30 = a.curva[maxDia];
  const peor30 = monto * p30.maximo * factor;
  return '<h3>Simulación: comprar por partes</h3>' +
    '<p class="nota">Comprar USD ' + FORMATO_2.format(monto) + " en " + partes + " partes iguales, una cada " + cada + " días" +
      (recortado ? " (las que pasan de 30 días se ubican en el día 30, el límite de la predicción)" : "") + ".</p>" +
    '<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Compra</th><th>Monto</th><th>Tipo de cambio esperado</th><th>Costo esperado</th></tr></thead><tbody>' +
    filas + "</tbody></table></div>" +
    '<div class="grid-3 espacio-arriba">' +
      '<div class="tarjeta-pred"><div class="tp-plazo">Por partes</div><div class="tp-esperado">' + bs(esperado) + '</div><div class="tp-rango"><span>Mín. ' + bs(minimo) + "</span><span>Máx. " + bs(maximo) + "</span></div></div>" +
      '<div class="tarjeta-pred"><div class="tp-plazo">Todo hoy</div><div class="tp-esperado">' + bs(hoyTotal) + '</div><div class="nota">Precio seguro: sin riesgo de que suba.</div></div>' +
      '<div class="tarjeta-pred"><div class="tp-plazo">Todo en 30 días</div><div class="tp-esperado">' + bs(monto * p30.esperado * factor) + '</div><div class="tp-rango"><span>Mín. ' + bs(monto * p30.minimo * factor) + "</span><span>Máx. " + bs(peor30) + "</span></div></div>" +
    "</div>" +
    '<p class="nota">Comprar por partes no busca el precio más bajo, sino <strong>repartir el riesgo</strong>: en el peor escenario pagarías ' +
      bs(maximo) + ", frente a " + bs(peor30) + " si esperaras para comprar todo en 30 días. Frente a comprar todo hoy, la diferencia esperada es de " +
      bsConSigno(esperado - hoyTotal) + ". (El mínimo y el máximo suponen que todas las compras caen en el extremo del rango: es un escenario conservador.)</p>";
}

// Nota al pie de la calculadora según el mercado elegido.
const NOTAS_CALCULADORA = {
  oficial: "Precio del banco = TCO del BCB más el margen indicado (los bancos venden el dólar algo por encima del TCO; consulte el de su banco).",
  compra: "En el paralelo se usa el precio de compra (lo que usted paga por cada dólar)."
};

function calcular() {
  const monto = leerNumero($("montoUSD").value);
  const mercado = $("mercadoCalc").value; // "oficial" o "compra"
  const salida = $("resultadoCalc");

  if (!isFinite(monto) || monto <= 0) {
    salida.innerHTML = '<p class="error-texto">Ingrese un monto válido en dólares (por ejemplo: 10.000).</p>';
    return;
  }
  const a = estado.analisis[mercado];
  if (!a) {
    salida.innerHTML = '<p class="error-texto">No hay datos suficientes de ' + nombreSerie(mercado) +
      " para calcular (hay " + estado.series[mercado].length + "; se necesitan al menos 3).</p>";
    return;
  }
  calculadoraUsada = true;

  // En el oficial se compra en el banco: TCO × (1 + margen).
  const margen = mercado === "oficial" ? leerMargenBanco() : 0;
  const factor = 1 + margen;
  const hoy = a.ultimo.y;
  const p7 = prediccionPlazo(a, 7);
  const p30 = prediccionPlazo(a, 30);
  const r7 = recomendacionPlazo(monto, hoy, p7, 7, factor);
  const r30 = recomendacionPlazo(monto, hoy, p30, 30, factor);
  const general = recomendacionGeneral(r7, r30);

  // Fila de la tabla de costos.
  function fila(etiqueta, fecha, precio, minimo, maximo) {
    const total = monto * precio * factor;
    const dif = total - monto * hoy * factor;
    const rango = minimo != null
      ? '<div class="sub">Rango: ' + bs(monto * minimo * factor) + " – " + bs(monto * maximo * factor) + "</div>" : "";
    const difTexto = minimo != null
      ? '<span class="' + (dif > 0 ? "sube" : dif < 0 ? "baja" : "") + '">' + bsConSigno(dif) + "</span>" : "—";
    return "<tr><td>" + etiqueta + '<div class="sub">' + formatoFecha(fecha) + "</div></td>" +
      "<td>" + bs(precio * factor) + (minimo != null ? '<div class="sub">' + num(minimo * factor) + " – " + num(maximo * factor) + "</div>" : "") + "</td>" +
      "<td><strong>" + bs(total) + "</strong>" + rango + "</td><td>" + difTexto + "</td></tr>";
  }

  const usd = "USD " + FORMATO_2.format(monto);
  salida.innerHTML =
    '<div class="recomendacion ' + general.clase + '"><div class="rec-titulo">' + general.titulo + "</div><p>" + general.texto + "</p></div>" +
    '<div class="tabla-scroll"><table class="tabla">' +
    "<thead><tr><th>Momento de compra</th><th>Precio de 1 USD</th><th>Costo de " + usd + "</th><th>Diferencia vs. hoy</th></tr></thead><tbody>" +
    fila("Hoy (último dato)", a.ultimo.fecha, hoy, null, null) +
    fila("Esperar 7 días", p7.fecha, p7.esperado, p7.minimo, p7.maximo) +
    fila("Esperar 30 días", p30.fecha, p30.esperado, p30.minimo, p30.maximo) +
    "</tbody></table></div>" +
    '<ul class="lista-rec"><li class="' + r7.tipo + '">' + r7.texto + '</li><li class="' + r30.tipo + '">' + r30.texto + "</li></ul>" +
    '<p class="nota">Cálculo con ' + (mercado === "oficial" ? "el precio del banco (TCO + " + pct(margen) + ")" : nombreSerie(mercado)) +
    ". Métodos usados: " + a.ganadores[7].metodo.corto + " (7 días) y " + a.ganadores[30].metodo.corto + " (30 días). " +
    NOTAS_CALCULADORA[mercado] + "</p>" +
    htmlComparacionMercados(monto, leerMargenBanco()) +
    htmlCompraEscalonada(monto, a, factor);
}

// Muestra el campo "margen del banco" solo si el mercado es el oficial.
function actualizarCamposCalculadora() {
  $("grupoMargen").hidden = $("mercadoCalc").value !== "oficial";
}

// ---- 6.8 Tabla de registros del usuario --------------------------------
function dibujarRegistros() {
  const lista = leerRegistrosUsuario();
  const cuerpo = $("cuerpoRegistros");
  $("resumenDatos").textContent = "Total de días con datos: " + estado.tabla.length +
    " · Días nuevos guardados en este navegador: " + lista.length + ".";
  if (!lista.length) {
    cuerpo.innerHTML = '<tr><td colspan="' + (CAMPOS.length + 3) + '" class="vacio">Todavía no hay datos nuevos. Los datos históricos vienen de datos.js; los de cada día se descargan solos al abrir la herramienta con internet.</td></tr>';
    return;
  }
  const v = (x) => (x == null ? "—" : num(x));
  // Los más recientes primero.
  cuerpo.innerHTML = lista.slice().reverse().map((r) =>
    "<tr><td>" + formatoFecha(r.fecha) + "</td>" +
    CAMPOS.map((campo) => "<td>" + v(r[campo]) + "</td>").join("") +
    "<td>" + escaparHTML(r.origen || "Manual") + "</td>" +
    '<td><button type="button" class="boton-link" data-borrar="' + escaparHTML(r.fecha) + '">Eliminar</button></td></tr>'
  ).join("");
}

// ---- 6.9 Datos dinámicos de la sección Metodología ----------------------
function dibujarMetodologiaDinamica() {
  const partes = [];
  for (const clave of CAMPOS) {
    const a = estado.analisis[clave];
    partes.push(nombreSerie(clave) + ": " + estado.series[clave].length + " observaciones" +
      (a ? ", métodos elegidos: " + CONFIG.horizontes.map((h) => a.ganadores[h].metodo.corto + " (" + h + " d)").join(", ")
         : ", sin predicción todavía"));
  }
  $("resumenMetodologia").textContent = "Situación actual — " + partes.join(" · ") + ".";
}


/* =====================================================================
   7. REGISTRO DE COTIZACIONES, EXPORTAR E IMPORTAR CSV
   ===================================================================== */

// Agrega o actualiza el registro de una fecha. Los campos null no
// borran valores que ya existían ese día.
// origen: "Manual" (formulario o CSV) o "Automático" (descargado de internet).
function guardarRegistro(nuevo, origen) {
  const lista = leerRegistrosUsuario();
  let existente = lista.find((r) => r.fecha === nuevo.fecha);
  if (!existente) {
    existente = { fecha: nuevo.fecha };
    for (const campo of CAMPOS) existente[campo] = null;
    lista.push(existente);
  }
  for (const campo of CAMPOS) {
    if (nuevo[campo] != null) existente[campo] = nuevo[campo];
  }
  existente.origen = origen || "Manual";
  return guardarRegistrosUsuario(lista);
}

// Comprueba que un tipo de cambio sea razonable (evita errores de tipeo
// como 117 en lugar de 11,7).
function valorRazonable(x) {
  return isFinite(x) && x >= 3 && x <= 50;
}

// Campos del formulario de registro: id del cuadro de texto → campo.
const CAMPOS_FORMULARIO = {
  regOficial: "oficial",
  regCompra: "compra",
  regVenta: "venta"
};

// Se ejecuta al pulsar "Guardar cotización".
function alEnviarRegistro(evento) {
  evento.preventDefault(); // evita que la página se recargue
  const fecha = leerFecha($("regFecha").value);
  if (!fecha) return mostrarMensaje("Ingrese una fecha válida.", "error");

  // Leer los textos escritos en cada cuadro.
  const textos = {};
  for (const id in CAMPOS_FORMULARIO) textos[CAMPOS_FORMULARIO[id]] = $(id).value.trim();

  if (CAMPOS.every((campo) => !textos[campo])) {
    return mostrarMensaje("Ingrese al menos el valor oficial o el paralelo.", "error");
  }
  // En el paralelo, compra y venta van juntas.
  if (!textos.compra !== !textos.venta) return mostrarMensaje("Para el paralelo ingrese compra y venta.", "error");

  const nuevo = { fecha: fecha };
  for (const campo of CAMPOS) {
    nuevo[campo] = textos[campo] ? leerNumero(textos[campo]) : null;
    if (nuevo[campo] != null && !valorRazonable(nuevo[campo])) {
      return mostrarMensaje("Revise los valores: deben ser números entre 3 y 50 (por ejemplo 11,70).", "error");
    }
  }

  if (guardarRegistro(nuevo, "Manual")) {
    for (const id in CAMPOS_FORMULARIO) $(id).value = "";
    recalcular();
    mostrarMensaje("Cotización del " + formatoFecha(fecha) + " guardada. Predicciones actualizadas.", "ok");
  }
}

// Borra el registro de una fecha (los datos históricos no se tocan).
function borrarRegistro(fecha) {
  if (!confirm("¿Eliminar su registro del " + formatoFecha(fecha) + "?")) return;
  const lista = leerRegistrosUsuario().filter((r) => r.fecha !== fecha);
  if (guardarRegistrosUsuario(lista)) {
    recalcular();
    mostrarMensaje("Registro eliminado.", "ok");
  }
}

// Exporta TODOS los datos (históricos + registrados) a un archivo CSV.
// Se usa punto y coma (;) y coma decimal para que Excel en español lo
// abra correctamente en columnas.
function exportarCSV() {
  const v = (x) => (x == null ? "" : num(x).replace(/\./g, "")); // sin punto de miles
  const lineas = ["fecha;oficial_bcb;paralelo_compra;paralelo_venta;origen"];
  for (const f of estado.tabla) {
    lineas.push([f.fecha].concat(CAMPOS.map((campo) => v(f[campo])), [f.origen]).join(";"));
  }
  // "﻿" (BOM) ayuda a Excel a reconocer tildes y eñes.
  const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = "leofx_tipo_cambio_" + fechaHoyLocal() + ".csv";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
  mostrarMensaje("Archivo CSV generado.", "ok");
}

// Lee un archivo CSV y guarda sus filas como registros del usuario.
// Columnas: fecha; oficial; paralelo compra; paralelo venta
//           (la columna "origen" se ignora).
// Acepta separador ";" (Excel en español) o "," con punto decimal.
function importarCSV(archivo) {
  const lector = new FileReader();
  lector.onload = () => {
    const texto = String(lector.result).replace(/^﻿/, "");
    const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
    const historicos = datosHistoricos();

    let importadas = 0;
    let omitidas = 0;
    const lista = leerRegistrosUsuario();

    for (const linea of lineas) {
      const sep = linea.includes(";") ? ";" : ",";
      const celdas = linea.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
      const fecha = leerFecha(celdas[0]);
      if (!fecha) { omitidas++; continue; } // encabezado o línea inválida

      // Con separador "," los números vienen con punto decimal.
      // Un texto (como "Histórico") se lee como "sin dato".
      const leer = (c) => {
        if (c == null || c === "") return null;
        const x = sep === "," ? Number(c) : leerNumero(c);
        return valorRazonable(x) ? x : null;
      };
      const fila = { fecha: fecha };
      CAMPOS.forEach((campo, i) => { fila[campo] = leer(celdas[i + 1]); });
      if (CAMPOS.every((campo) => fila[campo] == null)) { omitidas++; continue; }

      // Si el dato es idéntico al histórico, no hace falta guardarlo.
      const h = historicos.get(fecha) || filaVacia(fecha);
      const igual = (x, y) => x == null || (y != null && Math.abs(x - y) < 1e-9);
      if (CAMPOS.every((campo) => igual(fila[campo], h[campo]))) continue;

      let existente = lista.find((r) => r.fecha === fecha);
      if (!existente) {
        existente = filaVacia(fecha);
        delete existente.origen;
        lista.push(existente);
      }
      for (const campo of CAMPOS) {
        if (fila[campo] != null) existente[campo] = fila[campo];
      }
      // Se conserva el origen indicado en el CSV (columna después de los valores).
      existente.origen = celdas[CAMPOS.length + 1] === "Automático" ? "Automático" : "Manual";
      importadas++;
    }

    if (guardarRegistrosUsuario(lista)) {
      recalcular();
      mostrarMensaje("Importación terminada: " + importadas + " fila(s) nuevas o modificadas" +
        (omitidas > 1 ? ", " + (omitidas - 1) + " línea(s) omitidas" : "") + ".", "ok");
    }
  };
  lector.onerror = () => mostrarMensaje("No se pudo leer el archivo.", "error");
  lector.readAsText(archivo, "utf-8");
}

// Borra todos los registros del usuario (vuelve a los datos de fábrica).
function borrarTodosRegistros() {
  if (!confirm("¿Borrar TODOS sus registros guardados en este navegador? Se recomienda exportar un CSV antes. Los datos históricos no se borran.")) return;
  if (guardarRegistrosUsuario([])) {
    recalcular();
    mostrarMensaje("Se borraron sus registros.", "ok");
  }
}


/* =====================================================================
   8. ACTUALIZACIÓN AUTOMÁTICA DESDE INTERNET
   ---------------------------------------------------------------------
   Al abrir la página (y cada 30 minutos mientras siga abierta) se
   consultan las cotizaciones del día en DolarApi Bolivia, un servicio
   público y gratuito que permite ser leído desde una página web.

   Ejemplo real de su respuesta (15/10/2026):
     [ { "casa": "oficial", "compra": 11.68, "venta": 11.68,
         "fechaActualizacion": "2026-10-15T00:00:00.000Z" },
       { "casa": "binance", "compra": 11.78, "venta": 11.80,
         "fechaActualizacion": "2026-10-15T20:01:40.139Z" } ]

   - "oficial": TCO del BCB (se comprobó que coincide con bcb.gob.bo).
   - "binance": precio de referencia del mercado P2P en bolivianos; se
     usa como dólar PARALELO (coincide con dolarboliviahoy.com, la fuente
     de la serie histórica del paralelo).

   Los valores descargados se guardan en el navegador como registros
   "Automático", igual que los manuales, y las predicciones se recalculan.
   Si no hay internet, la página funciona igual con los datos guardados.
   ===================================================================== */
const FUENTE_EN_LINEA = {
  nombre: "DolarApi Bolivia (bo.dolarapi.com)",
  url: "https://bo.dolarapi.com/v1/dolares",
  esperaMaximaMs: 10000,           // si tarda más de 10 segundos, se cancela
  repetirCadaMs: 30 * 60 * 1000    // volver a consultar cada 30 minutos
};

// ---- Datos de LeoFX publicados en internet (GitHub) ----------------------
// La actualización diaria en GitHub guarda dos veces al día las noticias
// y las cotizaciones en la carpeta "datos-en-linea". Al abrirse, TODAS las
// copias de LeoFX.html (la del celular, las que se envían a otras
// personas…) descargan esos archivos; si son más nuevos que los que trae
// la copia, los usan. Así nadie tiene que volver a recibir el archivo.
const DATOS_EN_LINEA = {
  url: "https://raw.githubusercontent.com/mamaninogalesleonel-sudo/leofx/main/datos-en-linea/",
  claveCache: "leofx_datos_en_linea_v1"   // copia guardada para usar sin internet
};

// Usa un paquete { noticias, cotizaciones } si es más nuevo que lo que ya hay.
// Devuelve true si algo cambió. (Las fechas "AAAA-MM-DDTHH:MM" se pueden
// comparar como texto: la mayor es la más reciente.)
function aplicarDatosEnLinea(paquete) {
  let cambio = false;
  const n = paquete && paquete.noticias;
  if (n && typeof n.actualizado === "string" && Array.isArray(n.noticias) &&
      (!datosAutomaticos.fechaNoticias || n.actualizado > datosAutomaticos.fechaNoticias)) {
    datosAutomaticos.noticias = n.noticias;
    datosAutomaticos.fechaNoticias = n.actualizado;
    cambio = true;
  }
  const c = paquete && paquete.cotizaciones;
  if (c && typeof c.actualizado === "string" && Array.isArray(c.cotizaciones) &&
      (!datosAutomaticos.fechaCotizaciones || c.actualizado > datosAutomaticos.fechaCotizaciones)) {
    datosAutomaticos.cotizaciones = c.cotizaciones;
    datosAutomaticos.fechaCotizaciones = c.actualizado;
    cambio = true;
  }
  const p = paquete && paquete.predicciones;
  if (p && typeof p.actualizado === "string" && Array.isArray(p.predicciones) &&
      (!datosAutomaticos.fechaPredicciones || p.actualizado > datosAutomaticos.fechaPredicciones)) {
    datosAutomaticos.predicciones = p.predicciones;
    datosAutomaticos.fechaPredicciones = p.actualizado;
    cambio = true;
  }
  if (cambio) datosAutomaticos.desdeInternet = true;
  return cambio;
}

// Descarga un archivo JSON de la carpeta datos-en-linea (máximo 10 s).
async function descargarJSON(nombre) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), 10000);
  try {
    // "?t=..." evita que el navegador muestre una versión vieja guardada.
    const respuesta = await fetch(DATOS_EN_LINEA.url + nombre + "?t=" + Date.now(), { signal: control.signal, cache: "no-store" });
    if (!respuesta.ok) throw new Error("error " + respuesta.status);
    return await respuesta.json();
  } finally {
    clearTimeout(reloj);
  }
}

// Al abrir la página (y cada 30 minutos): descargar noticias y cotizaciones.
async function cargarDatosEnLinea() {
  if (DATOS_EN_LINEA.url.includes("USUARIO")) return; // todavía no se publicó en GitHub
  try {
    // Si un archivo falla, se usan los demás (".catch(() => null)").
    const [noticias, cotizaciones, predicciones] = await Promise.all(
      ["noticias.json", "cotizaciones.json", "predicciones.json"].map((n) => descargarJSON(n).catch(() => null)));
    if (!noticias && !cotizaciones && !predicciones) return;
    const paquete = { noticias: noticias, cotizaciones: cotizaciones, predicciones: predicciones };
    try { localStorage.setItem(DATOS_EN_LINEA.claveCache, JSON.stringify(paquete)); } catch (e) { /* sin espacio: no pasa nada */ }
    if (aplicarDatosEnLinea(paquete)) recalcular();
  } catch (e) {
    // Sin internet o GitHub no responde: se sigue con lo que ya había.
  }
}

// Sin internet: usar la última versión descargada en otra ocasión.
function cargarDatosEnLineaGuardados() {
  try {
    const texto = localStorage.getItem(DATOS_EN_LINEA.claveCache);
    if (texto) aplicarDatosEnLinea(JSON.parse(texto));
  } catch (e) { /* copia dañada: se ignora */ }
}

// Bolivia está siempre en UTC−4 (no cambia de horario en el año).
const DESFASE_BOLIVIA_MS = -4 * 3600 * 1000;

// "2026-10-15T20:01:40Z" (hora universal) → "2026-10-15" (fecha en Bolivia).
function fechaBolivia(marcaISO) {
  return new Date(Date.parse(marcaISO) + DESFASE_BOLIVIA_MS).toISOString().slice(0, 10);
}

// "2026-10-15T20:01:40Z" (hora universal) → "16:01" (hora en Bolivia).
function horaBolivia(marcaISO) {
  return new Date(Date.parse(marcaISO) + DESFASE_BOLIVIA_MS).toISOString().slice(11, 16);
}

// Regla del BCB: los fines de semana se mantiene el valor del viernes.
// Si entre el último oficial guardado y el nuevo solo hay sábados y
// domingos, se completan esos días con el valor anterior, como en la
// serie histórica. Si falta algún día hábil, NO se rellena nada (no se
// inventan valores; puede completarse a mano).
function rellenarFinDeSemanaOficial(fechaNueva) {
  const anterior = estado.series.oficial.filter((p) => p.fecha < fechaNueva).pop();
  if (!anterior) return;
  const huecos = [];
  for (let d = anterior.t + 1; d < fechaADia(fechaNueva); d++) huecos.push(d);
  if (huecos.length && huecos.every(esFinDeSemana)) {
    for (const d of huecos) guardarRegistro({ fecha: diaAFecha(d), oficial: anterior.y }, "Automático");
  }
}

// Consulta internet y guarda los valores del día.
// "async" significa que la función espera (await) la respuesta de
// internet sin congelar la página mientras tanto.
let actualizando = false;
async function actualizarDesdeInternet() {
  if (actualizando) return; // evita dos consultas al mismo tiempo
  actualizando = true;
  const caja = $("estadoActualizacion");
  const boton = $("btnActualizar");
  caja.className = "estado-actualizacion cargando";
  caja.textContent = "Buscando las cotizaciones de hoy en internet…";
  boton.disabled = true;

  try {
    // 1) Descargar los datos (con tiempo máximo de espera).
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), FUENTE_EN_LINEA.esperaMaximaMs);
    let datos;
    try {
      const respuesta = await fetch(FUENTE_EN_LINEA.url, { signal: control.signal, cache: "no-store" });
      if (!respuesta.ok) throw new Error("el servicio respondió con error " + respuesta.status);
      datos = await respuesta.json();
    } finally {
      clearTimeout(reloj);
    }
    if (!Array.isArray(datos)) throw new Error("el servicio respondió con un formato inesperado");

    const partes = []; // textos para el mensaje de estado

    // 2) Tipo de cambio oficial (BCB).
    const oficial = datos.find((x) => x.casa === "oficial");
    if (oficial && oficial.fechaActualizacion) {
      const valor = Number(oficial.venta != null ? oficial.venta : oficial.compra);
      if (valorRazonable(valor)) {
        // El TCO viene con fecha "AAAA-MM-DDT00:00:00Z": se usa la fecha tal cual.
        const fecha = String(oficial.fechaActualizacion).slice(0, 10);
        rellenarFinDeSemanaOficial(fecha);
        guardarRegistro({ fecha: fecha, oficial: valor }, "Automático");
        partes.push("Oficial BCB del " + formatoFecha(fecha) + ": <strong>" + bs(valor) + "</strong>");
      }
    }

    // 3) Dólar paralelo (referencia P2P).
    const paralelo = datos.find((x) => x.casa === "binance");
    if (paralelo && paralelo.fechaActualizacion && valorRazonable(paralelo.compra) && valorRazonable(paralelo.venta)) {
      const fecha = fechaBolivia(paralelo.fechaActualizacion);
      // En esta herramienta "compra" es lo que se PAGA por 1 USD (el valor
      // mayor) y "venta" lo que se RECIBE (el menor), como en la serie histórica.
      const compra = Math.max(paralelo.compra, paralelo.venta);
      const venta = Math.min(paralelo.compra, paralelo.venta);
      guardarRegistro({ fecha: fecha, compra: compra, venta: venta }, "Automático");
      partes.push("Paralelo (" + formatoFecha(fecha) + ", " + horaBolivia(paralelo.fechaActualizacion) + "): compra <strong>" +
        bs(compra) + "</strong>, venta " + bs(venta));
    }

    if (!partes.length) throw new Error("el servicio no trajo valores válidos");

    // 4) Recalcular todo con los datos nuevos y avisar.
    recalcular();
    const ahora = new Date();
    const hora = String(ahora.getHours()).padStart(2, "0") + ":" + String(ahora.getMinutes()).padStart(2, "0");
    caja.className = "estado-actualizacion ok";
    caja.innerHTML = "<strong>En vivo</strong> · actualizado a las " + hora + " · " + partes.join(" · ") +
      ' <span class="fuente">Fuente: ' + FUENTE_EN_LINEA.nombre + "</span>";
  } catch (error) {
    // Mensaje entendible según el tipo de problema.
    let motivo = error.message;
    if (error.name === "AbortError") motivo = "el servicio tardó demasiado en responder";
    else if (error instanceof TypeError) motivo = "no se pudo conectar; revise su conexión a internet";
    caja.className = "estado-actualizacion error";
    caja.textContent = "No se pudo actualizar desde internet (" + motivo + "). Se muestran los últimos datos guardados; " +
      "puede intentar de nuevo o registrar el valor a mano.";
  } finally {
    actualizando = false;
    boton.disabled = false;
  }
}


/* =====================================================================
   9. NOTICIAS E IMPACTO EN EL DÓLAR
   ---------------------------------------------------------------------
   Para cada noticia se mide cuánto se movió el dólar oficial alrededor
   de su fecha (método de "estudio de eventos"):

     antes   = último dato ANTERIOR al día de la noticia
     después = último dato dentro de los 5 días SIGUIENTES
     cambio  = (después − antes) / antes

   Ese cambio se compara con un movimiento "normal": la mediana de todos
   los cambios de 5 días de la serie. Si el cambio es 2,5 veces el normal
   o más, se califica como "fuerte"; desde 1 vez, "moderado".

   IMPORTANTE: que el dólar se mueva cerca de una noticia NO prueba que
   la noticia lo haya causado (pudo haber otros factores). La barra
   muestra coincidencia en el tiempo, no causa y efecto.
   ===================================================================== */

// Noticias que el usuario agregó (guardadas en el navegador).
function leerNoticiasUsuario() {
  try {
    const texto = localStorage.getItem(CONFIG.noticias.claveAlmacen);
    const lista = texto ? JSON.parse(texto) : [];
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

function guardarNoticiasUsuario(lista) {
  try {
    localStorage.setItem(CONFIG.noticias.claveAlmacen, JSON.stringify(lista));
    return true;
  } catch (e) {
    mostrarMensaje("No se pudo guardar la noticia en este navegador.", "error");
    return false;
  }
}

// Todas las noticias, la más reciente primero. Son de tres tipos:
//   - clave:       las seleccionadas a mano en datos.js (con resumen).
//   - automática:  las que trae buscar_noticias.ps1 de Google News
//                  (archivo noticias_auto.js).
//   - propia:      las que el usuario agregó con el formulario.
// "typeof" evita errores si alguno de esos archivos no existe.
function todasLasNoticias() {
  const clave = typeof DATOS_NOTICIAS !== "undefined" ? DATOS_NOTICIAS : [];
  const automaticas = datosAutomaticos.noticias;
  return clave.map((n) => Object.assign({ tipo: "clave" }, n))
    .concat(automaticas.map((n) => Object.assign({ tipo: "automatica" }, n)))
    .concat(leerNoticiasUsuario().map((n) => Object.assign({ tipo: "propia" }, n)))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

// Filtro elegido en los botones de arriba de la lista.
let filtroNoticias = "todas";

// Último dato de la serie ANTES del día indicado (hasta "maxDias" atrás).
function datoAntes(serie, dia, maxDias) {
  let encontrado = null;
  for (const p of serie) {
    if (p.t < dia && p.t >= dia - maxDias) encontrado = p;
  }
  return encontrado;
}

// Último dato de la serie DESPUÉS del día indicado (hasta "dias" después).
function datoDespues(serie, dia, dias) {
  let encontrado = null;
  for (const p of serie) {
    if (p.t > dia && p.t <= dia + dias) encontrado = p;
  }
  return encontrado;
}

// Movimiento "normal" del dólar en N días: la mediana de los cambios
// absolutos de N días en toda la serie. (La mediana es el valor del medio
// al ordenarlos; no se deja llevar por unos pocos días extremos.)
function movimientoNormal(serie, dias) {
  const cambios = [];
  for (const p of serie) {
    const luego = datoDespues(serie, p.t, dias);
    if (luego && luego.t >= p.t + dias - 1) cambios.push(Math.abs(luego.y - p.y) / p.y);
  }
  if (!cambios.length) return NaN;
  cambios.sort((a, b) => a - b);
  const medio = Math.floor(cambios.length / 2);
  return cambios.length % 2 ? cambios[medio] : (cambios[medio - 1] + cambios[medio]) / 2;
}

// Mide el movimiento del dólar alrededor de una noticia.
function medirImpacto(noticia, normal) {
  const cfg = CONFIG.noticias;
  const dia = fechaADia(noticia.fecha);
  const oficial = estado.series.oficial;
  const resultado = { estado: "sin-datos" };

  // Paralelo (compra): solo como dato complementario.
  const pAntes = datoAntes(estado.series.compra, dia, cfg.diasParalelo);
  const pDespues = datoDespues(estado.series.compra, dia, cfg.diasParalelo);
  if (pAntes && pDespues) {
    resultado.paralelo = { antes: pAntes, despues: pDespues, cambio: (pDespues.y - pAntes.y) / pAntes.y };
  }

  let antes = datoAntes(oficial, dia, 7);
  if (!antes && noticia.referenciaPrevia) {
    antes = { fecha: noticia.fecha, y: noticia.referenciaPrevia.valor, nota: noticia.referenciaPrevia.descripcion };
  }
  if (!antes || !oficial.length) return resultado;

  // ¿Ya pasaron los días necesarios para medir?
  if (oficial[oficial.length - 1].t < dia + cfg.diasDespues) {
    resultado.estado = "pendiente";
    resultado.desde = diaAFecha(dia + cfg.diasDespues);
    return resultado;
  }
  const despues = datoDespues(oficial, dia, cfg.diasDespues);
  if (!despues) return resultado;

  const cambio = (despues.y - antes.y) / antes.y;
  const veces = Math.abs(cambio) / (normal > 0 ? normal : 0.001);
  resultado.estado = "medido";
  resultado.antes = antes;
  resultado.despues = despues;
  resultado.cambio = cambio;
  resultado.veces = veces;
  resultado.nivel = veces >= cfg.fuerte ? "fuerte" : veces >= cfg.moderado ? "moderado" : "normal";
  return resultado;
}

// HTML de una noticia con su barra de impacto.
function htmlNoticia(n, impacto) {
  const enlaceValido = /^https?:\/\//i.test(n.enlace || "");
  const titulo = enlaceValido
    ? '<a href="' + escaparHTML(n.enlace) + '" target="_blank" rel="noopener noreferrer">' + escaparHTML(n.titular) + "</a>"
    : escaparHTML(n.titular);

  let bloque;
  if (impacto.estado === "medido") {
    const sube = impacto.cambio > 0;
    const nombres = { fuerte: "Fuerte", moderado: "Moderado", normal: "Normal" };
    const ancho = Math.max(4, Math.min(impacto.veces / 5, 1) * 100);
    bloque =
      '<div class="impacto-cabecera"><span>Movimiento del dólar oficial</span>' +
        '<span class="nivel-impacto ' + impacto.nivel + '">' + nombres[impacto.nivel] + "</span></div>" +
      '<div class="barra-impacto" role="img" aria-label="Movimiento ' + nombres[impacto.nivel] + '">' +
        '<div class="relleno-impacto ' + (sube ? "sube" : "baja") + " " + impacto.nivel + '" style="width:' + ancho.toFixed(0) + '%"></div></div>' +
      '<div class="impacto-detalle"><span class="' + (sube ? "sube" : "baja") + '">' + (sube ? "▲" : "▼") + " " + pctConSigno(impacto.cambio) + "</span> · " +
        bs(impacto.antes.y) + " (" + (impacto.antes.nota ? impacto.antes.nota : formatoFecha(impacto.antes.fecha)) + ") → " +
        bs(impacto.despues.y) + " (" + formatoFecha(impacto.despues.fecha) + ") · " +
        num(impacto.veces) + " veces un movimiento normal</div>";
  } else if (impacto.estado === "pendiente") {
    bloque = '<div class="impacto-detalle pendiente">Todavía no pasaron ' + CONFIG.noticias.diasDespues +
      " días desde la noticia: el movimiento se podrá medir desde el " + formatoFecha(impacto.desde) + ".</div>";
  } else {
    bloque = '<div class="impacto-detalle pendiente">No hay datos del dólar oficial alrededor de esta fecha para medir el movimiento.</div>';
  }
  if (impacto.paralelo) {
    const pc = impacto.paralelo;
    bloque += '<div class="impacto-paralelo">Paralelo (compra): ' + bs(pc.antes.y) + " (" + formatoFecha(pc.antes.fecha) + ") → " +
      bs(pc.despues.y) + " (" + formatoFecha(pc.despues.fecha) + "): " + pctConSigno(pc.cambio) + "</div>";
  }

  // Etiqueta según el tipo de noticia.
  const etiquetas = {
    clave: '<span class="noticia-tipo clave">Clave</span>',
    automatica: '<span class="noticia-tipo automatica">Automática</span>',
    propia: '<span class="noticia-tipo propia">Agregada por usted</span>'
  };

  return '<article class="noticia">' +
    '<div class="noticia-meta"><span class="noticia-fecha">' + formatoFecha(n.fecha) + "</span>" +
      (n.fuente ? '<span class="noticia-fuente">' + escaparHTML(n.fuente) + "</span>" : "") +
      (etiquetas[n.tipo] || "") + "</div>" +
    '<h3 class="noticia-titulo">' + titulo + "</h3>" +
    (n.resumen ? '<p class="noticia-resumen">' + escaparHTML(n.resumen) + "</p>" : "") +
    '<div class="impacto">' + bloque + "</div>" +
    (n.tipo === "propia" ? '<button type="button" class="boton-link" data-borrar-noticia="' + escaparHTML(n.id) + '">Eliminar noticia</button>' : "") +
    "</article>";
}

function dibujarNoticias() {
  const lista = $("listaNoticias");
  if (!lista) return;
  const normal = movimientoNormal(estado.series.oficial, CONFIG.noticias.diasDespues);
  $("textoNormal").textContent = isFinite(normal) ? pct(normal) : "—";

  // Estado de la búsqueda automática (fecha de la última búsqueda).
  const todas = todasLasNoticias();
  const cuantasAuto = todas.filter((n) => n.tipo === "automatica").length;
  const fechaAuto = datosAutomaticos.fechaNoticias;
  $("estadoNoticias").innerHTML = fechaAuto
    ? "Búsqueda automática en Google News: última actualización el <strong>" + formatoFecha(fechaAuto.slice(0, 10)) +
      " a las " + fechaAuto.slice(11, 16) + "</strong> · " + cuantasAuto + " noticias automáticas" +
      (datosAutomaticos.desdeInternet ? " (descargadas de internet)." : ".")
    : "La búsqueda automática todavía no se ejecutó.";

  // Resaltar el botón del filtro activo.
  document.querySelectorAll(".filtro-noticias button").forEach((b) => {
    b.classList.toggle("activo", b.dataset.filtro === filtroNoticias);
  });

  const visibles = filtroNoticias === "todas" ? todas : todas.filter((n) => n.tipo === filtroNoticias);
  lista.innerHTML = visibles.length
    ? visibles.map((n) => htmlNoticia(n, medirImpacto(n, normal))).join("")
    : '<p class="nota">No hay noticias de este tipo todavía.</p>';
}

// Se ejecuta al pulsar "Agregar noticia".
function alAgregarNoticia(evento) {
  evento.preventDefault();
  const fecha = leerFecha($("notFecha").value);
  const titular = $("notTitular").value.trim();
  const enlace = $("notEnlace").value.trim();
  if (!fecha) return mostrarMensaje("Ingrese la fecha de la noticia.", "error");
  if (!titular) return mostrarMensaje("Escriba el titular de la noticia.", "error");
  if (enlace && !/^https?:\/\//i.test(enlace)) return mostrarMensaje("El enlace debe empezar con http:// o https://", "error");

  const lista = leerNoticiasUsuario();
  lista.push({
    id: Date.now().toString(36),   // identificador para poder eliminarla
    fecha: fecha,
    titular: titular.slice(0, 200),
    fuente: $("notFuente").value.trim().slice(0, 80),
    enlace: enlace,
    resumen: $("notResumen").value.trim().slice(0, 500)
  });
  if (guardarNoticiasUsuario(lista)) {
    ["notTitular", "notFuente", "notEnlace", "notResumen"].forEach((id) => { $(id).value = ""; });
    dibujarNoticias();
    dibujarGrafico();
    mostrarMensaje("Noticia agregada. Su impacto se calcula automáticamente.", "ok");
  }
}

function borrarNoticia(id) {
  if (!confirm("¿Eliminar esta noticia?")) return;
  if (guardarNoticiasUsuario(leerNoticiasUsuario().filter((n) => n.id !== id))) {
    dibujarNoticias();
    dibujarGrafico();
    mostrarMensaje("Noticia eliminada.", "ok");
  }
}


/* =====================================================================
   9 B. INFORME PARA IMPRIMIR O GUARDAR COMO PDF
   ---------------------------------------------------------------------
   Arma una página limpia con lo más importante (cotización, predicciones,
   seguimiento, calculadora, noticias y metodología) y abre la ventana de
   impresión del navegador. Ahí se puede elegir "Guardar como PDF".
   ===================================================================== */
function generarInforme() {
  const textoPlazo = (h) => (h === 1 ? "1 día" : h + " días");
  const ahora = new Date();
  const generado = formatoFecha(fechaHoyLocal()) + " a las " +
    String(ahora.getHours()).padStart(2, "0") + ":" + String(ahora.getMinutes()).padStart(2, "0");

  // Tabla de predicciones de una serie.
  function tablaPredicciones(clave) {
    const a = estado.analisis[clave];
    if (!a) return "<p>Sin datos suficientes de " + nombreSerie(clave) + ".</p>";
    let filas = "";
    for (const h of CONFIG.horizontes) {
      const p = prediccionPlazo(a, h);
      const g = a.ganadores[h];
      filas += "<tr><td>" + textoPlazo(h) + "</td><td>" + formatoFecha(p.fecha) + "</td><td><b>" + bs(p.esperado) + "</b></td><td>" +
        num(p.minimo) + " – " + num(p.maximo) + "</td><td>" + g.metodo.corto + "</td><td>" + num(g.porPlazo[h].mape) + " %</td></tr>";
    }
    return "<h3>" + nombreSerie(clave) + " · último dato " + bs(a.ultimo.y) + " (" + formatoFecha(a.ultimo.fecha) + ")</h3>" +
      "<table><thead><tr><th>Plazo</th><th>Fecha</th><th>Esperado</th><th>Rango (≈80 %)</th><th>Método</th><th>MAPE backtest</th></tr></thead><tbody>" +
      filas + "</tbody></table>";
  }

  // Resumen del seguimiento real.
  function textoSeguimiento(clave) {
    const { evaluadas, pendientes } = evaluarSeguimiento(clave);
    if (!evaluadas.length) return nombreSerie(clave) + ": todavía no hay predicciones con fecha cumplida (" + pendientes.length + " en espera).";
    const mape = promedio(evaluadas.map((e) => Math.abs(e.error))) * 100;
    const dentro = evaluadas.filter((e) => e.dentro).length / evaluadas.length;
    return nombreSerie(clave) + ": " + evaluadas.length + " predicciones comprobadas · error medio real " + num(mape) +
      " % · " + pct(dentro) + " dentro del rango.";
  }

  // Cotización actual.
  const o = estado.analisis.oficial;
  const c = estado.analisis.compra;
  const v = estado.analisis.venta;
  let cotizacion = "<ul>";
  if (o) cotizacion += "<li>Oficial (TCO del BCB): <b>" + bs(o.ultimo.y) + "</b> (" + formatoFecha(o.ultimo.fecha) + ")</li>";
  if (c && v) cotizacion += "<li>Paralelo: compra <b>" + bs(c.ultimo.y) + "</b>, venta " + bs(v.ultimo.y) + " (" + formatoFecha(c.ultimo.fecha) + ")</li>";
  if (o && c) cotizacion += "<li>Brecha paralelo vs. oficial: " + pctConSigno((c.ultimo.y - o.ultimo.y) / o.ultimo.y) + "</li>";
  cotizacion += "</ul>";

  // Noticias recientes (las 6 más nuevas) con su impacto.
  const normal = movimientoNormal(estado.series.oficial, CONFIG.noticias.diasDespues);
  const nombresNivel = { fuerte: "Fuerte", moderado: "Moderado", normal: "Normal" };
  const noticias = todasLasNoticias().slice(0, 6).map((n) => {
    const im = medirImpacto(n, normal);
    const impacto = im.estado === "medido"
      ? nombresNivel[im.nivel] + " (" + pctConSigno(im.cambio) + " en 5 días)"
      : im.estado === "pendiente" ? "por medir" : "sin datos";
    return "<li><b>" + formatoFecha(n.fecha) + "</b> · " + escaparHTML(n.titular) + (n.fuente ? " <i>(" + escaparHTML(n.fuente) + ")</i>" : "") +
      " — impacto: " + impacto + "</li>";
  }).join("");

  // Resultado de la calculadora, si se usó.
  const calculadora = calculadoraUsada && $("resultadoCalc").innerHTML
    ? "<h2>Calculadora: ¿compro hoy o espero?</h2><p>Monto: USD " + escaparHTML($("montoUSD").value) + "</p>" + $("resultadoCalc").innerHTML
    : "";

  const html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe LeoFX — ' + generado + "</title>" +
    "<style>body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;margin:28px;font-size:12.5px;line-height:1.45}" +
    "h1{color:#064e3b;margin:0 0 2px;font-size:22px}h2{color:#047857;font-size:16px;border-bottom:2px solid #d1fae5;padding-bottom:3px;margin-top:22px}" +
    "h3{font-size:13px;margin:12px 0 6px}table{width:100%;border-collapse:collapse;margin:6px 0}th,td{border:1px solid #d6e5dc;padding:5px 7px;text-align:left;vertical-align:top}" +
    "th{background:#ecfdf5;color:#065f46}.aviso{background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:8px 10px;border-radius:6px}" +
    ".sub,.nota{color:#64748b;font-size:11px}.sube{color:#dc2626}.baja{color:#059669}.recomendacion{border-left:5px solid #64748b;background:#f1f5f9;padding:8px 12px;margin:8px 0}" +
    ".recomendacion.sube{border-color:#dc2626;background:#fef2f2}.recomendacion.baja{border-color:#059669;background:#ecfdf5}.rec-titulo{font-weight:800}" +
    ".grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.tarjeta-pred{border:1px solid #d6e5dc;padding:6px 8px;border-radius:6px}" +
    ".tp-esperado{font-size:15px;font-weight:800}.tp-rango{display:flex;justify-content:space-between;color:#64748b}.etiqueta-alerta,.insignia{font-weight:700}" +
    "@media print{body{margin:12mm}}</style></head><body>" +
    "<h1>LeoFX — Informe del tipo de cambio del dólar en Bolivia</h1><div class='nota'>Generado el " + generado + "</div>" +
    "<p class='aviso'><b>Aviso:</b> Herramienta de apoyo a la toma de decisiones. Las predicciones son estimaciones y no garantizan valores futuros.</p>" +
    "<h2>Cotización actual</h2>" + cotizacion +
    "<h2>Predicciones a 1, 7 y 30 días</h2><p>Para cada plazo se usa el método con menor error (MAPE) en el backtest. El rango equivale a cerca de 80 % de confianza.</p>" +
    tablaPredicciones("oficial") + tablaPredicciones("compra") +
    "<h2>Seguimiento real de las predicciones</h2><ul><li>" + textoSeguimiento("oficial") + "</li><li>" + textoSeguimiento("compra") + "</li></ul>" +
    calculadora +
    "<h2>Noticias recientes e impacto</h2><ul>" + noticias + "</ul><p class='nota'>El impacto mide cuánto se movió el dólar oficial en los 5 días siguientes a la noticia, comparado con un movimiento normal. Muestra coincidencia en el tiempo, no causa.</p>" +
    "<h2>Metodología y fuentes</h2><p>Métodos: promedio móvil, regresión lineal, Holt, Holt amortiguado y combinación; se comparan con el MAPE en un backtest y se elige el mejor para cada plazo. " +
    "Fuentes: Banco Central de Bolivia (TCO), DolarApi Bolivia (actualización diaria), prensa boliviana y Google News (noticias). Datos desde el 27/06/2026.</p>" +
    "<p class='nota'>LeoFX · https://mamaninogalesleonel-sudo.github.io/leofx/</p>" +
    "</body></html>";

  const ventana = window.open("", "_blank");
  if (!ventana) {
    mostrarMensaje("El navegador bloqueó la ventana del informe. Permita las ventanas emergentes e intente de nuevo.", "error");
    return;
  }
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
  // Abrir la ventana de impresión cuando el informe terminó de cargarse.
  ventana.onload = () => { ventana.focus(); ventana.print(); };
  setTimeout(() => { try { ventana.focus(); ventana.print(); } catch (e) { /* ya se imprimió */ } }, 900);
}


/* =====================================================================
   10. NAVEGACIÓN: MENÚ LATERAL Y APARTADOS
   ---------------------------------------------------------------------
   La página muestra UN apartado a la vez (cotización, calculadora,
   registro o metodología), como si cada uno fuera su propia página.

   Cuál se ve depende del final de la dirección de la página:
     ...LeoFX.html#metodologia  → se muestra el apartado "metodologia".
   Por eso también funcionan los botones Atrás/Adelante del navegador.

   Las opciones del menú se leen solas del HTML (class="opcion-menu") y
   los apartados también (class="apartado"). Para agregar una opción
   nueva NO hace falta cambiar este código (ver el comentario en
   index.html, junto al menú lateral).
   ===================================================================== */

// Apartado que se muestra al abrir la página (o si la dirección no es válida).
const APARTADO_INICIO = "cotizacion";

// Abre el panel lateral.
function abrirMenu() {
  const panel = $("panelMenu");
  panel.classList.add("abierto");          // el CSS lo desliza hacia adentro
  panel.inert = false;                     // ya se puede usar con el teclado
  panel.setAttribute("aria-hidden", "false");
  $("fondoMenu").classList.add("visible"); // fondo oscuro detrás
  $("btnMenu").setAttribute("aria-expanded", "true");
  document.body.classList.add("menu-abierto"); // la página de fondo no se mueve
  // Poner el foco del teclado en la opción activa (ayuda a la accesibilidad).
  const activa = panel.querySelector(".opcion-menu.activa") || panel.querySelector(".opcion-menu");
  if (activa) activa.focus({ preventScroll: true });
}

// Cierra el panel lateral. Si devolverFoco es true, el foco del teclado
// vuelve al botón ☰ (cuando se cierra con la X, Escape o clic afuera).
function cerrarMenu(devolverFoco) {
  const panel = $("panelMenu");
  if (!panel.classList.contains("abierto")) return; // ya estaba cerrado
  panel.classList.remove("abierto");
  panel.inert = true;
  panel.setAttribute("aria-hidden", "true");
  $("fondoMenu").classList.remove("visible");
  $("btnMenu").setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-abierto");
  if (devolverFoco) $("btnMenu").focus({ preventScroll: true });
}

// Muestra solo el apartado pedido, oculta los demás y resalta su opción
// en el menú.
function mostrarApartado(id) {
  const destino = document.getElementById(id);
  if (!destino || !destino.classList.contains("apartado")) id = APARTADO_INICIO;

  // 1) Mostrar uno, ocultar los demás.
  document.querySelectorAll(".apartado").forEach((seccion) => {
    seccion.hidden = seccion.id !== id;
  });

  // 2) Resaltar la opción activa y escribir su nombre en la barra.
  document.querySelectorAll(".opcion-menu").forEach((opcion) => {
    const activa = opcion.dataset.apartado === id;
    opcion.classList.toggle("activa", activa);
    if (activa) {
      opcion.setAttribute("aria-current", "page");
      const nombre = opcion.querySelector(".texto-opcion").textContent;
      $("tituloApartado").textContent = nombre;
      document.title = nombre + " · LeoFX";
    } else {
      opcion.removeAttribute("aria-current");
    }
  });

  // 3) Empezar el apartado desde arriba, como una página nueva.
  window.scrollTo({ top: 0, behavior: "instant" });

  // 4) Si el gráfico se dibujó mientras su apartado estaba oculto, se
  //    reajusta a su tamaño real ahora que se ve.
  if (id === "cotizacion" && estado.grafico) estado.grafico.resize();
}


/* =====================================================================
   11. ARRANQUE
   "DOMContentLoaded" significa: cuando la página terminó de cargarse.
   Aquí se conectan los botones con sus funciones (addEventListener).
   (Si este archivo se usa fuera de un navegador —por ejemplo, en GitHub
   con registrar_predicciones.js— no hay página y esta parte no se ejecuta.)
   ===================================================================== */
// App instalable: solo cuando LeoFX se abre desde la página web (https),
// se enlaza el "manifiesto" (nombre e íconos de la app) y se instala el
// service worker (sw.js) para que funcione sin internet. En las copias
// abiertas con doble clic no se hace nada (esos archivos no están al lado).
function activarAppInstalable() {
  if (location.protocol !== "https:") return;
  const manifiesto = document.createElement("link");
  manifiesto.rel = "manifest";
  manifiesto.href = "manifest.webmanifest";
  document.head.appendChild(manifiesto);
  const iconoApple = document.createElement("link");
  iconoApple.rel = "apple-touch-icon";
  iconoApple.href = "icono-192.png";
  document.head.appendChild(iconoApple);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* si falla, la página funciona igual */ });
  }
}

function iniciarPagina() {
  activarAppInstalable();
  // Menú lateral: abrir con ☰; cerrar con la X, con un clic en el fondo
  // oscuro (fuera del panel) o con la tecla Escape.
  $("btnMenu").addEventListener("click", abrirMenu);
  $("btnCerrarMenu").addEventListener("click", () => cerrarMenu(true));
  $("fondoMenu").addEventListener("click", () => cerrarMenu(true));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarMenu(true);
  });
  // Al elegir una opción, el menú se cierra solo. El enlace cambia el
  // final de la dirección (#...) y eso muestra el apartado (ver abajo).
  document.querySelectorAll(".opcion-menu").forEach((opcion) => {
    opcion.addEventListener("click", () => cerrarMenu(false));
  });
  // Cada vez que cambia el #... de la dirección, se muestra ese apartado.
  window.addEventListener("hashchange", () => mostrarApartado(location.hash.slice(1)));
  // Al abrir la página: el apartado de la dirección, o el de inicio.
  mostrarApartado(location.hash.slice(1));

  // Pestañas Oficial / Paralelo.
  document.querySelectorAll(".pestana").forEach((boton) => {
    boton.addEventListener("click", () => {
      estado.mercado = boton.dataset.mercado;
      // La calculadora sigue a la pestaña elegida (el usuario puede cambiarla).
      $("mercadoCalc").value = MERCADOS[estado.mercado].series[0];
      actualizarCamposCalculadora();
      dibujarTodo();
    });
  });

  // Opciones del gráfico.
  $("chkComparar").addEventListener("change", (e) => { estado.comparar = e.target.checked; dibujarGrafico(); });
  $("chkPrediccion").addEventListener("change", (e) => { estado.mostrarPrediccion = e.target.checked; dibujarGrafico(); });
  $("ladoSerie").addEventListener("change", (e) => { estado.lado = e.target.value; dibujarTodo(); });
  // Zoom del gráfico: 1 mes / 3 meses / Todo.
  document.querySelectorAll(".zoom-grafico button").forEach((boton) => {
    boton.addEventListener("click", () => {
      estado.rango = boton.dataset.rango;
      document.querySelectorAll(".zoom-grafico button").forEach((b) => b.classList.toggle("activo", b === boton));
      dibujarGrafico();
      dibujarGraficoBrecha();
    });
  });

  // Calculadora.
  $("formCalculadora").addEventListener("submit", (e) => { e.preventDefault(); calcular(); });
  $("mercadoCalc").addEventListener("change", () => { actualizarCamposCalculadora(); if (calculadoraUsada) calcular(); });
  // Si ya se calculó, cambiar el margen o la compra por partes recalcula al instante.
  ["margenBanco", "partesCompra", "intervaloCompra"].forEach((id) => {
    $(id).addEventListener("change", () => { if (calculadoraUsada) calcular(); });
  });
  actualizarCamposCalculadora();

  // Registro de cotizaciones.
  $("regFecha").value = fechaHoyLocal();
  $("formRegistro").addEventListener("submit", alEnviarRegistro);
  $("cuerpoRegistros").addEventListener("click", (e) => {
    const fecha = e.target.dataset && e.target.dataset.borrar;
    if (fecha) borrarRegistro(fecha);
  });
  $("btnExportar").addEventListener("click", exportarCSV);
  $("btnImportar").addEventListener("click", () => $("archivoCSV").click());
  $("archivoCSV").addEventListener("change", (e) => {
    if (e.target.files.length) importarCSV(e.target.files[0]);
    e.target.value = ""; // permite volver a elegir el mismo archivo
  });
  $("btnBorrarTodo").addEventListener("click", borrarTodosRegistros);

  // Noticias: agregar y eliminar.
  $("formNoticia").addEventListener("submit", alAgregarNoticia);
  $("notFecha").value = fechaHoyLocal();
  $("listaNoticias").addEventListener("click", (e) => {
    const id = e.target.dataset && e.target.dataset.borrarNoticia;
    if (id) borrarNoticia(id);
  });
  // Botones de filtro: Todas / Clave / Automáticas / Mías.
  document.querySelectorAll(".filtro-noticias button").forEach((boton) => {
    boton.addEventListener("click", () => {
      filtroNoticias = boton.dataset.filtro;
      dibujarNoticias();
    });
  });

  // Botón "Informe PDF".
  $("btnInforme").addEventListener("click", generarInforme);

  // Botón "Actualizar ahora".
  $("btnActualizar").addEventListener("click", actualizarDesdeInternet);

  // Primer cálculo con los datos guardados (se ve al instante)...
  cargarDatosEnLineaGuardados();
  recalcular();
  // ...y enseguida se buscan en internet las cotizaciones de hoy y las
  // noticias y cotizaciones publicadas en GitHub.
  actualizarDesdeInternet();
  cargarDatosEnLinea();
  // Mientras la página siga abierta, se vuelve a consultar cada 30 minutos.
  setInterval(() => {
    actualizarDesdeInternet();
    cargarDatosEnLinea();
  }, FUENTE_EN_LINEA.repetirCadaMs);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", iniciarPagina);
}
