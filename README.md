# FraudLens

**El punto de partida del MVP. Un repositorio, una app, un deploy.**

Implementa CU-01: recibe una transacción, persiste su evaluación en MongoDB y devuelve un resultado fijo. No ejecuta reglas ni inferencia de IA.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js App Router + React + TypeScript estricto |
| Backend | Route Handlers en la misma app Next.js, runtime Node.js |
| Persistencia | MongoDB Atlas en producción; MongoDB 8 en Docker local |
| Acceso a datos | Mongoose, conexión compartida por proceso |
| IA | Vercel AI SDK + proveedor oficial TypeSafe, Jev |
| Monorepo | npm workspaces, una única app desplegable |
| Calidad | ESLint, TypeScript y build en GitHub Actions |

Las versiones exactas resueltas quedan en `package-lock.json`. Usamos Node.js 24.

## Arquitectura e infraestructura

La aplicación se aloja en **Vercel** y usa **MongoDB Atlas** en producción. Para desarrollo usamos MongoDB local con Docker Compose. Administramos los servicios mediante los conectores de Vercel y MongoDB Atlas del asistente de IA; la aplicación se conecta directamente a MongoDB con Mongoose.

Ver [arquitectura de FraudLens](docs/architecture.md) para los diagramas, entornos y el papel de cada conector.

## Arranque local

Requisitos: Node.js 24, npm y Docker con Compose v2 o superior.

```bash
nvm use
npm ci
cp apps/web/.env.example apps/web/.env.local
npm run db:up
npm run dev
```

Abrí [localhost:3000](http://localhost:3000). La pantalla inicial y `GET /api/health` funcionan sin API key ni conexión a MongoDB. El endpoint de salud verifica únicamente que la app responde, no la disponibilidad de sus dependencias.

MongoDB queda en `127.0.0.1:27017`, con datos persistidos en un volumen de Docker. Es una instancia local sin autenticación, limitada a loopback. No usar este Compose como configuración de producción. Si el puerto está ocupado, detené la otra instancia o ajustá el puerto publicado y `MONGODB_URI`.

## Estructura

```text
fraudlens/
├── apps/web/                     # Única unidad de deploy
│   ├── public/                   # Assets públicos
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/health/        # Endpoint técnico de liveness
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx          # Pantalla de inicio mínima
│   │   ├── components/           # Componentes compartidos (vacío)
│   │   ├── hooks/                # Hooks de React (vacío)
│   │   ├── types/                # Tipos compartidos (vacío)
│   │   ├── lib/
│   │   │   ├── db/mongoose.ts    # Conexión compartida
│   │   │   └── ai/typesafe.ts    # Configuración de Jev
│   │   └── server/
│   │       ├── models/           # Modelo TransactionEvaluation
│   │       ├── repositories/     # Reservado
│   │       └── services/         # Validación y evaluación de transacciones
│   └── .env.example
├── docs/architecture.md
├── .github/workflows/ci.yml
├── compose.yaml
├── AGENTS.md
├── package.json
└── package-lock.json
```

Las carpetas reservadas se conservan con `.gitkeep`; no implican decisiones sobre el dominio.

## Variables de entorno

Next.js lee las variables locales desde **`apps/web/.env.local`**, no desde la raíz del monorepo.

| Variable | Uso |
| --- | --- |
| `MONGODB_URI` | URI local o Atlas; obligatoria al llamar a `connectDB()` |
| `TYPESAFE_AI_API_KEY` | API key directa de TypeSafe; obligatoria al obtener el modelo |
| `TYPESAFE_AI_MODEL` | Identificador de Jev; por defecto `jev-latest` |

No commitear credenciales ni agregarles el prefijo `NEXT_PUBLIC_`. Los módulos de DB e IA tienen `server-only`. La validación de secretos es diferida, por lo que el build no requiere acceso a servicios externos.

### TypeSafe / Jev

El proveedor oficial `@ai-sdk/typesafe-ai` se configura en `src/lib/ai/typesafe.ts`. `getDecisionModel()` devuelve un modelo de decisiones listo para usar con el AI SDK. Crear esta instancia no ejecuta solicitudes.

La integración utiliza la API experimental de decisiones de AI SDK (`experimental_decide`), no una API de chat. Todavía no se definen preguntas, prompts, criterios, umbrales ni endpoints de IA. La API key es de TypeSafe; no hace falta una key de AI Gateway para esta conexión directa. El alias `jev-latest` puede cambiar; se puede fijar una versión mediante la variable de entorno.

Referencia: [TypeSafe en AI SDK](https://ai-sdk.dev/providers/ai-sdk-providers/typesafe-ai).

## Comandos

| Comando | Acción |
| --- | --- |
| `npm run dev` | Desarrollo de frontend y backend |
| `npm run build` | Build de producción |
| `npm run start` | Servir el build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generar tipos de rutas y verificar TypeScript |
| `npm run check` | Lint + tipos + build |
| `npm run db:up` | Iniciar MongoDB y esperar a que esté saludable |
| `npm run db:down` | Detener MongoDB, conservando datos |
| `npm run db:logs` | Ver logs de MongoDB |

## Un solo deploy en Vercel

1. Importar el repositorio y seleccionar **Next.js**.
2. Elegir **Root Directory: `apps/web`** y habilitar acceso a archivos fuera de ese directorio si Vercel lo solicita para resolver el workspace y el lockfile raíz.
3. Usar Node.js **24.x**, build `npm run build` y directorio de salida automático. Para instalación explícita: `cd ../.. && npm ci`.
4. Configurar `MONGODB_URI` con el URI de Atlas que incluya la base `fraudlens`, y `TYPESAFE_AI_API_KEY`. `TYPESAFE_AI_MODEL` es opcional.
5. Crear en Atlas un usuario de aplicación con acceso a la base y configurar la conectividad de red para el entorno de despliegue.
6. Desplegar y comprobar `/` y `/api/health`.

Frontend y API se publican juntos. Atlas sigue siendo un servicio administrado externo; no se despliega Docker en Vercel. El scaffold no crea un cluster de Atlas ni realiza un deploy automáticamente.

## CU-01 — Analizar una transacción

`POST /api/transaction-evaluations` con `Content-Type: application/json`:

```bash
curl -i http://localhost:3000/api/transaction-evaluations \
  -H 'Content-Type: application/json' \
  -d '{
    "transaction_id": "tx-001",
    "user_id": "user-001",
    "transaction_datetime": "2026-10-27T12:30:00-03:00",
    "amount": 25,
    "currency": "ARS",
    "operation_type": "PURCHASE",
    "merchant": "Example merchant",
    "country": "AR",
    "cardholder_present": false,
    "card_present": false
  }'
```

Los diez campos son obligatorios. Los identificadores y merchant son strings no vacíos; amount es un número positivo; currency usa tres letras mayúsculas y country dos. transaction_datetime debe ser ISO 8601 con zona horaria. Solo se admite PURCHASE; los flags deben ser booleanos. Los campos adicionales se ignoran.

Devuelve `201 Created` después de guardar en `transaction_evaluations`:

```json
{
  "transaction_evaluation_id": "<MongoDB ObjectId autogenerado>",
  "transaction_id": "tx-001",
  "risk_score": 0.6,
  "decision": "BLOCK",
  "rules_applied": ["block_if_over_50"]
}
```

El documento conserva todos los campos de entrada, la fecha como Date, el resultado y created_at/updated_at. El resultado es fijo incluso para montos inferiores a 50: el nombre de la regla es parte del stub y no implica ejecución. Cada POST crea una evaluación nueva, incluso con el mismo transaction_id; todavía no hay idempotencia ni autenticación.

Errores: `400` para JSON o campos inválidos, `415` para otro Content-Type y `503` si no se puede persistir. Los errores no incluyen datos de la transacción ni detalles internos de MongoDB.

`npm test` ejecuta la validación del contrato; `npm run check` también la incluye. Para desarrollo usar `npm run db:up` y el URI local de `.env.example`; producción sigue usando Atlas.


## Estado de verificación inicial

Se verificaron lint, tipos, build, la página inicial, `/api/health` y MongoDB local. Atlas y la inferencia real de TypeSafe requieren credenciales y no se probaron.

La auditoría de producción (`npm audit --omit=dev`) no reportó vulnerabilidades. La auditoría completa reportó cinco entradas de severidad alta por un mismo aviso transitivo de `braces`, utilizado por el linter de Next.js ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)). No había una versión corregida disponible al preparar esta base; revisar al actualizar dependencias.

