# SPA Simpsons Chat + Gemini (Vercel Serverless)

## Configuracion segura

1. Crea `.env` en la raiz usando `.env.example` como base.
2. Define `GEMINI_API_KEY` (requerida).
3. Opcional: define `OPENROUTER_API_KEY` para fallback.
4. Mantiene `AI_PROVIDER=gemini` para usar Gemini como principal.
5. No subas `.env` a git.

## Variables de entorno

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=pon_aqui_tu_api_key_gemini
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-1.5-flash
OPENROUTER_API_KEY=pon_aqui_tu_api_key_openrouter
OPENROUTER_MODEL=openai/gpt-3.5-turbo
```

## Ejecutar en local

```bash
npm install
npm run dev
```

`npm run dev` usa `vercel dev` y expone:

- Frontend estatico
- Serverless Function en `/api/chat`

URL local esperada: `http://localhost:3000`

## Flujo de chat

1. Frontend envia `POST /api/chat` con `{ characterId, message, history }`.
2. `api/chat.js` valida metodo/body y sanitiza entrada.
3. Llama Gemini via `@google/generative-ai`.
4. Si Gemini falla por error recuperable y existe key OpenRouter, usa fallback.
5. Responde al frontend con:

```json
{
  "text": "...",
  "truncated": false,
  "usage": { "inputTokens": 0, "outputTokens": 0 },
  "model": "gemini-2.5-flash",
  "character": { "id": "homer", "name": "Homer Simpson" }
}
```

## Verificacion rapida

1. Abre `http://localhost:3000/api/chat` en navegador: debe responder `METHOD_NOT_ALLOWED`.
2. Prueba un POST:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"characterId":"homer","message":"Hola","history":[]}'
```

3. Debes recibir JSON con `text`.

## Problemas comunes

- `MISSING_API_KEY`: falta `GEMINI_API_KEY` (y no hay fallback disponible).
- `AI_REQUEST_FAILED`: key invalida, modelo no disponible o error del proveedor.
- `AI_QUOTA_EXCEEDED` (429): revisa cuota/rate limits.
