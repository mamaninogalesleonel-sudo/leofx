# LeoFX — Predicción del tipo de cambio del dólar en Bolivia

*"FX" es la sigla internacional del mercado de divisas (foreign exchange).*

Herramienta web para empresas importadoras y empresas que usan dólares con frecuencia (compras, alquileres, proveedores). Ayuda a decidir si conviene **comprar dólares hoy o esperar** una semana o un mes.

> **Aviso:** Herramienta de apoyo a la toma de decisiones. Las predicciones son estimaciones y no garantizan valores futuros.

---

## 1. Cómo abrir la herramienta

Hay dos formas, y las dos se mantienen al día solas:

**A) Con el enlace (recomendado: computadora, Android y iPhone)**
👉 **https://mamaninogalesleonel-sudo.github.io/leofx/**
Es la herramienta publicada en internet. Siempre muestra la última versión. Se puede compartir con cualquier persona.

**B) Con el archivo `LeoFX.html`**
Haga **doble clic en `LeoFX.html`** (o envíelo por WhatsApp, correo, etc. y ábralo con **Chrome**). Funciona sin instalar nada.

### ¿Cómo se mantiene al día? (GitHub)
El proyecto está publicado en **GitHub**: https://github.com/mamaninogalesleonel-sudo/leofx

- Dos veces al día (**9:00 y 21:00**, hora de Bolivia), un programa corre **en los servidores de GitHub** —no en su computadora, que puede estar apagada—: guarda el dólar oficial y el paralelo del día, busca noticias del dólar en Google News y deja todo publicado en la carpeta `datos-en-linea`.
- **Cada copia de `LeoFX.html`** (la de su computadora, la del celular, las que envió a otras personas) descarga esos datos **cada vez que se abre con internet**. Así recibe las noticias y cotizaciones nuevas **sin reenviar el archivo**. Lo descargado queda guardado para cuando no haya internet.
- Además, al abrirse, la página consulta el dólar del momento (DolarApi Bolivia).
- Para actualizar a mano en GitHub: en el repositorio, pestaña **Actions → Actualizar LeoFX → Run workflow**.

Notas:
- El repositorio es **público** (plan gratuito): cualquiera puede ver el código y las noticias. Los datos que cada persona registra a mano quedan solo en su navegador; no se publican.
- Los datos que usted registre a mano en un dispositivo quedan en ese dispositivo. Para pasarlos, use **Exportar CSV** en uno e **Importar CSV** en el otro.
- La tarea programada de Windows ya **no se usa** (la reemplazó GitHub). Los archivos `activar_…`/`desactivar_…`/`actualizar_ahora.bat` quedan por si algún día prefiere actualizar desde la computadora.

**Con internet**, al abrirse, la herramienta **descarga sola las cotizaciones del día** (oficial del BCB y paralelo) y recalcula las predicciones. Arriba verá una barra verde con la hora de actualización y los valores obtenidos.

**Sin internet**, funciona igual con los últimos datos guardados (el gráfico no se dibuja, porque la librería Chart.js también viene de internet).

---

## 2. Qué contiene cada archivo

| Archivo | Para qué sirve |
|---|---|
| **`LeoFX.html`** | **La herramienta lista para usar.** Un solo archivo con todo adentro. Es el que se abre y el que se envía al celular. |
| `index.html` | Entrada de la página web en GitHub (abre `LeoFX.html`). |
| `datos-en-linea/` | Noticias y cotizaciones publicadas dos veces al día; las leen todas las copias. |
| `.github/workflows/actualizar.yml` | El programa que corre en GitHub a las 9:00 y 21:00. |
| `README.md` | Este instructivo. |
| `codigo-fuente/index.html` | Estructura de la página: secciones, botones y textos. |
| `codigo-fuente/styles.css` | El diseño: colores (tonos verdes), tamaños y adaptación al celular. |
| `codigo-fuente/app.js` | La lógica: actualización automática, modelos de predicción, backtest, calculadora, registro y CSV. |
| `codigo-fuente/datos.js` | Los datos históricos (oficial y paralelo) hasta el 14/10/2026. |
| `codigo-fuente/armar_LeoFX.bat` | Doble clic para volver a crear `LeoFX.html` si modifica algún archivo del código fuente. |
| `codigo-fuente/activar_noticias_diarias.bat` | (Opcional, ya no hace falta) Activa la actualización diaria en la computadora en lugar de GitHub. |
| `codigo-fuente/desactivar_noticias_diarias.bat` | Doble clic para quitar esa actualización diaria. |
| `codigo-fuente/actualizar_ahora.bat` | Doble clic para actualizar en ese momento (a mano). |
| `codigo-fuente/actualizar_leofx.ps1` | Lo que ejecuta la tarea diaria: llama a los dos programas de abajo y arma `LeoFX.html`. |
| `codigo-fuente/guardar_cotizaciones.ps1` | Guarda el dólar oficial y el paralelo del día (aunque no abra la página). |
| `codigo-fuente/buscar_noticias.ps1` | Busca en Google News (últimos 7 días), filtra y guarda las noticias. |
| `codigo-fuente/cotizaciones_auto.js` | Las cotizaciones guardadas por la tarea (no se edita). |
| `codigo-fuente/noticias_auto.js` | Las noticias encontradas (no se edita). |
| `codigo-fuente/actualizacion.log` | Bitácora: cuándo se actualizó, qué cotización se guardó y cuántas noticias se encontraron. |

