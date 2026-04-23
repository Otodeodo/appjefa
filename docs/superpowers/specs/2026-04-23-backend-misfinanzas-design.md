# Backend MisFinanzas — Spec de Diseño

**Fecha:** 2026-04-23  
**Proyecto:** App de gestión financiera para pequeños negocios (contexto MX)  
**Usuario final:** 1 persona (mamá/jefa), ocupada, no técnica  
**Stack:** React Native + Expo Router · Supabase · GPT-4 Vision · xlsx

---

## 1. Arquitectura general

Todo el backend vive en **Supabase** (un solo servicio):

- **Postgres** — base de datos principal
- **Storage** — fotos de recibos y pagarés
- **Edge Functions** — OCR (llama GPT-4 Vision) y generación de alertas de renta
- **Sin Supabase Auth** — autenticación por PIN hasheado con bcryptjs, guardado en `app_config`

La `OPENAI_API_KEY` vive exclusivamente en los secrets de Supabase Edge Functions, nunca en la app ni en `.env` del cliente.

---

## 2. Schema de base de datos

### `tenants` — catálogo de inquilinos
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | generado automáticamente |
| name | text | nombre del inquilino |
| property_name | text | nombre de la propiedad (ej. "Casa Tlalpan") |
| rent_amount | numeric | monto mensual en MXN |
| rent_due_day | int | día del mes en que cae el pago (1-31) |
| phone | text | nullable |
| is_active | bool | default true; false = inquilino salió |

### `transactions` — tabla principal de movimientos
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| type | text | `'ingreso'` o `'gasto'` |
| category | text | `'renta'` · `'cafeteria'` · `'insumo'` · `'servicio'` · `'otro'` |
| amount | numeric | en pesos MXN, siempre positivo |
| date | date | fecha del movimiento (no created_at) |
| payment_method | text | `'efectivo'` · `'tarjeta'` · `'transferencia'` |
| description | text | nullable, texto libre |
| tenant_id | uuid FK | nullable; solo para rentas |
| receipt_url | text | nullable; ruta en Supabase Storage |
| ocr_raw | jsonb | nullable; respuesta cruda de GPT-4 Vision |
| created_at | timestamptz | default now() |

### `rent_alerts` — seguimiento de rentas por mes
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | → tenants |
| month | date | primer día del mes (ej. `2025-04-01`) |
| is_paid | bool | default false |
| paid_at | timestamptz | nullable |
| transaction_id | uuid FK | nullable; → transactions cuando se paga |

Restricción: `UNIQUE(tenant_id, month)` — un solo registro por inquilino por mes.

### `app_config` — configuración y PIN
| Campo | Tipo | Notas |
|---|---|---|
| key | text PK | |
| value | text | |

Filas predefinidas:
- `pin_hash` — hash bcrypt del PIN de 4 dígitos
- `owner_name` — nombre para el saludo en dashboard (ej. "Mamá")
- `alert_days_before` — días antes del vencimiento para mostrar alerta (default `"3"`)

### Supabase Storage
- Bucket: `receipts` (privado, accedido con signed URLs de 1 hora de duración)
- Estructura: `receipts/{año}/{mes}/{uuid}.jpg`
- Imágenes comprimidas a 800px máx antes de subir

---

## 3. Edge Functions

### `ocr-scan`

**Trigger:** POST desde la app después de subir la imagen a Storage.

**Request:**
```json
{ "image_url": "https://...supabase.../receipts/2025/04/uuid.jpg" }
```

**Proceso:**
1. Recibe la URL de la imagen
2. Llama a GPT-4 Vision con prompt en español optimizado para recibos mexicanos (pagarés, tickets de cafetería, facturas)
3. Parsea la respuesta a campos estructurados

**Response OK:**
```json
{
  "monto": 5000,
  "fecha": "2025-04-22",
  "nombre": "Juan García",
  "concepto": "Renta mayo",
  "confianza": 0.95
}
```

**Response error:**
```json
{ "error": "No se pudo extraer información" }
```

El campo `confianza` (0-1) determina si la app muestra los campos pre-llenados normalmente o con indicador de "verificar". Si es < 0.6, la app advierte que revise los datos.

### `generate-alerts`

**Trigger:** POST desde la app al abrir (una vez por día, controlado con AsyncStorage).

**Request:**
```json
{ "month": "2025-04-01" }
```

**Proceso:**
1. Consulta todos los `tenants` donde `is_active = true`
2. Para cada uno, hace upsert en `rent_alerts(tenant_id, month)` — crea si no existe, ignora si ya existe
3. Retorna conteo

**Response:**
```json
{ "created": 8, "existing": 2 }
```

---

## 4. Autenticación PIN

- **Primera vez:** 4 dígitos → `bcryptjs.hash(pin, 10)` → guardado en `app_config` como `pin_hash`
- **Ingreso:** `bcryptjs.compare(inputPin, hash)` en el dispositivo
- **Sesión:** token aleatorio guardado en `expo-secure-store` con expiración de 7 días
- **No se pide PIN** cada vez que se abre — solo en el primer arranque o tras 7 días de inactividad

