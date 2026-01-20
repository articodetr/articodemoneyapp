export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
      }
      account_movements: {
        Row: {
          id: string
          customer_id: string | null
          movement_number: string | null
          receipt_number: string | null
          receipt_generated_at: string | null
          amount: number
          currency: string
          direction: 'debit' | 'credit'
          commission_amount: number | null
          commission_currency: string | null
          commission_recipient: string | null
          notes: string | null
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          customer_id?: string | null
          movement_number?: string | null
          receipt_number?: string | null
          receipt_generated_at?: string | null
          amount?: number
          currency?: string
          direction: 'debit' | 'credit'
          commission_amount?: number | null
          commission_currency?: string | null
          commission_recipient?: string | null
          notes?: string | null
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          customer_id?: string | null
          movement_number?: string | null
          receipt_number?: string | null
          receipt_generated_at?: string | null
          amount?: number
          currency?: string
          direction?: 'debit' | 'credit'
          commission_amount?: number | null
          commission_currency?: string | null
          commission_recipient?: string | null
          notes?: string | null
          created_at?: string
          user_id?: string | null
        }
      }
      internal_transfers: {
        Row: {
          id: string
          sender_id: string | null
          beneficiary_id: string | null
          amount: number
          currency: string
          notes: string | null
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          sender_id?: string | null
          beneficiary_id?: string | null
          amount?: number
          currency?: string
          notes?: string | null
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          sender_id?: string | null
          beneficiary_id?: string | null
          amount?: number
          currency?: string
          notes?: string | null
          created_at?: string
          user_id?: string | null
        }
      }
      app_settings: {
        Row: {
          id: string
          key: string
          value: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          key: string
          value?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: Json | null
          updated_at?: string
          user_id?: string | null
        }
      }
      exchange_rates: {
        Row: {
          id: string
          from_currency: string
          to_currency: string
          rate: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          from_currency: string
          to_currency: string
          rate?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          from_currency?: string
          to_currency?: string
          rate?: number
          updated_at?: string
          user_id?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'customer'
          username: string
          full_name: string
          phone: string | null
          account_number: number
          created_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'customer'
          username: string
          full_name: string
          phone?: string | null
          account_number?: number
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'customer'
          username?: string
          full_name?: string
          phone?: string | null
          account_number?: number
          created_at?: string
        }
      }
      local_customers: {
        Row: {
          id: string
          owner_id: string
          display_name: string
          phone: string | null
          note: string | null
          local_account_number: number
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          display_name: string
          phone?: string | null
          note?: string | null
          local_account_number?: number
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          display_name?: string
          phone?: string | null
          note?: string | null
          local_account_number?: number
          created_at?: string
        }
      }
      user_customers: {
        Row: {
          id: string
          owner_id: string
          kind: 'registered' | 'local'
          registered_user_id: string | null
          local_customer_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          kind: 'registered' | 'local'
          registered_user_id?: string | null
          local_customer_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          kind?: 'registered' | 'local'
          registered_user_id?: string | null
          local_customer_id?: string | null
          created_at?: string
        }
      }
      customer_movements: {
        Row: {
          id: string
          owner_id: string
          user_customer_id: string
          movement_number: number
          currency: 'USD' | 'YER' | 'SAR' | 'EGP' | 'EUR' | 'AED' | 'QAR'
          amount: number
          signed_amount: number
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          user_customer_id: string
          movement_number?: number
          currency: 'USD' | 'YER' | 'SAR' | 'EGP' | 'EUR' | 'AED' | 'QAR'
          amount: number
          signed_amount: number
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          user_customer_id?: string
          movement_number?: number
          currency?: 'USD' | 'YER' | 'SAR' | 'EGP' | 'EUR' | 'AED' | 'QAR'
          amount?: number
          signed_amount?: number
          note?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      search_profiles: {
        Row: {
          id: string
          username: string
          full_name: string
          account_number: number
        }
      }
      customer_balances: {
        Row: {
          customer_id: string
          customer_name: string
          currency: string
          balance: number
        }
      }
      customers_with_last_activity: {
        Row: {
          id: string
          name: string
          phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
          user_id: string | null
          last_activity: string | null
        }
      }
      customer_balances_by_currency: {
        Row: {
          owner_id: string
          user_customer_id: string
          currency: string
          balance: number
        }
      }
    }
    Functions: {
      generate_movement_number: {
        Args: Record<string, never>
        Returns: string
      }
      generate_receipt_number: {
        Args: Record<string, never>
        Returns: string
      }
      get_customer_balance: {
        Args: {
          p_customer_id: string
          p_currency: string
        }
        Returns: number
      }
      get_total_debts: {
        Args: Record<string, never>
        Returns: {
          currency: string
          total_debt: number
        }[]
      }
      get_or_create_profit_loss_customer: {
        Args: {
          p_owner_id: string
        }
        Returns: string
      }
    }
  }
}

export interface ShopSettings {
  shop_name: string
  shop_phone: string
  shop_address: string
  shop_logo: string | null
  selected_receipt_logo: string | null
}

export interface UserProfile {
  id: string
  role: 'admin' | 'customer'
  username: string
  full_name: string
  account_number: number
  created_at: string
}
