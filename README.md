# LeoFX — Predicción del tipo de cambio del dólar en Bolivia

*"FX" es la sigla internacional del mercado de divisas (foreign exchange).*

Herramienta web para empresas importadoras y empresas que usan dólares con frecuencia (compras, alquileres, proveedores). Ayuda a decidir si conviene **comprar dólares hoy o esperar** una semana o un mes, y **dónde** comprarlos.

> **Aviso:** Herramienta de apoyo a la toma de decisiones. Las predicciones son estimaciones y no garantizan valores futuros.

---

## 1. Cómo abrir la herramienta

Hay dos formas, y las dos se mantienen al día solas:

**A) Con el enlace (recomendado: computadora, Android y iPhone)**
👉 **https://mamaninogalesleonel-sudo.github.io/leofx/**
Siempre muestra la última versión y se puede compartir con cualquier persona.
**Como app:** en el celular, abra el enlace y elija *Agregar a la pantalla de inicio* (Android: menú ⋮ → *Instalar app*; iPhone: botón Compartir → *Agregar a inicio*). Queda con su propio ícono y se abre aunque no haya internet (con los últimos datos descargados).

**B) Con el archivo `LeoFX.html`**
Doble clic en `LeoFX.html` (o envíelo por WhatsApp, correo, etc. y ábralo con **Chrome**). Funciona sin instalar nada.

### ¿Cómo se mantiene al día? (GitHub)
El proyecto está publicado en **GitHub**: https://github.com/mamaninogalesleonel-sudo/leofx

- Dos veces al día (**9:00 y 21:00**, hora de Bolivia), un programa corre **en los servidores de GitHub** —no en su computadora, que puede estar apagada—: guarda el dólar oficial y el paralelo del día, busca noticias del dólar en Google News, **guarda las predicciones del día** (para el seguimiento real) y publica todo en la carpeta `datos-en-linea`.
- **Cada copia de `LeoFX.html`** (la de su computadora, la del celular, las que envió a otras personas) descarga esos datos **cada vez que se abre con internet**, sin reenviar el archivo. Lo descargado queda guardado para cuando no haya internet.
- Además, al abrirse, la página consulta el dólar del momento (DolarApi Bolivia).
- Para actualizar a mano en GitHub: en el repositorio, pestaña **Actions → Actualizar LeoFX → Run workflow**.

Notas:
- El repositorio es **público** (plan gratuito): cualquiera puede **ver** el código y las noticias, pero **solo su cuenta puede modificarlos**. Los datos que cada persona registra a mano quedan solo en su navegador.
- **Sin internet**, la herramienta funciona con los últimos datos guardados (el gráfico necesita internet la primera vez).

---

## 2. Apartados del menú (☰)

La herramienta muestra **un apartado a la vez**. Pulse **☰ Menú** (arriba a la izquierda) y elija:

| Apartado | Qué tiene |
|---|---|
| **Cotización y predicción** *(se abre al inicio)* | Dólar de hoy, gráfico con **zoom (1 mes / 3 meses / Todo)**, **brecha paralelo-oficial**, predicciones a 1, 7 y 30 días, "¿Qué predice cada método?", backtest y **seguimiento real** ("¿Acertaron las predicciones?"). |
| **¿Compro hoy o espero?** | Calculadora con **margen del banco**, recomendación clara, **comparación banco vs. paralelo** y **simulación de compra por partes**. |
| **Noticias e impacto** | Noticias clave, automáticas (Google News) y propias, con una barra de cuánto se movió el dólar. |
| **Datos y respaldo** | Exportar/Importar CSV (para Excel y los anexos) y corregir un dato a mano. |
| **Metodología** | Fuentes, métodos, fórmulas y limitaciones. |
| **Glosario** | Los términos explicados en una línea (TCO, MAPE, brecha, backtest…). |

El menú se cierra con la **X**, con un clic fuera del panel o con **Escape**. Los botones **Atrás/Adelante** del navegador también funcionan.

Arriba a la derecha está el botón **Informe PDF**: arma un informe limpio (cotización, predicciones, seguimiento, calculadora, noticias y metodología) y abre la ventana de impresión, donde puede elegir **Guardar como PDF**.

---

## 3. Cómo usar cada parte

