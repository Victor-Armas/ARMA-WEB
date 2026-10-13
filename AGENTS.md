# ARMA Web

Esta es una aplicación React para web, independiente de ARMA Mobile. Usa TypeScript estricto, SOLID y KISS. No uses APIs de Expo/React Native en este proyecto.

- Revisa archivos existentes antes de proponer o modificar código.
- No edites archivos locales, instales paquetes ni hagas acciones en GitHub sin autorización explícita del usuario. El usuario quiere aprender implementando por pasos; por defecto entrega el código por chat.
- Sin any ni casts para esconder errores. Infiere los tipos de formularios desde Zod.
- Mantén componentes, hooks, servicios, conexiones y schemas con responsabilidades claras. Crea abstracciones solo por una necesidad real.
- Usa versiones estables y verifica las APIs actuales. No agregues dependencias innecesarias.
- La prioridad actual es autenticación. No avances a productos, inventario o dashboard sin indicación.
- Trabaja únicamente con Supabase ARMA. Nunca modifiques NexoOps. Clave publishable en cliente; nunca service_role, sb_secret ni passwords de base de datos.
- No autorices usando user_metadata. RLS y permisos backend son obligatorios para los datos.
- Ejecuta `npm run lint`, `npm run typecheck` y `npm run build` antes de dar un cambio por terminado.
