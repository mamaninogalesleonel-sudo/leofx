/* =====================================================================
   LeoFX — datos.js
   ---------------------------------------------------------------------
   Aquí están los DATOS HISTÓRICOS "de fábrica" de la herramienta.

   - Están escritos como "arrays" (listas) de JavaScript.
   - Cada elemento de la lista es un "objeto" con llaves { }, que agrupa
     varios datos con nombre (por ejemplo: fecha y valor).
   - Las fechas van en formato AAAA-MM-DD (año-mes-día) porque así se
     ordenan solas de forma correcta.
   - Los números van con PUNTO decimal (9.73) porque así los entiende
     JavaScript. En pantalla se muestran con coma (9,73).

   IMPORTANTE: los datos nuevos (los que la página descarga sola de
   internet al abrirse y los que usted registra a mano) NO se guardan en
   este archivo, sino en el navegador (localStorage). Este archivo solo
   cambia si usted lo edita a mano.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1) TIPO DE CAMBIO OFICIAL (TCO) DEL BCB
   Fuente: Banco Central de Bolivia — www.bcb.gob.bo
   Valor en bolivianos (Bs) por 1 dólar estadounidense.
   Los fines de semana el BCB mantiene el valor del viernes.
   --------------------------------------------------------------------- */
const DATOS_OFICIAL = [
  { fecha: "2026-06-27", valor: 9.73 },
  { fecha: "2026-06-28", valor: 9.73 },
  { fecha: "2026-06-29", valor: 9.73 },
  { fecha: "2026-06-30", valor: 9.76 },
  { fecha: "2026-07-01", valor: 9.76 },
  { fecha: "2026-07-02", valor: 9.78 },
  { fecha: "2026-07-03", valor: 9.80 },
  { fecha: "2026-07-04", valor: 9.83 },
  { fecha: "2026-07-05", valor: 9.83 },
  { fecha: "2026-07-06", valor: 9.83 },
  { fecha: "2026-07-07", valor: 9.89 },
  { fecha: "2026-07-08", valor: 9.96 },
  { fecha: "2026-07-09", valor: 10.10 },
  { fecha: "2026-07-10", valor: 10.24 },
  { fecha: "2026-07-11", valor: 10.40 },
  { fecha: "2026-07-12", valor: 10.40 },
  { fecha: "2026-07-13", valor: 10.40 },
  { fecha: "2026-07-14", valor: 10.50 },
  { fecha: "2026-07-15", valor: 10.70 },
  { fecha: "2026-07-16", valor: 10.75 },
  { fecha: "2026-07-17", valor: 10.75 },
  { fecha: "2026-07-18", valor: 10.85 },
  { fecha: "2026-07-19", valor: 10.85 },
  { fecha: "2026-07-20", valor: 10.85 },
  { fecha: "2026-07-21", valor: 10.90 },
  { fecha: "2026-07-22", valor: 11.00 },
  { fecha: "2026-07-23", valor: 11.13 },
  { fecha: "2026-07-24", valor: 11.21 },
  { fecha: "2026-07-25", valor: 11.37 },
  { fecha: "2026-07-26", valor: 11.37 },
  { fecha: "2026-07-27", valor: 11.37 },
  { fecha: "2026-07-28", valor: 11.54 },
  { fecha: "2026-07-29", valor: 11.80 },
  { fecha: "2026-07-30", valor: 11.89 },
  { fecha: "2026-07-31", valor: 12.15 },
  { fecha: "2026-08-01", valor: 12.13 },
  { fecha: "2026-08-02", valor: 12.13 },
  { fecha: "2026-08-03", valor: 12.13 },
  { fecha: "2026-08-04", valor: 12.08 },
  { fecha: "2026-08-05", valor: 12.02 },
  { fecha: "2026-08-06", valor: 11.86 },
  { fecha: "2026-08-07", valor: 11.86 },
  { fecha: "2026-08-08", valor: 11.86 },
  { fecha: "2026-08-09", valor: 11.86 },
  { fecha: "2026-08-10", valor: 11.86 },
  { fecha: "2026-08-11", valor: 11.77 },
  { fecha: "2026-08-12", valor: 11.71 },
  { fecha: "2026-08-13", valor: 11.66 },
  { fecha: "2026-08-14", valor: 11.62 },
  { fecha: "2026-08-15", valor: 11.58 },
  { fecha: "2026-08-16", valor: 11.58 },
  { fecha: "2026-08-17", valor: 11.58 },
  { fecha: "2026-08-18", valor: 11.55 },
  { fecha: "2026-08-19", valor: 11.52 },
  { fecha: "2026-08-20", valor: 11.52 },
  { fecha: "2026-08-21", valor: 11.52 },
  { fecha: "2026-08-22", valor: 11.50 },
  { fecha: "2026-08-23", valor: 11.50 },
  { fecha: "2026-08-24", valor: 11.50 },
  { fecha: "2026-08-25", valor: 11.54 },
  { fecha: "2026-08-26", valor: 11.57 },
  { fecha: "2026-08-27", valor: 11.71 },
  { fecha: "2026-08-28", valor: 11.83 },
  { fecha: "2026-08-29", valor: 11.92 },
  { fecha: "2026-08-30", valor: 11.92 },
  { fecha: "2026-08-31", valor: 11.92 },
  { fecha: "2026-09-01", valor: 12.12 },
  { fecha: "2026-09-02", valor: 12.26 },
  { fecha: "2026-09-03", valor: 12.32 },
  { fecha: "2026-09-04", valor: 12.45 },
  { fecha: "2026-09-05", valor: 12.58 },
  { fecha: "2026-09-06", valor: 12.58 },
  { fecha: "2026-09-07", valor: 12.58 },
  { fecha: "2026-09-08", valor: 12.60 },
  { fecha: "2026-09-09", valor: 12.64 },
  { fecha: "2026-09-10", valor: 12.42 },
  { fecha: "2026-09-11", valor: 12.04 },
  { fecha: "2026-09-12", valor: 11.53 },
  { fecha: "2026-09-13", valor: 11.53 },
  { fecha: "2026-09-14", valor: 11.53 },
  { fecha: "2026-09-15", valor: 10.99 },
  { fecha: "2026-09-16", valor: 10.15 },
  { fecha: "2026-09-17", valor: 9.83 },
  { fecha: "2026-09-18", valor: 10.01 },
  { fecha: "2026-09-19", valor: 11.00 },
  { fecha: "2026-09-20", valor: 11.00 },
  { fecha: "2026-09-21", valor: 11.00 },
  { fecha: "2026-09-22", valor: 11.90 },
  { fecha: "2026-09-23", valor: 12.06 },
  { fecha: "2026-09-24", valor: 12.26 },
  { fecha: "2026-09-25", valor: 12.22 },
  { fecha: "2026-09-26", valor: 12.05 },
  { fecha: "2026-09-27", valor: 12.05 },
  { fecha: "2026-09-28", valor: 12.05 },
  { fecha: "2026-09-29", valor: 12.02 },
  { fecha: "2026-09-30", valor: 12.02 },
  { fecha: "2026-10-01", valor: 12.00 },
  { fecha: "2026-10-02", valor: 11.90 },
  { fecha: "2026-10-03", valor: 12.00 },
  { fecha: "2026-10-04", valor: 12.00 },
  { fecha: "2026-10-05", valor: 12.00 },
  { fecha: "2026-10-06", valor: 11.97 },
  { fecha: "2026-10-07", valor: 11.97 },
  { fecha: "2026-10-08", valor: 11.85 },
  { fecha: "2026-10-09", valor: 11.85 },
  { fecha: "2026-10-10", valor: 11.73 },
  { fecha: "2026-10-11", valor: 11.73 },
  { fecha: "2026-10-12", valor: 11.73 },
  { fecha: "2026-10-13", valor: 11.70 },
  { fecha: "2026-10-14", valor: 11.70 },
  // 15 al 21 de octubre: agregados después. Fuente: BCB (bcb.gob.bo),
  // verificados con la serie del "Monitor Cambiario de Bolivia" y la prensa.
  // El 17 y 18 (fin de semana) llevan el TCO de Bs 11,69 que el BCB
  // publicó con vigencia del sábado 17 al lunes 19.
  { fecha: "2026-10-15", valor: 11.68 },
  { fecha: "2026-10-16", valor: 11.68 },
  { fecha: "2026-10-17", valor: 11.69 },
  { fecha: "2026-10-18", valor: 11.69 },
  { fecha: "2026-10-19", valor: 11.69 },
  { fecha: "2026-10-20", valor: 11.70 },
  { fecha: "2026-10-21", valor: 11.73 }
];


