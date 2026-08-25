# Diseño de dapan.es

Este documento describe el sistema visual y de interacción actualmente implementado en dapan.es. Su propósito es servir como referencia para mantener y extender el sitio sin perder su identidad.

## Concepto

dapan.es se presenta como una boleta o recibo impreso: una superficie estrecha de papel, tipografía monoespaciada, bordes construidos con caracteres y una paleta casi monocromática. La interfaz evita la apariencia de un portafolio convencional y privilegia una experiencia personal, directa y ligeramente imperfecta.

Los elementos que sostienen esta identidad son:

- Papel texturizado sobre un fondo oscuro, con una sombra que separa físicamente la página del entorno.
- JetBrains Mono como única familia tipográfica.
- Títulos hechos con arte ASCII en vez de logotipos o encabezados gráficos tradicionales.
- Reglas, marcos y separadores generados con caracteres `-` y `|`.
- Imágenes en escala de grises.
- Una animación inicial que revela el contenido como si estuviera saliendo de una impresora.
- Lenguaje informal y autobiográfico en español e inglés.

La estética debe sentirse deliberadamente austera, no incompleta. Cada incorporación debe favorecer texto, ritmo vertical, caracteres tipográficos y contraste antes que contenedores, iconos o efectos decorativos convencionales.

## Fundamentos visuales

### Paleta

La paleta se define mediante variables CSS y cambia según `data-theme` en el elemento `<html>`.

| Token | Tema claro | Tema oscuro | Uso |
| --- | --- | --- | --- |
| `--paper` | `#fffdf8` | `#171612` | Fondo principal de la página |
| `--ink` | `#181714` | `#eee9df` | Texto y controles |
| `--muted` | `#57534b` | `#b8b1a5` | Metadatos y texto secundario |
| `--rule` | `rgba(24, 23, 20, 0.72)` | `rgba(238, 233, 223, 0.72)` | Bordes y reglas ASCII |

El fondo exterior del documento permanece en `#1c1c1c` en ambos temas. En escritorio, la hoja usa una sombra `0 0 48px rgba(0, 0, 0, 0.28)`.

La textura de papel se genera con `@paper-design/shaders`. En claro mezcla `#ebe4d7` con `#fffdf8`; en oscuro mezcla `#25231f` con `#171612`. La textura es ambiental: nunca debe reducir la legibilidad ni competir con el contenido.

### Tipografía

- Familia: JetBrains Mono.
- Pesos cargados: 400 y 700.
- Tamaño base de escritorio: `16px`.
- Tamaño base bajo `700px`: `14px`.
- Interlineado general: `1.32`.
- Cuerpo y títulos ASCII usan la misma familia para conservar la cuadrícula de caracteres.
- Los encabezados convencionales de artículos pueden aumentar de tamaño, pero conservan un interlineado compacto.
- Negrita se reserva principalmente para estados activos, títulos de tickets, llamadas a la acción y navegación de retorno.

Los títulos ASCII no deben reconstruirse con una fuente proporcional. Cada bloque `<pre>` conserva espacios y saltos de línea y lleva una etiqueta accesible equivalente en texto normal.

### Superficie y ancho

La aplicación se compone de tres niveles:

1. Fondo exterior oscuro que llena el viewport.
2. Hoja `.page-shell`, centrada, con ancho máximo de `720px` y alto mínimo de `100vh`.
3. Contenido `.page-content`, con `34px 24px 70px` de padding en escritorio y `20px 16px 54px` en móvil.

La columna principal de la portada y el pie tienen un ancho máximo de `520px`. El contenido de artículos puede ocupar los `720px` completos de la hoja. Esta diferencia permite que la portada recuerde a un recibo angosto y que la lectura larga tenga más aire.

### Ritmo y separadores

El espaciado vertical es amplio en relación con el tamaño de texto. Las secciones principales se separan con líneas de guiones generadas según el ancho disponible, no con bordes CSS sólidos.

- Separador de sección: margen vertical de `30px` y altura de `1.32em`.
- Inicio de testimonios: `40px`.
- Inicio de artículos: `48px` en escritorio y `42px` en móvil.
- Inicio de redes sociales: `34px`.
- Pie de recibo: margen superior de `52px`.

Los nuevos espacios deben alinearse con múltiplos aproximados del interlineado base y conservar una lectura vertical pausada.

## Estructura compartida

### Navegación superior

`SiteChrome` muestra dos controles compactos y centrados:

```text
[ ES | EN ] [ OSCURO | CLARO ]
```

