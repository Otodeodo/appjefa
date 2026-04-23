# MisFinanzas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir MisFinanzas — app React Native + Expo para gestión financiera de una empresaria mexicana: rentas, cafetería, gastos, escaneo OCR de recibos y exportación Excel.

**Architecture:** Backend 100% en Supabase (Postgres + Storage + Edge Functions). Auth por PIN con bcryptjs en cliente. OCR vía GPT-4 Vision a través de Edge Function. Excel generado en cliente con xlsx. Sin Supabase Auth.

**Tech Stack:** React Native · Expo SDK 51 · Expo Router v3 · @supabase/supabase-js v2 · bcryptjs · expo-secure-store · expo-image-picker · expo-file-system · expo-sharing · xlsx · TypeScript

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `types/database.ts` | Tipos TypeScript de todas las entidades |
| `constants/categories.ts` | Categorías y métodos de pago como constantes |
| `lib/supabase.ts` | Cliente Supabase singleton |
| `lib/auth.ts` | Hash PIN, verificar PIN, sesión 7 días |
| `lib/ocr.ts` | Upload imagen + llamada Edge Function ocr-scan |
| `lib/alerts.ts` | Trigger generate-alerts + consultar alertas pendientes |
| `lib/export.ts` | Generar Excel con xlsx y compartir |
| `hooks/useTransactions.ts` | CRUD de transactions |
| `hooks/useTenants.ts` | CRUD de tenants |
| `hooks/useRentAlerts.ts` | Alertas del mes actual |
| `supabase/migrations/001_tenants.sql` | Tabla tenants |
| `supabase/migrations/002_transactions.sql` | Tabla transactions |
| `supabase/migrations/003_rent_alerts.sql` | Tabla rent_alerts |
| `supabase/migrations/004_app_config.sql` | Tabla app_config + storage bucket |
| `supabase/functions/ocr-scan/index.ts` | Edge Function: GPT-4 Vision |
| `supabase/functions/generate-alerts/index.ts` | Edge Function: crear rent_alerts del mes |
| `components/ui/Button.tsx` | Botón reutilizable |
| `components/ui/Card.tsx` | Card contenedor |
| `components/AmountInput.tsx` | Input numérico formateado en MXN |
| `components/TransactionCard.tsx` | Tarjeta de un movimiento |
| `components/TenantPicker.tsx` | Selector de inquilino |
| `components/RentAlertBanner.tsx` | Banner de renta pendiente |
| `app/_layout.tsx` | Layout raíz con guard de autenticación |
| `app/(auth)/pin.tsx` | Pantalla PIN (crear + ingresar) |
| `app/(tabs)/_layout.tsx` | Tab navigator |
| `app/(tabs)/index.tsx` | Dashboard |
| `app/(tabs)/scan.tsx` | Escanear recibo/pagaré |
| `app/(tabs)/history.tsx` | Historial filtrable |
| `app/(tabs)/export.tsx` | Exportar al contador |

---

## Task 1: Inicializar proyecto Expo

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `.env`, `.gitignore`

- [ ] **Step 1: Crear proyecto Expo con template TypeScript**

```bash
cd /Users/otoniel213
npx create-expo-app@latest appjefa --template blank-typescript
cd appjefa
```

- [ ] **Step 2: Instalar dependencias de navegación y Expo Router**

```bash
npx expo install expo-router expo-linking expo-constants expo-font expo-status-bar react-native-safe-area-context react-native-screens
```

- [ ] **Step 3: Instalar dependencias del proyecto**

```bash
npx expo install @supabase/supabase-js expo-secure-store expo-image-picker expo-file-system expo-sharing

npm install bcryptjs xlsx

npm install -D @types/bcryptjs
```

- [ ] **Step 4: Configurar Expo Router en `app.json`**

Reemplazar el contenido de `app.json`:

```json
{
  "expo": {
    "name": "MisFinanzas",
    "slug": "misfinanzas",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "misfinanzas",
    "userInterfaceStyle": "light",
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.appjefa.misfinanzas"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#ffffff"
      },
      "package": "com.appjefa.misfinanzas"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-image-picker",
        { "cameraPermission": "MisFinanzas necesita acceso a la cámara para escanear recibos." }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 5: Configurar `tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 6: Crear `.env`**

```bash
cat > .env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
EOF
```

- [ ] **Step 7: Crear `.gitignore`**

```bash
cat > .gitignore << 'EOF'
node_modules/
.expo/
dist/
.env
.env.local
.superpowers/
*.orig.*
web-build/
ios/
android/
EOF
```

- [ ] **Step 8: Verificar que la app arranca**

```bash
npx expo start
```

Esperado: QR code en terminal, sin errores de compilación.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize Expo project with Router and dependencies"
```

---

## Task 2: Tipos TypeScript y constantes

**Files:**
- Create: `types/database.ts`
- Create: `constants/categories.ts`

- [ ] **Step 1: Crear `types/database.ts`**

```typescript
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
```

- [ ] **Step 2: Crear `constants/categories.ts`**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add types/ constants/
git commit -m "feat: add TypeScript types and category constants"
```

---

## Task 3: Migraciones SQL de Supabase

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/001_tenants.sql`
- Create: `supabase/migrations/002_transactions.sql`
- Create: `supabase/migrations/003_rent_alerts.sql`
- Create: `supabase/migrations/004_app_config.sql`

**Prerequisito:** Tener [Supabase CLI](https://supabase.com/docs/guides/cli) instalado (`brew install supabase/tap/supabase`) y un proyecto creado en supabase.com.

- [ ] **Step 1: Crear `supabase/config.toml`**

```bash
mkdir -p supabase/migrations supabase/functions
```

```toml
# supabase/config.toml
[api]
enabled = true
port = 54321