Todo el proceso de comparación ocurre en el cliente. La `pin_hash` se consulta de Supabase una vez y se cachea en SecureStore junto con la sesión.

---

## 5. Flujo OCR completo

```
Mamá toma foto
  → Expo ImagePicker (cámara)
  → Comprimir imagen (max 800px, calidad 0.8)
  → Subir a Supabase Storage → receipt_url
  → POST /ocr-scan con receipt_url
  → GPT-4 Vision extrae: monto, fecha, nombre, concepto
  → App pre-llena formulario
  → Mamá revisa y corrige (si es necesario)
  → Selecciona categoría (chips: Renta / Cafetería / Insumo / Servicio / Otro)
  → Toca "Guardar" → INSERT en transactions
```

Tiempo estimado: 3-5 segundos.  
Si OCR falla, la app muestra el formulario vacío para llenado manual — nunca bloquea.

---

## 6. Alertas de renta

- Al abrir la app, se llama `generate-alerts` para el mes actual (máx 1 vez/día via AsyncStorage)
- El dashboard consulta `rent_alerts` donde `is_paid = false` y `month = mes actual`
- Si `hoy >= rent_due_day - alert_days_before`, muestra banner amarillo con nombre del inquilino
- Al registrar un pago de renta con `tenant_id`, se hace `UPDATE rent_alerts SET is_paid=true, paid_at=now(), transaction_id=...`

---

## 7. Exportación Excel

Generada 100% en el dispositivo con la librería `xlsx`:

1. Mamá elige rango (mes completo o fechas custom)
2. Query a Supabase: `transactions` del rango con JOIN a `tenants`
3. Genera workbook con 2 hojas: **Ingresos** y **Gastos**
4. Columnas: Fecha · Tipo · Categoría · Descripción · Inquilino · Monto (MXN) · Método de pago
5. Fila de totales al final de cada hoja
6. `expo-sharing` abre menú nativo → WhatsApp, correo, etc.

Sin servidor adicional, sin costos extra.

---

## 8. Estructura de carpetas

```
appjefa/
├── app/                        # Expo Router (file-based routing)
│   ├── (auth)/
│   │   └── pin.tsx             # Pantalla de PIN (crear + ingresar)
│   ├── (tabs)/
│   │   ├── index.tsx           # Dashboard / Inicio
│   │   ├── scan.tsx            # Escanear recibo o pagaré
│   │   ├── history.tsx         # Historial filtrable
│   │   └── export.tsx          # Exportar al contador
│   └── _layout.tsx
│
├── components/
│   ├── ui/                     # Botones, inputs, cards reutilizables
│   ├── TransactionCard.tsx
│   ├── TenantPicker.tsx        # Selector de inquilino (lista de tenants)
│   ├── RentAlertBanner.tsx     # Banner amarillo de renta pendiente
│   └── AmountInput.tsx         # Input numérico formateado en MXN
│
├── lib/
│   ├── supabase.ts             # Cliente Supabase (singleton)
│   ├── ocr.ts                  # Llama Edge Function ocr-scan
│   ├── export.ts               # Genera Excel con xlsx
│   ├── auth.ts                 # Lógica PIN: hash, verify, sesión
│   └── alerts.ts               # Calcula y consulta rentas pendientes
│
├── hooks/
│   ├── useTransactions.ts      # CRUD de transactions
│   ├── useTenants.ts           # CRUD de tenants
│   └── useRentAlerts.ts        # Alertas del mes actual
│
├── types/
│   └── database.ts             # Tipos TypeScript generados de Supabase
│
├── constants/
│   └── categories.ts           # Categorías y métodos de pago como constantes
│
├── assets/
│
├── supabase/
│   ├── functions/
│   │   ├── ocr-scan/
│   │   │   └── index.ts
│   │   └── generate-alerts/
│   │       └── index.ts
│   ├── migrations/
│   │   ├── 001_tenants.sql
│   │   ├── 002_transactions.sql
│   │   ├── 003_rent_alerts.sql
│   │   └── 004_app_config.sql
│   └── config.toml
│
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-04-23-backend-misfinanzas-design.md
│
├── app.json
├── package.json
├── tsconfig.json
├── .env                        # SUPABASE_URL, SUPABASE_ANON_KEY (nunca OPENAI_KEY)
└── .gitignore                  # incluye .env y .superpowers/
```

---

## 9. Variables de entorno

### App (`.env`)
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Supabase Edge Functions secrets (vía CLI, nunca en repo)
```
OPENAI_API_KEY=sk-...
```

---

## 10. Decisiones clave

| Decisión | Razón |
|---|---|
| Sin Supabase Auth | Un solo usuario, PIN es suficiente y más simple |
| OCR en Edge Function, no en cliente | API key de OpenAI nunca expuesta |
| Imagen sube antes de OCR | Si GPT-4 falla, la imagen no se pierde |
| generate-alerts al abrir app | Sin cron jobs ni push notifications (más simple) |
| Excel en cliente con xlsx | Sin servidor extra, funciona offline |
| bcryptjs en cliente | Hash local, sin roundtrip al servidor para auth |
| Sesión 7 días en SecureStore | Mamá no teclea PIN cada vez |