- El idioma actual se indica con `aria-current="page"` y peso 700.
- El tema activo se indica con `aria-pressed="true"` y peso 700.
- Los corchetes y barras son parte de la identidad tipográfica y no deben sustituirse por cajas o iconos.
- Los enlaces y botones se subrayan al pasar el cursor, con un desplazamiento de `0.2em`.
- En móvil, la navegación usa `0.92rem` y reduce el espacio entre elementos para mantenerse en una línea.

### Tema

El tema inicial se resuelve antes de pintar la página para evitar un destello incorrecto:

1. Se usa el valor `light` o `dark` almacenado en `localStorage.theme`.
2. Si no existe, se respeta `prefers-color-scheme`.
3. Al elegir un tema, se actualizan `data-theme`, `localStorage`, los estados `aria-pressed` y los colores del shader.

### Bordes ASCII adaptables

Los separadores y tickets calculan el ancho real de un carácter monoespaciado y generan la cantidad exacta de caracteres que cabe en su contenedor. Un `ResizeObserver` vuelve a dibujarlos cuando cambia el tamaño.

Los tickets usan:

- Una línea superior e inferior con forma `|-----|`.
- Rieles verticales absolutos construidos con `|` repetidos por cada fila de contenido.
- Padding horizontal de `2ch`.
- Ajuste de palabras con `overflow-wrap: anywhere` para títulos o URLs largos.

Esta geometría depende de la fuente monoespaciada y de mediciones reales. No debe reemplazarse por caracteres con una cantidad fija ni permitirse que el marco exceda el ancho disponible.

### Pie

El pie no contiene información adicional. Es una regla ASCII del mismo ancho máximo que la portada y funciona como borde final de la boleta.

## Vistas

### Portada

La portada sigue este orden:

1. Logotipo `dapan.es` en arte ASCII.
2. Biografía breve.
3. Dos testimonios visuales y su explicación.
4. Separador ASCII.
5. Encabezado ASCII de artículos, introducción y lista de tickets.
6. Separador ASCII.
7. Encabezado ASCII de redes sociales, texto introductorio y enlaces.

#### Testimonios

En escritorio, las dos imágenes forman una grilla de proporciones `314fr 295fr`, con `14px` de separación y un ancho total máximo de `624px`. La grilla se centra respecto a la hoja aunque sea más ancha que la columna de texto. Las imágenes tienen `205px` de alto, usan `object-fit: cover`, filtro de escala de grises y un borde oscuro muy tenue.

En móvil pasan a una sola columna de hasta `380px`, con `12px` de separación y altura automática. Siempre deben conservar texto alternativo localizado.

#### Lista de artículos

Cada artículo se representa como un ticket ASCII con:

- Título en peso 700.
- Extracto inmediatamente debajo.
- Enlace `Leer más >>` o `Read more >>`, separado por una línea de texto y en peso 700.

Los artículos se ordenan del más reciente al más antiguo. No se añaden tarjetas con fondos, radios, sombras independientes o miniaturas: el marco tipográfico es el único contenedor.

#### Redes sociales

Los enlaces aparecen como una lista simple precedida por `- `. Se abren en una pestaña nueva y conservan la apariencia de texto hasta recibir hover o foco.

### Artículos

La página de artículo prioriza legibilidad dentro de la misma hoja:

- La columna comienza a `54px` de la navegación en escritorio y `42px` en móvil.
- El enlace de retorno se muestra antes del encabezado, en peso 700 y con margen inferior de `44px`.
- El encabezado tiene padding lateral de `13px` y `20px` inferior.
- El título usa `clamp(1.4rem, 4vw, 2rem)`, interlineado `1.18` y margen inferior de `12px`.
- El extracto aparece como introducción y la fecha usa el color `--muted` y formato localizado.
- Una línea superior discontinua separa el cuerpo, que comienza con `28px` de padding.

En el cuerpo:

- Párrafos, listas y citas tienen un margen inferior de `1.35em`.
- Los encabezados aparecen con margen superior de `2.2em`.
- Los enlaces están subrayados permanentemente.
- Las citas usan una línea izquierda de `1px`, padding de `1.2em` y color secundario.
- El código inline recibe un fondo de tinta al 8 %; los bloques de código usan borde discontinuo y scroll horizontal.
- Las imágenes se centran, no exceden el ancho ni `560px` de alto y se muestran en escala de grises.

El contenido Markdown debe conservar estas reglas sin introducir estilos particulares por artículo salvo que el contenido lo requiera de forma justificada.

### Página 404

La vista 404 reutiliza la navegación, textura, separadores y pie. Contiene:

1. Un `404` en arte ASCII.
2. Un separador.
3. Mensaje localizado y enlace de regreso.

El bloque empieza aproximadamente al 15 % de la altura del viewport en escritorio y al 12 % en móvil. El idioma se deduce de la URL y actualiza dinámicamente textos, navegación y título del documento.

## Responsive

