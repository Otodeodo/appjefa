import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { uploadAndScan } from '@/lib/ocr'
import { useTransactions } from '@/hooks/useTransactions'
import { useTenants } from '@/hooks/useTenants'
import { useRentAlerts } from '@/hooks/useRentAlerts'
import { AmountInput } from '@/components/AmountInput'
import { TenantPicker } from '@/components/TenantPicker'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CATEGORIES, PAYMENT_METHODS } from '@/constants/categories'
import { Category, PaymentMethod, Tenant } from '@/types/database'

type Step = 'camera' | 'form'

export default function ScanScreen() {
  const router = useRouter()
  const { addTransaction } = useTransactions()
  const { tenants } = useTenants()
  const { markPaid } = useRentAlerts()

  const [step, setStep] = useState<Step>('camera')
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lowConfidence, setLowConfidence] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [ocrRaw, setOcrRaw] = useState<Record<string, unknown> | null>(null)

  const [amount, setAmount]           = useState('')
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [category, setCategory]       = useState<Category>('renta')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [isIncome, setIsIncome]       = useState(true)

  async function handleCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
      allowsEditing: false,
    })

    if (result.canceled) return

    setScanning(true)
    try {
      const { receiptUrl: url, ocrResult } = await uploadAndScan(result.assets[0].uri)
      setReceiptUrl(url)

      if (ocrResult) {
        setAmount(String(ocrResult.monto))
        setDate(ocrResult.fecha)
        setDescription(ocrResult.concepto ?? '')
        setLowConfidence(ocrResult.confianza < 0.6)
        setOcrRaw(ocrResult as unknown as Record<string, unknown>)
      }
    } catch {
      Alert.alert('Error', 'No se pudo procesar la imagen. Llena los datos manualmente.')
    } finally {
      setScanning(false)
      setStep('form')
    }
  }

  function handleManual() {
    setStep('form')
  }

  async function handleSave() {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert('Monto requerido', 'Ingresa un monto válido.')
      return
    }

    setSaving(true)
    try {
      const tx = await addTransaction({
        type: isIncome ? 'ingreso' : 'gasto',
        category,
        amount: parseFloat(amount),
        date,
        payment_method: paymentMethod,
        description: description || undefined,
        tenant_id: selectedTenant?.id,
        receipt_url: receiptUrl ?? undefined,
        ocr_raw: ocrRaw ?? undefined,
      })

      if (category === 'renta' && selectedTenant) {
        await markPaid(selectedTenant.id, tx.id)
      }

      router.replace('/(tabs)')
    } catch {
      Alert.alert('Error', 'No se pudo guardar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'camera') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.cameraView}>
          <Text style={styles.cameraTitle}>Nuevo registro</Text>

          {scanning ? (
            <View style={styles.scanningBox}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.scanningText}>Procesando imagen con IA...</Text>
            </View>
          ) : (
            <View style={styles.cameraBox}>
              <Text style={styles.cameraHint}>Apunta al recibo o pagaré</Text>
            </View>
          )}

          <Button label="📷  Tomar foto" onPress={handleCamera} style={styles.cameraBtn} disabled={scanning} />
          <TouchableOpacity onPress={handleManual} style={styles.manualLink}>
            <Text style={styles.manualText}>— o ingresar manualmente —</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.formContent}>
        <Text style={styles.formTitle}>
          {receiptUrl ? '📋 Datos detectados por IA' : '✏️ Nuevo registro'}
        </Text>

        {lowConfidence && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>⚠️ Verifica los datos — la imagen no se leyó con claridad</Text>
          </View>
        )}

        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, isIncome && styles.typeBtnActive]}
            onPress={() => setIsIncome(true)}
          >
            <Text style={[styles.typeBtnText, isIncome && styles.typeBtnTextActive]}>Ingreso</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, !isIncome && styles.typeBtnActive]}
            onPress={() => setIsIncome(false)}
          >
            <Text style={[styles.typeBtnText, !isIncome && styles.typeBtnTextActive]}>Gasto</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.formCard}>
          <Text style={styles.label}>Monto</Text>
          <AmountInput value={amount} onChange={setAmount} />

          <Text style={[styles.label, { marginTop: 16 }]}>Fecha</Text>
          <View style={styles.dateInput}>
            <Text style={styles.dateText}>{date}</Text>
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Categoría</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.value}
                style={[styles.chip, category === c.value && styles.chipActive]}
                onPress={() => setCategory(c.value)}
              >
                <Text style={[styles.chipText, category === c.value && styles.chipTextActive]}>
                  {c.emoji} {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {category === 'renta' && (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>Inquilino</Text>
              <TenantPicker tenants={tenants} selectedId={selectedTenant?.id ?? null} onSelect={setSelectedTenant} />
            </>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>Método de pago</Text>
          <View style={styles.chips}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.chip, paymentMethod === m.value && styles.chipActive]}
                onPress={() => setPaymentMethod(m.value)}
              >
                <Text style={[styles.chipText, paymentMethod === m.value && styles.chipTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Button label="Guardar registro" onPress={handleSave} loading={saving} style={{ marginTop: 16 }} />
        <TouchableOpacity onPress={() => setStep('camera')} style={styles.backLink}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#f9fafb' },
  cameraView:       { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  cameraTitle:      { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 32 },
  cameraBox:        { width: 260, height: 200, borderWidth: 3, borderColor: '#6366f1', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  cameraHint:       { color: '#6b7280', fontSize: 14 },
  scanningBox:      { alignItems: 'center', marginBottom: 40, gap: 16 },
  scanningText:     { color: '#6366f1', fontSize: 15, fontWeight: '500' },
  cameraBtn:        { width: '100%' },
  manualLink:       { marginTop: 20 },
  manualText:       { color: '#9ca3af', fontSize: 14 },
  formContent:      { padding: 20, paddingBottom: 40 },
  formTitle:        { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  warning:          { backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, marginBottom: 16 },
  warningText:      { color: '#92400e', fontSize: 13 },
  typeRow:          { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeBtn:          { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  typeBtnActive:    { backgroundColor: '#6366f1' },
  typeBtnText:      { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  typeBtnTextActive:{ color: '#fff' },
  formCard:         {},
  label:            { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateInput:        { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 14 },
  dateText:         { fontSize: 16, color: '#374151' },
  chips:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:             { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: 'transparent' },
  chipActive:       { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  chipText:         { fontSize: 13, color: '#6b7280' },
  chipTextActive:   { color: '#4338ca', fontWeight: '600' },
  backLink:         { marginTop: 16, alignItems: 'center' },
  backText:         { color: '#9ca3af', fontSize: 14 },
})
