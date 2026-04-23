import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    const { month } = await req.json()

    if (!month || !/^\d{4}-\d{2}-01$/.test(month)) {
      return Response.json(
        { error: 'month requerido en formato YYYY-MM-01' },
        { status: 400 }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id')
      .eq('is_active', true)

    if (tenantsError) throw tenantsError

    if (!tenants || tenants.length === 0) {
      return Response.json({ created: 0, existing: 0 })
    }

    const rows = tenants.map((t: { id: string }) => ({
      tenant_id: t.id,
      month,
      is_paid: false,
    }))

    const { data: upserted, error: upsertError } = await supabase
      .from('rent_alerts')
      .upsert(rows, { onConflict: 'tenant_id,month', ignoreDuplicates: true })
      .select()

    if (upsertError) throw upsertError

    const created = upserted?.length ?? 0
    const existing = tenants.length - created

    return Response.json(
      { created, existing },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  } catch (err) {
    console.error('generate-alerts error:', err)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
})