El único breakpoint explícito está en `699px`; desde `700px` se aplica la composición de escritorio.

En pantallas menores de `700px`:

- La hoja ocupa todo el ancho y pierde su sombra exterior.
- El padding horizontal baja de `24px` a `16px`.
- La tipografía base baja de `16px` a `14px`.
- Los títulos ASCII usan tamaños fluidos con `clamp()` para no desbordarse.
- Los testimonios cambian de dos columnas a una.
- Se reducen algunos márgenes superiores, pero se conserva la separación clara entre bloques.

El ancho mínimo soportado es `320px`. Todo texto largo debe envolver y ningún ticket, título ASCII, imagen o bloque de código debe ensanchar la página.

## Movimiento y textura

### Impresión inicial

Al cargar, la hoja comienza recortada y se revela verticalmente línea por línea durante unos `2600ms`. La velocidad incluye pequeñas variaciones y pausas aleatorias para evocar una impresora física. Un fallback retira el recorte después de cinco segundos para evitar contenido permanentemente oculto.

La animación es expresiva, pero nunca debe bloquear el acceso al contenido ni convertirse en una transición obligatoria entre interacciones internas.

### Movimiento reducido

Cuando `prefers-reduced-motion: reduce` está activo:

- No se ejecuta la animación de impresión.
- Se oculta el canvas de textura.
- Se elimina cualquier recorte de la hoja.
- Se desactiva el desplazamiento animado global.

Todo efecto futuro debe proporcionar un comportamiento equivalente sin movimiento.

## Accesibilidad y semántica

- Cada página define un único `<main>`.
- Las secciones de portada se conectan a sus descripciones mediante `aria-labelledby`.
- El arte ASCII visual se oculta con `aria-hidden="true"`; su encabezado conserva una etiqueta textual comprensible.
- Las reglas y rieles decorativos no se anuncian a tecnologías de asistencia.
- Los controles de tema son botones reales y exponen su estado con `aria-pressed`.
- El idioma activo usa `aria-current` y el documento declara el atributo `lang` correcto.
- Las imágenes significativas requieren alternativas localizadas; las decorativas deben marcarse como tales.
- Los enlaces externos usan `rel="noopener noreferrer"`.
- El color secundario debe reservarse para contenido no esencial y mantener contraste suficiente sobre el papel.
- Foco, teclado y lector de pantalla deben seguir funcionando aunque falle el shader o JavaScript.

## Internacionalización

El sitio tiene paridad entre español (`es`) e inglés (`en`). La navegación, biografía, textos de sección, llamadas a la acción, metadatos, fechas y alternativas de imágenes deben localizarse.

Cada artículo puede enlazar a su traducción mediante una clave compartida. Si no existe traducción, el selector de idioma dirige a la portada del otro idioma. Los títulos ASCII que representan palabras localizadas pueden tener variantes específicas, como `artículos` y `articles`.

No deben fijarse textos visibles directamente en un componente compartido cuando formen parte del contenido localizado.

## Reglas para extender el sistema

- Reutilizar `--paper`, `--ink`, `--muted` y `--rule`; no introducir colores de acento sin redefinir explícitamente la identidad visual.
- Preferir jerarquía tipográfica, guiones, barras y espacio vertical antes que cajas gráficas nuevas.
- Mantener una sola familia monoespaciada y la cuadrícula basada en caracteres.
- Conservar la hoja de `720px` y la columna principal de `520px` salvo que una necesidad de lectura justifique usar el ancho completo.
- Implementar cualquier marco ASCII con medición responsive, contenido flexible y semántica independiente de su decoración.
- Probar cada componente en ambos temas, ambos idiomas, `320px`, el breakpoint móvil y escritorio.
- Respetar `prefers-reduced-motion` y ofrecer fallbacks cuando canvas, shaders o JavaScript no estén disponibles.
- Evitar radios de borde, degradados de interfaz, iconografía ornamental, múltiples sombras y tipografías de display: contradicen el lenguaje de recibo impreso.
- Mantener el tono directo y humano. La interfaz debe sentirse escrita y construida por una persona, no como una plantilla corporativa.

## Checklist de revisión

Antes de publicar un cambio visual, comprobar:

- La página no presenta overflow horizontal desde `320px`.
- Los bordes ASCII permanecen cerrados y alineados después de redimensionar.
- El contenido es legible en claro y oscuro.
- El estado de tema persiste y coincide con `aria-pressed`.
- Español e inglés tienen contenido y rutas coherentes.
- La página funciona con movimiento reducido y sin shader.
- Títulos, secciones y controles mantienen semántica de HTML correcta.
- Las imágenes tienen alternativa, dimensiones y comportamiento responsive.
- El cambio parece parte del mismo recibo, no un componente importado de otro sistema visual.