La carpeta `codigo-fuente` tiene el código separado por partes y comentado en español (útil para estudiarlo o para los anexos de la tesis). **No la necesita para usar la herramienta.** Si cambia algo ahí, ejecute `armar_LeoFX.bat` para que `LeoFX.html` incluya el cambio.

---

## 3. Cómo usarla

### Menú y apartados
La herramienta muestra **un apartado a la vez**, como si cada uno fuera su propia página. Para cambiar de apartado:

1. Pulse el botón **☰ Menú** (arriba a la izquierda; se queda fijo al bajar por la página).
2. Se abre un panel desde la izquierda con las 5 opciones: **Cotización y predicción** (la principal, que se ve al abrir), **¿Compro hoy o espero?**, **Noticias e impacto**, **Registrar cotizaciones** y **Metodología**.
3. Elija una: se muestra ese apartado y el menú se cierra solo. La opción que está viendo aparece resaltada en verde.

El menú también se cierra con la **X**, haciendo **clic fuera del panel** o con la tecla **Escape**. Los botones **Atrás/Adelante** del navegador también sirven para volver al apartado anterior. Al **imprimir**, se incluyen todos los apartados.

### Noticias e impacto
En el menú, **Noticias e impacto** muestra noticias económicas (con fecha, fuente y enlace a la nota original) y, para cada una, una **barra** que indica cuánto se movió el dólar oficial en los 5 días siguientes:

- **Normal / Moderado / Fuerte:** se compara el movimiento con uno normal de 5 días (la mediana de la serie). Fuerte = 2,5 veces o más.
- **Rojo** = el dólar subió; **verde** = bajó. También se muestra el cambio del paralelo cuando hay datos cercanos.
- Las noticias **Clave** y las **Mías** aparecen en el gráfico de "Cotización y predicción" como **rombos amarillos**.
- **Filtros:** Todas / Clave / Automáticas / Mías.
- **Importante para la tesis:** la barra mide **coincidencia en el tiempo, no causa**. Que el dólar se mueva cerca de una noticia no prueba que la noticia lo haya provocado.

#### Noticias automáticas (se agregan solas)
La página no puede leer Google News por sí sola (el navegador lo bloquea), así que lo hace la **actualización diaria en GitHub** (ver sección 1):

1. Todos los días a las **9:00 y a las 21:00**, GitHub busca noticias de los **últimos 7 días** y las publica en `datos-en-linea/noticias.json`.
2. Cada copia de la herramienta las descarga al abrirse y las muestra con la etiqueta **Automática**, cada una con su barra de impacto.

Qué busca: titulares de Bolivia sobre dólar, tipo de cambio, divisas, BCB, FMI y reservas internacionales. Descarta las notas de rutina que solo informan la cotización del día ("Dólar hoy…", "Así cierra el dólar…") y las repetidas. Guarda hasta 150 noticias de los últimos 6 meses.

Si algo falla (por ejemplo, Google no responde), se anota en `codigo-fuente/actualizacion.log` y la herramienta sigue funcionando con lo que ya tenía.

#### Agregar noticias a mano
Al final del apartado hay un formulario (fecha, titular, fuente, enlace y resumen) para hechos que la búsqueda no encuentre, de Bolivia o del mundo.

Noticias precargadas: cambio a tipo de cambio flexible (26/06/2026), crédito con el FMI (30/07), envío del acuerdo al Parlamento (04/09), suspensión de compras de dólares del BCB y Reserva Monetaria Restringida (07/09), aprobación legislativa del acuerdo (19/09) y primer desembolso del FMI (06/10).

### Actualización automática
- Cada vez que abre `LeoFX.html`, la herramienta consulta **DolarApi Bolivia** (bo.dolarapi.com), un servicio público y gratuito, y guarda:
  - el **Tipo de Cambio Oficial (TCO) del BCB** del día (coincide con lo publicado en bcb.gob.bo);
  - el **dólar paralelo** del momento (compra y venta).