### Cotización y predicción
- **Pestañas Oficial (BCB) / Paralelo.** En Paralelo se puede predecir el precio de compra o el de venta.
- **Gráfico:** línea histórica, predicción punteada con su rango sombreado y rombos amarillos en las fechas de noticias clave. Botones **1 mes / 3 meses / Todo** para acercar o alejar.
- **Brecha:** cuánto más caro (en %) está el paralelo que el oficial cada día.
- **Predicciones a 1, 7 y 30 días:** cada tarjeta indica el valor esperado, el rango (≈ 80 %) y qué método se usó (el de menor error en ese plazo).
- **¿Acertaron las predicciones?:** dos veces al día GitHub guarda lo que LeoFX predice; cuando llega la fecha, se compara con el valor real (error medio y % de veces que el real cayó dentro del rango). Las primeras comprobaciones aparecen al día siguiente de la publicación.

### Calculadora "¿Compro hoy o espero?"
1. Escriba el monto en dólares (por ejemplo `10.000`).
2. Elija **Banco** (tipo de cambio oficial) o **Paralelo**. En Banco, indique el **margen** que cobra su banco sobre el TCO (por defecto 1,5 %).
3. Elija en cuántas partes y cada cuántos días compraría (para la simulación).
4. Pulse **Calcular**. Verá:
   - una **recomendación** que dice qué plazo sube o baja y **cuánto ahorraría o pagaría de más**;
   - el costo hoy, en 7 y en 30 días (con rango);
   - **¿Dónde conviene comprar hoy?**: banco vs. paralelo (con nota sobre respaldo tributario y bancarización del paralelo);
   - **Comprar por partes**: costo esperado, mínimo y máximo frente a comprar todo hoy o todo en 30 días.

### Noticias e impacto
- **Barra Normal / Moderado / Fuerte:** compara el movimiento del dólar oficial en los 5 días siguientes con un movimiento normal de 5 días. **Rojo** = subió; **verde** = bajó.
- **Filtros:** Todas / Clave / Automáticas / Mías. Formulario al final para agregar noticias propias.
- **Importante para la tesis:** la barra mide **coincidencia en el tiempo, no causa**.
- Las **automáticas** llegan solas (Google News, últimos 7 días, sin notas de rutina ni repetidas; hasta 150 noticias de los últimos 6 meses).

### Datos y respaldo
- **Exportar CSV:** todos los datos (históricos, automáticos y manuales), listo para Excel y los anexos. Formato: `fecha;oficial_bcb;paralelo_compra;paralelo_venta;origen`, con coma decimal.
- **Importar CSV:** carga un archivo exportado antes (por ejemplo, en otro dispositivo).
- **Corregir o agregar un dato a mano:** formulario plegable, solo si hace falta.

---

## 4. Resumen de la metodología

- **Métodos (5):** promedio móvil, regresión lineal (últimos 30 días), Holt, **Holt amortiguado** y **combinación** (promedio móvil + Holt amortiguado). Además, el "último valor" como referencia.
- **Backtest y MAPE:** se "predice el pasado" y se mide el error. Para cada plazo se usa el método con **menor MAPE en ese plazo**.
- **Rango:** esperado ± 1,28 × desviación de los errores pasados (≈ 80 %). Más de 5 % de ancho → "alta incertidumbre".
- **Seguimiento real:** predicciones guardadas cada día y comparadas con el valor real cuando llega la fecha (evaluación fuera de muestra).
- **Precio en el banco** = TCO × (1 + margen). **Brecha** = (paralelo compra − TCO) / TCO.
- **Compra por partes:** suma de cada parte por el tipo de cambio esperado de su día; mínimo y máximo con los extremos del rango (escenario conservador).
- **Estudio de eventos (noticias):** cambio del TCO entre el día anterior y 5 días después, dividido entre la mediana de los cambios de 5 días.

**¿Por qué a veces los tres plazos dan casi el mismo valor?** Cuando el mercado no tiene una tendencia clara, el pronóstico más preciso es que el dólar se mantenga cerca de su valor actual; lo que más informa entonces es el **rango**. Cuando aparezca una tendencia, las predicciones se separarán solas.

### Resultados con los datos al 14/10/2026

| Serie | 1 día | 7 días | 30 días |
|---|---|---|---|
| Oficial (BCB) | Holt amortiguado (MAPE 0,99 %) | Combinación (4,59 %) | Promedio móvil (5,38 %) |
| Paralelo – compra | Holt amortiguado (0,43 %) | Combinación (0,82 %) | Promedio móvil (1,26 %) |
| Paralelo – venta | Holt (0,66 %) | Promedio móvil (0,81 %) | Promedio móvil (0,38 %) |