## Postman

Importar [la colección de Postman](postman/FraudLens.postman_collection.json). Incluye health, creación de evaluaciones y un ejemplo de validación fallida, con verificaciones de respuesta. La variable `base_url` apunta por defecto a `http://localhost:3000`. El POST crea documentos persistentes en la base configurada.

Todo cambio de endpoints debe mantener esta colección actualizada en el mismo PR, según `AGENTS.md`.

## Consultar evaluaciones pasadas

`GET /api/transaction-evaluations?limit=20&offset=0` devuelve `200` con `{ "items": [], "limit": 20, "offset": 0, "has_more": false }`.

Cada item contiene `transaction_evaluation_id`, los campos de entrada, `risk_score`, `decision`, `rules_applied`, `created_at` y `updated_at`. Las fechas se devuelven en ISO 8601 UTC. Se ordena por creación descendente, con ID descendente como desempate. `limit` es un entero entre 1 y 100 (default 20); `offset` es un entero no negativo (default 0). Una lista vacía devuelve `200`; parámetros inválidos `400`; errores de persistencia `503`. La paginación por offset puede desplazarse con inserciones concurrentes.

La colección Postman incluye este GET. Para probar el flujo POST → MongoDB → GET, iniciar MongoDB y la app, y ejecutar `TEST_BASE_URL=http://localhost:3000 npm test`. El test crea una evaluación persistente y no elimina datos. Requiere una instancia local sin solicitudes concurrentes. Sin esa variable, se omite el test HTTP y se ejecutan los tests unitarios.

Para el MVP se autorizó consultar el historial sin autenticación propia de la app, manteniendo la protección existente de Vercel. No deshabilitar esa protección al desplegar.
