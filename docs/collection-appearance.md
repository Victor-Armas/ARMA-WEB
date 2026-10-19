# Apariencia y temporadas de la colección

En **Colección pública → Apariencia** un propietario o administrador puede elegir ARMA original, Día de Muertos o Navidad; personalizar cinco colores; elegir adornos prediseñados o una imagen propia y establecer fechas opcionales. El fondo general se mantiene claro y el encabezado/pie oscuros para preservar la legibilidad de las partes existentes. En las superficies de color se calcula el texto de mayor contraste.

## Borrador y publicación

Los controles y la vista previa usan estado local. No se sube ningún archivo ni se cambia la base de datos hasta pulsar **Revisar antes de publicar → Publicar apariencia**. Cerrar la revisión conserva el borrador. Recargar o salir de la pestaña lo descarta. Un error al publicar conserva el formulario y se muestra de forma persistente dentro del diálogo de revisión, con opción de reintentar o seguir editando; una revisión de base de datos impide sobrescribir cambios ajenos.

La vista previa reutiliza la página y sus componentes dentro de un iframe local sin scripts propios, con estilos y tamaño de viewport reales. Los enlaces no navegan fuera del borrador. Una consulta privada, disponible solo para los mismos gestores autorizados, permite verla cuando la colección pública está oculta. No se publica temporalmente la colección ni se cambian sus productos.

## Imágenes

El editor separa tres usos. Ninguna carga se envía a Supabase hasta publicar:

| Uso | Recomendación | Entrada permitida | Preparación |
| --- | --- | --- | --- |
| Fondo de portada | Fotografía 1920 × 1080 px o patrón 512 × 512 px | Ancho y alto 256–4096 px | Hasta 1920 px; conserva el encuadre y la transparencia |
| Logo de temporada | 800 × 240 px, transparente, versión visible sobre fondo oscuro | Ancho 128–4096 px, alto 32–2048 px | Recorta márgenes transparentes; hasta 800 px |
| Adorno o franja | Composición 1200 × 500 px o franja repetible 1600 × 200 px | Ancho 256–4096 px, alto 48–2048 px | Recorta márgenes transparentes; hasta 2048 px |

Para los tres usos: **PNG/JPG/WebP hasta 2 MB y 12 megapíxeles**. Se valida la firma y se decodifica el archivo. Se prepara una imagen estática WebP de hasta **512 KB**, preservando la transparencia. No se aceptan SVG, GIF, HTML ni videos. El recorte usa el canal alfa; no elimina fondos negros o de otro color pintados dentro del archivo ni modifica los archivos originales. Los originales se mantienen en el equipo del usuario.

- **Fondo**: se aplica únicamente a la portada, sobre el color principal. Puede cubrirla con recorte de bordes o repetirse como patrón. El tamaño del patrón es configurable (120–800 px). La visibilidad solicitada es 0–60%; se limita automáticamente cuando es necesario para preservar contraste sobre posibles píxeles claros y oscuros de la imagen. Si el acento no conserva contraste, utiliza el color legible del título. El resto del catálogo conserva sus superficies habituales.
- **Logo**: se muestra con sus colores originales en encabezado y pie, sin invertir la imagen personalizada. Al retirarlo o si falla su carga, se usa el logo habitual de ARMA. El editor indica elegir una versión legible sobre el encabezado oscuro.
- **Adorno**: una composición se muestra una sola vez. El modo franja usa `repeat-x` hasta cubrir el ancho disponible, con altura configurable de 40–240 px. Puede aparecer bajo el encabezado, antes del pie o en ambos lugares. El archivo debe ser preparado para que sus bordes continúen si se busca una unión sin cortes; el sistema no convierte cualquier dibujo en un patrón continuo. No hay un número fijo de copias.
- Los iconos prediseñados permanecen como alternativa cuando no se selecciona una imagen propia. El tamaño discreto/festivo se aplica a esos iconos; las imágenes usan la altura de franja.
- Modelos principales: se mantienen las fotos existentes en Gestión de productos. Recomendación **1200 × 1500 px (4:5)**, prenda centrada con margen; ese formulario acepta PNG, JPG y WebP hasta 5 MB.

Las dimensiones y el canal alfa se comprueban en el navegador. El servidor impone permisos, rutas, MIME WebP, máximo 512 KB y existencia del objeto antes de permitir cualquiera de las tres referencias. No inspecciona dimensiones o bytes de la imagen en la base de datos.

Los tres tipos de imagen usan el bucket privado **collection-artwork** y rutas únicas (`usuario/uuid.webp`), sin reemplazar archivos. Solo se firman públicamente las imágenes de la configuración publicada y vigente. Las imágenes del borrador son accesibles únicamente para gestores autorizados. Al fallar el guardado se intenta retirar todas las subidas no referenciadas; una política impide borrar cualquiera de las tres imágenes referenciadas en la configuración guardada. Las imágenes antiguas no se eliminan automáticamente. Las URL firmadas pueden seguir válidas hasta una hora.

## Compatibilidad

Los clientes nuevos usan los RPC `get_collection_appearance_v2`, `collection_appearance_public_v2` y `save_collection_appearance_v2`. Las proyecciones anteriores conservan su contrato de siete campos; un guardado de un cliente anterior preserva los nuevos ajustes de imágenes. Los campos nuevos se añadieron sin borrar colores, fechas ni imágenes existentes. Los originales de los productos tampoco se modifican.

## Fechas y actualización

Fechas inclusivas en `America/Monterrey`. Sin inicio: inmediato; sin fin: indefinido. Fuera de vigencia se muestra ARMA original, sin adornos propios. El servidor decide la vigencia. Las pestañas abiertas consultan la apariencia cada 30 segundos y al recuperar el foco; no hace falta tarea programada.

## Alcance y permisos

Solo afecta la colección, el catálogo y su detalle públicos; no modifica el diseño del panel, precios, ventas ni existencias. Se conserva `collection.manage` y además se verifica que la cuenta sea propietario/administrador, con sesión válida. Los vendedores no pueden publicar aunque se les otorgue accidentalmente ese permiso. No se admiten CSS, HTML o URL arbitrarios en la configuración.

No se añadieron dependencias ni se relajó la política CSP o la protección contra iframes externos. Para una temporada con dibujos completamente nuevos se puede cargar otro adorno; nuevas composiciones estructurales siguen siendo cambios de código.

## Verificación

`supabase/tests/collection_appearance.sql` y `supabase/tests/collection_background_logo_borders.sql` comprueban publicación, fechas, concurrencia, datos inválidos y denegación a invitados/vendedores, con `ROLLBACK`. La revisión del navegador utiliza datos simulados para no publicar temas ni archivos de prueba en producción.
