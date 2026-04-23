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
