import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

const SYSTEM_PROMPT = `Eres un asistente especializado en extraer información de documentos financieros mexicanos.
Se te dará la imagen de un recibo, pagaré, ticket o comprobante.
Extrae ÚNICAMENTE estos campos en JSON, sin texto adicional:
{
  "monto": número (sin comas, sin símbolo $),
  "fecha": "YYYY-MM-DD",
  "nombre": "nombre de la persona o empresa que paga/emite" o null,
  "concepto": "descripción breve del pago" o null,
  "confianza": número entre 0 y 1 (qué tan seguro estás de la extracción)
}
Si no puedes leer un campo, ponlo en null. Si no hay fecha clara, usa la fecha de hoy.
Responde SOLO con el JSON, sin markdown, sin explicaciones.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { image_url } = await req.json()

    if (!image_url || typeof image_url !== 'string') {
      return Response.json({ error: 'image_url requerida' }, { status: 400 })
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: image_url, detail: 'high' },
              },
            ],
          },
        ],
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.text()
      console.error('OpenAI error:', err)
      return Response.json({ error: 'Error al procesar la imagen' }, { status: 502 })
    }

    const openaiData = await openaiRes.json()
    const content = openaiData.choices?.[0]?.message?.content ?? ''

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(content)
    } catch {
      console.error('No se pudo parsear respuesta de OpenAI:', content)
      return Response.json({ error: 'No se pudo extraer información' }, { status: 422 })
    }

    const result = {
      monto:     typeof parsed.monto === 'number' ? parsed.monto : null,
      fecha:     typeof parsed.fecha === 'string' ? parsed.fecha : new Date().toISOString().split('T')[0],
      nombre:    typeof parsed.nombre === 'string' ? parsed.nombre : null,
      concepto:  typeof parsed.concepto === 'string' ? parsed.concepto : null,
      confianza: typeof parsed.confianza === 'number' ? Math.min(1, Math.max(0, parsed.confianza)) : 0.5,
    }

    if (result.monto === null) {
      return Response.json({ error: 'No se pudo extraer el monto' }, { status: 422 })
    }

    return Response.json(result, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('ocr-scan error:', err)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
})
