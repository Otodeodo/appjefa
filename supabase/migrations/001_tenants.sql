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
