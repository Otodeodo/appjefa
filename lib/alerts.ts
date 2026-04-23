import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { RentAlertWithTenant } from '@/types/database'

const LAST_ALERT_RUN_KEY = 'mf_last_alert_run'
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export function getMonthStart(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export async function shouldTriggerAlerts(): Promise<boolean> {
  const lastRun = await AsyncStorage.getItem(LAST_ALERT_RUN_KEY)
  const today = new Date().toISOString().split('T')[0]
  return lastRun !== today
}

export async function triggerGenerateAlerts(): Promise<void> {
  const should = await shouldTriggerAlerts()
  if (!should) return

  const month = getMonthStart()

  try {
    await fetch(`${SUPABASE_URL}/functions/v1/generate-alerts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ month }),
    })

    const today = new Date().toISOString().split('T')[0]
    await AsyncStorage.setItem(LAST_ALERT_RUN_KEY, today)
  } catch {
    // Silencioso — la app funciona aunque falle
  }
}

export async function getPendingAlerts(): Promise<RentAlertWithTenant[]> {
  const month = getMonthStart()

  const { data, error } = await supabase
    .from('rent_alerts')
    .select(`
      *,
      tenant:tenants (name, property_name, rent_due_day, rent_amount)
    `)
    .eq('month', month)
    .eq('is_paid', false)

  if (error || !data) return []
  return data as RentAlertWithTenant[]
}

export async function markAlertPaid(
  tenantId: string,
  transactionId: string
): Promise<void> {
  const month = getMonthStart()
  await supabase
    .from('rent_alerts')
    .update({
      is_paid: true,
      paid_at: new Date().toISOString(),
      transaction_id: transactionId,
    })
    .eq('tenant_id', tenantId)
    .eq('month', month)
}
