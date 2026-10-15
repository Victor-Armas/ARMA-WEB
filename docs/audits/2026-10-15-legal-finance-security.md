# Revisión de ARMA Web · 15 de octubre de 2026

## Alcance y resultado

Revisión del código de ARMA Web y de la base de datos del proyecto ARMA `hlrshryjgdjkdczzwfqe`. Cambios locales y dos migraciones aplicadas a ese proyecto. No se modificó GitHub ni ARMA Mobile. No se publicó un despliegue nuevo.

Es una revisión técnica y documental con pruebas concretas; no constituye dictamen jurídico, certificación contable, auditoría fiscal, prueba de penetración exhaustiva ni garantía de invulnerabilidad. No se certifica la web «al 100%». El dominio desplegado, su infraestructura y los procesos reales requieren verificaciones adicionales.

## Documentos y datos autorizados

El responsable es Víctor Jesús Garzón Armas, persona física que opera con el nombre comercial ARMA. Domicilio y correo proporcionados y autorizados en esta conversación, centralizados en `src/features/legal/legal-content.ts`. No se afirma que exista una sociedad constituida ni que ARMA esté inscrita ante el SAT.

Disponibles sin iniciar sesión, incluso con una cuenta bloqueada o pendiente de cambio de contraseña:

- `/legal/privacidad`: responsable, datos, finalidades, proveedores, conservación, derechos y contacto.
- `/legal/terminos`: uso del sistema privado y responsabilidades operativas del personal.
- `/legal/almacenamiento`: sesión, nombre y enlaces temporales en almacenamiento del navegador.
- `/legal/operaciones`: información sobre ventas, apartados, cancelaciones, devoluciones y entregas a vendedores.

Enlaces desde acceso, bloqueo de cuenta y pie del sistema. Los formularios de operaciones y equipo recuerdan informar al titular antes de registrar sus datos. Esto no registra ni inventa una aceptación contractual: entregar el aviso y documentar los acuerdos reales sigue siendo una obligación operativa.

No se detectaron rastreadores publicitarios ni analítica opcional en el código. No se añadió un banner de consentimiento ficticio. Si se incorporan posteriormente, deben revisarse el aviso y los controles antes de activarlos. No se inspeccionaron cookies añadidas por un dominio de producción o por extensiones del navegador.

## Correcciones financieras

**Problema:** el margen calculado a partir del precio final de reventa podía confundirse con el margen propio de ARMA. Además, la compra de mercancía de un vendedor y sus liquidaciones no aparecían como un bloque financiero propio en Inicio.

**Cambio:** el resumen «Lo que corresponde a ARMA», accesible con `business.read` y `commerce.read_all`, distingue:

- Venta directa del taller: precio final registrado.
- Consignación: importe pactado para ARMA por las piezas vendidas, descontadas las devueltas.
- Compra pagada o a crédito: importe pactado al entregar mercancía. No se suma otra vez al revenderse al cliente.
- Pagos al taller y liquidaciones de vendedores: cobros propios de ARMA por fecha y medio de pago.
- Cobros efectuados por el vendedor: siguen siendo actividad comercial del vendedor; no se consideran dinero recibido por ARMA hasta la liquidación.
- Devolución de un cliente al revendedor comprador: no cancela su obligación de compra a ARMA. El regreso de mercancía al taller se contabiliza separadamente.

Se guarda `seller_deliveries.unit_cost_at_delivery` al entregar. El histórico solo se recupera del movimiento original de inventario cuando existe; nunca se sustituye por el promedio actual. El costo desconocido permanece desconocido. El margen excluye operaciones cuyo costo no puede determinarse y se identifica como parcial. En devoluciones de ventas, el costo se revierte solo si la pieza regresa al stock vendible; una prenda que no regresa conserva el costo incurrido.

El panel anterior queda rotulado como actividad comercial de taller y vendedores. Sus cobros de clientes y margen de ventas al cliente no deben sumarse al panel propio de ARMA: son perspectivas distintas de operaciones relacionadas.

Los pagos iniciales de un apartado se etiquetan «Pago inicial», evitando presentarlos automáticamente como anticipos fiscales. Completar una venta no vuelve a cobrar ni a sumar los abonos ya recibidos. Los importes son MXN, con validación de decimales y cantidades en el servidor.

