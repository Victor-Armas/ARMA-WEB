# Catálogo público de ARMA

- `/coleccion`: portada con tipografía Barlow Condensed alojada localmente, carrusel manual con gestos, selector de modelos y entradas coordinadas con Motion. Se respeta `prefers-reduced-motion`, conservando navegación y gestos funcionales.
- `/coleccion/catalogo`: catálogo fijo, búsqueda, filtros de talla y color, 12 modelos por página. Filtros y página en la URL.
- `/coleccion/producto/:id`: fotografías ampliables, descripción, variantes y precio oficial por variante. Se puede compartir este enlace directamente.

No hay carrito, pagos, registro de clientes ni operaciones de venta en estas rutas. No se necesita sesión. Las rutas internas mantienen autenticación y permisos. El catálogo emplea un cliente Supabase independiente sin sesión del personal y se carga en un módulo separado de la administración.

## Publicación y contenido

Comparte `https://TU-DOMINIO/coleccion` después de desplegar la aplicación en su alojamiento habitual. No se publica ni despliega automáticamente al editar el código. Los modelos provienen de Gestión de productos: solo aparecen productos activos con al menos una variante activa; los ocultos no son consultables en el detalle público. Las imágenes archivadas tampoco se publican.

Se muestran los precios oficiales por variante; nunca el costo del proveedor, costo de fabricación, precio privado del vendedor, cantidades de inventario ni información de clientes/personal. Las tallas/colores indican variantes del modelo, no una promesa de existencia. El catálogo solicita confirmar disponibilidad con quien compartió el enlace.

## Acceso de invitados

Migración `public_customer_catalog`: RPC pública invocadora `customer_catalog_page` y proyección definidora de solo lectura en `arma_private`, con columnas explícitas y límite fijo de 12 productos. La función no modifica datos y limita búsqueda/paginación. No se conceden permisos de lectura anónimos sobre tablas operativas ni se cambian sus políticas.

El bucket `inventory-images` continúa privado. La política `customer_catalog_images_read` permite a `anon` firmar solo fotos no archivadas vinculadas a productos activos con variantes activas; no materia prima ni archivos huérfanos. Los enlaces firmados duran una hora y se reutilizan en memoria durante 50 minutos. Ocultar un producto bloquea consultas y firmas nuevas, pero un enlace ya firmado puede funcionar hasta su vencimiento. No se muestran fotos internas del taller.

Los datos se consideran frescos durante un minuto; después se reconsultan al volver a la pestaña o al montar la consulta, y se actualizan automáticamente cada 30 minutos mientras la página está abierta. Las tarjetas usan miniatura si existe; el detalle solicita la versión de alta resolución (WebP optimizada en las fotos actuales). Las fotos de cada página se precargan y decodifican antes de mostrarla; el visor se carga al abrirlo; únicamente la foto principal de portada recibe prioridad alta. No se incorpora analítica ni cookies de terceros. Motion y la tipografía Barlow Condensed se sirven desde la propia web.

## Identidad y comprobaciones

La colección pública usa una dirección de campaña streetwear: azul eléctrico `#2447f5`, lima `#d7fc51`, coral `#ff754a`, negro `#141414` y fondo claro `#f6f6f1`. Se conservan los bordes de 4 px, logo y Barlow Condensed. Estos colores se aplican solo a la colección pública; el área interna conserva su paleta crema/verde y Georgia. El catálogo completo mantiene una consulta estática, con cabecera y pie de marca compartidos. Los textos sobre fondos de color heredan un contraste blanco/negro apropiado, incluidos los precios tachados de promociones.

La portada presenta cuatro modelos elegidos y ordenados desde Colección pública; se puede seleccionar una fotografía específica sin cambiar la portada del producto en el catálogo. La colección completa se consulta en su propia ruta.

La migración quedó aplicada y verificada en ARMA. `supabase/tests/public_customer_catalog.sql` comprueba como invitado la proyección pública, el límite de página, búsqueda literal y denegación de acceso directo a productos, ventas y personal. No crea datos ni avanza folios. Se probaron las tres rutas como invitado con los productos reales en computadora, tablet y teléfono, además de 13 modelos simulados en el navegador para paginación. La revisión de Supabase no añadió avisos nuevos; permanece el aviso previo de [protección contra contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), independiente del catálogo.

## Vista previa del enlace

La compilación genera `dist/catalogo-publico.html` con título, descripción y etiquetas Open Graph propios del catálogo; las rutas `/coleccion` usan ese documento mediante las reglas de Vercel. Las rutas privadas mantienen el documento original. La imagen social es únicamente el logo de marca, nunca una imagen privada del inventario. Para URL e imagen absoluta se usa `VITE_PUBLIC_SITE_URL`, o el dominio de producción que Vercel proporciona en `VERCEL_PROJECT_PRODUCTION_URL` (y, como alternativa, `VERCEL_URL`). En otro alojamiento configura `VITE_PUBLIC_SITE_URL=https://tu-dominio` en sus variables de compilación y dirige `/coleccion` y sus subrutas a `catalogo-publico.html`. La vista previa concreta depende de la caché y comportamiento de la aplicación donde se comparta el enlace. No se cambia la configuración existente de no indexación por buscadores.

## Precarga y fotografías optimizadas