[db]
port = 54322

[studio]
enabled = true
port = 54323
```

- [ ] **Step 2: Crear `supabase/migrations/001_tenants.sql`**

```sql
CREATE TABLE IF NOT EXISTS tenants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  property_name text NOT NULL,
  rent_amount   numeric(10,2) NOT NULL,
  rent_due_day  int NOT NULL CHECK (rent_due_day BETWEEN 1 AND 31),
  phone         text,
  is_active     boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_tenants_is_active ON tenants (is_active);
```

- [ ] **Step 3: Crear `supabase/migrations/002_transactions.sql`**

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type           text NOT NULL CHECK (type IN ('ingreso', 'gasto')),
  category       text NOT NULL CHECK (category IN ('renta', 'cafeteria', 'insumo', 'servicio', 'otro')),
  amount         numeric(10,2) NOT NULL CHECK (amount > 0),
  date           date NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia')),
  description    text,
  tenant_id      uuid REFERENCES tenants(id) ON DELETE SET NULL,
  receipt_url    text,
  ocr_raw        jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_date ON transactions (date DESC);
CREATE INDEX idx_transactions_type ON transactions (type);
CREATE INDEX idx_transactions_tenant_id ON transactions (tenant_id);
```

- [ ] **Step 4: Crear `supabase/migrations/003_rent_alerts.sql`**

```sql
CREATE TABLE IF NOT EXISTS rent_alerts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month          date NOT NULL,
  is_paid        boolean NOT NULL DEFAULT false,
  paid_at        timestamptz,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  UNIQUE (tenant_id, month)
);

CREATE INDEX idx_rent_alerts_month ON rent_alerts (month);
CREATE INDEX idx_rent_alerts_is_paid ON rent_alerts (is_paid);
```

- [ ] **Step 5: Crear `supabase/migrations/004_app_config.sql`**

```sql
CREATE TABLE IF NOT EXISTS app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- Filas iniciales
INSERT INTO app_config (key, value) VALUES
  ('owner_name',        'Mamá'),
  ('alert_days_before', '3')
ON CONFLICT (key) DO NOTHING;

-- Storage bucket privado para recibos
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: acceso total (app de un solo usuario, sin RLS)
CREATE POLICY "Allow all storage operations"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'receipts')
  WITH CHECK (bucket_id = 'receipts');
```

- [ ] **Step 6: Aplicar migraciones en Supabase**

Opción A — Dashboard SQL Editor (más fácil para empezar):
1. Ir a supabase.com → tu proyecto → SQL Editor
2. Pegar y ejecutar cada archivo SQL en orden (001 → 004)

Opción B — CLI:
```bash
supabase db push
```

- [ ] **Step 7: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase migrations for all tables and storage bucket"
```

---

## Task 4: Cliente Supabase

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Crear `lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY en .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
})
```

- [ ] **Step 2: Verificar conexión manualmente**

En `app/(tabs)/index.tsx` temporal, agregar:

```typescript
import { supabase } from '@/lib/supabase'

// En un useEffect temporal:
useEffect(() => {
  supabase.from('app_config').select('*').then(console.log)
}, [])
```

Esperado en consola: `{ data: [{key: 'owner_name', value: 'Mamá'}, ...], error: null }`

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add Supabase client singleton"
```

---

## Task 5: Edge Function ocr-scan

**Files:**
- Create: `supabase/functions/ocr-scan/index.ts`

- [ ] **Step 1: Crear `supabase/functions/ocr-scan/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

const SYSTEM_PROMPT = `Eres un asistente especializado en extraer información de documentos financieros mexicanos.
Se te dará la imagen de un recibo, pagaré, ticket o comprobante.
Extrae ÚNICAMENTE estos campos en JSON, sin texto adicional:
{
  "monto": número (sin comas, sin símbolo $),
  "fecha": "YYYY-MM-DD",
  "nombre": "nombre de la persona o empresa que paga/emite" o null,
  "concepto": "descripción breve del pago" o null,
  "confianza": número entre 0 y 1 (qué tan seguro estás de la extracción)
}
Si no puedes leer un campo, ponlo en null. Si no hay fecha clara, usa la fecha de hoy.
Responde SOLO con el JSON, sin markdown, sin explicaciones.`

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
    const { image_url } = await req.json()

    if (!image_url || typeof image_url !== 'string') {
      return Response.json({ error: 'image_url requerida' }, { status: 400 })
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: image_url, detail: 'high' },
              },
            ],
          },
        ],
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.text()
      console.error('OpenAI error:', err)
      return Response.json({ error: 'Error al procesar la imagen' }, { status: 502 })
    }

    const openaiData = await openaiRes.json()
    const content = openaiData.choices?.[0]?.message?.content ?? ''

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(content)
    } catch {
      console.error('No se pudo parsear respuesta de OpenAI:', content)
      return Response.json({ error: 'No se pudo extraer información' }, { status: 422 })
    }

    const result = {
      monto:      typeof parsed.monto === 'number' ? parsed.monto : null,
      fecha:      typeof parsed.fecha === 'string' ? parsed.fecha : new Date().toISOString().split('T')[0],
      nombre:     typeof parsed.nombre === 'string' ? parsed.nombre : null,
      concepto:   typeof parsed.concepto === 'string' ? parsed.concepto : null,
      confianza:  typeof parsed.confianza === 'number' ? Math.min(1, Math.max(0, parsed.confianza)) : 0.5,
    }

    if (result.monto === null) {
      return Response.json({ error: 'No se pudo extraer el monto' }, { status: 422 })
    }

    return Response.json(result, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('ocr-scan error:', err)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
})
```

- [ ] **Step 2: Configurar secret de OpenAI en Supabase**