La estimación DTF usa costo por área más merma adicional configurable; es una referencia y no un optimizador de acomodo. El precio sugerido usa costo / (1 − margen objetivo), no costo × (1 + margen). Los costos de receta y los costos históricos de movimientos tienen fines distintos. Compras de material registradas no equivalen a salidas de caja conciliadas.

**Pendientes fiscales y contables:** alta o actualización ante SAT; régimen; IVA incluido/desglosado y acreditable; facturas; conciliación de efectivo, banco y tarjetas; comisiones bancarias, cuentas por pagar, gastos generales y retiros del propietario. No se inventaron tasas o reglas fiscales. El reporte no calcula utilidad neta fiscal ni saldo bancario real. La clasificación mercantil/fiscal de las entregas a vendedores requiere validar sus acuerdos reales con un contador.

## Seguridad corregida y comprobada

- La consulta directa de `inventory_balances` ya no permite ver existencias de otro vendedor mediante el permiso general de productos. La consulta se limita al custodio, al taller autorizado o a gestión de vendedores.
- La lectura directa de órdenes e insumos de producción exige `production.read`; no se deriva accidentalmente de `materials.read`.
- Se retiraron privilegios anónimos innecesarios y escrituras sobre `commerce_items_display`. La vista conserva `security_invoker=true`.
- Todas las tablas de los esquemas `public` y `arma_private` tienen RLS activado, incluida la bitácora de cambios de rol. Las bitácoras privadas sin políticas abiertas se mantienen deliberadamente sin acceso directo del cliente.
- El bucket de inventario sigue privado y limita nuevas cargas a PNG, JPEG y WebP, con máximo de 5 MB. El filtrado MIME es una capa, no un análisis antivirus ni una garantía sobre el contenido binario. Los enlaces firmados son temporales y pueden compartirse hasta caducar: el personal debe tratarlos como enlaces privados.
- Credenciales de servicio solo en la función de servidor. No se encontró una clave con formato `sb_secret_…` en el JavaScript de producción. La clave publishable del navegador no es un secreto ni reemplaza RLS.
- Se revisaron 101 funciones de aplicación: no se encontró SQL dinámico construido con datos recibidos del usuario. Las operaciones usan argumentos tipados/JSON, validaciones y permisos del servidor. Las funciones administrativas públicas con privilegios elevados están restringidas a `service_role`.
- Perfiles: solo nombre, teléfono y avatar tienen permiso directo de actualización; no `is_active` ni roles. Las decisiones de autorización no dependen de `user_metadata`.
- Se preservan bloqueos de inventario y claves de idempotencia para operaciones sensibles.
- Vercel preparado con CSP sin `unsafe-eval` ni scripts inline, protección contra iframe, `nosniff`, política de referencias y restricciones de capacidades innecesarias. Zod se configura antes de cargar schemas con `jitless: true` para funcionar con esa CSP. Estilos inline se permiten porque la interfaz y sus bibliotecas los utilizan.
- Se añaden rutas profundas de SPA y exclusión de indexación. `robots.txt` y `noindex` no son mecanismos de control de acceso.
- Se corrigió la visualización falsa de acceso correcto cuando la autenticación devolvía un error.
- Optimizadas las políticas de perfiles/órdenes para no recalcular la identidad en cada fila. Añadidos índices de claves foráneas indicados por el asesor.

## Evidencia de pruebas