/* ---------------------------------------------------------------------
   2) DÓLAR PARALELO (mercado informal / plataformas P2P como Binance)
   Cierres reportados en prensa.
   Fuentes: dolarboliviahoy.com vía Red Uno, EJU, Correo del Sur;
            dolaresabolivianos.com / paralelo.bo (algunos días de septiembre).

   - compra: precio que se paga para COMPRAR 1 dólar (en Bs).
   - venta:  precio que se recibe al VENDER 1 dólar (en Bs).

   Hay días SIN dato. No se inventan valores: el gráfico une los puntos
   con una línea solo como ayuda visual, y los modelos de predicción usan
   únicamente los días que sí tienen dato.
   --------------------------------------------------------------------- */
const DATOS_PARALELO = [
  { fecha: "2026-07-23", compra: 11.56, venta: 11.49 },
  { fecha: "2026-07-24", compra: 11.75, venta: 11.69 },
  { fecha: "2026-07-31", compra: 11.98, venta: 11.96 },
  { fecha: "2026-08-01", compra: 11.80, venta: 11.71 },
  { fecha: "2026-08-15", compra: 11.43, venta: 11.40 },
  { fecha: "2026-09-07", compra: 12.48, venta: 12.44 },
  { fecha: "2026-09-11", compra: 11.84, venta: 11.67 },
  { fecha: "2026-09-14", compra: 12.00, venta: 11.66 },
  { fecha: "2026-09-20", compra: 11.95, venta: 11.91 },
  { fecha: "2026-09-21", compra: 12.06, venta: 12.00 },
  { fecha: "2026-09-25", compra: 12.22, venta: 12.00 },
  { fecha: "2026-09-29", compra: 12.03, venta: 12.00 },
  { fecha: "2026-09-30", compra: 12.04, venta: 11.86 },
  { fecha: "2026-10-02", compra: 11.99, venta: 11.96 },
  { fecha: "2026-10-07", compra: 11.90, venta: 11.88 },
  { fecha: "2026-10-09", compra: 11.87, venta: 11.86 },
  { fecha: "2026-10-10", compra: 11.84, venta: 11.81 },
  { fecha: "2026-10-12", compra: 11.85, venta: 11.86 },
  { fecha: "2026-10-13", compra: 11.88, venta: 11.86 },
  { fecha: "2026-10-14", compra: 11.85, venta: 11.83 }
];