```bash
supabase secrets set OPENAI_API_KEY=sk-...TU_KEY...
```

- [ ] **Step 3: Deploy de la Edge Function**

```bash
supabase functions deploy ocr-scan
```

Esperado: `Deployed ocr-scan`

- [ ] **Step 4: Probar manualmente**

```bash
curl -X POST https://TU_PROYECTO.supabase.co/functions/v1/ocr-scan \
  -H "Authorization: Bearer TU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Biharwe_Market_-_Receipts.jpg/1280px-Biharwe_Market_-_Receipts.jpg"}'
```

Esperado: JSON con `monto`, `fecha`, `nombre`, `concepto`, `confianza`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/ocr-scan/
git commit -m "feat: add ocr-scan Edge Function with GPT-4 Vision"
```

---

## Task 6: Edge Function generate-alerts

**Files:**
- Create: `supabase/functions/generate-alerts/index.ts`

- [ ] **Step 1: Crear `supabase/functions/generate-alerts/index.ts`**

```typescript
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
```

- [ ] **Step 2: Deploy**

```bash
supabase functions deploy generate-alerts
```

- [ ] **Step 3: Probar manualmente**

```bash
# Primero asegúrate de tener al menos un tenant en la DB
curl -X POST https://TU_PROYECTO.supabase.co/functions/v1/generate-alerts \
  -H "Authorization: Bearer TU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"month": "2026-04-01"}'
```

Esperado: `{"created": N, "existing": 0}`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/generate-alerts/
git commit -m "feat: add generate-alerts Edge Function"
```

---

## Task 7: lib/auth.ts

**Files:**
- Create: `lib/auth.ts`
- Create: `lib/__tests__/auth.test.ts`

- [ ] **Step 1: Escribir tests fallidos en `lib/__tests__/auth.test.ts`**

```typescript
import * as SecureStore from 'expo-secure-store'
import { hashPin, verifyPin, saveSession, isSessionValid, clearSession } from '../auth'

jest.mock('expo-secure-store')
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() =>
        Promise.resolve({ data: { key: 'pin_hash', value: 'hashedpin' }, error: null })
      }))}))
    }))
  }
}))

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>

describe('auth', () => {
  beforeEach(() => jest.clearAllMocks())

  test('hashPin returns non-empty string different from input', async () => {
    const hash = await hashPin('1234')
    expect(hash).toBeTruthy()
    expect(hash).not.toBe('1234')
    expect(hash.length).toBeGreaterThan(20)
  })

  test('verifyPin returns true for correct pin', async () => {
    const hash = await hashPin('1234')
    const result = await verifyPin('1234', hash)
    expect(result).toBe(true)
  })

  test('verifyPin returns false for wrong pin', async () => {
    const hash = await hashPin('1234')
    const result = await verifyPin('9999', hash)
    expect(result).toBe(false)
  })

  test('isSessionValid returns false when no session stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null)
    const result = await isSessionValid()
    expect(result).toBe(false)
  })

  test('isSessionValid returns false for expired session', async () => {
    const expired = JSON.stringify({ token: 'abc', expiresAt: Date.now() - 1000 })
    mockSecureStore.getItemAsync.mockResolvedValue(expired)
    const result = await isSessionValid()
    expect(result).toBe(false)
  })

  test('isSessionValid returns true for valid session', async () => {
    const valid = JSON.stringify({ token: 'abc', expiresAt: Date.now() + 1_000_000 })
    mockSecureStore.getItemAsync.mockResolvedValue(valid)
    const result = await isSessionValid()
    expect(result).toBe(true)
  })

  test('clearSession removes stored session', async () => {
    await clearSession()
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('mf_session')
  })
})
```

- [ ] **Step 2: Ejecutar tests para verificar que fallan**

```bash
npx jest lib/__tests__/auth.test.ts
```

Esperado: FAIL — `Cannot find module '../auth'`

- [ ] **Step 3: Crear `lib/auth.ts`**

```typescript
import * as SecureStore from 'expo-secure-store'
import bcryptjs from 'bcryptjs'
import { supabase } from '@/lib/supabase'

const SESSION_KEY = 'mf_session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 días

interface Session {
  token: string
  expiresAt: number
}

export async function hashPin(pin: string): Promise<string> {
  return bcryptjs.hash(pin, 10)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(pin, hash)
}

export async function saveSession(): Promise<void> {
  const session: Session = {
    token: Math.random().toString(36).slice(2),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session))
}

export async function isSessionValid(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY)
    if (!raw) return false
    const session: Session = JSON.parse(raw)
    return session.expiresAt > Date.now()
  } catch {
    return false
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY)
}

/** Obtiene el pin_hash guardado en Supabase app_config */
export async function getStoredPinHash(): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'pin_hash')
    .single()
  if (error || !data) return null
  return data.value
}

/** Guarda un nuevo pin_hash en Supabase app_config */
export async function storePinHash(hash: string): Promise<void> {
  await supabase
    .from('app_config')
    .upsert({ key: 'pin_hash', value: hash })
}
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

```bash
npx jest lib/__tests__/auth.test.ts
```

Esperado: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts lib/__tests__/auth.test.ts
git commit -m "feat: add PIN auth with bcryptjs and 7-day session"
```

---

## Task 8: lib/ocr.ts

**Files:**
- Create: `lib/ocr.ts`

- [ ] **Step 1: Crear `lib/ocr.ts`**

```typescript
import * as FileSystem from 'expo-file-system'
import * as ImageManipulator from 'expo-image-manipulator'
import { supabase } from '@/lib/supabase'
import { OcrResult } from '@/types/database'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Comprime imagen a 800px máximo y la sube a Supabase Storage.
 * Retorna la URL pública del archivo.
 */
export async function uploadReceipt(localUri: string): Promise<string> {
  // Comprimir
  const compressed = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 800 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  )

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const now = new Date()
  const path = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${fileName}`

  // Leer como base64
  const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
    encoding: FileSystem.EncodingType.Base64,
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