La pantalla de carga usa el logo ARMA con animación CSS suave y progreso real de imágenes. El contenido aparece después de decodificar las fotos de la página, no solo después de recibir los datos. En volver a páginas ya preparadas se reutilizan imágenes decodificadas. Si una foto falla o supera 10 segundos, se muestra una alternativa y un botón de reintento; no se bloquea la página indefinidamente. Las consultas públicas tienen límite de 15 segundos y reintento manual. Durante búsqueda se mantienen resultados anteriores para permitir seguir escribiendo.

El 15 de octubre de 2026 se optimizaron las 13 fotos activas: originales de 31,455,519 bytes; versiones WebP para detalle de 1,859,582 bytes y miniaturas de 792,334 bytes. Las cuatro portadas pasan de aproximadamente 8.88 MB a 143,250 bytes. El almacenamiento conserva los PNG originales y el respaldo local de correspondencias está en `backups/catalog-image-originals-2026-10-15.json`, excluido de Git. Las miniaturas públicas usan el prefijo ya definido `products/thumbnails/`. Se corrigió una validación existente que rechazaba extensiones WebP válidas.

Las próximas fotos subidas desde Gestión de productos o Materia prima se convierten en el navegador a WebP de hasta 1600×2000 px, manteniendo proporción, orientación y transparencia. Se conserva el archivo seleccionado si la conversión no ofrece reducción y no hace falta redimensionar. Nunca se modifica el archivo original del computador. No se necesita instalar otra librería en el navegador para este proceso.


## Administración de la colección

En el menú interno, **Colección pública** (`/collection-management`) tiene dos pestañas: Portada y Ofertas. Solo cuentas con rol propietario (`owner`) o administrador (`admin`) y permiso `collection.manage` pueden acceder o guardar. Asignar ese permiso a un vendedor o rol personalizado no permite administrar la colección. La comprobación también se realiza en las funciones de base de datos. Equipo permite retirar este permiso a un administrador.

Portada permite activar/desactivar toda la publicación, editar tres líneas del título, bienvenida y título de ofertas, seleccionar exactamente cuatro modelos activos distintos y su foto, y reordenarlos con flechas. Los cambios se publican al guardar. Las fotos se previsualizan con acceso del personal, incluso con el catálogo temporalmente despublicado. La configuración se guarda con control de versión para evitar sobrescribir cambios de otra persona.

Ofertas permite una promoción por modelo, con etiqueta, precio, fechas opcionales y casilla para habilitar/pausar. El precio debe ser menor que todas las variantes activas del producto, con una sola moneda, positivo y con hasta dos decimales. Las fechas usan America/Monterrey e incluyen todo el día final. Los precios regulares se conservan en la base de datos y se muestran tachados en colección, catálogo y detalle cuando aplica la promoción. Una oferta futura, vencida, pausada o de modelo oculto no se muestra. Si posteriormente baja el precio base por debajo del precio promocional, la promoción deja de aplicarse. La colección muestra hasta doce ofertas vigentes; el catálogo y los detalles aplican todas las promociones válidas.

Las ofertas son precios mostrados en el escaparate público: no reescriben ventas registradas, precios privados de vendedores ni sus acuerdos. Al registrar una venta se debe confirmar el precio acordado en el formulario existente. No hay cobro automático en el catálogo.

La portada reconsulta cada minuto y al volver a la pestaña cuando hay datos vencidos. Guardar desde el editor invalida las consultas públicas del mismo navegador. Otras pestañas/visitantes actualizan al reconsultar; no se promete propagación instantánea. El catálogo mantiene su caché de un minuto y actualización periódica de treinta minutos. Despublicar bloquea consultas y firmas nuevas; enlaces de fotos ya firmados pueden seguir funcionando hasta su vencimiento de una hora.

Migraciones: `managed_public_collection`, `collection_preview_access`. La tabla privada de auditoría registra las modificaciones y no concede acceso directo al cliente. Pruebas transaccionales: `supabase/tests/managed_public_collection.sql`, ejecutadas con rollback para verificar permisos, protección frente a cambios simultáneos, promociones, fechas, publicación y conservación del precio base. No crean ventas ni consumen folios.


## Campaña visual pública

La portada presenta fotografías en capas, selector de cuatro modelos y desplazamiento táctil. El póster acompaña ligeramente el scroll con Motion, sin interceptarlo. Una sola franja de modelos enlazables se desplaza con CSS y ofrece un botón de pausa/reanudación; al enfocar enlaces también se pausa. Con movimiento reducido se presenta fija y sin parallax. Los cuatro bloques de modelos usan colores de campaña y entradas por transformación, conservando precios, fotografías y orden elegidos en administración.

No se añadieron dependencias para el rediseño: se reutiliza Motion. Las fotografías siguen siendo las WebP optimizadas, con precarga real y pantalla de carga; no se descargan fotografías comerciales de otras marcas. La identidad de la campaña toma referencias de composición de marcas de streetwear, sin copiar sus imágenes ni sus textos.

Por solicitud del propietario, el pie público ya no muestra enlaces a avisos legales y presenta el texto «Catálogo totalmente informativo. Sin compras ni pagos en línea», junto con la indicación de confirmar precio y disponibilidad. Las rutas legales y sus documentos siguen existiendo y el área interna conserva sus enlaces. Este cambio de presentación no constituye una evaluación legal sobre obligaciones de privacidad.
