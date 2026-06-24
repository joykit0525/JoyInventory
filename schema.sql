CREATE TABLE IF NOT EXISTS inventory_items (
  sku text PRIMARY KEY,
  name text NOT NULL,
  image_url text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  qty integer NOT NULL DEFAULT 0 CHECK (qty >= 0),
  safety integer NOT NULL DEFAULT 0 CHECK (safety >= 0),
  purchase_amount numeric(14, 2) NOT NULL DEFAULT 0,
  landed_unit_cost numeric(14, 2) NOT NULL DEFAULT 0,
  margin_rate numeric(8, 2) NOT NULL DEFAULT 30,
  mall_fee_rate numeric(8, 2) NOT NULL DEFAULT 10,
  tax_rate numeric(8, 2) NOT NULL DEFAULT 10,
  unit text NOT NULL DEFAULT '개',
  supplier text NOT NULL DEFAULT '',
  memo text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY,
  date timestamptz NOT NULL DEFAULT now(),
  sku text NOT NULL REFERENCES inventory_items(sku) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('in', 'out', 'adjust')),
  qty integer NOT NULL CHECK (qty >= 0),
  note text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_updated_at ON inventory_items(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(date DESC);
