/*
  # Create Core Database Schema for Altaraf Money Transfer System

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text) - Customer name
      - `phone` (text) - Contact phone
      - `notes` (text) - Additional notes
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_id` (uuid) - Reference to auth.users
    
    - `account_movements`
      - `id` (uuid, primary key)
      - `customer_id` (uuid) - Reference to customers
      - `movement_number` (text) - Unique movement identifier
      - `receipt_number` (text) - Receipt reference
      - `amount` (numeric) - Transaction amount
      - `currency` (text) - Currency code (USD, EUR, etc.)
      - `direction` (text) - 'debit' or 'credit'
      - `commission_amount` (numeric) - Commission charged
      - `commission_currency` (text) - Commission currency
      - `commission_recipient` (text) - Who receives commission
      - `notes` (text) - Transaction notes
      - `created_at` (timestamp)
      - `user_id` (uuid) - Who created this movement
    
    - `internal_transfers`
      - `id` (uuid, primary key)
      - `sender_id` (uuid) - Reference to customers (sender)
      - `beneficiary_id` (uuid) - Reference to customers (receiver)
      - `amount` (numeric) - Transfer amount
      - `currency` (text) - Currency code
      - `notes` (text) - Transfer notes
      - `created_at` (timestamp)
      - `user_id` (uuid) - Who created this transfer
    
    - `app_settings`
      - `id` (uuid, primary key)
      - `key` (text, unique) - Setting key
      - `value` (jsonb) - Setting value
      - `updated_at` (timestamp)
      - `user_id` (uuid) - Who last updated
    
    - `exchange_rates`
      - `id` (uuid, primary key)
      - `from_currency` (text) - Source currency
      - `to_currency` (text) - Target currency
      - `rate` (numeric) - Exchange rate
      - `updated_at` (timestamp)
      - `user_id` (uuid) - Who last updated

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Create account_movements table
CREATE TABLE IF NOT EXISTS account_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  movement_number text,
  receipt_number text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  direction text NOT NULL CHECK (direction IN ('debit', 'credit')),
  commission_amount numeric DEFAULT 0,
  commission_currency text,
  commission_recipient text,
  notes text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Create internal_transfers table
CREATE TABLE IF NOT EXISTS internal_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  beneficiary_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  notes text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb,
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Create exchange_rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric NOT NULL DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  UNIQUE(from_currency, to_currency)
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Customers policies
CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers"
  ON customers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Account movements policies
CREATE POLICY "Users can view own movements"
  ON account_movements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own movements"
  ON account_movements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own movements"
  ON account_movements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own movements"
  ON account_movements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Internal transfers policies
CREATE POLICY "Users can view own transfers"
  ON internal_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transfers"
  ON internal_transfers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transfers"
  ON internal_transfers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transfers"
  ON internal_transfers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- App settings policies
CREATE POLICY "Users can view own settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON app_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Exchange rates policies (shared among all users)
CREATE POLICY "Authenticated users can view exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert exchange rates"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exchange rates"
  ON exchange_rates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_customer_id ON account_movements(customer_id);
CREATE INDEX IF NOT EXISTS idx_movements_user_id ON account_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_sender ON internal_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_transfers_beneficiary ON internal_transfers(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON internal_transfers(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_rates_updated_at
  BEFORE UPDATE ON exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();