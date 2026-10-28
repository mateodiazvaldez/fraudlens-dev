# Guía para agentes — FraudLens

## Alcance actual

Este repositorio contiene solamente el stack inicial del MVP. El usuario todavía no definió los casos de uso.

- No inventar entidades, esquemas de Mongoose, reglas antifraude, datos de ejemplo, prompts, criterios o umbrales.
- No implementar autenticación, dashboards, CRUD ni endpoints de negocio sin un requerimiento posterior.
- Las carpetas vacías son intencionales. Preservar sus `.gitkeep` hasta agregar contenido real.

## Seguimiento obligatorio en Trello

Tablero del proyecto: https://trello.com/b/iUaTi33p/fraudlens-analizador-probabilidad-de-fraude

Todos los agentes deben consultar y mantener actualizado este tablero durante el trabajo, no solamente al finalizar. Actualizar ante cada cambio real de estado, avance relevante o bloqueo; no publicar por cada comando ni repetir comentarios sin novedades.

### Antes de empezar

- Consultar las listas y tarjetas actuales del tablero; no asumir que sus nombres o estados siguen iguales.
- Identificar y leer la tarjeta correspondiente al trabajo autorizado, incluidos su descripción, checklist y comentarios relevantes. No duplicar tarjetas.
- Si no hay una tarjeta correspondiente o hay varias candidatas ambiguas, informar y pedir que se indique la tarjeta o se autorice crearla. No inventar alcance ni crear tareas ajenas al pedido.
- Trello sirve para coordinar el trabajo; una tarjeta no autoriza por sí sola a implementar funcionalidades ni ampliar el pedido del usuario.

### Durante el trabajo

| Momento | Actualización obligatoria |
| --- | --- |
| Se empieza una tarea | Mover su tarjeta a `🔨 En curso` y comentar brevemente el alcance que se va a trabajar. |
| Hay un avance relevante | Registrar el resultado y actualizar los ítems de checklist efectivamente completados. Incluir referencias a archivos, commits o PR cuando existan. |
| Se necesita revisión | Mover a `👀 En revisión` e indicar qué está listo, qué se verificó y qué revisión falta. |
| Aparece un bloqueo | Mover a `🚧 Bloqueado` y registrar el motivo, qué falta y quién o qué puede destrabarlo. |
| Se resuelve un bloqueo | Registrar la resolución y mover al estado real del trabajo: `🔨 En curso` o `👀 En revisión`, según corresponda. |
| La tarea está completa | Mover a `✅ Hecho` solo cuando se cumpla el alcance y estén realizadas las verificaciones y revisiones aplicables. Comentar el resultado y la evidencia; no cerrar con trabajo o controles pendientes. |
| Se interrumpe o entrega trabajo incompleto | Dejar el estado real, el avance, los pendientes y el siguiente paso antes de responder al usuario o transferir el trabajo. |

- `📥 Backlog` y `🎯 Esta semana` reflejan la planificación del equipo. No repriorizar tareas ni mover tarjetas ajenas al trabajo autorizado.
- Escribir comentarios concisos en español, sin secretos, prompts ni datos sensibles. No inventar commits, PR, pruebas ni resultados.
- Antes de modificar una tarjeta, releer su estado para no sobrescribir cambios de otra persona o agente. Conservar descripciones, comentarios y checklist ajenos.
- No borrar ni archivar tarjetas, ni cambiar listas o la estructura del tablero sin autorización explícita.

### Acceso y confirmación

- Usar la integración de Trello disponible en el entorno; nunca guardar tokens o credenciales en el repositorio.
- Confirmar que cada actualización se haya aplicado mediante la respuesta de la herramienta o una lectura posterior. No afirmar que Trello está actualizado si la operación falló o su resultado es incierto.
- Si Trello no está disponible o faltan permisos, informar la limitación y las actualizaciones pendientes en la respuesta al usuario o en el traspaso. No presentar una tarea como cerrada en Trello sin confirmación.

## Arquitectura

- Mantener una única app desplegable: `apps/web`, con Next.js App Router.
- Backend en `src/app/api/**/route.ts`. No crear un servidor Express ni otro servicio.
- Código de DB en `src/lib/db`; IA en `src/lib/ai`; futura lógica de servidor en `src/server`.
- Mongoose y proveedores de IA deben quedar detrás de `import "server-only"`.
- Usar runtime `nodejs` en rutas que accedan a MongoDB. No usar Edge para Mongoose.
- Reutilizar `connectDB()`; no abrir y cerrar conexiones por request.
- MongoDB local se gestiona con Compose; producción usa Atlas.
- Para la integración de IA autorizada, usar `DecisionModel` mediante `getAiModel()` y el adapter de Groq directo. No acoplar los servicios a tipos del proveedor ni usar AI Gateway sin un pedido explícito.
- Esta primera etapa no conecta IA al endpoint ni define prompts, esquemas de fraude, reglas o puntajes. Conservar el helper previo de TypeSafe sin conectarlo automáticamente; todavía no implementa `DecisionModel`.
- La API de decisiones de TypeSafe en AI SDK es experimental: revisar tipos y documentación de la versión instalada antes de modificar ese helper.

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