- Mientras la página siga abierta, vuelve a consultar **cada 30 minutos**. También puede pulsar **"Actualizar ahora"**.
- Si la abre varias veces el mismo día, se queda con el último valor del día.
- Los fines de semana el BCB mantiene el valor del viernes: la herramienta completa sábado y domingo con ese valor, como en la serie histórica.
- **Aunque nadie abra la página**, la actualización diaria en GitHub guarda el dólar de cada día (`datos-en-linea/cotizaciones.json`), así la serie no queda con huecos. Todas las copias reciben esos días al abrirse.

### Pestañas "Oficial (BCB)" y "Paralelo"
En cada pestaña verá:
- **Cotización de hoy**: el último valor, su variación respecto al dato anterior (en Bs y en %) y una flecha: ▲ roja = subió, ▼ verde = bajó.
- **Gráfico histórico** desde el 27/06/2026. Puede activar **"Comparar oficial y paralelo"** y **"Mostrar predicción"** (línea punteada con su rango sombreado).
- **Predicción a 1, 7 y 30 días**, presentada como un rango (mínimo, esperado y máximo).
- **Tabla de backtest**: el error (MAPE) de cada método. Se elige automáticamente el de menor error.

En la pestaña Paralelo puede elegir si se predice el precio de **compra** o el de **venta**.

### Calculadora "¿Compro hoy o espero?"
1. Escriba el monto en dólares (por ejemplo `10.000`).
2. Elija el mercado: oficial o paralelo.
3. Pulse **Calcular**. Verá el costo en Bs hoy, el costo esperado en 7 y 30 días (con rango) y una recomendación en lenguaje sencillo.

---

## 4. Registrar cotizaciones a mano (solo si hace falta)

Normalmente no necesita hacerlo, porque los datos llegan solos. Úselo para **corregir un valor** o **completar un día** en que no abrió la herramienta:

1. Vaya a la sección **"Registrar cotizaciones"**.
2. Elija la fecha.
3. Escriba el **valor oficial del BCB** y/o el **paralelo** (compra y venta juntas). Puede usar coma decimal: `11,70`.
4. Pulse **Guardar cotización**. Las predicciones se recalculan al instante.

En la tabla **"Datos nuevos guardados"** verá cada día con su origen: **Automático** (de internet) o **Manual**. Puede eliminar cualquiera.

Los datos se guardan **en ese navegador y esa computadora** (localStorage). Si cambia de navegador o borra los datos de navegación, se pierden. Por eso:

### Respaldo con CSV (y anexos de la tesis)
- **Exportar CSV** descarga todos los datos (históricos, automáticos y manuales) en un archivo que se abre en Excel. Hágalo cada semana como respaldo; también sirve para los anexos.
- **Importar CSV** carga un archivo exportado antes, por ejemplo en otra computadora.
- Formato: `fecha;oficial_bcb;paralelo_compra;paralelo_venta;origen`, con coma decimal. También acepta archivos separados por comas con punto decimal.

---

## 5. Resumen de la metodología

- **Métodos (5):** promedio móvil (7 datos en el oficial, 3 en el paralelo), regresión lineal (últimos 30 días), suavizamiento exponencial doble de Holt, **Holt amortiguado** (la tendencia se va frenando con el plazo) y una **combinación** (promedio del promedio móvil y Holt amortiguado). Los parámetros de Holt se optimizan solos. Además se muestra el **"último valor"** como referencia de comparación.
- **Backtest:** se "predice el pasado" en cada fecha y se compara con lo que ocurrió realmente.
- **MAPE** = promedio de |Real − Pronóstico| / Real × 100 %.
- **Elección por plazo:** para 1, 7 y 30 días se usa, en cada caso, el método con **menor MAPE en ese plazo**. Por eso cada tarjeta de predicción indica qué método usó.
- **Rango:** esperado ± 1,28 × desviación de los errores pasados (aprox. 80 % de confianza). Si el rango supera el 5 % del valor esperado, se advierte "alta incertidumbre".
- **"¿Qué predice cada método?":** una tabla muestra lo que predice cada uno de los métodos en los tres plazos, para ver qué tendencia detecta cada uno.

**¿Por qué a veces los tres plazos dan casi el mismo valor?** Porque cuando el mercado no tiene una tendencia clara, el pronóstico más preciso es que el dólar se mantenga cerca de su valor actual; los métodos que inventan subidas o bajadas se equivocan más en el backtest y por eso no se eligen. En ese caso, lo que más informa es el **rango**, que se amplía con el plazo. Cuando aparezca una tendencia, las predicciones de 1, 7 y 30 días se separarán solas.

La explicación completa, con fórmulas y limitaciones, está en la sección **Metodología** de la página.

### Resultados con los datos al 14/10/2026

