export type TransactionType = 'ingreso' | 'gasto'

export type Category =
  | 'renta'
  | 'cafeteria'
  | 'insumo'
  | 'servicio'
  | 'otro'

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia'

export interface Tenant {
  id: string
  name: string
  property_name: string
  rent_amount: number
  rent_due_day: number
  phone: string | null
  is_active: boolean
}

export interface Transaction {
  id: string
  type: TransactionType
  category: Category
  amount: number
  date: string           // ISO date 'YYYY-MM-DD'
  payment_method: PaymentMethod
  description: string | null
  tenant_id: string | null
  receipt_url: string | null
  ocr_raw: Record<string, unknown> | null
  created_at: string
  tenant?: Pick<Tenant, 'name' | 'property_name'>
}

export interface RentAlert {
  id: string
  tenant_id: string
  month: string          // 'YYYY-MM-01'
  is_paid: boolean
  paid_at: string | null
  transaction_id: string | null
}

export interface RentAlertWithTenant extends RentAlert {
  tenant: Pick<Tenant, 'name' | 'property_name' | 'rent_due_day' | 'rent_amount'>
}

export interface AppConfig {
  key: string
  value: string
}

export interface OcrResult {
  monto: number
  fecha: string          // 'YYYY-MM-DD'
  nombre: string | null
  concepto: string | null
  confianza: number      // 0-1
}

export interface NewTransaction {
  type: TransactionType
  category: Category
  amount: number
  date: string
  payment_method: PaymentMethod
  description?: string
  tenant_id?: string
  receipt_url?: string
  ocr_raw?: Record<string, unknown>
}