En el oficial a 1 día, la referencia "último valor" (0,89 %) es levemente mejor: típico de los mercados cambiarios ("caminata aleatoria"), un hallazgo útil para la discusión de la tesis. Estos valores cambian a medida que llegan datos nuevos. La explicación completa está en el apartado **Metodología**.

---

## 5. Qué contiene cada archivo

| Archivo | Para qué sirve |
|---|---|
| **`LeoFX.html`** | **La herramienta lista para usar.** Un solo archivo con todo adentro. |
| `index.html` | Entrada de la página web (abre `LeoFX.html`). |
| `manifest.webmanifest`, `sw.js`, `icono-192.png`, `icono-512.png` | Lo que permite instalar LeoFX como app y usarla sin internet (solo en la página web). |
| `datos-en-linea/` | Noticias, cotizaciones y predicciones publicadas dos veces al día; las leen todas las copias. |
| `.github/workflows/actualizar.yml` | El programa que corre en GitHub a las 9:00 y 21:00. |
| `codigo-fuente/index.html`, `styles.css`, `app.js` | Estructura, diseño y lógica de la página (comentados en español). |
| `codigo-fuente/datos.js` | Datos históricos (oficial y paralelo) y noticias clave. |
| `codigo-fuente/guardar_cotizaciones.ps1` | Guarda el dólar oficial y el paralelo del día. |
| `codigo-fuente/buscar_noticias.ps1` | Busca, filtra y guarda las noticias de Google News. |
| `codigo-fuente/registrar_predicciones.js` | Guarda las predicciones del día para el seguimiento real (usa los mismos modelos de `app.js`). |
| `codigo-fuente/actualizar_leofx.ps1` | Ejecuta los tres programas anteriores y arma `LeoFX.html`. |
| `codigo-fuente/armar_LeoFX.bat` / `.ps1` | Une el código fuente en `LeoFX.html`. |
| `codigo-fuente/*_auto.js` | Datos generados automáticamente (no se editan). |
| `codigo-fuente/actualizacion.log` | Bitácora de cada actualización. |

---

## 6. Ajustes opcionales (para usuarios avanzados)

Los cambios se hacen en `codigo-fuente` y luego se sube el proyecto a GitHub (o se ejecuta `armar_LeoFX.bat` para el archivo local).

- En `app.js`, bloque `CONFIG`: `ventanaPromedio`, `ventanaRegresionDias`, `z` (1,28 ≈ 80 %; 1,96 ≈ 95 %), `umbralCambio`, `umbralIncertidumbre`, `referenciaPuedeGanar`, y los parámetros de `noticias`.
- Colores: `styles.css` (bloque `:root`) y, para las líneas del gráfico, `app.js` (objeto `SERIES`).
- Datos históricos "de fábrica": `datos.js`.

### Cómo agregar una nueva opción al menú
Solo se edita `codigo-fuente/index.html` (no hace falta tocar `app.js`):

1. **Crear el apartado** dentro de `<main>`:
   ```html
   <section id="mi-apartado" class="seccion apartado" hidden>
     <div class="tarjeta">
       <h2>Mi apartado</h2>
       <p>Contenido…</p>
     </div>
   </section>
   ```
2. **Agregar la opción** dentro de `<nav class="panel-opciones">` (copie una existente y cambie `href`, `data-apartado` y el texto; los dos primeros deben coincidir con el `id`):
   ```html
   <a class="opcion-menu" href="#mi-apartado" data-apartado="mi-apartado">
     <svg class="icono-opcion" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
     <span class="texto-opcion">Mi apartado</span>
   </a>
   ```
3. Volver a armar `LeoFX.html` y subir a GitHub.

---

## 7. Fuentes de datos

- **Oficial:** Banco Central de Bolivia — TCO, www.bcb.gob.bo. Histórico desde el 27/06/2026; los días del 15 al 21/10/2026 se completaron con valores del BCB verificados con el "Monitor Cambiario de Bolivia" y la prensa; desde el 22/10/2026 se obtiene automáticamente vía DolarApi Bolivia.
- **Paralelo:** histórico con cierres reportados en prensa (dolarboliviahoy.com vía Red Uno, EJU y Correo del Sur; dolaresabolivianos.com y paralelo.bo para algunos días de septiembre); los días sin dato no se inventan. Luego, automático vía DolarApi Bolivia (referencia del mercado P2P).
- **Noticias:** selección de notas clave con enlace (El Deber, Opinión, Infobae/EFE, France 24) y búsqueda automática en Google News.
- **Servicio de actualización:** DolarApi Bolivia — https://bo.dolarapi.com (público y gratuito).
