# Administración de ARMA

Estas migraciones son incrementales sobre el esquema de ARMA ya existente. Ya se aplicaron al proyecto ARMA; no se deben ejecutar de nuevo desde el editor SQL.

## Equipo

- Personal: crear cuentas, editar nombre/teléfono/roles, restablecer contraseñas y deshabilitar o reactivar cuentas.
- Permisos de roles: habilitar acciones por rol. Admin y propietario parten con los mismos permisos. Una cuenta con varios roles reúne sus permisos. Se conserva siempre una cuenta activa con acceso a Equipo y edición de permisos.
- Deshabilitar conserva ventas, apartados e historial.

## Contraseñas temporales

`user-admin` es una Edge Function que valida el JWT y consulta permisos actuales del servidor. Las claves administrativas solo se leen del entorno de Supabase; nunca se incluyen en la aplicación web.

Crear y restablecer generan una contraseña aleatoria, mostrada una vez y válida por 24 horas. Solo se conserva su resumen criptográfico en el esquema privado. El navegador mantiene la contraseña únicamente en el modal abierto. El usuario debe introducir la temporal, una contraseña nueva de al menos 12 caracteres y su confirmación. RLS impide consultar los datos mientras el cambio esté pendiente, aunque Auth haya emitido una sesión. Al vencer la temporal se requiere otro restablecimiento.

La actualización de contraseña de Supabase revoca la sesión temporal. Una operación breve previamente validada permite finalizar el cambio si la cuenta y su corte de sesiones siguen intactos. Después se inicia una sesión nueva con la contraseña permanente; las sesiones previas dejan de tener acceso. Las operaciones sobre credenciales se serializan para evitar que un restablecimiento y un cambio de contraseña se mezclen.

La función está desplegada con verificación de JWT habilitada. `deno.json` mantiene TypeScript estricto. Para futuros cambios, revisar la documentación vigente de Supabase y desplegar todos los archivos de `functions/user-admin`. El frontend solo usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Catálogo

Gestión de productos permite crear y editar diseños y variantes, subir fotografías privadas, ocultar y reactivar productos. Un producto oculto no se ofrece para nuevas ventas o apartados; los registros existentes se conservan. Materia prima reutiliza estos formularios para playeras sin imprimir y DTF, con medidas y descripciones por variante. Las variantes nuevas comienzan en cero; editar datos no modifica existencias. Las fotografías aceptan PNG, JPG y WebP de hasta 5 MB.

## Verificación realizada

- Pruebas transaccionales con rollback: permisos independientes, RLS, acceso por vendedor, catálogo, vencimiento, exclusión mutua de credenciales y protección del último gestor de permisos.
- Prueba real contra Auth y la Edge Function: creación, cambio obligatorio, restablecimiento, edición, deshabilitado y reactivación, usando cuentas desechables.
- Pruebas de interfaz con datos simulados en escritorio, tablet y teléfono.
- Lint, TypeScript estricto y compilación de producción.

## Apartados y calendario

La sección de Apartados integra un calendario informativo mensual o semanal, con selección de día, filtros por cliente/teléfono/producto/folio, estado y vendedor según permisos. La lista muestra las fotografías privadas de los productos y conserva las acciones dentro de Ver detalle. En teléfonos inicia con vista semanal; la vista mensual sigue disponible. No permite arrastrar ni crear apartados en las celdas.

`reservation_calendar` agrega todas las filas visibles mediante RLS para el período mostrado; sus conteos no dependen de las 12 filas por página de la lista. Los totales superiores abarcan todas las fechas de la búsqueda. Los estados de pago y entrega se mantienen separados de la proximidad de la fecha. Se muestran apartados por entregar, piezas, saldo pendiente, atrasados y sin fecha; no se inventan estados de producción. Los registros entregados o cancelados también se pueden consultar por día. La agenda se actualiza cada minuto y después de sus acciones.


## Entradas, recetas y armado

Materia prima → Entradas y costos registra recepciones por variante, cantidad, costo unitario, proveedor y referencia. Los costos se promedian ponderando existencias físicas. Si el stock anterior no tenía costo, permanece desconocido hasta registrar explícitamente su valoración, con motivo y auditoría. Una valoración no cambia cantidades ni reescribe costos históricos de ventas.

Armado de productos guarda una receta por variante S/M/L: una playera sin imprimir, uno o varios DTF, mano de obra por pieza y margen objetivo sobre venta. La selección de corte, gramaje, talla, color y diseño utiliza las variantes y descripciones del catálogo; no se deduce a partir de una foto. No se precargaron recetas ficticias.

