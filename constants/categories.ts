import { Category, PaymentMethod } from '@/types/database'

export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'renta',     label: 'Renta',      emoji: '🏠' },
  { value: 'cafeteria', label: 'Cafetería',   emoji: '☕' },
  { value: 'insumo',    label: 'Insumo',      emoji: '🛒' },
  { value: 'servicio',  label: 'Servicio',    emoji: '⚡' },
  { value: 'otro',      label: 'Otro',        emoji: '📦' },
]

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'tarjeta',       label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
]

export const CATEGORY_LABEL: Record<Category, string> = {
  renta:     '🏠 Renta',
  cafeteria: '☕ Cafetería',
  insumo:    '🛒 Insumo',
  servicio:  '⚡ Servicio',
  otro:      '📦 Otro',
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  transferencia: 'Transferencia',
}