/* ---------------------------------------------------------------------
   3) NOTICIAS CLAVE (para el apartado "Noticias e impacto")
   Hechos económicos con fecha y fuente verificable. El resumen está
   escrito con palabras propias; el enlace lleva a la nota original.

   - fecha:   día en que se conoció la noticia (AAAA-MM-DD).
   - titular, resumen, fuente, enlace: lo que se muestra en pantalla.
   - referenciaPrevia (opcional): valor del dólar oficial ANTES de la
     noticia cuando no está en la serie (solo en el cambio de régimen,
     porque la serie empieza el 27/06/2026).

   El "impacto" NO se escribe aquí: la herramienta lo calcula sola
   comparando el dólar antes y después de cada fecha.
   Usted puede agregar más noticias desde la página.
   --------------------------------------------------------------------- */
const DATOS_NOTICIAS = [
  {
    fecha: "2026-06-26",
    titular: "Bolivia deja el tipo de cambio fijo: el BCB fija el primer dólar flexible en Bs 9,73",
    resumen: "Con la Resolución Ministerial 245, el Gobierno adopta un régimen cambiario flexible y encarga la transición al BCB. El tipo oficial, fijo en Bs 6,96 desde 2011, pasa a calcularse cada día con las compras de dólares de los bancos.",
    fuente: "El Deber",
    enlace: "https://eldeber.com.bo/economia/bcb-establece-partir-lunes-29-junio-entra-vigencia-tipo-cambio-flexible_1782520030",
    referenciaPrevia: { valor: 6.96, descripcion: "tipo fijo vigente hasta el 26/06/2026" }
  },
  {
    fecha: "2026-07-30",
    titular: "Bolivia pacta un crédito con el FMI, el primero en dos décadas",
    resumen: "El Gobierno alcanza un acuerdo de financiamiento con el Fondo Monetario Internacional para respaldar las reservas internacionales en medio de la crisis económica.",
    fuente: "France 24",
    enlace: "https://www.france24.com/es/programas/econom%C3%ADa/20260730-bolivia-pacta-cr%C3%A9dito-millonario-con-el-fmi-el-primero-tras-dos-d%C3%A9cadas-y-en-medio-de-una-crisis-econ%C3%B3mica"
  },
  {
    fecha: "2026-09-04",
    titular: "El Gobierno envía al Parlamento el acuerdo con el FMI por USD 1.900 millones",
    resumen: "El acuerdo de financiamiento pasa a la Asamblea Legislativa para su análisis y eventual aprobación.",
    fuente: "Infobae",
    enlace: "https://www.infobae.com/america/america-latina/2026/09/04/el-gobierno-de-bolivia-envio-al-parlamento-el-acuerdo-con-el-fmi-por-usd-1900-millones-para-su-analisis-y-eventual-aprobacion/"
  },
  {
    fecha: "2026-09-07",
    titular: "El BCB suspende la compra de dólares y crea una reserva obligatoria para los bancos",
    resumen: "Para frenar la presión sobre el tipo de cambio, el BCB pausa sus nuevas compras de dólares y, desde el 8 de septiembre, exige a los bancos inmovilizar el 3 % de sus depósitos en bolivianos (Reserva Monetaria Restringida).",
    fuente: "Opinión",
    enlace: "https://www.opinion.com.bo/articulo/pais/bcb-dispone-medidas-reducir-presion-mercado-dolares/20260907230747995864.html"
  },
  {
    fecha: "2026-09-19",
    titular: "La Asamblea Legislativa aprueba el acuerdo con el FMI por USD 1.900 millones",
    resumen: "Ambas cámaras aprueban el financiamiento; el presidente promulga la ley al día siguiente.",
    fuente: "Infobae",
    enlace: "https://www.infobae.com/america/america-latina/2026/09/19/el-congreso-de-bolivia-aprobo-el-acuerdo-de-financiamiento-con-el-fmi-por-usd-1900-millones/"
  },
  {
    fecha: "2026-10-06",
    titular: "El BCB recibe el primer desembolso del FMI: USD 211,3 millones",
    resumen: "El primer tramo del programa con el FMI llega a las reservas internacionales para apoyar la balanza de pagos.",
    fuente: "Infobae / EFE",
    enlace: "https://www.infobae.com/america/agencias/2026/10/06/banco-central-de-bolivia-confirma-primer-desembolso-de-2113-millones-de-dolares-del-fmi/"
  }
];
