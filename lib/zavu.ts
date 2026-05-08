// Zavu client - solo se usa en server-side (API routes, no en browser)
// Para usar en producción, instala: npm add @zavudev/sdk
// Por ahora usamos fetch directo a la API REST de Zavu

const ZAVU_API = "https://api.zavudev.com/v1";

function getApiKey(): string {
  return process.env.ZAVUDEV_API_KEY || "";
}

export async function sendWhatsAppMessage(to: string, text: string) {
  const res = await fetch(`${ZAVU_API}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      to,
      channel: "whatsapp",
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Zavu send error:", err);
    throw new Error(`Zavu API error: ${res.status}`);
  }

  return res.json();
}
