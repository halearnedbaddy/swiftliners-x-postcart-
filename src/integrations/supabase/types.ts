export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          api_key_last_four: string | null
          business_name: string | null
          created_at: string
          id: string
          live_api_key_hash: string | null
          sandbox_api_key: string | null
          status: string
          updated_at: string
          user_id: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key_last_four?: string | null
          business_name?: string | null
          created_at?: string
          id?: string
          live_api_key_hash?: string | null
          sandbox_api_key?: string | null
          status?: string
          updated_at?: string
          user_id: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key_last_four?: string | null
          business_name?: string | null
          created_at?: string
          id?: string
          live_api_key_hash?: string | null
          sandbox_api_key?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      disbursements: {
        Row: {
          account_id: string
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          description: string | null
          failed_at: string | null
          failure_reason: string | null
          fee_amount: number | null
          hold_id: string | null
          id: string
          max_retries: number | null
          metadata: Json | null
          payment_method: string
          processing_at: string | null
          provider_ref: string | null
          queued_at: string
          recipient_name: string | null
          recipient_phone: string
          retry_count: number | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          fee_amount?: number | null
          hold_id?: string | null
          id: string
          max_retries?: number | null
          metadata?: Json | null
          payment_method?: string
          processing_at?: string | null
          provider_ref?: string | null
          queued_at?: string
          recipient_name?: string | null
          recipient_phone: string
          retry_count?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          fee_amount?: number | null
          hold_id?: string | null
          id?: string
          max_retries?: number | null
          metadata?: Json | null
          payment_method?: string
          processing_at?: string | null
          provider_ref?: string | null
          queued_at?: string
          recipient_name?: string | null
          recipient_phone?: string
          retry_count?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disbursements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "escrow_holds"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_messages: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          delivered_at: string | null
          dispute_id: string
          id: string
          is_admin: boolean | null
          message: string
          read_at: string | null
          sender_id: string
          sender_name: string | null
          sender_type: string | null
          status: string | null
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          delivered_at?: string | null
          dispute_id: string
          id?: string
          is_admin?: boolean | null
          message: string
          read_at?: string | null
          sender_id: string
          sender_name?: string | null
          sender_type?: string | null
          status?: string | null
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          delivered_at?: string | null
          dispute_id?: string
          id?: string
          is_admin?: boolean | null
          message?: string
          read_at?: string | null
          sender_id?: string
          sender_name?: string | null
          sender_type?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string | null
          deadline: string | null
          description: string | null
          dispute_type: string | null
          evidence: string[] | null
          id: string
          opened_by_id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by_id: string | null
          status: Database["public"]["Enums"]["dispute_status"] | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          dispute_type?: string | null
          evidence?: string[] | null
          id?: string
          opened_by_id: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by_id?: string | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          dispute_type?: string | null
          evidence?: string[] | null
          id?: string
          opened_by_id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by_id?: string | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_deposits: {
        Row: {
          admin_notes: string | null
          amount: number
          auto_release_at: string | null
          confirmed_at: string | null
          confirmed_by_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          payer_name: string | null
          payer_phone: string | null
          payment_method: string
          payment_proof_url: string | null
          payment_reference: string | null
          released_at: string | null
          released_by_id: string | null
          status: string | null
          transaction_id: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          auto_release_at?: string | null
          confirmed_at?: string | null
          confirmed_by_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          payer_name?: string | null
          payer_phone?: string | null
          payment_method: string
          payment_proof_url?: string | null
          payment_reference?: string | null
          released_at?: string | null
          released_by_id?: string | null
          status?: string | null
          transaction_id: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          auto_release_at?: string | null
          confirmed_at?: string | null
          confirmed_by_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          payer_name?: string | null
          payer_phone?: string | null
          payment_method?: string
          payment_proof_url?: string | null
          payment_reference?: string | null
          released_at?: string | null
          released_by_id?: string | null
          status?: string | null
          transaction_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_deposits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_holds: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          description: string | null
          expires_at: string | null
          held_at: string
          id: string
          metadata: Json | null
          payment_method: string | null
          phone: string | null
          release_method: string | null
          released_at: string | null
          released_to: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          expires_at?: string | null
          held_at?: string
          id: string
          metadata?: Json | null
          payment_method?: string | null
          phone?: string | null
          release_method?: string | null
          released_at?: string | null
          released_to?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          expires_at?: string | null
          held_at?: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          phone?: string | null
          release_method?: string | null
          released_at?: string | null
          released_to?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_holds_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_holds_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_wallets: {
        Row: {
          auto_release_date: string | null
          created_at: string | null
          currency: string | null
          gross_amount: number
          id: string
          locked_at: string | null
          net_amount: number
          order_id: string | null
          platform_fee: number
          released_at: string | null
          released_by: string | null
          requires_buyer_confirmation: boolean | null
          status: string | null
          updated_at: string | null
          wallet_ref: string
        }
        Insert: {
          auto_release_date?: string | null
          created_at?: string | null
          currency?: string | null
          gross_amount: number
          id?: string
          locked_at?: string | null
          net_amount: number
          order_id?: string | null
          platform_fee?: number
          released_at?: string | null
          released_by?: string | null
          requires_buyer_confirmation?: boolean | null
          status?: string | null
          updated_at?: string | null
          wallet_ref: string
        }
        Update: {
          auto_release_date?: string | null
          created_at?: string | null
          currency?: string | null
          gross_amount?: number
          id?: string
          locked_at?: string | null
          net_amount?: number
          order_id?: string | null
          platform_fee?: number
          released_at?: string | null
          released_by?: string | null
          requires_buyer_confirmation?: boolean | null
          status?: string | null
          updated_at?: string | null
          wallet_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_wallets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          details: Json | null
          id: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          transaction_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          transaction_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          created_at: string | null
          credit_account: string
          debit_account: string
          description: string | null
          entry_ref: string
          id: string
          order_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          credit_account: string
          debit_account: string
          description?: string | null
          entry_ref: string
          id?: string
          order_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          credit_account?: string
          debit_account?: string
          description?: string | null
          entry_ref?: string
          id?: string
          order_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      otps: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          is_used: boolean | null
          max_attempts: number | null
          phone: string
          purpose: string
          used_at: string | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          is_used?: boolean | null
          max_attempts?: number | null
          phone: string
          purpose: string
          used_at?: string | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean | null
          max_attempts?: number | null
          phone?: string
          purpose?: string
          used_at?: string | null
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          clicks: number | null
          created_at: string | null
          currency: string | null
          customer_phone: string | null
          expiry_date: string | null
          id: string
          images: string[] | null
          original_price: number | null
          price: number
          product_description: string | null
          product_name: string
          purchases: number | null
          quantity: number | null
          revenue: number | null
          seller_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          clicks?: number | null
          created_at?: string | null
          currency?: string | null
          customer_phone?: string | null
          expiry_date?: string | null
          id: string
          images?: string[] | null
          original_price?: number | null
          price: number
          product_description?: string | null
          product_name: string
          purchases?: number | null
          quantity?: number | null
          revenue?: number | null
          seller_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          clicks?: number | null
          created_at?: string | null
          currency?: string | null
          customer_phone?: string | null
          expiry_date?: string | null
          id?: string
          images?: string[] | null
          original_price?: number | null
          price?: number
          product_description?: string | null
          product_name?: string
          purchases?: number | null
          quantity?: number | null
          revenue?: number | null
          seller_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_name: string
          account_number: string
          country: string | null
          created_at: string | null
          details: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          method_name: string | null
          payment_type: string | null
          provider: string
          type: Database["public"]["Enums"]["payment_method_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          country?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          method_name?: string | null
          payment_type?: string | null
          provider: string
          type: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          country?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          method_name?: string | null
          payment_type?: string | null
          provider?: string
          type?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          platform_fee: number
          seller_id: string
          status: string | null
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          platform_fee: number
          seller_id: string
          status?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          platform_fee?: number
          seller_id?: string
          status?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_accounts: {
        Row: {
          account_type: string
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          account_type: string
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          account_type?: string
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          ai_confidence_score: number | null
          availability_note: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          extraction_warnings: string[] | null
          id: string
          images: string[] | null
          is_available: boolean | null
          last_synced_at: string | null
          missing_fields: string[] | null
          name: string
          platform: Database["public"]["Enums"]["social_platform"] | null
          price: number | null
          social_post_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["product_status"] | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          availability_note?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          extraction_warnings?: string[] | null
          id?: string
          images?: string[] | null
          is_available?: boolean | null
          last_synced_at?: string | null
          missing_fields?: string[] | null
          name: string
          platform?: Database["public"]["Enums"]["social_platform"] | null
          price?: number | null
          social_post_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["product_status"] | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          availability_note?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          extraction_warnings?: string[] | null
          id?: string
          images?: string[] | null
          is_available?: boolean | null
          last_synced_at?: string | null
          missing_fields?: string[] | null
          name?: string
          platform?: Database["public"]["Enums"]["social_platform"] | null
          price?: number | null
          social_post_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["product_status"] | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"] | null
          created_at: string | null
          email: string | null
          failed_login_attempts: number | null
          id: string
          is_active: boolean | null
          is_email_verified: boolean | null
          is_phone_verified: boolean | null
          last_login: string | null
          locked_until: string | null
          member_since: string | null
          name: string
          phone: string | null
          profile_picture: string | null
          role: string | null
          signup_method: Database["public"]["Enums"]["signup_method"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          created_at?: string | null
          email?: string | null
          failed_login_attempts?: number | null
          id?: string
          is_active?: boolean | null
          is_email_verified?: boolean | null
          is_phone_verified?: boolean | null
          last_login?: string | null
          locked_until?: string | null
          member_since?: string | null
          name: string
          phone?: string | null
          profile_picture?: string | null
          role?: string | null
          signup_method?: Database["public"]["Enums"]["signup_method"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          created_at?: string | null
          email?: string | null
          failed_login_attempts?: number | null
          id?: string
          is_active?: boolean | null
          is_email_verified?: boolean | null
          is_phone_verified?: boolean | null
          last_login?: string | null
          locked_until?: string | null
          member_since?: string | null
          name?: string
          phone?: string | null
          profile_picture?: string | null
          role?: string | null
          signup_method?: Database["public"]["Enums"]["signup_method"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seller_profiles: {
        Row: {
          business_address: string | null
          business_name: string | null
          created_at: string | null
          id: string
          is_verified: boolean | null
          rating: number | null
          response_time: number | null
          success_rate: number | null
          total_reviews: number | null
          total_sales: number | null
          updated_at: string | null
          user_id: string
          verification_date: string | null
        }
        Insert: {
          business_address?: string | null
          business_name?: string | null
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          rating?: number | null
          response_time?: number | null
          success_rate?: number | null
          total_reviews?: number | null
          total_sales?: number | null
          updated_at?: string | null
          user_id: string
          verification_date?: string | null
        }
        Update: {
          business_address?: string | null
          business_name?: string | null
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          rating?: number | null
          response_time?: number | null
          success_rate?: number | null
          total_reviews?: number | null
          total_sales?: number | null
          updated_at?: string | null
          user_id?: string
          verification_date?: string | null
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string | null
          id: string
          message: string
          metadata: Json | null
          recipient: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          message: string
          metadata?: Json | null
          recipient: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          recipient?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          created_at: string | null
          id: string
          last_scanned_at: string | null
          page_id: string | null
          page_url: string
          platform: Database["public"]["Enums"]["social_platform"]
          scan_status: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_scanned_at?: string | null
          page_id?: string | null
          page_url: string
          platform: Database["public"]["Enums"]["social_platform"]
          scan_status?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_scanned_at?: string | null
          page_id?: string | null
          page_url?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          scan_status?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          bio: string | null
          created_at: string | null
          id: string
          logo: string | null
          name: string
          seller_id: string
          slug: string
          status: Database["public"]["Enums"]["store_status"] | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          id?: string
          logo?: string | null
          name: string
          seller_id: string
          slug: string
          status?: Database["public"]["Enums"]["store_status"] | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          id?: string
          logo?: string | null
          name?: string
          seller_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["store_status"] | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          items_created: number | null
          items_failed: number | null
          items_fetched: number | null
          items_updated: number | null
          social_account_id: string | null
          started_at: string | null
          status: string | null
          store_id: string
          trigger: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          items_created?: number | null
          items_failed?: number | null
          items_fetched?: number | null
          items_updated?: number | null
          social_account_id?: string | null
          started_at?: string | null
          status?: string | null
          store_id: string
          trigger: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          items_created?: number | null
          items_failed?: number | null
          items_fetched?: number | null
          items_updated?: number | null
          social_account_id?: string | null
          started_at?: string | null
          status?: string | null
          store_id?: string
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      totp_secrets: {
        Row: {
          backup_codes: string[] | null
          created_at: string
          encrypted_secret: string
          id: string
          is_verified: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string
          encrypted_secret: string
          id?: string
          is_verified?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string
          encrypted_secret?: string
          id?: string
          is_verified?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_validations: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          status: string
          transaction_id: string
          validation_type: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          status?: string
          transaction_id: string
          validation_type: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          status?: string
          transaction_id?: string
          validation_type?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          accepted_at: string | null
          admin_rejection_reason: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          auto_release_at: string | null
          buyer_address: string | null
          buyer_confirmed_at: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string | null
          buyer_phone: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          courier_name: string | null
          created_at: string | null
          currency: string | null
          delivered_at: string | null
          delivery_proof_urls: string[] | null
          escrow_status: string | null
          escrow_wallet_id: string | null
          estimated_delivery_date: string | null
          expires_at: string | null
          id: string
          item_description: string | null
          item_images: string[] | null
          item_name: string
          paid_at: string | null
          payment_instructions: string | null
          payment_method: string | null
          payment_reference: string | null
          platform_fee: number | null
          product_id: string | null
          quantity: number | null
          refunded_at: string | null
          rejected_at: string | null
          rejection_reason: string | null
          screenshot_url: string | null
          seller_id: string
          seller_payout: number | null
          shipped_at: string | null
          shipping_notes: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          tracking_number: string | null
          transaction_code: string | null
          updated_at: string | null
          verification_details: Json | null
          verification_status: string | null
        }
        Insert: {
          accepted_at?: string | null
          admin_rejection_reason?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          auto_release_at?: string | null
          buyer_address?: string | null
          buyer_confirmed_at?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          courier_name?: string | null
          created_at?: string | null
          currency?: string | null
          delivered_at?: string | null
          delivery_proof_urls?: string[] | null
          escrow_status?: string | null
          escrow_wallet_id?: string | null
          estimated_delivery_date?: string | null
          expires_at?: string | null
          id: string
          item_description?: string | null
          item_images?: string[] | null
          item_name: string
          paid_at?: string | null
          payment_instructions?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          platform_fee?: number | null
          product_id?: string | null
          quantity?: number | null
          refunded_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          screenshot_url?: string | null
          seller_id: string
          seller_payout?: number | null
          shipped_at?: string | null
          shipping_notes?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          tracking_number?: string | null
          transaction_code?: string | null
          updated_at?: string | null
          verification_details?: Json | null
          verification_status?: string | null
        }
        Update: {
          accepted_at?: string | null
          admin_rejection_reason?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          auto_release_at?: string | null
          buyer_address?: string | null
          buyer_confirmed_at?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          courier_name?: string | null
          created_at?: string | null
          currency?: string | null
          delivered_at?: string | null
          delivery_proof_urls?: string[] | null
          escrow_status?: string | null
          escrow_wallet_id?: string | null
          estimated_delivery_date?: string | null
          expires_at?: string | null
          id?: string
          item_description?: string | null
          item_images?: string[] | null
          item_name?: string
          paid_at?: string | null
          payment_instructions?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          platform_fee?: number | null
          product_id?: string | null
          quantity?: number | null
          refunded_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          screenshot_url?: string | null
          seller_id?: string
          seller_payout?: number | null
          shipped_at?: string | null
          shipping_notes?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          tracking_number?: string | null
          transaction_code?: string | null
          updated_at?: string | null
          verification_details?: Json | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_escrow_wallet_id_fkey"
            columns: ["escrow_wallet_id"]
            isOneToOne: false
            referencedRelation: "escrow_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          reference: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          reference: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          reference?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          available_balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          pending_balance: number | null
          total_earned: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          pending_balance?: number | null
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          pending_balance?: number | null
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt: number
          created_at: string
          delivered_at: string | null
          event_type: string
          failed_at: string | null
          id: string
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
          webhook_endpoint_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          event_type: string
          failed_at?: string | null
          id?: string
          max_attempts?: number
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          webhook_endpoint_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          failed_at?: string | null
          id?: string
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          webhook_endpoint_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_endpoint_id_fkey"
            columns: ["webhook_endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          account_id: string
          created_at: string
          description: string | null
          events: string[]
          id: string
          is_active: boolean
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          account_id: string
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string | null
          failure_reason: string | null
          fee: number | null
          id: string
          net_amount: number | null
          payment_method_id: string
          processed_at: string | null
          reference: string | null
          status: Database["public"]["Enums"]["withdrawal_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          failure_reason?: string | null
          fee?: number | null
          id?: string
          net_amount?: number | null
          payment_method_id: string
          processed_at?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          failure_reason?: string | null
          fee?: number | null
          id?: string
          net_amount?: number | null
          payment_method_id?: string
          processed_at?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "pending_verification"
      app_role: "buyer" | "seller" | "admin"
      dispute_status:
        | "open"
        | "under_review"
        | "awaiting_seller"
        | "awaiting_buyer"
        | "resolved_buyer"
        | "resolved_seller"
        | "closed"
      notification_type:
        | "payment_received"
        | "order_accepted"
        | "item_shipped"
        | "delivery_confirmed"
        | "dispute_opened"
        | "dispute_update"
        | "dispute_resolved"
        | "withdrawal_processed"
        | "link_expired"
        | "reminder"
      payment_method_type: "mobile_money" | "bank_account"
      product_status: "draft" | "published" | "archived"
      signup_method: "phone_otp" | "email_password" | "admin_created"
      social_platform: "instagram" | "facebook" | "linkedin"
      store_status: "inactive" | "active" | "frozen"
      transaction_status:
        | "pending"
        | "processing"
        | "paid"
        | "accepted"
        | "shipped"
        | "delivered"
        | "completed"
        | "disputed"
        | "cancelled"
        | "refunded"
        | "expired"
      withdrawal_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "pending_verification"],
      app_role: ["buyer", "seller", "admin"],
      dispute_status: [
        "open",
        "under_review",
        "awaiting_seller",
        "awaiting_buyer",
        "resolved_buyer",
        "resolved_seller",
        "closed",
      ],
      notification_type: [
        "payment_received",
        "order_accepted",
        "item_shipped",
        "delivery_confirmed",
        "dispute_opened",
        "dispute_update",
        "dispute_resolved",
        "withdrawal_processed",
        "link_expired",
        "reminder",
      ],
      payment_method_type: ["mobile_money", "bank_account"],
      product_status: ["draft", "published", "archived"],
      signup_method: ["phone_otp", "email_password", "admin_created"],
      social_platform: ["instagram", "facebook", "linkedin"],
      store_status: ["inactive", "active", "frozen"],
      transaction_status: [
        "pending",
        "processing",
        "paid",
        "accepted",
        "shipped",
        "delivered",
        "completed",
        "disputed",
        "cancelled",
        "refunded",
        "expired",
      ],
      withdrawal_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
    },
  },
} as const