Iniciar un armado reserva los insumos, validando disponibilidad bajo bloqueo de filas. Cada orden conserva las cantidades de su receta. Finalizar permite confirmar de cero hasta la cantidad planeada: consume lo correspondiente a lo terminado, libera lo no utilizado y suma producto final en una sola transacción. Cancelar libera todos los insumos. La confirmación supone que los insumos no consumidos siguen íntegros: no es un registro de mermas. El costo definitivo usa el promedio de materiales al finalizar más la mano de obra guardada en la orden.

## Abonos, devoluciones y dinero recibido

Ver detalle del apartado permite registrar abonos positivos hasta el saldo pendiente, cada uno con efectivo, transferencia o tarjeta. `commerce_orders.deposit` mantiene el acumulado abonado por compatibilidad. El historial privado conserva cada movimiento y su medio original. Completar venta solo registra como cobro nuevo el saldo restante. Cancelar exige confirmar la devolución de todos los abonos y registra reembolsos por los medios originales. Una liquidación con saldo cero sigue requiriendo Completar venta para cerrar el apartado.

Las ventas permiten devoluciones parciales por renglón, con cantidad, motivo, reembolso real, medio y decisión de reintegrar o no al stock vendible. El servidor bloquea devolver más piezas que las vendidas o reembolsar más que su importe. Las prendas reintegradas conservan el costo de venta conocido; si falta, el costo permanece desconocido. Las operaciones son idempotentes y se serializan por orden para evitar cobros o devoluciones duplicados.

El libro de cobros se inicializó con los registros existentes y sus fechas originales, sin duplicar anticipos al convertir apartados en ventas. Las contraseñas y credenciales no intervienen en estos registros.

## Inicio con cifras reales

`business_dashboard` consulta un período máximo de un año en la zona America/Monterrey, separando ventas registradas, ingresos recibidos, reembolsos, cobros netos y saldo actual pendiente. Efectivo, transferencia y tarjeta se calculan desde los movimientos reales de dinero. Los saldos, stock, armados pendientes y actividad reciente son actuales; se etiquetan cuando abarcan todos los períodos.

Los vendedores consultan únicamente operaciones propias, según sus permisos de ventas y apartados. `business.read` habilita costos, compras, margen bruto conocido y precios sugeridos; no habilita consultar ventas ajenas. El precio sugerido es (materiales + mano de obra) / (1 - margen/100), redondeado hacia arriba a centavos. Se compara con precio de catálogo y promedio real cobrado por pieza. No modifica el catálogo, ni incluye impuestos o gastos generales, ni se presenta como utilidad neta. El margen bruto mostrado es anterior a devoluciones y excluye piezas sin costo histórico. Las gráficas Chart.js se cargan por separado al abrir Inicio y tienen tablas/cifras accesibles.

Los costos en balances y renglones de venta tienen permisos por columna; el vendedor no puede consultarlos directamente. Las tablas de recibos, recetas, cobros y devoluciones están en arma_private con RLS y sin acceso directo del cliente. Las escrituras pasan por funciones privadas que validan sesión, permisos y alcance. Los permisos nuevos se pueden editar en Equipo → Permisos de roles. Propietario y admin parten con todos; el vendedor recibe únicamente el permiso adicional de abonos, manteniendo el alcance propio.

## Pruebas de operaciones

`supabase/tests/business_operations.sql` prueba recepciones, promedios, recetas, reservas de insumos, cierre parcial, cancelación, costos de venta, abonos mixtos, reintentos, devoluciones y aislamiento del vendedor, dentro de una transacción con rollback. No deja registros de prueba; los contadores de folio de Postgres pueden presentar saltos por las llamadas a secuencias.


## Fotografías y materia prima compacta

Materia prima usa una cuadrícula con densidad preferida de 2, 3 o 4 columnas, adaptada al ancho disponible; en teléfono muestra una columna. Las fotos se administran en un modal compacto con ampliación. Cada fotografía guarda su fondo blanco, gris o negro, sin modificar el archivo. La acción Eliminar fotografía la retira del catálogo mediante archivado de metadatos; los objetos privados permanecen conservados. Cuando se retira la portada se elige la siguiente fotografía disponible. RLS excluye las archivadas de la lectura pública y del acceso a Storage. Las acciones validan permisos de edición o creación sobre un registro propio.

## Costos de referencia y DTF

Cada variante de materia prima puede guardar un costo fijo por pieza, o, para DTF, una estimación por dimensiones. Los formatos iniciales de la interfaz son 180 MXN por 100 × 58 cm y 200 MXN por 100 × 28 cm, proporcionados por el usuario; se pueden editar antes de guardar. No se insertaron costos supuestos en variantes existentes.

