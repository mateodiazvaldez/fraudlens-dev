# Guía para agentes — FraudLens

## Alcance actual

Este repositorio contiene solamente el stack inicial del MVP. El usuario todavía no definió los casos de uso.

- No inventar entidades, esquemas de Mongoose, reglas antifraude, datos de ejemplo, prompts, criterios o umbrales.
- No implementar autenticación, dashboards, CRUD ni endpoints de negocio sin un requerimiento posterior.
- Las carpetas vacías son intencionales. Preservar sus `.gitkeep` hasta agregar contenido real.

## Arquitectura

- Mantener una única app desplegable: `apps/web`, con Next.js App Router.
- Backend en `src/app/api/**/route.ts`. No crear un servidor Express ni otro servicio.
- Código de DB en `src/lib/db`; IA en `src/lib/ai`; futura lógica de servidor en `src/server`.
- Mongoose y proveedores de IA deben quedar detrás de `import "server-only"`.
- Usar runtime `nodejs` en rutas que accedan a MongoDB. No usar Edge para Mongoose.
- Reutilizar `connectDB()`; no abrir y cerrar conexiones por request.
- MongoDB local se gestiona con Compose; producción usa Atlas.
- Usar TypeSafe directo mediante `getDecisionModel()`. No sustituirlo por un modelo de chat o AI Gateway sin un pedido explícito.
- La API de decisiones de AI SDK es experimental: revisar tipos y documentación de la versión instalada antes de modificarla.

## Desarrollo

- Node.js 24 y npm workspaces. Instalar desde la raíz y conservar `package-lock.json`.
- TypeScript estricto. Evitar `any` y abstracciones anticipadas.
- Server Components por defecto; `use client` solo cuando haga falta interacción.
- Alias `@/*` relativo a `apps/web/src`.
- Documentación en español; identificadores de código en inglés.
- No agregar infraestructura, librerías ni capas que el requerimiento no necesite.

## Contratos HTTP y Postman

- Todo cambio en endpoints debe actualizar en el mismo cambio la colección `postman/FraudLens.postman_collection.json`.
- Esto incluye crear o eliminar endpoints y modificar métodos, rutas, parámetros, headers, cuerpos de entrada, respuestas o códigos de estado.
- Mantener los ejemplos y las verificaciones de Postman alineados con el contrato implementado. Si la colección todavía no existe, crearla al agregar o modificar un endpoint.
- No incluir credenciales ni datos sensibles reales en la colección; usar variables para configurar el entorno.
- Antes de dar por terminado el cambio o abrir un PR, verificar que la colección sea JSON válido y refleje los endpoints afectados.

## Secretos y efectos externos

- Variables locales en `apps/web/.env.local`; documentar nombres en `.env.example`.
- Nunca commitear credenciales ni exponer URI de MongoDB o keys con `NEXT_PUBLIC_`.
- No registrar secretos, prompts o datos sensibles en logs.
- No ejecutar llamadas pagas de IA para comprobar un build.
- No borrar volúmenes de Docker, bases de datos ni colecciones sin autorización explícita.

## Verificación

- Ejecutar `npm run check` para cambios de código/configuración.
- Comprobar `/` y `/api/health` si se modifica la base HTTP.
- Para cambios de Compose, validar `docker compose config --quiet` y, si hay Docker disponible, su healthcheck.
- Agregar tests cuando existan comportamientos de negocio; no inventarlos para llenar carpetas.
- Informar qué se verificó y cualquier bloqueo real. No afirmar que Atlas o TypeSafe fueron probados si no se hicieron solicitudes.
- Actualizar README y `docs/architecture.md` cuando cambie el stack o el arranque.