/**
 * Llama a la Edge Function ocr-scan con la URL de la imagen.
 * Retorna OcrResult o null si falla.
 */
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

/**
 * Flujo completo: sube imagen y ejecuta OCR.
 * receipt_url siempre se retorna (incluso si OCR falla).
 */
export async function uploadAndScan(
  localUri: string
): Promise<{ receiptUrl: string; ocrResult: OcrResult | null }> {
  const receiptUrl = await uploadReceipt(localUri)
  const ocrResult = await scanReceiptUrl(receiptUrl)
  return { receiptUrl, ocrResult }
}
```

- [ ] **Step 2: Instalar expo-image-manipulator**

```bash
npx expo install expo-image-manipulator
```

- [ ] **Step 3: Commit**

```bash
git add lib/ocr.ts
git commit -m "feat: add OCR utility with image upload and Edge Function call"
```

---

## Task 9: lib/alerts.ts

**Files:**
- Create: `lib/alerts.ts`
- Create: `lib/__tests__/alerts.test.ts`

- [ ] **Step 1: Escribir tests fallidos en `lib/__tests__/alerts.test.ts`**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { shouldTriggerAlerts, getMonthStart } from '../alerts'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}))

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>

describe('alerts utils', () => {
  beforeEach(() => jest.clearAllMocks())

  test('getMonthStart returns first day of given date month', () => {
    const result = getMonthStart(new Date('2026-04-15'))
    expect(result).toBe('2026-04-01')
  })

  test('shouldTriggerAlerts returns true when no last run stored', async () => {
    mockStorage.getItem.mockResolvedValue(null)
    const result = await shouldTriggerAlerts()
    expect(result).toBe(true)
  })

  test('shouldTriggerAlerts returns false when last run was today', async () => {
    const today = new Date().toISOString().split('T')[0]
    mockStorage.getItem.mockResolvedValue(today)
    const result = await shouldTriggerAlerts()
    expect(result).toBe(false)
  })

  test('shouldTriggerAlerts returns true when last run was yesterday', async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
    mockStorage.getItem.mockResolvedValue(yesterday)
    const result = await shouldTriggerAlerts()
    expect(result).toBe(true)
  })
})
```

- [ ] **Step 2: Ejecutar tests — verificar que fallan**

```bash
npx jest lib/__tests__/alerts.test.ts
```

Esperado: FAIL — `Cannot find module '../alerts'`

- [ ] **Step 3: Crear `lib/alerts.ts`**

```typescript
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

/**
 * Llama a la Edge Function generate-alerts si no se ha llamado hoy.
 */
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
    // Silencioso — la app funciona aunque falle la generación de alertas
  }
}

/**
 * Retorna las rent_alerts pendientes del mes actual con datos del inquilino.
 */
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

/**
 * Marca una renta como pagada y la vincula a una transacción.
 */
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
```

- [ ] **Step 4: Instalar AsyncStorage**

```bash
npx expo install @react-native-async-storage/async-storage
```

- [ ] **Step 5: Ejecutar tests — verificar que pasan**

```bash
npx jest lib/__tests__/alerts.test.ts
```

Esperado: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/alerts.ts lib/__tests__/alerts.test.ts
git commit -m "feat: add alerts utility with daily trigger guard"
```

---

## Task 10: lib/export.ts

**Files:**
- Create: `lib/export.ts`

- [ ] **Step 1: Crear `lib/export.ts`**

```typescript
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

/**
 * Genera un archivo Excel con 2 hojas (Ingresos y Gastos) y lo comparte.
 */
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

  const month = startDate.slice(0, 7) // 'YYYY-MM'
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/export.ts
git commit -m "feat: add Excel export utility with xlsx and expo-sharing"
```

---

## Task 11: Hooks

**Files:**
- Create: `hooks/useTransactions.ts`
- Create: `hooks/useTenants.ts`
- Create: `hooks/useRentAlerts.ts`

- [ ] **Step 1: Crear `hooks/useTransactions.ts`**

```typescript
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
```

- [ ] **Step 2: Crear `hooks/useTenants.ts`**

```typescript
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
```

- [ ] **Step 3: Crear `hooks/useRentAlerts.ts`**

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add hooks/
git commit -m "feat: add useTransactions, useTenants, and useRentAlerts hooks"
```

---

## Task 12: Componentes UI

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/AmountInput.tsx`
- Create: `components/TransactionCard.tsx`
- Create: `components/TenantPicker.tsx`
- Create: `components/RentAlertBanner.tsx`

- [ ] **Step 1: Crear `components/ui/Button.tsx`**

```typescript
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const bg = variant === 'primary' ? '#6366f1'
           : variant === 'danger'  ? '#ef4444'
           : '#f3f4f6'
  const textColor = variant === 'secondary' ? '#374151' : '#fff'

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, style]}
    >
      {loading
        ? <ActivityIndicator color={textColor} />
        : <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      }
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base:  { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '600' },
})
```

- [ ] **Step 2: Crear `components/ui/Card.tsx`**

```typescript
import { View, StyleSheet, ViewStyle } from 'react-native'

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
})
```

- [ ] **Step 3: Crear `components/AmountInput.tsx`**

```typescript
import { useState } from 'react'
import { TextInput, Text, View, StyleSheet } from 'react-native'

