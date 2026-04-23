import * as FileSystem from 'expo-file-system'
import * as ImageManipulator from 'expo-image-manipulator'
import { supabase } from '@/lib/supabase'
import { OcrResult } from '@/types/database'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export async function uploadReceipt(localUri: string): Promise<string> {
  const compressed = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 800 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  )

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const now = new Date()
  const path = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${fileName}`

  const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
    encoding: 'base64',
  })
  const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg' })

  if (error) throw new Error(`Error subiendo imagen: ${error.message}`)

  const { data: signedData } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 3600)

  if (!signedData?.signedUrl) throw new Error('No se pudo generar URL firmada')

  return signedData.signedUrl
}

export async function scanReceiptUrl(imageUrl: string): Promise<OcrResult | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ocr-scan`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image_url: imageUrl }),
    })

    if (!res.ok) return null

    const data = await res.json()
    if (data.error) return null

    return data as OcrResult
  } catch {
    return null
  }
}

export async function uploadAndScan(
  localUri: string
): Promise<{ receiptUrl: string; ocrResult: OcrResult | null }> {
  const receiptUrl = await uploadReceipt(localUri)
  const ocrResult = await scanReceiptUrl(receiptUrl)
  return { receiptUrl, ocrResult }
}