Costo DTF = precio del formato / (ancho × largo del formato) × (ancho × alto del diseño) × (1 + merma adicional / 100), redondeado hacia arriba a centavos. La merma es un porcentaje adicional configurable, no un cálculo de acomodo real. Se valida que el diseño quepa, incluso rotado. El costo fijo permite estandarizar diferentes diseños bajo un mismo importe.

Las dimensiones se sincronizan con la variante del insumo: editar sus medidas actualiza la referencia por área; si el diseño no cabe en el formato configurado se rechaza el cambio. Las actualizaciones de costo se serializan por variante para evitar conflictos concurrentes.

El costo de referencia se usa para cotizar recetas. El costo promedio de inventario permanece separado y solo se cambia al recibir material o confirmar explícitamente la valoración de existencias. El formulario de costos permite confirmar dicha valoración si la cuenta tiene materials.receive. Cada cambio de referencia y cada valoración queda registrado, sin reescribir costos de órdenes ni ventas anteriores.

## Recetas y tablero de armado

Recetas tiene su propia ruta /recipes, con filtros para configuradas y pendientes. Cada receta contiene una playera sin imprimir, uno o varios DTF, mano de obra, luz, cinta/consumibles, otros gastos por playera y margen objetivo. El editor muestra fotografías y un desglose del costo de referencia. Inicio distingue Precio medio de venta (promedio cobrado) de Costo de producción y Precio sugerido.

Armado de productos, /production, ofrece únicamente recetas configuradas al iniciar una orden. El tablero por defecto muestra En proceso; Terminados y Cancelados tienen pestañas y consultas paginadas independientes. Los conteos se calculan en servidor sobre todos los registros filtrados, no sobre la página actual. Las órdenes activas se muestran desde la más antigua. Las tarjetas incluyen fotos del producto y los insumos; el tablero se actualiza cada 15 segundos.

Los gastos por playera se guardan como una copia en la orden al iniciarla. El costo definitivo usa materiales realmente consumidos con su costo promedio de inventario y esos gastos guardados. Una referencia nueva o una receta editada no altera la contabilidad histórica.

## Verificación de esta ampliación

La prueba transaccional supabase/tests/catalog_photos_costing_production_board.sql comprueba fondos, retirada de fotografías y portada, tarifas DTF, merma, orientación, valoración explícita, sincronización de dimensiones, gastos de receta, costo al terminar, selección de recetas configuradas, separación de estados y permisos del vendedor. Usa datos aislados y rollback. Los contadores de folio pueden avanzar aunque se haga rollback. Se verificaron también los formularios, la ampliación dentro del modal, las fotos y la distribución en escritorio, tablet y teléfono con datos simulados.


## Roles personalizados

Equipo y permisos → Permisos de roles → Crear rol permite definir nombre y descripción. Cada rol nuevo empieza sin permisos; luego se habilitan los permisos existentes y se asigna al personal al crear o editar su cuenta. La operación requiere team.permissions.edit y guarda el actor en la auditoría; los reintentos con el mismo identificador no duplican el rol. Los nombres existentes se rechazan sin distinguir mayúsculas y espacios exteriores.

El catálogo de roles activos se obtiene de la base de datos, incluidos los roles adicionales que ya existían. Los códigos internos de propietario y administrador se conservan. La asignación de roles personalizados requiere una cuenta propietaria/administradora con permiso de edición de usuarios; las cuentas delegadas siguen limitadas a vendedores. La administración comprueba permisos en servidor y conserva al menos una cuenta activa capaz de gestionar permisos. No se modifica la autenticación temporal de 24 horas.

La migración 20261015205717_dynamic_team_roles.sql y la función user-admin versión 2 habilitan el flujo. supabase/tests/dynamic_team_roles.sql comprueba creación, reintento, nombre duplicado, ausencia de permisos iniciales, configuración, creación/edición de cuentas con rol nuevo y bloqueo de operaciones no autorizadas. La prueba usa una transacción con rollback.


## Mercancía en consignación y liquidaciones de vendedores

Productos conserva sus diseños y precios fijos de catálogo. Inventario del taller permite operar a las cuentas con inventory.sell_workshop; Mi inventario muestra únicamente diseños con piezas en custodia de la cuenta; Catálogo permite consultar diseños y precios sin vender ni apartar. Las consultas se paginan en servidor y separan sus cachés por usuario y vista. El detalle obtiene las existencias de esa misma vista. No se reasigna inventario ni deuda de ventas anteriores.

