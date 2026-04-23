import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { utils, write, WorkBook } from 'xlsx'
import { supabase } from '@/lib/supabase'
import { Transaction } from '@/types/database'
import { CATEGORY_LABEL, PAYMENT_LABEL } from '@/constants/categories'

function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

function transactionsToRows(transactions: Transaction[]) {
  return transactions.map((t) => ({
    Fecha: t.date,
    Tipo: t.type === 'ingreso' ? 'Ingreso' : 'Gasto',
    Categoría: CATEGORY_LABEL[t.category],
    Descripción: t.description ?? '',
    Inquilino: t.tenant?.name ?? '',
    'Monto (MXN)': t.amount,
    'Método de pago': PAYMENT_LABEL[t.payment_method],
  }))
}

function addTotalsRow(rows: ReturnType<typeof transactionsToRows>, total: number) {
  return [
    ...rows,
    {},
    {
      Fecha: '',
      Tipo: '',
      Categoría: '',
      Descripción: 'TOTAL',
      Inquilino: '',
      'Monto (MXN)': total,
      'Método de pago': '',
    },
  ]
}

export async function exportToExcel(startDate: string, endDate: string): Promise<void> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, tenant:tenants(name, property_name)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) throw new Error(`Error obteniendo datos: ${error.message}`)

  const all = (data ?? []) as Transaction[]
  const ingresos = all.filter((t) => t.type === 'ingreso')
  const gastos = all.filter((t) => t.type === 'gasto')

  const totalIngresos = ingresos.reduce((s, t) => s + t.amount, 0)
  const totalGastos = gastos.reduce((s, t) => s + t.amount, 0)

  const wb: WorkBook = utils.book_new()

  const wsIngresos = utils.json_to_sheet(addTotalsRow(transactionsToRows(ingresos), totalIngresos))
  utils.book_append_sheet(wb, wsIngresos, 'Ingresos')

  const wsGastos = utils.json_to_sheet(addTotalsRow(transactionsToRows(gastos), totalGastos))
  utils.book_append_sheet(wb, wsGastos, 'Gastos')

  const wbout = write(wb, { type: 'base64', bookType: 'xlsx' })

  const month = startDate.slice(0, 7)
  const filename = `MisFinanzas_${month}.xlsx`
  const path = `${FileSystem.cacheDirectory}${filename}`

  await FileSystem.writeAsStringAsync(path, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  })

  await Sharing.shareAsync(path, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: `Exportar ${filename}`,
    UTI: 'com.microsoft.excel.xlsx',
  })
}
