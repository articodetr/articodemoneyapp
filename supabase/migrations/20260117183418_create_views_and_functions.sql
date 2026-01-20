/*
  # Create Database Views and Helper Functions

  1. Views
    - `customer_balances` - Calculate customer balances by currency
    - `customers_with_last_activity` - Customers with their last transaction date
    
  2. Functions
    - Auto-generate movement numbers
    - Calculate account balances
*/

-- Create view for customer balances by currency
CREATE OR REPLACE VIEW customer_balances AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  am.currency,
  COALESCE(
    SUM(
      CASE 
        WHEN am.direction = 'credit' THEN am.amount
        WHEN am.direction = 'debit' THEN -am.amount
        ELSE 0
      END
    ), 
    0
  ) as balance
FROM customers c
LEFT JOIN account_movements am ON c.id = am.customer_id
GROUP BY c.id, c.name, am.currency;

-- Create view for customers with last activity
CREATE OR REPLACE VIEW customers_with_last_activity AS
SELECT 
  c.*,
  (
    SELECT MAX(created_at) 
    FROM account_movements 
    WHERE customer_id = c.id
  ) as last_activity
FROM customers c;

-- Function to generate next movement number
CREATE OR REPLACE FUNCTION generate_movement_number()
RETURNS text AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(movement_number AS integer)), 0) + 1
  INTO next_num
  FROM account_movements
  WHERE movement_number ~ '^[0-9]+$';
  
  RETURN LPAD(next_num::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to get customer balance for specific currency
CREATE OR REPLACE FUNCTION get_customer_balance(
  p_customer_id uuid,
  p_currency text
)
RETURNS numeric AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN direction = 'credit' THEN amount
        WHEN direction = 'debit' THEN -amount
        ELSE 0
      END
    ),
    0
  )
  INTO v_balance
  FROM account_movements
  WHERE customer_id = p_customer_id
    AND currency = p_currency;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to get total debts (negative balances)
CREATE OR REPLACE FUNCTION get_total_debts()
RETURNS TABLE(currency text, total_debt numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cb.currency,
    SUM(ABS(cb.balance)) as total_debt
  FROM customer_balances cb
  WHERE cb.balance < 0
  GROUP BY cb.currency;
END;
$$ LANGUAGE plpgsql;