| Serie | 1 día | 7 días | 30 días |
|---|---|---|---|
| Oficial (BCB) | Holt amortiguado (MAPE 0,99 %) | Combinación (4,59 %) | Promedio móvil (5,38 %) |
| Paralelo – compra | Holt amortiguado (0,43 %) | Combinación (0,82 %) | Promedio móvil (1,26 %) |
| Paralelo – venta | Holt (0,66 %) | Promedio móvil (0,81 %) | Promedio móvil (0,38 %) |

Antes, con un solo método para los tres plazos, el oficial usaba el promedio móvil con MAPE de 2,86 % a 1 día y 5,60 % a 7 días; eligiendo por plazo bajan a 0,99 % y 4,59 %. El Holt amortiguado reduce el error de Holt a 30 días de 21,88 % a 11,62 %. En el oficial a 1 día, la referencia "último valor" (0,89 %) sigue siendo levemente mejor: es típico de los mercados cambiarios (comportamiento de "caminata aleatoria") y es un hallazgo útil para la discusión de la tesis. Estos valores cambian a medida que llegan datos nuevos.

---

## 6. Ajustes opcionales (para usuarios avanzados)

Todos estos cambios se hacen en los archivos de `codigo-fuente`, y después se ejecuta `codigo-fuente/armar_LeoFX.bat` para actualizar `LeoFX.html`.

Al inicio de `app.js`, en el bloque `CONFIG`, puede cambiar:
- `ventanaPromedio`: cuántos datos promedia el promedio móvil.
- `ventanaRegresionDias`: cuántos días usa la regresión.
- `z`: amplitud del rango (1,28 ≈ 80 %; 1,96 ≈ 95 %).
- `umbralCambio` y `umbralIncertidumbre`: cuándo se considera "estable" y cuándo hay "alta incertidumbre".
- `referenciaPuedeGanar`: póngalo en `true` si quiere que el "último valor" también pueda ser elegido.

En la sección 8 de `app.js` (`FUENTE_EN_LINEA`) puede cambiar cada cuánto se vuelve a consultar internet.

Para cambiar los datos históricos "de fábrica", edite `datos.js` con el Bloc de notas, respetando el formato.

Los colores se cambian en `styles.css` (bloque `:root`) y, para las líneas del gráfico, en `app.js` (objeto `SERIES`). El diseño anterior, más sobrio, está guardado en `styles_anterior.css`.

### Cómo agregar una nueva opción al menú
Solo se edita `codigo-fuente/index.html` (no hace falta tocar `app.js`). Ejemplo para un apartado "Glosario":

1. **Crear el apartado.** Dentro de `<main>`, después de la última `</section>`, agregue:
   ```html
   <section id="glosario" class="seccion apartado" hidden>
     <div class="tarjeta">
       <h2>Glosario</h2>
       <p>Aquí va el contenido…</p>
     </div>
   </section>
   ```
   - `id="glosario"`: el nombre interno (sin espacios ni tildes).
   - `class="seccion apartado"`: lo marca como apartado del menú.
   - `hidden`: empieza oculto (el menú lo muestra cuando se elige).

2. **Agregar la opción en el menú.** Dentro de `<nav class="panel-opciones">`, copie una opción existente y cambie el `href`, el `data-apartado` y el texto:
   ```html
   <a class="opcion-menu" href="#glosario" data-apartado="glosario">
     <svg class="icono-opcion" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
     <span class="texto-opcion">Glosario</span>
   </a>
   ```
   El `href` lleva `#` + el id, y `data-apartado` lleva el id solo. Ambos deben ser **iguales** al `id` del paso 1.

3. **Actualizar el archivo final.** Haga doble clic en `codigo-fuente/armar_LeoFX.bat`. Listo: `LeoFX.html` ya tiene la nueva opción.

---

## 7. Fuentes de datos

- **Oficial:** Banco Central de Bolivia — Tipo de Cambio Oficial (TCO), www.bcb.gob.bo. Histórico desde el 27/06/2026; desde el 15/10/2026 se obtiene automáticamente vía DolarApi Bolivia (valor verificado contra bcb.gob.bo).
- **Paralelo:** histórico con cierres reportados en prensa (dolarboliviahoy.com vía Red Uno, EJU y Correo del Sur; dolaresabolivianos.com y paralelo.bo para algunos días de septiembre); los días sin dato no se inventan. Desde el 15/10/2026 se obtiene automáticamente vía DolarApi Bolivia, que reporta el precio de referencia del mercado P2P en bolivianos (ese día coincidía con dolarboliviahoy.com).
- **Servicio de actualización:** DolarApi Bolivia — https://bo.dolarapi.com (público y gratuito; si dejara de funcionar, la herramienta sigue operando con los datos guardados y el registro manual).
