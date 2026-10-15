# Revisión antes de publicar en Git · 15 de octubre de 2026

Se revisó ARMA Web, sin hacer commits, staging ni push, y sin modificar el historial. El análisis inicial cubrió 210 archivos de texto actuales, 295 blobs de texto históricos y 8 commits alcanzables mediante las referencias locales de Git. No se encontraron coincidencias de credenciales con los patrones revisados ni archivos sensibles rastreados. Esto no sustituye un detector especializado ni garantiza detectar cualquier formato de secreto.

## Archivos excluidos

`.env.local` está ignorado y no está rastreado. También se excluyen los demás `.env` excepto `.env.example`, dependencias, compilación, caché, archivos del sistema, configuraciones locales de autenticación, credenciales, llaves privadas, estado local de Vercel/Supabase, respaldos, exportaciones, bases locales, logs, resultados de pruebas y notebooks. No se excluyen de forma indiscriminada JSON, SQL ni archivos lock: el proyecto, las migraciones y las pruebas necesitan versionarse.

Se creó `.env.example` con marcadores de posición. Ninguna variable VITE puede contener secretos: sus valores se incorporan al navegador aunque el archivo de origen esté ignorado. La URL del proyecto y la clave publishable son configuración pública; la seguridad de los datos depende de permisos del servidor y RLS.

## Comprobaciones

- Patrones de claves privadas, claves secretas de Supabase, JWT de sesión/servicio, credenciales en URLs de base de datos, tokens de GitHub, claves de AWS/Google/Stripe/Slack y URLs de Storage con firma.
- Asignaciones de variables sensibles y nombres de archivos de credenciales, respaldos o compilación entre los archivos versionados.
- Historial alcanzable de todas las referencias locales, además del árbol actual. No se inspeccionaron repositorios remotos ni se certifica la ausencia de copias previamente publicadas en otro lugar.
- Reglas de `.gitignore` comprobadas con `git check-ignore`, incluidos archivos sensibles dentro de subcarpetas y la excepción de `.env.example`.
- Se comprobó que los archivos añadidos a esta revisión son las reglas de exclusión, la plantilla de entorno y este informe.

## Datos que sí son visibles

El aviso legal incluye nombre, domicilio y correo de contacto del responsable, autorizados por el usuario para la web. Son datos personales destinados a ese aviso, no secretos de acceso. Un repositorio público también los expondrá y podrá conservarlos en su historial. Mantener el repositorio privado limita la difusión del código, pero no oculta lo que publique la propia página legal.

El código y la documentación contienen el identificador del proyecto ARMA, estructura de tablas y permisos. No son contraseñas. Las migraciones y funciones de servidor deben conservarse para poder reconstruir y revisar el sistema. Nunca deben incluir secretos reales dentro del SQL.

## Antes de cada publicación

1. Revisar `git status` y la lista/diff exactos que se van a confirmar.
2. Mantener secretos del servidor en el entorno de Supabase o del alojamiento, nunca en variables VITE.
3. No usar `git add -f` para saltarse las exclusiones de credenciales o datos locales.
4. Si alguna vez se confirma un secreto, revocarlo/rotarlo y revisar la limpieza del historial. Añadirlo después a `.gitignore` no lo retira de commits anteriores.
5. Repetir el análisis después de introducir integraciones, credenciales o archivos nuevos. Esta revisión corresponde al estado del 15 de octubre de 2026.

No se borraron archivos locales ni se cambió la configuración de producción de ARMA.