interface AmountInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function AmountInput({ value, onChange, placeholder = '0.00' }: AmountInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.symbol}>$</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => {
          // Solo números y un punto decimal
          const clean = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
          onChange(clean)
        }}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
      />
      <Text style={styles.currency}>MXN</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, height: 56 },
  symbol:    { fontSize: 20, color: '#374151', marginRight: 4 },
  input:     { flex: 1, fontSize: 24, fontWeight: '700', color: '#111827' },
  currency:  { fontSize: 14, color: '#9ca3af', marginLeft: 4 },
})
```

- [ ] **Step 4: Crear `components/TransactionCard.tsx`**

```typescript
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Transaction } from '@/types/database'
import { CATEGORY_LABEL } from '@/constants/categories'

interface TransactionCardProps {
  transaction: Transaction
  onPress?: () => void
}

export function TransactionCard({ transaction: t, onPress }: TransactionCardProps) {
  const isIncome = t.type === 'ingreso'
  const amountColor = isIncome ? '#10b981' : '#ef4444'
  const sign = isIncome ? '+' : '-'

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.category}>{CATEGORY_LABEL[t.category]}</Text>
        <Text style={styles.description} numberOfLines={1}>
          {t.tenant?.name ?? t.description ?? '—'}
        </Text>
        <Text style={styles.date}>{t.date} · {t.payment_method}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {sign}${t.amount.toLocaleString('es-MX')}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  left:        { flex: 1, marginRight: 12 },
  category:    { fontSize: 14, fontWeight: '600', color: '#374151' },
  description: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  date:        { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  amount:      { fontSize: 16, fontWeight: '700' },
})
```

- [ ] **Step 5: Crear `components/TenantPicker.tsx`**

```typescript
import { View, Text, TouchableOpacity, FlatList, Modal, StyleSheet } from 'react-native'
import { useState } from 'react'
import { Tenant } from '@/types/database'

interface TenantPickerProps {
  tenants: Tenant[]
  selectedId: string | null
  onSelect: (tenant: Tenant | null) => void
}

export function TenantPicker({ tenants, selectedId, onSelect }: TenantPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = tenants.find((t) => t.id === selectedId)

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.selected : styles.placeholder}>
          {selected ? `🏠 ${selected.name} — ${selected.property_name}` : 'Seleccionar inquilino...'}
        </Text>
        <Text>▼</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <TouchableOpacity style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Seleccionar inquilino</Text>
          <TouchableOpacity style={styles.item} onPress={() => { onSelect(null); setOpen(false) }}>
            <Text style={styles.none}>Sin inquilino</Text>
          </TouchableOpacity>
          <FlatList
            data={tenants}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, item.id === selectedId && styles.itemSelected]}
                onPress={() => { onSelect(item); setOpen(false) }}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSub}>{item.property_name} · ${item.rent_amount.toLocaleString('es-MX')}/mes</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 14 },
  selected:     { fontSize: 15, color: '#374151', fontWeight: '500' },
  placeholder:  { fontSize: 15, color: '#9ca3af' },
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  title:        { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#111827' },
  item:         { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemSelected: { backgroundColor: '#eef2ff' },
  itemName:     { fontSize: 15, fontWeight: '600', color: '#374151' },
  itemSub:      { fontSize: 13, color: '#6b7280', marginTop: 2 },
  none:         { fontSize: 15, color: '#9ca3af', fontStyle: 'italic' },
})
```

- [ ] **Step 6: Crear `components/RentAlertBanner.tsx`**

```typescript
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { RentAlertWithTenant } from '@/types/database'

interface RentAlertBannerProps {
  alerts: RentAlertWithTenant[]
  today: Date
  onPress: (alert: RentAlertWithTenant) => void
}

