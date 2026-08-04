# SPA Simpsons Chat

Aplicación en vanilla JavaScript con tres vistas: Home, Chat y About. El chat usa una serverless function en Vercel para enviar mensajes a Gemini y devolver respuestas con personalidad de los personajes de The Simpsons.

## Inicio rápido

### 1. Requisitos

- Node.js 18 o superior
- npm

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto usando `.env.example` como base.

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=tu_api_key_de_gemini
GEMINI_MODEL=gemini-3.1-flash-lite
PORT=3000
```

> No subas tu archivo `.env` a Git.

Si tenías una key expuesta previamente, rota la credencial en Gemini y usa una nueva.

### 4. Ejecutar la app

```bash
npm run dev
```

Abre esta URL en el navegador:

```text
http://localhost:3000
```

### Deploy en Vercel

La versión desplegada está disponible en:

```text
https://proyecto-m3-tamara-castronuovo.vercel.app/home
```

## Scripts útiles

- `npm run dev`: inicia Vercel Dev en local.
- `npm run dev:vercel`: usa Vercel Dev si quieres probar el runtime de Vercel.
- `npm run test`: corre la suite de pruebas.

## Estructura del proyecto

- `server.js`: servidor HTTP local legacy.
- `src/main.js`: arranque de la SPA.
- `src/router.js`: enrutado entre vistas.
- `src/views/`: componentes de UI para Home, Chat y About.
- `src/engine/`: lógica del chat, payloads y normalización de respuestas.
- `src/api/`: handler del endpoint de chat.
- `src/services/`: servicios auxiliares de red.

## Flujo del chat

1. La vista de chat renderiza los personajes y captura el mensaje del usuario.
2. El frontend envía un `POST` a `/api/chat` con:
   - `characterId`
   - `message`
   - `history`
3. El backend arma el prompt y envía la request a Gemini.
4. En cada request se envía todo el historial disponible en memoria de la sesión.
5. El frontend muestra el texto del personaje en la ventana del chat.

## Probar el endpoint

Desde otra terminal:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"characterId":"homer","message":"Hola","history":[]}'
```

Deberías recibir JSON con un campo `text`.

## Problemas comunes

- `MISSING_API_KEY`: falta `GEMINI_API_KEY` en el `.env`.
- `AI_REQUEST_FAILED`: la key es inválida, el modelo no está disponible o el proveedor falló.
- `AI_QUOTA_EXCEEDED` (429): revisa la cuota o el rate limit de Gemini.
- `AI_REQUEST_TIMEOUT` (504): el proveedor tardó demasiado en responder; intenta nuevamente.

## Registro de uso de IA

Bitácora real de asistencia con IA durante el desarrollo.

### Prompt 1

- Objetivo: corregir y ubicar la normalización de rutas para soportar trailing slash sin duplicar lógica.
- Prompt usado: "Quiero agregar esta función para que mi router entienda que si pongo una barra adicional en la URL me redirija igual y no dé error. Dónde la agrego para evitar duplicar código?"
- Respuesta resumida: IA recomendó mantener una sola función `normalizePath` como helper global en el router, reutilizada desde `router()` y `updateActiveLink()`. También corrigió la regex para evitar typo.
- Decisión tomada en el código: se conservó una única función `normalizePath` al final del archivo para centralizar la normalización de rutas.
- Archivo(s) impactado(s): `src/router.js`.

### Prompt 2

- Objetivo: simplificar el arranque local del proyecto y evitar comandos manuales largos.
- Prompt usado: "No entiendo por qué se levanta en dos puertos distintos 5500 y 8095, qué está pasando?"
- Respuesta resumida: IA explicó que había dos servidores distintos en paralelo (Live Server y servidor de terminal), por eso aparecían dos puertos para el mismo proyecto.
- Decisión tomada en el código: se dejó un flujo único de ejecución por script y se documentó el comando recomendado de arranque.
- Archivo(s) impactado(s): `package.json`, `README.md`.

### Prompt 3

- Objetivo: asegurar comportamiento consistente de navegación SPA y recarga de rutas.
- Prompt usado: "Explícame cuál puerto debo usar y cómo evitar conflictos para probar navegación, 404 interno y recargas directas de rutas."
- Respuesta resumida: IA recomendó usar un solo servidor a la vez y validar explícitamente rutas internas de la SPA (`/home`, `/chat`, `/about`) y fallback.
- Decisión tomada en el código: se estandarizó la documentación de prueba y se mantuvo el flujo de router con `popstate` + enlaces interceptados.
- Archivo(s) impactado(s): `README.md`, `src/main.js`, `src/navigation.js`, `src/router.js`.

### Notas de trazabilidad

- La IA se usó como apoyo para validación de enfoque y debugging, no para exponer secretos.
- Las decisiones finales de arquitectura y código se validaron con pruebas locales y tests automáticos.

## Checklist de despliegue en Vercel

Marca cada punto cuando lo verifiques:

- [ ] Repositorio conectado a Vercel.
- [ ] Variables de entorno cargadas en Vercel (`GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_PROVIDER`, `PORT` si aplica).
- [ ] Deploy en estado `Ready`.
- [ ] Ruta principal accesible (`/home`, `/chat`, `/about`).
- [ ] Endpoint `POST /api/chat` responde correctamente en producción.
- [ ] Manejo de errores validado en producción (`MISSING_API_KEY`, `AI_REQUEST_FAILED`, `AI_REQUEST_TIMEOUT`).

### Evidencia de deploy

- URL de producción:
- Fecha y hora de validación:
- Resultado de prueba manual en `/chat`:
- Resultado de `POST /api/chat` en producción:
