/*
  # Two-Party Synced Transactions System (Splitwise-Style)

  ## Overview
  This migration transforms the movements system to support two-party synced transactions
  between registered users. When user A adds a movement for user B, both users will
  see the movement in their ledgers with appropriate signs.

  ## Changes Made

  1. **New Columns in customer_movements**
    - `transaction_group_id` (uuid) - Links paired movements together
    - `counter_party_id` (uuid) - Reference to the other party in the transaction
    - `is_initiator` (boolean) - True if this user initiated the movement
    - `auto_added` (boolean) - True if the relationship was auto-created

  2. **New Functions**
    - `get_or_create_user_customer_relationship` - Auto-creates customer relationships
    - `create_two_party_movement` - Creates paired movements for both parties

  3. **Updated RLS Policies**
    - Users can now see movements where they are either owner OR counter_party

  4. **New Indexes**
    - Index on transaction_group_id for fast paired movement lookups
    - Index on counter_party_id for reverse relationship queries

  ## How It Works

  ### Scenario: Ali adds 9000 for Galal
  1. Ali calls create_two_party_movement(galal_id, 9000, 'له')
  2. System creates TWO movements with same transaction_group_id:
     - Movement in Ali's ledger: signed_amount = +9000 (Ali owes Galal)
     - Movement in Galal's ledger: signed_amount = -9000 (Galal is owed by Ali)
  3. If Galal hasn't added Ali, the relationship is auto-created
  4. Both users see the movement in their customer lists with correct balances

  ## Important Notes
  - Only works for registered users (kind = 'registered')
  - Local customers continue to work with single movements
  - All existing data remains unchanged
  - RLS ensures users only see their own movements
*/

-- Add new columns to customer_movements
DO $$
BEGIN
  -- Add transaction_group_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_movements' AND column_name = 'transaction_group_id'
  ) THEN
    ALTER TABLE customer_movements ADD COLUMN transaction_group_id uuid;
  END IF;

  -- Add counter_party_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_movements' AND column_name = 'counter_party_id'
  ) THEN
    ALTER TABLE customer_movements ADD COLUMN counter_party_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add is_initiator
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_movements' AND column_name = 'is_initiator'
  ) THEN
    ALTER TABLE customer_movements ADD COLUMN is_initiator boolean DEFAULT false;
  END IF;

  -- Add auto_added to user_customers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_customers' AND column_name = 'auto_added'
  ) THEN
    ALTER TABLE user_customers ADD COLUMN auto_added boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_customer_movements_transaction_group ON customer_movements(transaction_group_id);
CREATE INDEX IF NOT EXISTS idx_customer_movements_counter_party ON customer_movements(counter_party_id);

-- Function: Get or create user_customer relationship
CREATE OR REPLACE FUNCTION get_or_create_user_customer_relationship(
  p_owner_id uuid,
  p_registered_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_customer_id uuid;
BEGIN
  -- Check if relationship exists
  SELECT id INTO v_user_customer_id
  FROM user_customers
  WHERE owner_id = p_owner_id
    AND kind = 'registered'
    AND registered_user_id = p_registered_user_id;

  -- If found, return it
  IF v_user_customer_id IS NOT NULL THEN
    RETURN v_user_customer_id;
  END IF;

  -- Create new relationship
  INSERT INTO user_customers (owner_id, kind, registered_user_id, auto_added)
  VALUES (p_owner_id, 'registered', p_registered_user_id, true)
  RETURNING id INTO v_user_customer_id;

  RETURN v_user_customer_id;
END;
$$;

-- Function: Create two-party movement
CREATE OR REPLACE FUNCTION create_two_party_movement(
  p_initiator_id uuid,
  p_counter_party_id uuid,
  p_currency text,
  p_amount numeric,
  p_signed_amount numeric,
  p_note text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_group_id uuid;
  v_initiator_user_customer_id uuid;
  v_counter_party_user_customer_id uuid;
  v_initiator_movement_id uuid;
  v_counter_party_movement_id uuid;
BEGIN
  -- Validate that counter_party is a registered user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_counter_party_id) THEN
    RAISE EXCEPTION 'Counter party must be a registered user';
  END IF;

  -- Validate that initiator is not the same as counter_party
  IF p_initiator_id = p_counter_party_id THEN
    RAISE EXCEPTION 'Cannot create movement with yourself';
  END IF;

  -- Generate transaction group ID
  v_transaction_group_id := gen_random_uuid();

  -- Get or create user_customer relationship for initiator
  v_initiator_user_customer_id := get_or_create_user_customer_relationship(
    p_initiator_id,
    p_counter_party_id
  );

  -- Get or create user_customer relationship for counter_party
  v_counter_party_user_customer_id := get_or_create_user_customer_relationship(
    p_counter_party_id,
    p_initiator_id
  );

  -- Create movement in initiator's ledger
  INSERT INTO customer_movements (
    owner_id,
    user_customer_id,
    transaction_group_id,
    counter_party_id,
    is_initiator,
    currency,
    amount,
    signed_amount,
    note
  ) VALUES (
    p_initiator_id,
    v_initiator_user_customer_id,
    v_transaction_group_id,
    p_counter_party_id,
    true,
    p_currency,
    p_amount,
    p_signed_amount,
    p_note
  ) RETURNING id INTO v_initiator_movement_id;

  -- Create mirrored movement in counter_party's ledger
  -- The signed_amount is inverted (positive becomes negative, negative becomes positive)
  INSERT INTO customer_movements (
    owner_id,
    user_customer_id,
    transaction_group_id,
    counter_party_id,
    is_initiator,
    currency,
    amount,
    signed_amount,
    note
  ) VALUES (
    p_counter_party_id,
    v_counter_party_user_customer_id,
    v_transaction_group_id,
    p_initiator_id,
    false,
    p_currency,
    p_amount,
    -p_signed_amount, -- Invert the sign
    p_note
  ) RETURNING id INTO v_counter_party_movement_id;

  -- Return both movement IDs
  RETURN jsonb_build_object(
    'transaction_group_id', v_transaction_group_id,
    'initiator_movement_id', v_initiator_movement_id,
    'counter_party_movement_id', v_counter_party_movement_id
  );
END;
$$;

-- Drop existing RLS policies for customer_movements
DROP POLICY IF EXISTS "Users can view own movements" ON customer_movements;
DROP POLICY IF EXISTS "Users can insert own movements" ON customer_movements;
DROP POLICY IF EXISTS "Users can update own movements" ON customer_movements;
DROP POLICY IF EXISTS "Users can delete own movements" ON customer_movements;

-- Create updated RLS policies that allow viewing movements where user is either owner OR counter_party
CREATE POLICY "Users can view own and related movements"
  ON customer_movements FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR counter_party_id = auth.uid()
  );

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
  USING (owner_id = auth.uid() AND is_initiator = true);
