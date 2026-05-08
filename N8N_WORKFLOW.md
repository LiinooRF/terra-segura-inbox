# n8n Workflow - Terra Segura

## Requisitos previos

1. n8n corriendo en `https://n8n.linorequena.xyz`
2. Credenciales configuradas en n8n (Settings > Credentials):
   - **Supabase**: Service Role Key (`eyJhbGci...`), URL (`http://agenciapalena_posgress:8000` o localhost:8000)
   - **HTTP Request Auth**: Zavu API Key (`zv_test_314c46...`)
   - **OpenAI**: API Key (lo pones tú)

---

## Paso 1: Crear el Webhook de entrada

1. Nuevo workflow en n8n
2. Agregar nodo **Webhook**:
   - Method: `POST`
   - Path: `zavu-inbound`
   - Response: `JSON`
   - Response content: `{ "ok": true }`
   - Options > Response Mode: `Immediately`

## Paso 2: Parsear el payload del webhook

Agregar nodo **Code** conectado al Webhook:

```javascript
// Nombre: Parse Inbound

const body = $input.first().json.body || $input.first().json;
const evento = body;

const telefono = evento.data?.from || evento.from;
const texto = evento.data?.text || evento.text;
const timestamp = evento.timestamp || Date.now();
const eventId = evento.id;

// Si no tiene data, es porque ya viene parseado
const from = telefono;
const message = texto;

return {
  telefono_cliente: from,
  texto: message,
  timestamp: timestamp,
  event_id: eventId
};
```

## Paso 3: Buscar o crear conversación en Supabase

Agregar nodo **Supabase** > Resource: `Row` > Operation: `Get`:
- Table: `conversaciones`
- Search Column: `telefono_cliente`
- Search Value: `{{ $json.telefono_cliente }}`

Luego agrega un **IF** (nodo Switch):
- Condición: `{{ $json.id }}` existe (la conversación existe)

### Rama NO (conversación nueva — no existe):

Agregar nodo **Supabase** > Operation: `Create`:
- Table: `conversaciones`
- Data:
  - `telefono_cliente`: `{{ $json.telefono_cliente }}`
  - `estado`: `ia_activa`

### Rama SÍ (la conversación ya existe):

El flujo continúa normalmente. En ambos casos pasa al siguiente paso.

---

## Paso 4: Guardar el mensaje entrante

Agregar nodo **Supabase** > Operation: `Create`:
- Table: `mensajes`
- Data:
  - `id_conversacion`: `{{ $('Buscar Conversación').item.json.id }}` (o el nuevo ID)
  - `texto`: `{{ $json.texto }}`
  - `enviado_por`: `cliente`

**TIP**: Usa un nodo **Merge** para unificar las dos ramas (nueva conversación y existente) antes de este paso.

---

## Paso 5: Actualizar conversación

Agregar nodo **Supabase** > Operation: `Update`:
- Table: `conversaciones`
- Value to Update: `{{ $json.id_conversacion }}`
- Data:
  - `ultimo_mensaje`: `{{ $json.texto }}`
  - `ultimo_mensaje_at`: `{{ new Date().toISOString() }}`
  - `ultimo_mensaje_por`: `cliente`

---

## Paso 6: Verificar estado de la conversación

Agregar nodo **Switch** con 3 condiciones:
- **`cerrada`**: Reabrir (cambiar estado a `ia_activa`)
- **`asignada`**: Solo guardar mensaje, no hacer nada más (FIN)
- **`ia_activa`**: Continuar al agente IA

---

## Paso 7: Detectar si el cliente quiere un humano

Agregar nodo **Code**:

```javascript
// Nombre: Detectar intención humano

const texto = $input.first().json.texto?.toLowerCase() || '';

const palabrasClave = [
  'humano', 'agente', 'persona', 'asesor', 'real',
  'hablar con', 'ejecutivo', 'vendedor', 'no eres real',
  'quiero hablar', 'atención personal', 'operador'
];

const quiereHumano = palabrasClave.some(p => texto.includes(p));

return {
  ...$input.first().json,
  quiere_humano: quiereHumano
};
```

Agregar nodo **IF**:
- Condición: `{{ $json.quiere_humano }} === true`

---

## Paso 8A: Rama SÍ — Round Robin para asignar agente

### 8A.1 Buscar próximo agente disponible

Agregar nodo **Supabase** > Operation: `Get All`:
- Table: `agentes`
- Filters:
  - `activo` = `true`
  - `rol` = `agente`
- Sort: `ultimo_turno` ASC (NULLS FIRST)

### 8A.2 Seleccionar el primer agente

Agregar nodo **Code**:

```javascript
const agentes = $input.all();
const agente = agentes[0]?.json;

if (!agente) {
  // No hay agentes disponibles
  return {
    error: true,
    mensaje: "No hay agentes disponibles en este momento."
  };
}

return agente;
```

### 8A.3 Asignar conversación

Agregar nodo **Supabase** > Operation: `Update`:
- Table: `conversaciones`
- Value to Update: ID de la conversación
- Data:
  - `id_agente`: `{{ $json.id }}`
  - `estado`: `asignada`

### 8A.4 Actualizar turno del agente

Agregar nodo **Supabase** > Operation: `Update`:
- Table: `agentes`
- Value to Update: `{{ $json.id }}`
- Data:
  - `ultimo_turno`: `{{ new Date().toISOString() }}`

