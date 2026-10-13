# ARMA Web

Versión web independiente de ARMA Mobile para el personal. React + Vite + TypeScript estricto, Tailwind CSS, Lucide, React Hook Form, Zod y Supabase. Dependencias fijadas y package-lock.json como fuente reproducible de instalación.

## Ejecutar

```bash
npm ci
npm run dev
```

Crea `.env.local` a partir de `.env.example` y configura la URL del proyecto **ARMA** y su clave publishable. Las variables `VITE_` son públicas y se incorporan al build; no incluyas service_role, sb_secret ni contraseñas de base de datos. `.env.local` está ignorado por Git.

## Comprobaciones

```bash
npm run lint
npm run typecheck
npm run build
npm run preview
```

## Estructura

- `src/app`: composición de la aplicación.
- `src/components/ui`: componentes visuales compartidos.
- `src/features/auth/pages`: pantalla de login.
- `src/features/auth/components`: presentación del formulario.
- `src/features/auth/hooks`: estado y envío del formulario.
- `src/features/auth/schemas`: validación Zod y tipos inferidos.
- `src/features/auth/services`: llamadas de autenticación.
- `src/lib`: cliente compartido de Supabase.
- `src/styles`: estilos y tokens de tema; colores definidos una sola vez.

## Estado actual

Se adaptó el login existente de móvil a HTML accesible: logo y fondo oficiales del proyecto, campos reutilizables, mostrar/ocultar contraseña, validación, envío con Enter, indicador de carga y errores de Supabase. El correo se recorta y la contraseña únicamente se exige no vacía. Se usa el almacenamiento del navegador para persistir la sesión; Supabase gestiona su renovación en web.

El mensaje de éxito comprueba el envío actual; no representa un guard de autorización. La sesión compartida, las rutas protegidas, el cierre de sesión y la recuperación de contraseña son la siguiente etapa, como en móvil. No hay productos, inventario ni dashboard. RLS y permisos del proyecto ARMA deben controlar el acceso real a los datos; no basta con ocultar pantallas.

## Web instalable

Se incluye un manifest y un icono vectorial provisional con el nombre ARMA. El logo oficial de la pantalla se conserva sin cambios. En un origen HTTPS (o localhost durante desarrollo) los navegadores compatibles pueden ofrecer agregar la web a la pantalla de inicio. En iPhone, usa Compartir → Agregar a pantalla de inicio. No se implementó caché offline ni sincronización de operaciones sin conexión.

## Vercel

Importa el proyecto como Vite, configura las dos variables `VITE_SUPABASE_*` en el entorno de Vercel y despliega. `.env.local` no se sube; la configuración remota es necesaria para cada build. Usa `npm run build` y `dist` como directorio de salida. Para uso comercial, el plan Hobby de Vercel no corresponde.

No se ha publicado ni creado ningún repositorio remoto.
