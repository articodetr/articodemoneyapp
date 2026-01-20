/*
  # Create Customer Movements System

  1. New Tables
    - `customer_movements`
      - `id` (uuid, primary key)
      - `owner_id` (uuid, not null) - Reference to auth.users
      - `user_customer_id` (uuid, not null) - Reference to user_customers(id)
      - `movement_number` (bigint, unique) - Auto-generated movement number
      - `currency` (text, not null) - Currency code (USD/YER/SAR/EGP/EUR/AED/QAR)
      - `amount` (numeric(18,2), not null) - Absolute amount
      - `signed_amount` (numeric(18,2), not null) - Signed amount (+/-)
      - `note` (text, nullable) - Optional note
      - `created_at` (timestamptz, default now())
  
  2. Sequences
    - `movement_number_seq` - Auto-incrementing sequence for movement numbers

  3. Security
    - Enable RLS on customer_movements
    - Add policies for owner_id = auth.uid()

  4. Indexes
    - Index on owner_id for fast queries
    - Index on user_customer_id for customer-specific queries
    - Index on movement_number for lookups
*/

-- Create sequence for movement numbers
CREATE SEQUENCE IF NOT EXISTS movement_number_seq START WITH 1;

-- Create customer_movements table
CREATE TABLE IF NOT EXISTS customer_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_customer_id uuid NOT NULL REFERENCES user_customers(id) ON DELETE CASCADE,
  movement_number bigint UNIQUE DEFAULT nextval('movement_number_seq'),
  currency text NOT NULL CHECK (currency IN ('USD', 'YER', 'SAR', 'EGP', 'EUR', 'AED', 'QAR')),
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  signed_amount numeric(18,2) NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_movements_owner ON customer_movements(owner_id);
CREATE INDEX IF NOT EXISTS idx_customer_movements_user_customer ON customer_movements(user_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_movements_number ON customer_movements(movement_number);
CREATE INDEX IF NOT EXISTS idx_customer_movements_created ON customer_movements(created_at DESC);

-- Enable RLS
ALTER TABLE customer_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_movements
CREATE POLICY "Users can view own movements"
  ON customer_movements FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own movements"
  ON customer_movements FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own movements"
  ON customer_movements FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own movements"
  ON customer_movements FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Create helper function to get or create profit/loss customer
CREATE OR REPLACE FUNCTION get_or_create_profit_loss_customer(p_owner_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_local_customer_id uuid;
  v_user_customer_id uuid;
  v_profit_loss_name text := 'الأرباح والخسائر';
BEGIN
  -- Check if profit/loss customer already exists
  SELECT uc.id INTO v_user_customer_id
  FROM user_customers uc
  JOIN local_customers lc ON uc.local_customer_id = lc.id
  WHERE uc.owner_id = p_owner_id
    AND uc.kind = 'local'
    AND lc.display_name = v_profit_loss_name
  LIMIT 1;

  -- If found, return it
  IF v_user_customer_id IS NOT NULL THEN
    RETURN v_user_customer_id;
  END IF;

  -- Create new local customer for profit/loss
  INSERT INTO local_customers (owner_id, display_name, phone, note)
  VALUES (p_owner_id, v_profit_loss_name, NULL, 'حساب خاص للأرباح والخسائر من العمولات')
  RETURNING id INTO v_local_customer_id;

  -- Link it in user_customers
  INSERT INTO user_customers (owner_id, kind, local_customer_id)
  VALUES (p_owner_id, 'local', v_local_customer_id)
  RETURNING id INTO v_user_customer_id;

  RETURN v_user_customer_id;
END;
$$;

-- Create view to calculate customer balances by currency
CREATE OR REPLACE VIEW customer_balances_by_currency AS
SELECT 
  owner_id,
  user_customer_id,
  currency,
  SUM(signed_amount) as balance
FROM customer_movements
GROUP BY owner_id, user_customer_id, currency;