### 8A.5 Guardar mensaje del sistema

Agregar nodo **Supabase** > Operation: `Create`:
- Table: `mensajes`
- Data:
  - `id_conversacion`: ID de la conversación
  - `texto`: `"Conversación asignada a {{ $json.nombre }}"`
  - `enviado_por`: `ia`

### 8A.6 Enviar notificación al cliente vía Zavu

Agregar nodo **HTTP Request**:
- Method: `POST`
- URL: `https://api.zavudev.com/v1/messages`
- Headers:
  - `Authorization`: `Bearer zv_test_314c46daf67135b3c6ef81d15d7b9d4d9fef71682ba83ad1`
  - `Content-Type`: `application/json`
- Body (JSON):
```json
{
  "to": "{{ $('Parse Inbound').item.json.telefono_cliente }}",
  "channel": "whatsapp",
  "text": "Un asesor de Terra Segura te atenderá en breve. Gracias por tu paciencia."
}
```

---

## Paso 8B: Rama NO — Responder con IA (OpenAI)

### 8B.1 Construir el sistema de prompt

Agregar nodo **Code**:

```javascript
const nombre = $input.first().json.nombre_cliente || '';

return {
  model: "gpt-4o-mini",
  temperature: 0.7,
  max_tokens: 500,
  messages: [
    {
      role: "system",
      content: `Eres un asesor virtual de Terra Segura, una inmobiliaria especializada en terrenos.
Tu trabajo es ayudar a clientes interesados en comprar terrenos.

INFORMACIÓN DE TERRA SEGURA:
- Vendemos terrenos residenciales y de inversión en zonas con alto potencial
- Ofrecemos financiamiento directo sin banco
- Precios desde $150,000 MXN hasta $2,500,000 MXN
- Terrenos desde 200m² hasta 1,000m²
- Ubicaciones: zonas periféricas y suburbanas
- Requisitos: identificación oficial, comprobante de ingresos, enganche del 20%

COMPORTAMIENTO:
- Sé amable, profesional y conciso (máximo 3 oraciones por respuesta)
- Pregunta qué tipo de terreno busca el cliente (tamaño, presupuesto, ubicación)
- NO inventes precios ni ubicaciones específicas, di que un asesor le dará detalles
- Si el cliente insiste en hablar con una persona real, responde EXACTAMENTE:
  "Claro, te transfiero con un asesor humano. TRANSFERIR_HUMANO"`
    },
    {
      role: "user",
      content: $input.first().json.texto
    }
  ]
};
```

### 8B.2 Llamar a OpenAI

Agregar nodo **HTTP Request**:
- Method: `POST`
- URL: `https://api.openai.com/v1/chat/completions`
- Headers:
  - `Authorization`: `Bearer {{ $env.OPENAI_API_KEY }}`
  - `Content-Type`: `application/json`
- Body: Usar el output del nodo anterior `{{ $json }}`

### 8B.3 Extraer respuesta

Agregar nodo **Code**:

```javascript
const response = $input.first().json.choices[0].message.content;

return {
  respuesta: response,
  transferir: response.includes('TRANSFERIR_HUMANO')
};
```

Agregar nodo **IF**:
- Condición: `{{ $json.transferir }} === true`
- Si TRUE: Redirigir al flujo de Round Robin (Paso 8A)
- Si FALSE: Continuar

### 8B.4 Guardar respuesta IA

Agregar nodo **Supabase** > Operation: `Create`:
- Table: `mensajes`
- Data:
  - `id_conversacion`: ID de la conversación
  - `texto`: `{{ $json.respuesta }}` (limpia sin TRANSFERIR_HUMANO)
  - `enviado_por`: `ia`

### 8B.5 Enviar respuesta vía Zavu

Agregar nodo **HTTP Request**:
- Method: `POST`
- URL: `https://api.zavudev.com/v1/messages`
- Headers:
  - `Authorization`: `Bearer zv_test_314c46daf67135b3c6ef81d15d7b9d4d9fef71682ba83ad1`
  - `Content-Type`: `application/json`
- Body (JSON):
```json
{
  "to": "{{ $('Parse Inbound').item.json.telefono_cliente }}",
  "channel": "whatsapp",
  "text": "{{ $json.respuesta.replace('TRANSFERIR_HUMANO', '').trim() }}"
}
```

---

## Variables de entorno en n8n

Configura en Settings > Environment Variables:

```
SUPABASE_URL=http://agenciapalena_posgress:8000
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ZAVUDEV_API_KEY=zv_test_314c46...
OPENAI_API_KEY=sk-... (TU API KEY)
```

---

## Probar el flujo

1. Activar el webhook en n8n
2. Copiar la URL del webhook: `https://n8n.linorequena.xyz/webhook/zavu-inbound`
3. Configurar esta URL como webhook en el Sender de Zavu
4. Enviar un WhatsApp de prueba al número `+12024494825`
5. El flujo recibirá el webhook de Zavu y disparará todo el proceso

## Paso opcional: Webhook en Zavu

Para que Zavu envíe eventos a n8n, necesitas configurar el webhook en tu Sender:

```bash
# Si tienes el CLI de Zavu
npx zavudev senders update --senderId snd_tu_id \
  --webhookUrl https://n8n.linorequena.xyz/webhook/zavu-inbound \
  --webhookEvents message.inbound
```

O desde la API de Zavu directamente configurando el sender con su `webhookUrl`.
