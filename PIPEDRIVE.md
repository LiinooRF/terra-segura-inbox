# Pipedrive App Extension - Instrucciones

## Paso 1: Ir al Developer Hub

Ve a https://developers.pipedrive.com/ y haz login con tu cuenta de Pipedrive.

## Paso 2: Crear app privada

1. Click en **"Create an app"**
2. Selecciona **"Create private app"** (no pública)
3. Completa los datos:

| Campo | Valor |
|-------|-------|
| App name | `Terra Segura Inbox` |
| Description | `Inbox de atención al cliente vía WhatsApp para Terra Segura` |
| App icon | Sube el logo de Terra Segura (o un ícono genérico) |
| Callback URL | `https://inbox.linorequena.xyz/api/pipedrive/callback` |

4. Click **"Create app"**

## Paso 3: Configurar Panel Extension

En la página de tu app, ve a la sección **"App Extensions"**:

1. Click **"Add extension"**
2. Elige **"Custom panel"**
3. Configura:

| Campo | Valor |
|-------|-------|
| Extension name | `WhatsApp Inbox` |
| Panel location | `Deals details view` |
| Extension URL | `https://inbox.linorequena.xyz/inbox` |
| Sandbox URL | `https://inbox.linorequena.xyz/inbox` |

4. Click **"Save"**

## Paso 4: Scopes

No necesitas OAuth scopes para una app privada que solo embebe un iframe. Si Pipedrive lo requiere, agrega estos scopes mínimos:

- `deals:read`
- `contacts:read`

## Paso 5: Instalar en tu cuenta

1. En el Developer Hub, click en el botón **"Install app"**
2. Serás redirigido a tu cuenta de Pipedrive para autorizar
3. Después de autorizar, serás redirigido al callback URL: `https://inbox.linorequena.xyz/api/pipedrive/callback?code=xxxx`
4. El callback guarda el código y redirige al inbox

## Paso 6: Ver el inbox en Pipedrive

Una vez instalado:
1. Ve a Pipedrive
2. Abre cualquier Deal
3. En el menú lateral izquierdo, busca **"WhatsApp Inbox"** bajo "Custom panels"
4. Al hacer click, el inbox se carga en un panel lateral como iframe

## Nota sobre cookies

Si el iframe de Pipedrive bloquea las cookies (problema de third-party cookies), tienes dos opciones:

### Opción A: Token en URL (recomendado para iframe)
Modificar el middleware de Next.js para aceptar `?token=xxx` y setear la cookie automáticamente.

### Opción B: SameSite=None
Configurar las cookies con `SameSite=None; Secure` en `lib/auth.ts`.

---

## Callback URL

La callback ya está implementada en `app/api/pipedrive/callback/route.ts`.
Recibe el parámetro `?code=` y redirige al inbox.
