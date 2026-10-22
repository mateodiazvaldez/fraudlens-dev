# FraudLens

**El punto de partida del MVP. Un repositorio, una app, un deploy.**

Esta versión deja lista la infraestructura para empezar a construir. El dominio y los casos de uso se definirán después: todavía no hay entidades, esquemas, reglas de negocio, autenticación ni flujos de IA.

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
│   │   │   ├── db/mongoose.ts    # Conexión, sin schemas
│   │   │   └── ai/typesafe.ts    # Configuración de Jev
│   │   └── server/
│   │       ├── models/           # Reservado; sin modelado
│   │       ├── repositories/     # Reservado
│   │       └── services/         # Reservado
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

## Próximo paso

Definir los casos de uso de FraudLens. A partir de eso se diseñarán entidades, contratos de API, pantallas y decisiones de IA.

## Estado de verificación inicial

Se verificaron lint, tipos, build, la página inicial, `/api/health` y MongoDB local. Atlas y la inferencia real de TypeSafe requieren credenciales y no se probaron.

La auditoría de producción (`npm audit --omit=dev`) no reportó vulnerabilidades. La auditoría completa reportó cinco entradas de severidad alta por un mismo aviso transitivo de `braces`, utilizado por el linter de Next.js ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)). No había una versión corregida disponible al preparar esta base; revisar al actualizar dependencias.
