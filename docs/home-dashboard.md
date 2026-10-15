# Inicio por alcance de acceso

Actualización del 15 de octubre de 2026. Un mismo filtro de fechas y componentes compartidos presentan dos experiencias, determinadas por la respuesta del servidor, no por un parámetro modificable del navegador.

## Negocio

Propietario y administrador, con los permisos predeterminados, tienen `commerce.read_all`: Inicio integra la actividad del taller y vendedores. Con `business.read` también muestra margen propio, cobros reales de ARMA por medio de pago, costos y análisis de precios. Las cifras de venta al cliente incluyen toda la red; el margen y los cobros de ARMA conservan el cálculo propio para no atribuirle la ganancia del revendedor ni duplicar una compra de mercancía al revenderla. El resumen azul separado se retiró y sus métricas se integraron en tarjetas, gráficas y costos del negocio.

Los permisos siguen siendo editables: un rol sin alcance global recibe Inicio personal. No se amplían permisos basándose solo en el nombre del rol.

## Personal

Cada usuario sin alcance global consulta exclusivamente sus operaciones. La tarjeta principal muestra ganancia por ventas, calculada con el importe pactado de cada entrega: venta menos devolución menos importe para ARMA. Ejemplo probado: 4 piezas vendidas a $300, pactadas a $200, equivalen a $1,200 de ventas y $400 de ganancia antes de gastos personales e impuestos.

Los pagos de apartados forman parte de cobros y no de ganancia hasta completar la venta. Las devoluciones afectan la ganancia en su fecha de registro. Los precios pactados de $200/$220 para lotes distintos se respetan; no se sustituye el costo por el precio de catálogo ni por el costo de producción de ARMA.

Las gráficas muestran ventas y ganancia por día, además de los medios de cobro propios. Se compara con el período inmediatamente anterior de igual duración. Si faltan acuerdos históricos, se marca ganancia conocida/parcial y no se inventa un margen. Las deudas y liquidaciones con ARMA permanecen en Vendedores; no se duplica su resumen acumulado en Inicio.

## Implementación y verificación

Migración aplicada: `20261015230604_separate_business_and_personal_home.sql`. Mantiene el RPC `business_dashboard`, agrega `mode`, `personal` y la serie diaria de `company`. La función privada personal deriva la identidad de `auth.uid()` y valida sesión y permiso de consulta de ventas. No recibe un identificador de vendedor del cliente.

Regresiones: `supabase/tests/separate_home_dashboards.sql`, `business_operations.sql` y `legal_finance_security.sql`. Pruebas con rollback: aislamiento de usuarios, $1,200/$400, lotes de distintos precios, pagos iniciales, devolución parcial, comparación temporal, período vacío, costo desconocido y roles sin acceso a ventas.

Comprobación de navegador en escritorio 1600×1100, tablet 820×1180 y móvil 390×844: dos experiencias, cuatro tarjetas principales, gráficas/tablas, filtro de fechas, estados parcial/vacío/error y ausencia de los bloques duplicados. Sin cambios en GitHub ni en datos históricos de ventas.
