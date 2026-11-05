# Migración de la interfaz del prototipo

La interfaz de evaluación e historial reutiliza el lenguaje visual del prototipo de FraudLens y se conecta a la API actual de la aplicación. El navegador solo prepara y presenta datos; la evaluación, persistencia y paginación permanecen en los Route Handlers existentes.

## Flujo

1. Completar los campos de la transacción, incluyendo país de transacción y país de emisión de tarjeta por separado.
2. Enviar `POST /api/transaction-evaluations`; durante el envío los campos quedan deshabilitados. Un error se muestra sin borrar los datos; un éxito muestra la decisión, motivos y señales devueltos y limpia el formulario.
3. Consultar el historial con `GET /api/transaction-evaluations` y sus parámetros `limit` y `offset`. La interfaz usa `has_more` para habilitar la página siguiente y permite reintentar errores.

## Contrato y límites

- `card_country` es obligatorio, independiente de `country`, y representa el país de emisión de la tarjeta.
- El cliente envía booleanos reales para `cardholder_present` y `card_present`; la API solo admite `PURCHASE`.
- Las decisiones actuales `APPROVED` y `REJECTED`, junto con `reasons` y `signals`, se presentan sin recalcularlas.
- Registros históricos `BLOCK` se muestran como **BLOCK · legado fijo**. No se transforman ni se interpretan como una decisión actual.
- No se agregan umbrales, probabilidades, autenticación, métricas, endpoints ni funciones del prototipo sin soporte en la API.
- El monto debe conservar la compatibilidad con números positivos pequeños aceptados por el servidor; no se impone un mínimo de negocio en el navegador.

## Procedencia

La fuente original es [fguerrero2/FraudLens-prototipo](https://github.com/fguerrero2/FraudLens-prototipo), revisión `6a6d3c6bc070da47572fe791f28f2ff27fc16cef`: `App/web/App.jsx`, `styles.css`, `Brand.jsx`, `theme.js`, `i18n.jsx`, las guías `App/VISUAL_IDENTITY.md` y `App/UX_GUIDELINES.md`, y los recursos de `App/public/brand`. La estructura visual y los assets de marca ya portados se recuperaron desde la rama histórica `feat/migrate-prototype-frontend-02-ui` del repositorio. Se adaptó la interfaz al contrato de la base actual; no se copiaron sus afirmaciones de resultado simulado ni documentación de backend obsoleta.

Los tests de cliente usan `fetch` simulado y no realizan POST real, consultan MongoDB ni llaman a un proveedor de IA. La disponibilidad de esos servicios requiere verificación separada.
