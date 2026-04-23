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
