import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Tenant } from '@/types/database'

export function useTenants(onlyActive = true) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('tenants').select('*').order('name')
    if (onlyActive) query = query.eq('is_active', true)
    const { data } = await query
    setTenants((data ?? []) as Tenant[])
    setLoading(false)
  }, [onlyActive])

  useEffect(() => { fetch() }, [fetch])

  async function addTenant(tenant: Omit<Tenant, 'id' | 'is_active'>): Promise<void> {
    const { data, error } = await supabase
      .from('tenants')
      .insert({ ...tenant, is_active: true })
      .select()
      .single()
    if (error) throw new Error(error.message)
    setTenants((prev) => [...prev, data as Tenant].sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function deactivateTenant(id: string): Promise<void> {
    await supabase.from('tenants').update({ is_active: false }).eq('id', id)
    setTenants((prev) => prev.filter((t) => t.id !== id))
  }

  return { tenants, loading, refetch: fetch, addTenant, deactivateTenant }
}
