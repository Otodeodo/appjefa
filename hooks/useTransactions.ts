import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Transaction, NewTransaction } from '@/types/database'

export function useTransactions(filters?: {
  startDate?: string
  endDate?: string
  category?: string
  type?: string
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('transactions')
      .select('*, tenant:tenants(name, property_name)')
      .order('date', { ascending: false })
      .limit(200)

    if (filters?.startDate) query = query.gte('date', filters.startDate)
    if (filters?.endDate)   query = query.lte('date', filters.endDate)
    if (filters?.category)  query = query.eq('category', filters.category)
    if (filters?.type)      query = query.eq('type', filters.type)

    const { data, error: err } = await query
    if (err) setError(err.message)
    else setTransactions((data ?? []) as Transaction[])
    setLoading(false)
  }, [filters?.startDate, filters?.endDate, filters?.category, filters?.type])

  useEffect(() => { fetch() }, [fetch])

  async function addTransaction(tx: NewTransaction): Promise<Transaction> {
    const { data, error: err } = await supabase
      .from('transactions')
      .insert(tx)
      .select('*, tenant:tenants(name, property_name)')
      .single()
    if (err) throw new Error(err.message)
    const newTx = data as Transaction
    setTransactions((prev) => [newTx, ...prev])
    return newTx
  }

  async function deleteTransaction(id: string): Promise<void> {
    const { error: err } = await supabase.from('transactions').delete().eq('id', id)
    if (err) throw new Error(err.message)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  return { transactions, loading, error, refetch: fetch, addTransaction, deleteTransaction }
}
