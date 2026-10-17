# Apartados pendientes de existencia

En Apartados se conserva el flujo de reservar piezas disponibles y se añade **Solicitar sin existencia**. Este acceso abre Productos en el catálogo completo (`scope=catalog`), desde donde se elige modelo, color y talla aunque haya cero piezas. También se puede abrir desde el detalle de una variante agotada. El modelo y su variante deben existir y estar activos.

El formulario compartido permite elegir **Reservar existencia disponible** o **Pendiente de existencia**, con cantidad, precio acordado, cliente, teléfono, notas, fecha límite de pago, compromiso de entrega y anticipo opcionales según las validaciones existentes. Cambiar la modalidad conserva los datos escritos. No se puede registrar una venta sin existencia.

## Inventario y seguimiento

- Un pedido pendiente queda como apartado activo con `stock_status=waiting`. Sus partidas no tienen `inventory_balance_id`; no se inventa un saldo de inventario ni se genera movimiento de stock.
- Se muestra con etiqueta, contador y filtro **Pendientes de existencia**. También aparece en el calendario y los pendientes por entregar, con su fecha comprometida si existe.
- No se reserva parcialmente ni se asigna mercancía automáticamente al completar producción. Las piezas continúan disponibles para otras operaciones hasta confirmar su asignación.
- Desde el detalle, **Asignar existencia** consulta disponibilidad y pide confirmación. La cantidad completa debe estar disponible en el taller o en una sola entrega del vendedor. Se bloquea el saldo de inventario, se incrementa la cantidad reservada y se marca `stock_status=reserved` en la misma transacción.
- Repetir la asignación no crea movimientos adicionales. Si otra operación consumió la existencia, se rechaza la asignación y el apartado sigue pendiente.
- Completar venta exige primero existencia asignada. Después se usa el flujo habitual de cobro, venta y entrega.

## Vendedores y dinero

`stock_source` conserva si se surtirá del taller o del inventario del vendedor. Un vendedor sin permiso de operar inventario del taller no puede cambiar el origen a taller, aunque modifique la petición al servidor.

El anticipo y los abonos se registran en el historial existente sin ser una venta. Si los recibe un vendedor, son cobros del vendedor y no efectivo recibido por ARMA. No se crea un acuerdo de precio ni una deuda por mercancía hasta que exista una entrega real. Al asignar existencia del vendedor se elige una entrega que pertenezca al creador del apartado y a la variante solicitada; se conserva el precio de esa entrega y se comprueba que no supere el precio al cliente acordado. Las liquidaciones a ARMA conservan su flujo habitual.

Cancelar un pedido sin existencia devuelve los abonos por sus medios originales, previa confirmación, y no libera ni aumenta inventario. Cancelar después de asignar existencia libera solamente las piezas reservadas. Los registros históricos conservan sus importes; los apartados existentes se consideran ya reservados y el origen de operaciones anteriores de vendedores se identifica mediante sus enlaces de entrega.

## Permisos y comprobaciones

Se reutilizan los permisos existentes de crear, consultar, cancelar, abonar y completar apartados/ventas. Asignar existencia requiere `reservations.create` y propiedad del apartado o `commerce.manage_all`; el taller también exige `inventory.sell_workshop`. Las lecturas respetan propiedad o `commerce.read_all`. Los visitantes no pueden llamar las funciones nuevas. Se mantienen RLS, acceso de solo lectura del cliente a las tablas y wrappers invocadores con la operación privilegiada en `arma_private` y búsqueda de esquema vacía.

Migración: `20261017084619_reservations_waiting_for_stock.sql`. Pruebas: `supabase/tests/reservations_waiting_for_stock.sql` con rollback. Para probar los caminos de creación y conversión sin consumir folios, se ejecuta el cuerpo instalado de las funciones en bloques anónimos, reemplazando únicamente la generación del número por un número explícito de fixture; la función de producción no se sustituye. Asignación, consulta, abonos, cancelación, reintentos y denegaciones se prueban contra sus funciones reales. Se verifica que la secuencia de folios no avance y que no quede ningún dato de prueba.

La interfaz se comprobó con respuestas simuladas para propietario y vendedor, en escritorio y móvil: cero existencia, anticipo, fechas/filtros/calendario, asignación con confirmación, entrega del vendedor, bloqueo de venta antes de asignar, cancelación, errores y reintento. Se comprobó también el caso de existencia parcial y conservación del formulario al cambiar la modalidad.