export function RentAlertBanner({ alerts, today, onPress }: RentAlertBannerProps) {
  if (alerts.length === 0) return null

  const alertDaysBefore = 3

  const visible = alerts.filter((a) => {
    const dueDay = a.tenant.rent_due_day
    return today.getDate() >= dueDay - alertDaysBefore
  })

  if (visible.length === 0) return null

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚠️ Rentas pendientes este mes</Text>
      {visible.map((alert) => (
        <TouchableOpacity key={alert.id} style={styles.row} onPress={() => onPress(alert)}>
          <View>
            <Text style={styles.name}>{alert.tenant.name}</Text>
            <Text style={styles.sub}>{alert.tenant.property_name} · Vence día {alert.tenant.rent_due_day}</Text>
          </View>
          <Text style={styles.amount}>${alert.tenant.rent_amount.toLocaleString('es-MX')}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fefce8', borderWidth: 1.5, borderColor: '#fde047', borderRadius: 14, padding: 14, marginBottom: 16 },
  title:     { fontSize: 13, fontWeight: '700', color: '#854d0e', marginBottom: 10 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#fde04780' },
  name:      { fontSize: 14, fontWeight: '600', color: '#713f12' },
  sub:       { fontSize: 12, color: '#92400e', marginTop: 2 },
  amount:    { fontSize: 15, fontWeight: '700', color: '#854d0e' },
})
```

- [ ] **Step 7: Commit**

```bash
git add components/
git commit -m "feat: add all UI components (Button, Card, AmountInput, TransactionCard, TenantPicker, RentAlertBanner)"
```

---

## Task 13: App layout y pantalla PIN

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(auth)/pin.tsx`
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Crear `app/_layout.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { isSessionValid } from '@/lib/auth'
import { getStoredPinHash } from '@/lib/auth'

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    async function checkAuth() {
      const pinHash = await getStoredPinHash()
      const sessionOk = await isSessionValid()

      const inAuth = segments[0] === '(auth)'

      if (!pinHash || !sessionOk) {
        if (!inAuth) router.replace('/(auth)/pin')
      } else {
        if (inAuth) router.replace('/(tabs)')
      }
      setReady(true)
    }
    checkAuth()
  }, [])

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return <Slot />
}
```

- [ ] **Step 2: Crear `app/(auth)/_layout.tsx`**

```typescript
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 3: Crear `app/(auth)/pin.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { hashPin, verifyPin, saveSession, getStoredPinHash, storePinHash } from '@/lib/auth'

const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export default function PinScreen() {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [step, setStep] = useState<'enter' | 'create' | 'confirm'>('enter')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getStoredPinHash().then((hash) => {
      if (!hash) setStep('create')
    })
  }, [])

  function handleDigit(d: string) {
    if (d === '⌫') {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) setTimeout(() => handleComplete(next), 100)
  }

  async function handleComplete(fullPin: string) {
    setLoading(true)
    try {
      if (step === 'create') {
        setConfirmPin(fullPin)
        setPin('')
        setStep('confirm')
        setLoading(false)
        return
      }

      if (step === 'confirm') {
        if (fullPin !== confirmPin) {
          Alert.alert('Error', 'Los PINs no coinciden. Intenta de nuevo.')
          setPin('')
          setStep('create')
          setLoading(false)
          return
        }
        const hash = await hashPin(fullPin)
        await storePinHash(hash)
        await saveSession()
        router.replace('/(tabs)')
        return
      }

      // step === 'enter'
      const hash = await getStoredPinHash()
      const ok = hash ? await verifyPin(fullPin, hash) : false
      if (ok) {
        await saveSession()
        router.replace('/(tabs)')
      } else {
        Alert.alert('PIN incorrecto', 'Intenta de nuevo.')
        setPin('')
      }
    } finally {
      setLoading(false)
    }
  }

  const title = step === 'create' ? 'Crear PIN'
              : step === 'confirm' ? 'Confirmar PIN'
              : 'Ingresa tu PIN'

  const subtitle = step === 'create' ? 'Elige 4 dígitos para proteger la app'
                 : step === 'confirm' ? 'Repite tu PIN para confirmar'
                 : ''

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.dots}>
        {[0,1,2,3].map((i) => (
          <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
        ))}
      </View>

      <View style={styles.keypad}>
        {DIGITS.map((d, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, d === '' && { opacity: 0 }]}
            onPress={() => d && handleDigit(d)}
            disabled={!d || loading}
          >
            <Text style={styles.keyText}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 32 },
  title:     { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle:  { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 32 },
  dots:      { flexDirection: 'row', gap: 16, marginBottom: 48 },
  dot:       { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#6366f1' },
  dotFilled: { backgroundColor: '#6366f1' },
  keypad:    { flexDirection: 'row', flexWrap: 'wrap', width: 240, justifyContent: 'center', gap: 12 },
  key:       { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  keyText:   { fontSize: 22, fontWeight: '600', color: '#111827' },
})
```

- [ ] **Step 4: Crear `app/(tabs)/_layout.tsx`**

```typescript
import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarStyle: { borderTopColor: '#f3f4f6' },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Inicio',   tabBarIcon: () => null }} />
      <Tabs.Screen name="scan"    options={{ title: 'Escanear', tabBarIcon: () => null }} />
      <Tabs.Screen name="history" options={{ title: 'Historial',tabBarIcon: () => null }} />
      <Tabs.Screen name="export"  options={{ title: 'Exportar', tabBarIcon: () => null }} />
    </Tabs>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/
git commit -m "feat: add root layout with auth guard and PIN screen"
```

---

## Task 14: Dashboard (tabs/index.tsx)

**Files:**
- Create: `app/(tabs)/index.tsx`

- [ ] **Step 1: Crear `app/(tabs)/index.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useTransactions } from '@/hooks/useTransactions'
import { useRentAlerts } from '@/hooks/useRentAlerts'
import { RentAlertBanner } from '@/components/RentAlertBanner'
import { TransactionCard } from '@/components/TransactionCard'
import { Card } from '@/components/ui/Card'
import { getMonthStart } from '@/lib/alerts'

export default function Dashboard() {
  const router = useRouter()
  const today = new Date()
  const monthStart = getMonthStart(today)
  const monthEnd = today.toISOString().split('T')[0]

  const { transactions, loading } = useTransactions({ startDate: monthStart, endDate: monthEnd })
  const { pendingAlerts } = useRentAlerts()
  const [ownerName, setOwnerName] = useState('Mamá')

  useEffect(() => {
    supabase.from('app_config').select('value').eq('key', 'owner_name').single()
      .then(({ data }) => { if (data) setOwnerName(data.value) })
  }, [])

  const totalIngresos = transactions.filter((t) => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const totalGastos   = transactions.filter((t) => t.type === 'gasto').reduce((s, t) => s + t.amount, 0)
  const saldo = totalIngresos - totalGastos

  const recent = transactions.slice(0, 10)

  const monthName = today.toLocaleString('es-MX', { month: 'long', year: 'numeric' })

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola, {ownerName} 👋</Text>
          <Text style={styles.month}>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</Text>
        </View>

        {/* Saldo */}
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo del mes</Text>
          <Text style={[styles.balanceAmount, { color: saldo >= 0 ? '#10b981' : '#ef4444' }]}>
            ${Math.abs(saldo).toLocaleString('es-MX')}
          </Text>
          <Text style={styles.balanceSub}>Ingresos − Gastos</Text>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceMini}>Ingresos</Text>
              <Text style={[styles.balanceMiniAmount, { color: '#10b981' }]}>
                +${totalIngresos.toLocaleString('es-MX')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.balanceMini}>Gastos</Text>
              <Text style={[styles.balanceMiniAmount, { color: '#ef4444' }]}>
                -${totalGastos.toLocaleString('es-MX')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Alertas */}
        <RentAlertBanner
          alerts={pendingAlerts}
          today={today}
          onPress={() => router.push('/(tabs)/scan')}
        />

        {/* Botones principales */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)/scan')}>
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionLabel}>Escanear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f0fdf4' }]} onPress={() => router.push('/(tabs)/scan')}>
            <Text style={styles.actionIcon}>+</Text>
            <Text style={styles.actionLabel}>Ingreso</Text>
          </TouchableOpacity>
        </View>

        {/* Últimos movimientos */}
        <Text style={styles.sectionTitle}>Últimos movimientos</Text>
        <Card>
          {loading
            ? <Text style={styles.empty}>Cargando...</Text>
            : recent.length === 0
            ? <Text style={styles.empty}>Sin movimientos este mes</Text>
            : recent.map((t) => <TransactionCard key={t.id} transaction={t} />)
          }
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#f9fafb' },
  scroll:            { flex: 1 },
  content:           { padding: 20, paddingBottom: 40 },
  header:            { marginBottom: 20 },
  greeting:          { fontSize: 24, fontWeight: '700', color: '#111827' },
  month:             { fontSize: 14, color: '#6b7280', marginTop: 2 },
  balanceCard:       { marginBottom: 20, alignItems: 'center' },
  balanceLabel:      { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  balanceAmount:     { fontSize: 40, fontWeight: '800', marginBottom: 4 },
  balanceSub:        { fontSize: 12, color: '#9ca3af', marginBottom: 16 },
  balanceRow:        { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  balanceMini:       { fontSize: 12, color: '#6b7280' },
  balanceMiniAmount: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  actions:           { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn:         { flex: 1, backgroundColor: '#eef2ff', borderRadius: 16, padding: 20, alignItems: 'center' },
  actionIcon:        { fontSize: 28, marginBottom: 8 },
  actionLabel:       { fontSize: 15, fontWeight: '600', color: '#4338ca' },
  sectionTitle:      { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 },
  empty:             { textAlign: 'center', color: '#9ca3af', paddingVertical: 20 },
})
```

- [ ] **Step 2: Verificar que el dashboard carga y muestra saldo**

```bash
npx expo start
```

Abrir en simulador o Expo Go. Verificar: saludo con nombre, saldo $0 en mes sin datos, botones visibles.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: add Dashboard screen with balance summary and rent alerts"
```

---

## Task 15: Pantalla Escanear (tabs/scan.tsx)

**Files:**
- Create: `app/(tabs)/scan.tsx`

- [ ] **Step 1: Crear `app/(tabs)/scan.tsx`**

```typescript
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

  // Form state
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
    } catch (e) {
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
    } catch (e) {
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
              <View style={styles.cameraCorners} />
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

        {/* Tipo */}
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
          {/* Monto */}
          <Text style={styles.label}>Monto</Text>
          <AmountInput value={amount} onChange={setAmount} />

          {/* Fecha */}
          <Text style={[styles.label, { marginTop: 16 }]}>Fecha</Text>
          <View style={styles.dateInput}>
            <Text style={styles.dateText}>{date}</Text>
          </View>

          {/* Categoría */}
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

          {/* Inquilino (solo para renta) */}
          {category === 'renta' && (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>Inquilino</Text>
              <TenantPicker tenants={tenants} selectedId={selectedTenant?.id ?? null} onSelect={setSelectedTenant} />
            </>
          )}

          {/* Método de pago */}
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
  cameraCorners:    { },
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
  formCard:         { },
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
```

- [ ] **Step 2: Probar flujo completo**

1. Abrir app → tab Escanear
2. Tomar foto de cualquier recibo → verificar que carga → formulario pre-llenado
3. Corregir datos si necesario → Guardar
4. Verificar que aparece en Dashboard

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/scan.tsx
git commit -m "feat: add Scan screen with OCR flow and manual entry"
```

---

## Task 16: Historial (tabs/history.tsx)

**Files:**
- Create: `app/(tabs)/history.tsx`

- [ ] **Step 1: Crear `app/(tabs)/history.tsx`**

```typescript
import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTransactions } from '@/hooks/useTransactions'
import { TransactionCard } from '@/components/TransactionCard'
import { Card } from '@/components/ui/Card'
import { CATEGORIES } from '@/constants/categories'
import { Category } from '@/types/database'

export default function HistoryScreen() {
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null)
  const [typeFilter, setTypeFilter] = useState<'ingreso' | 'gasto' | null>(null)

  const { transactions, loading } = useTransactions({
    category: categoryFilter ?? undefined,
    type: typeFilter ?? undefined,
  })

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
      </View>

      {/* Filtros tipo */}
      <View style={styles.filterRow}>
        {([null, 'ingreso', 'gasto'] as const).map((t) => (
          <TouchableOpacity
            key={String(t)}
            style={[styles.filterBtn, typeFilter === t && styles.filterActive]}
            onPress={() => setTypeFilter(t)}
          >
            <Text style={[styles.filterText, typeFilter === t && styles.filterTextActive]}>
              {t === null ? 'Todo' : t === 'ingreso' ? 'Ingresos' : 'Gastos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtros categoría */}
      <View style={styles.catRow}>
        <TouchableOpacity
          style={[styles.catChip, !categoryFilter && styles.catActive]}
          onPress={() => setCategoryFilter(null)}
        >
          <Text style={[styles.catText, !categoryFilter && styles.catTextActive]}>Todas</Text>
        </TouchableOpacity>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.catChip, categoryFilter === c.value && styles.catActive]}
            onPress={() => setCategoryFilter(c.value)}
          >
            <Text style={[styles.catText, categoryFilter === c.value && styles.catTextActive]}>
              {c.emoji} {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <Text style={styles.empty}>Cargando...</Text>
      ) : transactions.length === 0 ? (
        <Text style={styles.empty}>Sin movimientos con este filtro</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 1, borderRadius: 0 }}>
              <TransactionCard transaction={item} />
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#f9fafb' },
  header:          { padding: 20, paddingBottom: 12 },
  title:           { fontSize: 24, fontWeight: '700', color: '#111827' },
  filterRow:       { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  filterBtn:       { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f3f4f6' },
  filterActive:    { backgroundColor: '#6366f1' },
  filterText:      { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  filterTextActive:{ color: '#fff', fontWeight: '600' },
  catRow:          { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  catChip:         { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#f3f4f6' },
  catActive:       { backgroundColor: '#eef2ff', borderWidth: 1.5, borderColor: '#6366f1' },
  catText:         { fontSize: 13, color: '#6b7280' },
  catTextActive:   { color: '#4338ca', fontWeight: '600' },
  list:            { paddingHorizontal: 20, paddingBottom: 40 },
  empty:           { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15 },
})
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/history.tsx
git commit -m "feat: add History screen with category and type filters"
```

---

## Task 17: Exportar (tabs/export.tsx)

**Files:**
- Create: `app/(tabs)/export.tsx`

- [ ] **Step 1: Crear `app/(tabs)/export.tsx`**

```typescript
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { exportToExcel } from '@/lib/export'
import { getMonthStart } from '@/lib/alerts'

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - i)
  return {
    label: d.toLocaleString('es-MX', { month: 'long', year: 'numeric' }),
    start: getMonthStart(d),
    end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
  }
})

export default function ExportScreen() {
  const [selected, setSelected] = useState(0)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      await exportToExcel(MONTHS[selected].start, MONTHS[selected].end)
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el archivo Excel.')
    } finally {
      setExporting(false)
    }
  }

  const m = MONTHS[selected]
  const label = m.label.charAt(0).toUpperCase() + m.label.slice(1)

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Exportar al contador</Text>
        <Text style={styles.subtitle}>Genera un Excel con todos los movimientos del mes</Text>

        <Text style={styles.sectionLabel}>Selecciona el mes</Text>
        <Card>
          {MONTHS.map((month, i) => {
            const mlabel = month.label.charAt(0).toUpperCase() + month.label.slice(1)
            return (
              <TouchableOpacity
                key={i}
                style={[styles.monthRow, i === selected && styles.monthRowSelected]}
                onPress={() => setSelected(i)}
              >
                <Text style={[styles.monthText, i === selected && styles.monthTextSelected]}>
                  {mlabel}
                </Text>
                {i === selected && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            )
          })}
        </Card>

        <Card style={styles.summary}>
          <Text style={styles.summaryTitle}>📊 {label}</Text>
          <Text style={styles.summaryDates}>{m.start} → {m.end}</Text>
          <Text style={styles.summaryInfo}>2 hojas: Ingresos y Gastos · Totales incluidos</Text>
        </Card>

        <Button
          label={exporting ? 'Generando...' : '📤 Exportar y compartir'}
          onPress={handleExport}
          loading={exporting}
          style={{ marginTop: 8 }}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#f9fafb' },
  content:            { flex: 1, padding: 20 },
  title:              { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle:           { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  sectionLabel:       { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  monthRow:           { paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  monthRowSelected:   { },
  monthText:          { fontSize: 15, color: '#374151' },
  monthTextSelected:  { color: '#6366f1', fontWeight: '600' },
  check:              { color: '#6366f1', fontSize: 16, fontWeight: '700' },
  summary:            { marginTop: 16, backgroundColor: '#eef2ff', borderColor: '#6366f1', borderWidth: 1 },
  summaryTitle:       { fontSize: 16, fontWeight: '700', color: '#4338ca', marginBottom: 4 },
  summaryDates:       { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  summaryInfo:        { fontSize: 13, color: '#6b7280' },
})
```

- [ ] **Step 2: Probar exportación**

1. Asegúrate de tener al menos una transacción en la DB
2. Tab Exportar → selecciona el mes → "Exportar y compartir"
3. Verificar que se abre el menú de compartir nativo con el archivo `.xlsx`
4. Enviarlo por correo o WhatsApp y abrirlo en Excel/Sheets para verificar las hojas

- [ ] **Step 3: Commit final**

```bash
git add app/\(tabs\)/export.tsx
git commit -m "feat: add Export screen with month selector and Excel sharing"
```

---

## Checklist de self-review

- [x] **Spec §1 (Arquitectura):** Todo en Supabase, sin Supabase Auth → Task 4 (supabase.ts) + Task 7 (auth.ts)
- [x] **Spec §2 (Schema):** 4 tablas con todos los campos → Task 3 (migraciones SQL)
- [x] **Spec §3 (Edge Functions):** ocr-scan + generate-alerts con contratos exactos → Tasks 5 y 6
- [x] **Spec §4 (Auth PIN):** bcryptjs hash, verify, sesión 7 días, SecureStore → Task 7
- [x] **Spec §5 (Flujo OCR):** Upload → ocr-scan → pre-fill → guardar → Task 8 + Task 15
- [x] **Spec §6 (Alertas):** generate-alerts 1x/día, banner en dashboard → Tasks 9 + Task 14
- [x] **Spec §7 (Export Excel):** xlsx 2 hojas, expo-sharing → Task 10 + Task 17
- [x] **Spec §8 (Estructura):** Todas las carpetas y archivos definidos → Tasks 1-17
- [x] **Tipos consistentes:** `OcrResult`, `Transaction`, `RentAlertWithTenant` usados igual en todos los tasks
- [x] **Sin placeholders:** Todo el código está completo, sin "TBD" ni "implement later"