Vendedores, /sellers, requiere consignments.read. Las cuentas con consignments.manage seleccionan una cuenta y registran entregas por variante/cantidad/importe para ARMA, pagos recibidos, reintegros por crédito y regreso al taller de piezas sin vender. Cada entrega usa una ubicación propia y un precio acordado inmutable. La salida y recepción se realizan en la misma transacción, con movimientos y conservación del costo de fabricación. Las prendas apartadas no se pueden transferir al taller hasta liberar el apartado.

El vendedor cobra al cliente. Su ganancia antes de gastos es venta efectiva menos reembolsos al cliente menos el importe de las piezas vendidas que corresponde a ARMA. Su saldo pendiente se calcula con las obligaciones de cada modalidad de entrega, menos pagos entregados, más reintegros de créditos. En consignación las prendas sin vender y los anticipos de apartados activos no generan obligación; las compras generan el importe completo desde la entrega. Las devoluciones de cliente reducen la obligación por las piezas devueltas y su reembolso reduce lo vendido. Una devolución posterior a la liquidación puede generar crédito, visible como saldo a favor y reintegrable por administración. El regreso de prendas sin vender al taller no genera venta ni pago.

Vender y apartar abren un modal, con selector de entrega, cantidad, precio real al cliente y desglose de importe para ARMA/ganancia. Cada operación usa una sola entrega; para usar tandas con acuerdos distintos se registran operaciones separadas. El servidor valida la pertenencia de la entrega, el precio mínimo acordado, la variante activa y sus piezas disponibles. La operación de completar apartado conserva al vendedor original y la ubicación de la reserva, aunque la confirme un administrador. Las devoluciones vendibles regresan al inventario que originó la venta.

Los pagos del vendedor se registran en un historial independiente del cobro al cliente, por lo que no duplican ingresos de venta. Los resúmenes de cobros del Inicio siguen reflejando cobros a clientes, incluyendo vendedores cuando la cuenta tiene alcance de todo el negocio; no son una conciliación bancaria del propietario. El resumen de consignación en el Inicio del vendedor es acumulado, independiente del período de ventas. La cantidad disponible y las alertas de producto se limitan al taller o al inventario propio según el permiso inventory.sell_workshop.

Los nuevos permisos son editables en Equipo. Propietario/Admin reciben consignments.read, consignments.manage e inventory.sell_workshop; Vendedor recibe consignments.read. Los roles personalizados requieren configuración explícita de permisos. No se basa la autorización en user_metadata ni en la visibilidad de botones. Los registros internos de entregas, asociaciones, pagos y retornos tienen RLS sin acceso directo de clientes. Las funciones públicas invoker delegan en funciones privadas con validación de sesión/permisos; los movimientos bloquean filas y serializan operaciones del mismo vendedor. Los reintentos conservan el identificador para no duplicar piezas ni dinero.

supabase/tests/seller_consignment.sql verifica con rollback entregas/reintentos, dos acuerdos de precio, venta, prohibición de existencias ajenas/del taller, precio mínimo, apartado y cierre por administrador, pagos sin duplicar cobros, devoluciones con crédito, reintegros, cancelación, regreso de stock disponible, costo conservado y disponibilidad propia del Inicio. No deja cuentas, prendas, entregas ni pagos de prueba. Las secuencias pueden avanzar durante las pruebas.

Al seleccionar una variante en Entregar mercancía se muestra su precio de venta de catálogo por pieza, obtenido desde product_variants.sale_price. Es una referencia visual independiente del importe pactado con el vendedor; no rellena ni modifica ese acuerdo.


## Precio personal del vendedor

En Productos → Mi inventario → detalle de una variante, Configurar mi precio guarda un precio fijo privado por cuenta y variante. Requiere products.price_own y lectura de Productos, además de una entrega propia registrada. Propietario/Admin/Vendedor reciben el permiso inicial, editable desde Equipo; los roles personalizados lo requieren explícitamente. El botón se muestra con piezas propias o un precio ya configurado.

Mi inventario y Catálogo muestran solamente el precio de venta, sin indicar referencias internas, preferencias ni acuerdos. Si no hay precio personal, usan el de catálogo con la etiqueta neutral Precio; el taller conserva su precio de catálogo. La referencia ARMA se consulta dentro del modal de configuración, abierto mediante un icono discreto junto al SKU en Mi inventario. Las tarjetas de Mi inventario calculan precios sobre variantes con piezas en custodia. La calculadora suma una ganancia por pieza al importe de una entrega seleccionada y permite copiar el resultado al precio fijo. No guarda reglas de porcentaje ni de ganancia automática. Muestra la ganancia distinta que dejaría ese precio en cada entrega disponible. Usar referencia ARMA elimina la preferencia propia.