1. Siete archivos SQL ejecutados con fixtures aislados y rollback: `business_operations.sql`, `catalog_photos_costing_production_board.sql`, `seller_consignment.sql`, `seller_personal_prices.sql`, `dynamic_team_roles.sql`, `seller_delivery_payment_terms.sql` y `legal_finance_security.sql`.
2. Regresión financiera: compras pagada y a crédito de 3 × $200, costo $100/pieza, consignación, reventa, devolución de cliente, regreso al taller y reintegro. Diferencia esperada y obtenida: ingreso atribuible ARMA $1,000; costo $500; margen conocido $500; cobros netos ARMA $700. Los importes se comparan con un saldo previo y no dependen de datos reales.
3. Carrera real con dos llamadas de base de datos en paralelo y una sola pieza: una venta y un apartado. Resultado: una operación registrada, la otra rechazada por falta de existencias; disponible 0, sin inventario negativo. Se mantuvo abierta la transacción ganadora brevemente para probar contención.
4. Reenvío simultáneo con el mismo identificador: una orden y un cobro, disponible 0. Ambas llamadas terminaron sin duplicar el movimiento.
5. Texto con apariencia de SQL (`'; DROP TABLE products; --`) guardado como nombre de cliente en el fixture: la tabla y el producto permanecieron íntegros. Esta prueba acompaña la revisión del código; no demuestra ausencia absoluta de inyección en cualquier superficie futura.
6. Fixtures de la carrera eliminados explícitamente; comprobado: 0 cuentas `@example.invalid` y 0 productos de concurrencia restantes. Las secuencias de folios pueden avanzar durante las pruebas aunque se haga rollback; los huecos no representan ventas faltantes.
7. Navegador Chrome, escritorio 1440 × 1000 y móvil 390 × 844: cuatro páginas legales, acceso con sesión bloqueada, enlaces desde login y panel propio de finanzas; sin desbordamientos ni errores de ejecución.
8. Compilación real servida localmente con las cabeceras preparadas para Vercel: las páginas y validación funcionan, las credenciales incorrectas muestran error sin mensaje de acceso exitoso, y un script de origen externo es rechazado. No equivale a verificar que el despliegue remoto esté usando esas cabeceras.
9. `npm audit --json`: 0 vulnerabilidades conocidas al momento de la revisión. `npm run lint`, `npm run typecheck` y `npm run build` pasan. Persiste advertencia de tamaño del bloque principal (~977 kB sin comprimir); no se ocultó.

## Pendientes externos antes de afirmar preparación de producción

**Supabase Auth:** el asesor todavía reporta protección contra contraseñas filtradas desactivada. Es una función de Pro o superior; no se cambió la suscripción. Activarla si el plan lo permite. Revisar además registro público desactivado, límites de intentos, configuración de correo y MFA de las cuentas que administran Supabase/Vercel. Esas configuraciones no se verificaron en el panel de la plataforma mediante esta revisión.

**Copias y recuperación:** definir backups de base de datos y archivos, retención y responsables; realizar una restauración de prueba. Una migración guardada no es una copia de los datos ni del Storage.

**Publicación:** desplegar la versión revisada por el flujo autorizado y comprobar HTTPS, rutas profundas, CSP, imágenes, operaciones y cookies reales en el dominio final. No se ha desplegado ni enviado nada a GitHub.

**Legal y operación:** revisión final por abogado en México de avisos, contratos con vendedores y condiciones comerciales; definir y comunicar plazos y reglas comerciales de cancelación/entrega sin anular derechos legales. Validar contratos y tratamiento internacional con proveedores. Confirmar derechos de uso de diseños y fotografías, sin presumir que su carga en el sistema acredita su titularidad.

**Atención de privacidad:** revisar el correo de atención, llevar registro de solicitudes, verificar identidad de forma proporcional, localizar datos, responder y ejecutar lo procedente, documentando cualquier conservación obligatoria. No borrar automáticamente historial financiero o respaldos sin valorar sus obligaciones y restricciones. El aviso publicado no sustituye estos procesos.

## Fuentes primarias consultadas

- [LFPDPPP vigente](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf).
- [Ley Federal de Protección al Consumidor](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPC.pdf).
- [Ley del IVA](https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf); no se determina aquí el tratamiento fiscal concreto de ARMA.
- [SAT: trámites del RFC para personas físicas](https://wwwmat.sat.gob.mx/personas/empresarios-y-profesionales/tramites-del-rfc).
- [SAT: distinción de anticipo y pago parcial](https://www.sat.gob.mx/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1461175754221&ssbinary=true).
- [Supabase: contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- [Supabase: tablas privadas con RLS y sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy); las cuatro notas informativas corresponden a bitácoras/seguridad privadas que no necesitan políticas de acceso del cliente.
- [Supabase: índices aún sin uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index); observación informativa esperable en tablas pequeñas y recién indexadas, no motivo suficiente para eliminar los índices.
- [Vercel: SPA Vite](https://vercel.com/docs/frameworks/frontend/vite).
- [Zod: compilación y CSP](https://zod.dev/compile).
