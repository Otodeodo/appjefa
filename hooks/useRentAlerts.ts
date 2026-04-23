import { useState, useEffect } from 'react'
import { RentAlertWithTenant } from '@/types/database'
import { triggerGenerateAlerts, getPendingAlerts, markAlertPaid } from '@/lib/alerts'

export function useRentAlerts() {
  const [pendingAlerts, setPendingAlerts] = useState<RentAlertWithTenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      await triggerGenerateAlerts()
      const alerts = await getPendingAlerts()
      setPendingAlerts(alerts)
      setLoading(false)
    }
    init()
  }, [])

  async function markPaid(tenantId: string, transactionId: string): Promise<void> {
    await markAlertPaid(tenantId, transactionId)
    setPendingAlerts((prev) => prev.filter((a) => a.tenant_id !== tenantId))
  }

  return { pendingAlerts, loading, markPaid }
}