El precio personal inicia las nuevas ventas y apartados de entregas propias, conservando la negociación por operación. No modifica precios de catálogo, acuerdos de entregas ni operaciones pasadas. El servidor rechaza un precio nuevo que no cubra los acuerdos de las piezas que aún conserva el vendedor. Si posteriormente recibe una entrega con importe mayor que su preferencia, esta no cambia automáticamente: el formulario advierte la diferencia y requiere ajustar el precio de la operación para cumplir el importe acordado.

La tabla privada seller_variant_prices tiene RLS y ningún acceso directo desde clientes. Las consultas solo incluyen el precio de auth.uid(); las lecturas del taller omiten preferencias. El guardado usa un bloqueo del vendedor consistente con entregas y valida sesión, permiso, propiedad, precio positivo y centavos. La prueba supabase/tests/seller_personal_prices.sql verifica aislamiento entre vendedores, referencia de catálogo intacta, dos acuerdos de entrega, validación, conservación de ventas históricas, entrega posterior más cara, borrado de preferencia y revocación de permiso, con rollback.


## Compras pagadas, compras a crédito y consignación

Entregar mercancía calcula cantidad × importe para ARMA por pieza y ofrece tres modalidades. Pagado al entregar registra la compra completa y su pago completo con medio y referencia en la misma transacción: no añade deuda nueva, aunque puede existir un saldo anterior. Compra con pago pendiente genera la obligación completa desde la entrega y permite pagos posteriores, incluidos pagos parciales desde la cuenta del vendedor. Consignación: paga al vender conserva el comportamiento anterior. Las entregas existentes mantienen consignación y no reciben deudas ni pagos retroactivos.

El importe recibido al entregar se calcula en servidor; no se confía en el total o en amount enviado por el cliente. El pago inicial queda vinculado a la entrega con seller_settlements.delivery_id y usa el mismo identificador de operación para evitar duplicados al reintentar. La tarjeta de entrega muestra su modalidad, total y el pago inicial cuando existe. El saldo general contempla compras y consignación vendida, menos pagos netos; un pago inicial de una compra no liquida otras deudas previas.

La ganancia realizada se calcula sobre ventas al cliente menos reembolsos y costo acordado de las piezas vendidas netas de devoluciones, sin restar toda una compra todavía sin vender. Por ello una compra a crédito no crea una pérdida ficticia antes de revender. Revender piezas compradas no vuelve a generar la obligación de compra. Una devolución del cliente de una pieza comprada por el vendedor no elimina su deuda con ARMA; el regreso autorizado de esa mercancía al taller sí reduce el importe de compra y puede generar saldo a favor si ya estaba pagado. Las reglas de consignación se conservan.

supabase/tests/seller_delivery_payment_terms.sql valida tres piezas a 200 MXN para cada modalidad, reintento de pago inicial, total calculado en servidor, medio de pago obligatorio, venta posterior sin doble cargo, ganancia realizada, pagos parciales, devolución del cliente, regreso al taller y reintegro de crédito. Se ejecuta con rollback y no deja registros de prueba. También se ejecutó la prueba de consignación anterior para comprobar compatibilidad.


## Revisión legal, financiera y de seguridad (15 de octubre de 2026)

Migraciones `20261015223057_legal_finance_security_review.sql` y `20261015223751_audit_policy_query_plans.sql` aplicadas a ARMA. Añaden costo histórico de entrega (`unit_cost_at_delivery`), resumen privado `business_dashboard.company` para `business.read` + `commerce.read_all`, aislamiento de custodios en lectura directa de stock y optimización de políticas/índices.

`company` separa venta atribuible a ARMA, margen conocido y cobros propios de la actividad de reventa del vendedor. No es un cálculo fiscal. Las compras pagadas/a crédito se cuentan al entregar, las consignaciones al vender; no se duplica la reventa. Los retornos y cobros se consideran en su fecha.

Regresión: `supabase/tests/legal_finance_security.sql` (fixtures con rollback). Informe, evidencia y pendientes externos en `docs/audits/2026-10-15-legal-finance-security.md`. No ejecutar nuevamente migraciones ya aplicadas ni borrar historial real para probar.


## Inicio de negocio y personal

`20261015230604_separate_business_and_personal_home.sql` agrega al RPC `business_dashboard` un `mode` explícito y métricas `personal` limitadas al usuario autenticado. La ganancia usa el importe de cada entrega y se filtra por fechas; los pagos de apartados no generan ganancia. `company.series` permite integrar las gráficas propias de ARMA en el Inicio global. Pruebas: `supabase/tests/separate_home_dashboards.sql`. Detalles: `docs/home-dashboard.md`.
