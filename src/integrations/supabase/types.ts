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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_secrets: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      agent_logs: {
        Row: {
          action: string
          agent_name: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          product_id: string | null
          status: string
        }
        Insert: {
          action: string
          agent_name: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          product_id?: string | null
          status?: string
        }
        Update: {
          action?: string
          agent_name?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          product_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      b2b_customer_grids: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          grid_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          grid_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          grid_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_customer_grids_grid_id_fkey"
            columns: ["grid_id"]
            isOneToOne: false
            referencedRelation: "b2b_price_grids"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_grid_categories: {
        Row: {
          category: string
          discount_percent: number
          grid_id: string
          id: string
        }
        Insert: {
          category: string
          discount_percent?: number
          grid_id: string
          id?: string
        }
        Update: {
          category?: string
          discount_percent?: number
          grid_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_grid_categories_grid_id_fkey"
            columns: ["grid_id"]
            isOneToOne: false
            referencedRelation: "b2b_price_grids"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_price_grids: {
        Row: {
          created_at: string
          customer_type: string
          description: string | null
          discount_percent: number
          id: string
          is_active: boolean
          min_order_amount: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_type?: string
          description?: string | null
          discount_percent?: number
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_type?: string
          description?: string | null
          discount_percent?: number
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          code: string | null
          company: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          code?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          code?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          level: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          level: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          level?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_prices: {
        Row: {
          competitor_name: string
          competitor_price: number
          competitor_url: string | null
          created_at: string
          id: string
          price_difference: number | null
          price_difference_percent: number | null
          product_ean: string | null
          product_id: string
          scraped_at: string
        }
        Insert: {
          competitor_name: string
          competitor_price: number
          competitor_url?: string | null
          created_at?: string
          id?: string
          price_difference?: number | null
          price_difference_percent?: number | null
          product_ean?: string | null
          product_id: string
          scraped_at?: string
        }
        Update: {
          competitor_name?: string
          competitor_price?: number
          competitor_url?: string | null
          created_at?: string
          id?: string
          price_difference?: number | null
          price_difference_percent?: number | null
          product_ean?: string | null
          product_id?: string
          scraped_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      competitor_product_map: {
        Row: {
          active: boolean
          competitor_id: string
          created_at: string
          id: string
          last_error: string | null
          last_success_at: string | null
          pack_size: number
          product_id: string
          product_url: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          competitor_id: string
          created_at?: string
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          pack_size?: number
          product_id: string
          product_url: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          competitor_id?: string
          created_at?: string
          id?: string
          last_error?: string | null
          last_success_at?: string | null
          pack_size?: number
          product_id?: string
          product_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_product_map_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_product_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_product_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_product_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      competitors: {
        Row: {
          base_url: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          price_selector: string | null
          rate_limit_ms: number | null
          updated_at: string
        }
        Insert: {
          base_url: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          price_selector?: string | null
          rate_limit_ms?: number | null
          updated_at?: string
        }
        Update: {
          base_url?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          price_selector?: string | null
          rate_limit_ms?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      crawl_images: {
        Row: {
          bytes: number | null
          content_type: string | null
          created_at: string
          id: string
          job_id: string
          page_url: string | null
          sha256: string | null
          source_url: string
          storage_path: string | null
          storage_public_url: string | null
        }
        Insert: {
          bytes?: number | null
          content_type?: string | null
          created_at?: string
          id?: string
          job_id: string
          page_url?: string | null
          sha256?: string | null
          source_url: string
          storage_path?: string | null
          storage_public_url?: string | null
        }
        Update: {
          bytes?: number | null
          content_type?: string | null
          created_at?: string
          id?: string
          job_id?: string
          page_url?: string | null
          sha256?: string | null
          source_url?: string
          storage_path?: string | null
          storage_public_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crawl_images_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crawl_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          delay_ms: number
          id: string
          images_found: number
          images_uploaded: number
          last_error: string | null
          max_images: number
          max_pages: number
          pages_visited: number
          source: string
          start_urls: string[]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delay_ms?: number
          id?: string
          images_found?: number
          images_uploaded?: number
          last_error?: string | null
          max_images?: number
          max_pages?: number
          pages_visited?: number
          source: string
          start_urls: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delay_ms?: number
          id?: string
          images_found?: number
          images_uploaded?: number
          last_error?: string | null
          max_images?: number
          max_pages?: number
          pages_visited?: number
          source?: string
          start_urls?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      crawl_pages: {
        Row: {
          fetched_at: string
          http_status: number | null
          id: string
          images_on_page: number | null
          job_id: string
          links_found: number | null
          page_url: string
        }
        Insert: {
          fetched_at?: string
          http_status?: number | null
          id?: string
          images_on_page?: number | null
          job_id: string
          links_found?: number | null
          page_url: string
        }
        Update: {
          fetched_at?: string
          http_status?: number | null
          id?: string
          images_on_page?: number | null
          job_id?: string
          links_found?: number | null
          page_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_pages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "crawl_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_job_logs: {
        Row: {
          duration_ms: number | null
          error_message: string | null
          executed_at: string
          id: string
          job_name: string
          result: Json | null
          status: string
        }
        Insert: {
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string
          id?: string
          job_name: string
          result?: Json | null
          status?: string
        }
        Update: {
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string
          id?: string
          job_name?: string
          result?: Json | null
          status?: string
        }
        Relationships: []
      }
      customer_interactions: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          interaction_type: string
          notes: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          interaction_type: string
          notes?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          interaction_type?: string
          notes?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      customer_recommendations: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          recommendation_reason: string | null
          recommendation_score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          recommendation_reason?: string | null
          recommendation_score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          recommendation_reason?: string | null
          recommendation_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      customer_rfm_scores: {
        Row: {
          avg_order_value: number | null
          calculated_at: string | null
          churn_risk: number | null
          frequency_score: number | null
          id: string
          last_order_date: string | null
          lifetime_value_estimate: number | null
          monetary_score: number | null
          recency_score: number | null
          rfm_segment: string | null
          total_orders: number | null
          total_spent: number | null
          user_id: string
        }
        Insert: {
          avg_order_value?: number | null
          calculated_at?: string | null
          churn_risk?: number | null
          frequency_score?: number | null
          id?: string
          last_order_date?: string | null
          lifetime_value_estimate?: number | null
          monetary_score?: number | null
          recency_score?: number | null
          rfm_segment?: string | null
          total_orders?: number | null
          total_spent?: number | null
          user_id: string
        }
        Update: {
          avg_order_value?: number | null
          calculated_at?: string | null
          churn_risk?: number | null
          frequency_score?: number | null
          id?: string
          last_order_date?: string | null
          lifetime_value_estimate?: number | null
          monetary_score?: number | null
          recency_score?: number | null
          rfm_segment?: string | null
          total_orders?: number | null
          total_spent?: number | null
          user_id?: string
        }
        Relationships: []
      }
      data_processing_register: {
        Row: {
          created_at: string
          created_by: string
          data_categories: string[]
          data_source: string | null
          data_subjects: string[]
          dpia_conducted_at: string | null
          dpia_required: boolean | null
          id: string
          is_automated_decision: boolean | null
          legal_basis: string
          processing_name: string
          processing_purpose: string
          recipients: string[] | null
          retention_period: string
          security_measures: string | null
          status: string
          third_country_transfers: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          data_categories?: string[]
          data_source?: string | null
          data_subjects?: string[]
          dpia_conducted_at?: string | null
          dpia_required?: boolean | null
          id?: string
          is_automated_decision?: boolean | null
          legal_basis: string
          processing_name: string
          processing_purpose: string
          recipients?: string[] | null
          retention_period: string
          security_measures?: string | null
          status?: string
          third_country_transfers?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data_categories?: string[]
          data_source?: string | null
          data_subjects?: string[]
          dpia_conducted_at?: string | null
          dpia_required?: boolean | null
          id?: string
          is_automated_decision?: boolean | null
          legal_basis?: string
          processing_name?: string
          processing_purpose?: string
          recipients?: string[] | null
          retention_period?: string
          security_measures?: string | null
          status?: string
          third_country_transfers?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      data_retention_logs: {
        Row: {
          data_type: string
          deleted_at: string
          deleted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          data_type: string
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          data_type?: string
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      gdpr_requests: {
        Row: {
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          request_type: string
          requested_at: string
          response_data: Json | null
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type: string
          requested_at?: string
          response_data?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          requested_at?: string
          response_data?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      liderpapel_pricing_coefficients: {
        Row: {
          coefficient: number
          created_at: string
          family: string
          id: string
          is_active: boolean | null
          subfamily: string | null
          updated_at: string
        }
        Insert: {
          coefficient?: number
          created_at?: string
          family: string
          id?: string
          is_active?: boolean | null
          subfamily?: string | null
          updated_at?: string
        }
        Update: {
          coefficient?: number
          created_at?: string
          family?: string
          id?: string
          is_active?: boolean | null
          subfamily?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_connections: {
        Row: {
          created_at: string
          credentials: Json | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          marketplace_name: string
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          marketplace_name: string
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials?: Json | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          marketplace_name?: string
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_product_mappings: {
        Row: {
          created_at: string
          id: string
          is_synced: boolean | null
          last_stock_sync_at: string | null
          marketplace_asin: string | null
          marketplace_name: string
          marketplace_product_id: string | null
          marketplace_sku: string | null
          product_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_synced?: boolean | null
          last_stock_sync_at?: string | null
          marketplace_asin?: string | null
          marketplace_name: string
          marketplace_product_id?: string | null
          marketplace_sku?: string | null
          product_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_synced?: boolean | null
          last_stock_sync_at?: string | null
          marketplace_asin?: string | null
          marketplace_name?: string
          marketplace_product_id?: string | null
          marketplace_sku?: string | null
          product_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_product_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_product_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_product_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      marketplace_sales: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          marketplace_name: string
          order_date: string
          order_id: string
          product_id: string | null
          product_name: string | null
          product_sku: string | null
          quantity: number
          status: string | null
          total_amount: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          marketplace_name: string
          order_date: string
          order_id: string
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          quantity?: number
          status?: string | null
          total_amount: number
          unit_price: number
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          marketplace_name?: string
          order_date?: string
          order_id?: string
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          quantity?: number
          status?: string | null
          total_amount?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      marketplace_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          errors: Json | null
          id: string
          items_synced: number | null
          marketplace_name: string
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          id?: string
          items_synced?: number | null
          marketplace_name: string
          started_at?: string
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          id?: string
          items_synced?: number | null
          marketplace_name?: string
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity: number
          subtotal: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity?: number
          subtotal: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_price?: number
          quantity?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string
          customer_email: string
          customer_phone: string | null
          id: string
          notes: string | null
          order_number: string
          shipping_address: Json | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string
          customer_email: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_number: string
          shipping_address?: Json | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address?: Json | null
          created_at?: string
          customer_email?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          shipping_address?: Json | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_adjustments: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          competitor_avg_price: number | null
          created_at: string
          id: string
          new_margin_percent: number | null
          new_price_ht: number
          old_margin_percent: number | null
          old_price_ht: number
          price_change_percent: number
          pricing_rule_id: string | null
          product_id: string
          reason: string | null
          status: string
          supplier_price: number | null
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          competitor_avg_price?: number | null
          created_at?: string
          id?: string
          new_margin_percent?: number | null
          new_price_ht: number
          old_margin_percent?: number | null
          old_price_ht: number
          price_change_percent: number
          pricing_rule_id?: string | null
          product_id: string
          reason?: string | null
          status?: string
          supplier_price?: number | null
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          competitor_avg_price?: number | null
          created_at?: string
          id?: string
          new_margin_percent?: number | null
          new_price_ht?: number
          old_margin_percent?: number | null
          old_price_ht?: number
          price_change_percent?: number
          pricing_rule_id?: string | null
          product_id?: string
          reason?: string | null
          status?: string
          supplier_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_adjustments_pricing_rule_id_fkey"
            columns: ["pricing_rule_id"]
            isOneToOne: false
            referencedRelation: "pricing_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      price_current: {
        Row: {
          best_competitor_id: string | null
          best_price: number | null
          pack_size: number
          product_id: string
          sample_count: number
          updated_at: string
        }
        Insert: {
          best_competitor_id?: string | null
          best_price?: number | null
          pack_size?: number
          product_id: string
          sample_count?: number
          updated_at?: string
        }
        Update: {
          best_competitor_id?: string | null
          best_price?: number | null
          pack_size?: number
          product_id?: string
          sample_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_current_best_competitor_id_fkey"
            columns: ["best_competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_current_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_current_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_current_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      price_snapshots: {
        Row: {
          competitor_id: string
          created_at: string
          currency: string
          id: string
          is_suspect: boolean
          pack_size: number
          price: number
          product_id: string
          scraped_at: string
          source_url: string | null
        }
        Insert: {
          competitor_id: string
          created_at?: string
          currency?: string
          id?: string
          is_suspect?: boolean
          pack_size?: number
          price: number
          product_id: string
          scraped_at?: string
          source_url?: string | null
        }
        Update: {
          competitor_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_suspect?: boolean
          pack_size?: number
          price?: number
          product_id?: string
          scraped_at?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_snapshots_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      pricing_alerts: {
        Row: {
          alert_type: string
          competitor_name: string | null
          competitor_price: number | null
          created_at: string | null
          details: Json | null
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          our_price: number | null
          price_difference: number | null
          price_difference_percent: number | null
          product_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          suggested_action: string | null
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          competitor_name?: string | null
          competitor_price?: number | null
          created_at?: string | null
          details?: Json | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          our_price?: number | null
          price_difference?: number | null
          price_difference_percent?: number | null
          product_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          suggested_action?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          competitor_name?: string | null
          competitor_price?: number | null
          created_at?: string | null
          details?: Json | null
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          our_price?: number | null
          price_difference?: number | null
          price_difference_percent?: number | null
          product_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          suggested_action?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      pricing_insights: {
        Row: {
          competitor_data: Json | null
          created_at: string
          current_price: number | null
          description: string
          id: string
          insight_type: string
          potential_gain: number | null
          priority: string
          product_id: string | null
          reviewed_by: string | null
          status: string
          suggested_price: number | null
          title: string
        }
        Insert: {
          competitor_data?: Json | null
          created_at?: string
          current_price?: number | null
          description: string
          id?: string
          insight_type: string
          potential_gain?: number | null
          priority?: string
          product_id?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_price?: number | null
          title: string
        }
        Update: {
          competitor_data?: Json | null
          created_at?: string
          current_price?: number | null
          description?: string
          id?: string
          insight_type?: string
          potential_gain?: number | null
          priority?: string
          product_id?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_price?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_insights_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_insights_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_insights_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          category: string | null
          competitor_offset_fixed: number | null
          competitor_offset_percent: number | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          last_applied_at: string | null
          max_margin_percent: number | null
          max_price_change_percent: number | null
          max_price_ht: number | null
          min_competitor_count: number | null
          min_margin_percent: number | null
          min_price_ht: number | null
          name: string
          priority: number
          product_ids: string[] | null
          require_approval: boolean | null
          strategy: string
          supplier_ids: string[] | null
          target_margin_percent: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          competitor_offset_fixed?: number | null
          competitor_offset_percent?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_applied_at?: string | null
          max_margin_percent?: number | null
          max_price_change_percent?: number | null
          max_price_ht?: number | null
          min_competitor_count?: number | null
          min_margin_percent?: number | null
          min_price_ht?: number | null
          name: string
          priority?: number
          product_ids?: string[] | null
          require_approval?: boolean | null
          strategy: string
          supplier_ids?: string[] | null
          target_margin_percent?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          competitor_offset_fixed?: number | null
          competitor_offset_percent?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_applied_at?: string | null
          max_margin_percent?: number | null
          max_price_change_percent?: number | null
          max_price_ht?: number | null
          min_competitor_count?: number | null
          min_margin_percent?: number | null
          min_price_ht?: number | null
          name?: string
          priority?: number
          product_ids?: string[] | null
          require_approval?: boolean | null
          strategy?: string
          supplier_ids?: string[] | null
          target_margin_percent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      product_attributes: {
        Row: {
          attribute_name: string
          attribute_type: string
          attribute_value: string
          created_at: string
          id: string
          product_id: string
          source: string | null
          unit: string | null
        }
        Insert: {
          attribute_name: string
          attribute_type: string
          attribute_value: string
          created_at?: string
          id?: string
          product_id: string
          source?: string | null
          unit?: string | null
        }
        Update: {
          attribute_name?: string
          attribute_type?: string
          attribute_value?: string
          created_at?: string
          id?: string
          product_id?: string
          source?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_exceptions: {
        Row: {
          created_at: string
          details: Json | null
          exception_type: string
          id: string
          product_id: string
          resolved: boolean
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          exception_type: string
          id?: string
          product_id: string
          resolved?: boolean
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          exception_type?: string
          id?: string
          product_id?: string
          resolved?: boolean
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_exceptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_exceptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_exceptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_seo: string | null
          created_at: string
          display_order: number | null
          id: string
          is_principal: boolean
          product_id: string
          source: string
          updated_at: string
          url_optimisee: string | null
          url_originale: string
        }
        Insert: {
          alt_seo?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_principal?: boolean
          product_id: string
          source?: string
          updated_at?: string
          url_optimisee?: string | null
          url_originale: string
        }
        Update: {
          alt_seo?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_principal?: boolean
          product_id?: string
          source?: string
          updated_at?: string
          url_optimisee?: string | null
          url_originale?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_lifecycle_logs: {
        Row: {
          details: Json
          event_at: string
          event_type: string
          id: string
          performed_by: string
          product_id: string
        }
        Insert: {
          details?: Json
          event_at?: string
          event_type: string
          id?: string
          performed_by?: string
          product_id: string
        }
        Update: {
          details?: Json
          event_at?: string
          event_type?: string
          id?: string
          performed_by?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_lifecycle_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_lifecycle_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_lifecycle_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_packagings: {
        Row: {
          created_at: string
          dimensions: string | null
          ean: string | null
          id: string
          packaging_type: string
          product_id: string
          qty: number
          weight_gr: number | null
        }
        Insert: {
          created_at?: string
          dimensions?: string | null
          ean?: string | null
          id?: string
          packaging_type: string
          product_id: string
          qty?: number
          weight_gr?: number | null
        }
        Update: {
          created_at?: string
          dimensions?: string | null
          ean?: string | null
          id?: string
          packaging_type?: string
          product_id?: string
          qty?: number
          weight_gr?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_packagings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_packagings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_packagings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string
          id: string
          new_cost_price: number | null
          new_price_ht: number | null
          new_price_ttc: number | null
          old_cost_price: number | null
          old_price_ht: number | null
          old_price_ttc: number | null
          product_id: string
          supplier_id: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string
          id?: string
          new_cost_price?: number | null
          new_price_ht?: number | null
          new_price_ttc?: number | null
          old_cost_price?: number | null
          old_price_ht?: number | null
          old_price_ttc?: number | null
          product_id: string
          supplier_id?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string
          id?: string
          new_cost_price?: number | null
          new_price_ht?: number | null
          new_price_ttc?: number | null
          old_cost_price?: number | null
          old_price_ht?: number | null
          old_price_ttc?: number | null
          product_id?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_price_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_relations: {
        Row: {
          created_at: string
          id: string
          product_id: string
          related_product_id: string
          relation_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          related_product_id: string
          relation_type: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          related_product_id?: string
          relation_type?: string
        }
        Relationships: []
      }
      product_seo: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          description_courte: string | null
          description_detaillee: string | null
          description_longue: string | null
          description_source: string | null
          generated_at: string
          id: string
          json_ld: Json | null
          lang: string | null
          meta_description: string | null
          meta_title: string | null
          product_id: string
          seo_score: number | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          description_courte?: string | null
          description_detaillee?: string | null
          description_longue?: string | null
          description_source?: string | null
          generated_at?: string
          id?: string
          json_ld?: Json | null
          lang?: string | null
          meta_description?: string | null
          meta_title?: string | null
          product_id: string
          seo_score?: number | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          description_courte?: string | null
          description_detaillee?: string | null
          description_longue?: string | null
          description_source?: string | null
          generated_at?: string
          id?: string
          json_ld?: Json | null
          lang?: string | null
          meta_description?: string | null
          meta_title?: string | null
          product_id?: string
          seo_score?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_seo_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_seo_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_seo_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_stock_locations: {
        Row: {
          created_at: string | null
          id: string
          last_inventory_date: string | null
          location_name: string
          location_type: string
          min_stock_alert: number | null
          notes: string | null
          product_id: string | null
          reorder_point: number | null
          stock_quantity: number | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_inventory_date?: string | null
          location_name: string
          location_type: string
          min_stock_alert?: number | null
          notes?: string | null
          product_id?: string | null
          reorder_point?: number | null
          stock_quantity?: number | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_inventory_date?: string | null
          location_name?: string
          location_type?: string
          min_stock_alert?: number | null
          notes?: string | null
          product_id?: string | null
          reorder_point?: number | null
          stock_quantity?: number | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_locations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_locations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_locations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_stock_locations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_volume_pricing: {
        Row: {
          created_at: string | null
          discount_percent: number | null
          id: string
          max_quantity: number | null
          min_quantity: number
          price_ht: number
          price_ttc: number
          product_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          max_quantity?: number | null
          min_quantity: number
          price_ht: number
          price_ttc: number
          product_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          max_quantity?: number | null
          min_quantity?: number
          price_ht?: number
          price_ttc?: number
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_volume_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_volume_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_volume_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          attributs: Json
          availability_updated_at: string | null
          available_qty_total: number | null
          badge: string | null
          brand: string | null
          category: string
          code_b2b: number | null
          cost_price: number | null
          country_origin: string | null
          created_at: string
          customs_code: string | null
          delivery_days: number | null
          description: string | null
          dimensions_cm: string | null
          ean: string | null
          eco: boolean | null
          eco_contribution: number | null
          eco_tax: number | null
          family: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_available: boolean | null
          is_end_of_life: boolean | null
          is_featured: boolean | null
          is_fragile: boolean | null
          is_heavy: boolean | null
          is_special_order: boolean | null
          manufacturer_code: string | null
          manufacturer_ref: string | null
          margin_percent: number | null
          min_stock_alert: number | null
          name: string
          name_short: string | null
          oem_ref: string | null
          price: number
          price_ht: number | null
          price_ttc: number | null
          public_price_source: string | null
          public_price_ttc: number | null
          public_price_updated_at: string | null
          ref_b2b: string | null
          ref_softcarrier: string | null
          reorder_quantity: number | null
          requires_special_shipping: boolean | null
          sku_interne: string | null
          status: string | null
          stock_quantity: number | null
          subcategory: string | null
          subfamily: string | null
          tva_rate: number | null
          updated_at: string
          vat_code: number | null
          warranty_months: number | null
          weight_kg: number | null
        }
        Insert: {
          attributs?: Json
          availability_updated_at?: string | null
          available_qty_total?: number | null
          badge?: string | null
          brand?: string | null
          category: string
          code_b2b?: number | null
          cost_price?: number | null
          country_origin?: string | null
          created_at?: string
          customs_code?: string | null
          delivery_days?: number | null
          description?: string | null
          dimensions_cm?: string | null
          ean?: string | null
          eco?: boolean | null
          eco_contribution?: number | null
          eco_tax?: number | null
          family?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          is_end_of_life?: boolean | null
          is_featured?: boolean | null
          is_fragile?: boolean | null
          is_heavy?: boolean | null
          is_special_order?: boolean | null
          manufacturer_code?: string | null
          manufacturer_ref?: string | null
          margin_percent?: number | null
          min_stock_alert?: number | null
          name: string
          name_short?: string | null
          oem_ref?: string | null
          price: number
          price_ht?: number | null
          price_ttc?: number | null
          public_price_source?: string | null
          public_price_ttc?: number | null
          public_price_updated_at?: string | null
          ref_b2b?: string | null
          ref_softcarrier?: string | null
          reorder_quantity?: number | null
          requires_special_shipping?: boolean | null
          sku_interne?: string | null
          status?: string | null
          stock_quantity?: number | null
          subcategory?: string | null
          subfamily?: string | null
          tva_rate?: number | null
          updated_at?: string
          vat_code?: number | null
          warranty_months?: number | null
          weight_kg?: number | null
        }
        Update: {
          attributs?: Json
          availability_updated_at?: string | null
          available_qty_total?: number | null
          badge?: string | null
          brand?: string | null
          category?: string
          code_b2b?: number | null
          cost_price?: number | null
          country_origin?: string | null
          created_at?: string
          customs_code?: string | null
          delivery_days?: number | null
          description?: string | null
          dimensions_cm?: string | null
          ean?: string | null
          eco?: boolean | null
          eco_contribution?: number | null
          eco_tax?: number | null
          family?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          is_end_of_life?: boolean | null
          is_featured?: boolean | null
          is_fragile?: boolean | null
          is_heavy?: boolean | null
          is_special_order?: boolean | null
          manufacturer_code?: string | null
          manufacturer_ref?: string | null
          margin_percent?: number | null
          min_stock_alert?: number | null
          name?: string
          name_short?: string | null
          oem_ref?: string | null
          price?: number
          price_ht?: number | null
          price_ttc?: number | null
          public_price_source?: string | null
          public_price_ttc?: number | null
          public_price_updated_at?: string | null
          ref_b2b?: string | null
          ref_softcarrier?: string | null
          reorder_quantity?: number | null
          requires_special_shipping?: boolean | null
          sku_interne?: string | null
          status?: string | null
          stock_quantity?: number | null
          subcategory?: string | null
          subfamily?: string | null
          tva_rate?: number | null
          updated_at?: string
          vat_code?: number | null
          warranty_months?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          purchase_order_id: string | null
          quantity: number
          received_quantity: number | null
          supplier_product_id: string | null
          unit_price_ht: number
          unit_price_ttc: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          purchase_order_id?: string | null
          quantity: number
          received_quantity?: number | null
          supplier_product_id?: string | null
          unit_price_ht: number
          unit_price_ttc: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          purchase_order_id?: string | null
          quantity?: number
          received_quantity?: number | null
          supplier_product_id?: string | null
          unit_price_ht?: number
          unit_price_ttc?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_supplier_product_id_fkey"
            columns: ["supplier_product_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          created_at: string | null
          created_by: string
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string | null
          order_number: string
          status: string | null
          supplier_id: string | null
          total_ht: number | null
          total_ttc: number | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          created_at?: string | null
          created_by: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number: string
          status?: string | null
          supplier_id?: string | null
          total_ht?: number | null
          total_ttc?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          created_at?: string | null
          created_by?: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number?: string
          status?: string | null
          supplier_id?: string | null
          total_ht?: number | null
          total_ttc?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      reorder_suggestions: {
        Row: {
          approved_by: string | null
          best_supplier: string | null
          created_at: string
          current_stock: number | null
          estimated_cost: number | null
          id: string
          product_id: string | null
          product_name: string
          reasoning: string | null
          status: string
          suggested_quantity: number
          updated_at: string
          urgency: string
        }
        Insert: {
          approved_by?: string | null
          best_supplier?: string | null
          created_at?: string
          current_stock?: number | null
          estimated_cost?: number | null
          id?: string
          product_id?: string | null
          product_name: string
          reasoning?: string | null
          status?: string
          suggested_quantity: number
          updated_at?: string
          urgency?: string
        }
        Update: {
          approved_by?: string | null
          best_supplier?: string | null
          created_at?: string
          current_stock?: number | null
          estimated_cost?: number | null
          id?: string
          product_id?: string | null
          product_name?: string
          reasoning?: string | null
          status?: string
          suggested_quantity?: number
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "reorder_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      school_list_carts: {
        Row: {
          created_at: string
          id: string
          items: Json
          items_count: number
          tier: string
          total_ht: number
          total_ttc: number
          upload_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          items_count?: number
          tier: string
          total_ht?: number
          total_ttc?: number
          upload_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          items_count?: number
          tier?: string
          total_ht?: number
          total_ttc?: number
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_list_carts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "school_list_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      school_list_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_mandatory: boolean
          item_name: string
          list_id: string
          quantity: number
          suggested_product_ids: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_mandatory?: boolean
          item_name: string
          list_id: string
          quantity?: number
          suggested_product_ids?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_mandatory?: boolean
          item_name?: string
          list_id?: string
          quantity?: number
          suggested_product_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "school_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "school_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      school_list_matches: {
        Row: {
          candidates: Json | null
          confidence: number | null
          constraints: string | null
          created_at: string
          id: string
          is_mandatory: boolean
          item_label: string
          item_quantity: number
          match_status: string
          selected_product_id: string | null
          tier: string | null
          upload_id: string
        }
        Insert: {
          candidates?: Json | null
          confidence?: number | null
          constraints?: string | null
          created_at?: string
          id?: string
          is_mandatory?: boolean
          item_label: string
          item_quantity?: number
          match_status?: string
          selected_product_id?: string | null
          tier?: string | null
          upload_id: string
        }
        Update: {
          candidates?: Json | null
          confidence?: number | null
          constraints?: string | null
          created_at?: string
          id?: string
          is_mandatory?: boolean
          item_label?: string
          item_quantity?: number
          match_status?: string
          selected_product_id?: string | null
          tier?: string | null
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_list_matches_selected_product_id_fkey"
            columns: ["selected_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_list_matches_selected_product_id_fkey"
            columns: ["selected_product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_list_matches_selected_product_id_fkey"
            columns: ["selected_product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "school_list_matches_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "school_list_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      school_list_templates: {
        Row: {
          class_level: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean
          name: string
          school_type: string
          updated_at: string
        }
        Insert: {
          class_level: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          school_type: string
          updated_at?: string
        }
        Update: {
          class_level?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          school_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_list_uploads: {
        Row: {
          class_level: string | null
          created_at: string
          error_message: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          items_count: number | null
          ocr_text: string | null
          school_name: string | null
          school_year: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_level?: string | null
          created_at?: string
          error_message?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          items_count?: number | null
          ocr_text?: string | null
          school_name?: string | null
          school_year?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_level?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          items_count?: number | null
          ocr_text?: string | null
          school_name?: string | null
          school_year?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      school_lists: {
        Row: {
          class_level: string
          created_at: string
          created_by: string | null
          id: string
          list_name: string
          school_id: string
          school_year: string
          status: string
          updated_at: string
        }
        Insert: {
          class_level: string
          created_at?: string
          created_by?: string | null
          id?: string
          list_name: string
          school_id: string
          school_year: string
          status?: string
          updated_at?: string
        }
        Update: {
          class_level?: string
          created_at?: string
          created_by?: string | null
          id?: string
          list_name?: string
          school_id?: string
          school_year?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_lists_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          city: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          official_code: string | null
          postal_code: string
          school_type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          official_code?: string | null
          postal_code: string
          school_type: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          official_code?: string | null
          postal_code?: string
          school_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      scrape_runs: {
        Row: {
          details: Json | null
          errors_count: number
          finished_at: string | null
          id: string
          offers_saved: number
          started_at: string
          status: string
        }
        Insert: {
          details?: Json | null
          errors_count?: number
          finished_at?: string | null
          id?: string
          offers_saved?: number
          started_at?: string
          status?: string
        }
        Update: {
          details?: Json | null
          errors_count?: number
          finished_at?: string | null
          id?: string
          offers_saved?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      shopify_sync_log: {
        Row: {
          details: Json | null
          error_message: string | null
          id: string
          product_id: string | null
          shopify_product_id: string | null
          status: string
          sync_type: string
          synced_at: string
        }
        Insert: {
          details?: Json | null
          error_message?: string | null
          id?: string
          product_id?: string | null
          shopify_product_id?: string | null
          status?: string
          sync_type?: string
          synced_at?: string
        }
        Update: {
          details?: Json | null
          error_message?: string | null
          id?: string
          product_id?: string | null
          shopify_product_id?: string | null
          status?: string
          sync_type?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_sync_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_sync_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_sync_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      stock_reception_items: {
        Row: {
          created_at: string | null
          expected_quantity: number
          id: string
          notes: string | null
          product_id: string | null
          purchase_order_item_id: string | null
          received_quantity: number
          reception_id: string
        }
        Insert: {
          created_at?: string | null
          expected_quantity?: number
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_order_item_id?: string | null
          received_quantity?: number
          reception_id: string
        }
        Update: {
          created_at?: string | null
          expected_quantity?: number
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_order_item_id?: string | null
          received_quantity?: number
          reception_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_reception_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reception_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reception_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_reception_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reception_items_reception_id_fkey"
            columns: ["reception_id"]
            isOneToOne: false
            referencedRelation: "stock_receptions"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receptions: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          purchase_order_id: string | null
          received_by: string
          reception_date: string | null
          reception_number: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          received_by: string
          reception_date?: string | null
          reception_number?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          received_by?: string
          reception_date?: string | null
          reception_number?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_receptions_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_category_mappings: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_verified: boolean
          supplier_category_name: string
          supplier_id: string
          supplier_subcategory_name: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_verified?: boolean
          supplier_category_name: string
          supplier_id: string
          supplier_subcategory_name?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          supplier_category_name?: string
          supplier_id?: string
          supplier_subcategory_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_category_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_category_mappings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_import_logs: {
        Row: {
          deactivated_count: number | null
          error_count: number | null
          errors: Json | null
          filename: string | null
          format: string
          id: string
          imported_at: string | null
          imported_by: string | null
          price_changes_count: number | null
          report_data: Json | null
          success_count: number | null
          supplier_id: string | null
          total_rows: number | null
          unmatched_count: number | null
        }
        Insert: {
          deactivated_count?: number | null
          error_count?: number | null
          errors?: Json | null
          filename?: string | null
          format: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          price_changes_count?: number | null
          report_data?: Json | null
          success_count?: number | null
          supplier_id?: string | null
          total_rows?: number | null
          unmatched_count?: number | null
        }
        Update: {
          deactivated_count?: number | null
          error_count?: number | null
          errors?: Json | null
          filename?: string | null
          format?: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          price_changes_count?: number | null
          report_data?: Json | null
          success_count?: number | null
          supplier_id?: string | null
          total_rows?: number | null
          unmatched_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_import_logs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_offers: {
        Row: {
          created_at: string | null
          delivery_delay_days: number | null
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          min_qty: number | null
          packaging: Json | null
          product_id: string
          purchase_price_ht: number | null
          pvp_ttc: number | null
          stock_qty: number | null
          supplier: string
          supplier_product_id: string
          tax_breakdown: Json | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          created_at?: string | null
          delivery_delay_days?: number | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          min_qty?: number | null
          packaging?: Json | null
          product_id: string
          purchase_price_ht?: number | null
          pvp_ttc?: number | null
          stock_qty?: number | null
          supplier: string
          supplier_product_id: string
          tax_breakdown?: Json | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          created_at?: string | null
          delivery_delay_days?: number | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          min_qty?: number | null
          packaging?: Json | null
          product_id?: string
          purchase_price_ht?: number | null
          pvp_ttc?: number | null
          stock_qty?: number | null
          supplier?: string
          supplier_product_id?: string
          tax_breakdown?: Json | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      supplier_price_tiers: {
        Row: {
          created_at: string
          id: string
          min_qty: number
          price_ht: number
          price_pvp: number | null
          product_id: string
          tax_cop: number | null
          tax_d3e: number | null
          tier: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_qty?: number
          price_ht: number
          price_pvp?: number | null
          product_id: string
          tax_cop?: number | null
          tax_d3e?: number | null
          tier: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          min_qty?: number
          price_ht?: number
          price_pvp?: number | null
          product_id?: string
          tax_cop?: number | null
          tax_d3e?: number | null
          tier?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          created_at: string
          delivery_cost: number | null
          delivery_performance_score: number | null
          free_delivery_threshold: number | null
          id: string
          is_preferred: boolean | null
          last_delivery_date: string | null
          last_order_date: string | null
          lead_time_days: number | null
          min_order_quantity: number | null
          notes: string | null
          payment_terms_days: number | null
          priority_rank: number | null
          product_id: string
          quantity_discount: Json | null
          reliability_score: number | null
          source_type: string | null
          stock_quantity: number | null
          supplier_id: string
          supplier_price: number
          supplier_reference: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_cost?: number | null
          delivery_performance_score?: number | null
          free_delivery_threshold?: number | null
          id?: string
          is_preferred?: boolean | null
          last_delivery_date?: string | null
          last_order_date?: string | null
          lead_time_days?: number | null
          min_order_quantity?: number | null
          notes?: string | null
          payment_terms_days?: number | null
          priority_rank?: number | null
          product_id: string
          quantity_discount?: Json | null
          reliability_score?: number | null
          source_type?: string | null
          stock_quantity?: number | null
          supplier_id: string
          supplier_price: number
          supplier_reference?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_cost?: number | null
          delivery_performance_score?: number | null
          free_delivery_threshold?: number | null
          id?: string
          is_preferred?: boolean | null
          last_delivery_date?: string | null
          last_order_date?: string | null
          lead_time_days?: number | null
          min_order_quantity?: number | null
          notes?: string | null
          payment_terms_days?: number | null
          priority_rank?: number | null
          product_id?: string
          quantity_discount?: Json | null
          reliability_score?: number | null
          source_type?: string | null
          stock_quantity?: number | null
          supplier_id?: string
          supplier_price?: number
          supplier_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_stock_snapshots: {
        Row: {
          delivery_week: string | null
          fetched_at: string
          id: string
          qty_available: number
          ref_softcarrier: string
        }
        Insert: {
          delivery_week?: string | null
          fetched_at?: string
          id?: string
          qty_available?: number
          ref_softcarrier: string
        }
        Update: {
          delivery_week?: string | null
          fetched_at?: string
          id?: string
          qty_available?: number
          ref_softcarrier?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          conditions_commerciales: Json | null
          country: string | null
          created_at: string
          delivery_terms: string | null
          email: string | null
          format_source: string | null
          id: string
          is_active: boolean | null
          minimum_order_amount: number | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          postal_code: string | null
          siret: string | null
          supplier_type: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          conditions_commerciales?: Json | null
          country?: string | null
          created_at?: string
          delivery_terms?: string | null
          email?: string | null
          format_source?: string | null
          id?: string
          is_active?: boolean | null
          minimum_order_amount?: number | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          supplier_type?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          conditions_commerciales?: Json | null
          country?: string | null
          created_at?: string
          delivery_terms?: string | null
          email?: string | null
          format_source?: string | null
          id?: string
          is_active?: boolean | null
          minimum_order_amount?: number | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          supplier_type?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_type: string
          consented: boolean
          consented_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          consent_type: string
          consented?: boolean
          consented_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          consent_type?: string
          consented?: boolean
          consented_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
    }
    Views: {
      v_products_vendable: {
        Row: {
          attributs: Json | null
          badge: string | null
          category: string | null
          created_at: string | null
          description: string | null
          dimensions_cm: string | null
          ean: string | null
          eco: boolean | null
          eco_contribution: number | null
          eco_tax: number | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_vendable: boolean | null
          manufacturer_code: string | null
          margin_percent: number | null
          min_stock_alert: number | null
          name: string | null
          price: number | null
          price_ht: number | null
          price_ttc: number | null
          reorder_quantity: number | null
          sku_interne: string | null
          stock_quantity: number | null
          tva_rate: number | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          attributs?: Json | null
          badge?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          dimensions_cm?: string | null
          ean?: string | null
          eco?: boolean | null
          eco_contribution?: number | null
          eco_tax?: number | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_vendable?: never
          manufacturer_code?: string | null
          margin_percent?: number | null
          min_stock_alert?: number | null
          name?: string | null
          price?: number | null
          price_ht?: number | null
          price_ttc?: number | null
          reorder_quantity?: number | null
          sku_interne?: string | null
          stock_quantity?: number | null
          tva_rate?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          attributs?: Json | null
          badge?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          dimensions_cm?: string | null
          ean?: string | null
          eco?: boolean | null
          eco_contribution?: number | null
          eco_tax?: number | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_vendable?: never
          manufacturer_code?: string | null
          margin_percent?: number | null
          min_stock_alert?: number | null
          name?: string | null
          price?: number | null
          price_ht?: number | null
          price_ttc?: number | null
          reorder_quantity?: number | null
          sku_interne?: string | null
          stock_quantity?: number | null
          tva_rate?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      v_stock_virtuel: {
        Row: {
          ean: string | null
          nb_fournisseurs_actifs: number | null
          product_id: string | null
          product_name: string | null
          quantite_reappro: number | null
          seuil_alerte: number | null
          sku_interne: string | null
          statut_stock: string | null
          stock_boutique: number | null
          stock_entrepot: number | null
          stock_fournisseur: number | null
          stock_fournisseurs_distant: number | null
          stock_propre: number | null
          stock_virtuel: number | null
        }
        Relationships: []
      }
      v_supplier_offer_priority: {
        Row: {
          created_at: string | null
          delivery_delay_days: number | null
          id: string | null
          is_active: boolean | null
          last_seen_at: string | null
          min_qty: number | null
          packaging: Json | null
          priority_rank: number | null
          product_id: string | null
          purchase_price_ht: number | null
          pvp_ttc: number | null
          stock_qty: number | null
          supplier: string | null
          supplier_product_id: string | null
          tax_breakdown: Json | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          created_at?: string | null
          delivery_delay_days?: number | null
          id?: string | null
          is_active?: boolean | null
          last_seen_at?: string | null
          min_qty?: number | null
          packaging?: Json | null
          priority_rank?: never
          product_id?: string | null
          purchase_price_ht?: number | null
          pvp_ttc?: number | null
          stock_qty?: number | null
          supplier?: string | null
          supplier_product_id?: string | null
          tax_breakdown?: Json | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          created_at?: string | null
          delivery_delay_days?: number | null
          id?: string | null
          is_active?: boolean | null
          last_seen_at?: string | null
          min_qty?: number | null
          packaging?: Json | null
          priority_rank?: never
          product_id?: string | null
          purchase_price_ht?: number | null
          pvp_ttc?: number | null
          stock_qty?: number | null
          supplier?: string | null
          supplier_product_id?: string | null
          tax_breakdown?: Json | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_vendable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_stock_virtuel"
            referencedColumns: ["product_id"]
          },
        ]
      }
    }
    Functions: {
      admin_recompute_all_rollups: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      admin_recompute_product_rollups: {
        Args: { p_product_id: string }
        Returns: Json
      }
      compute_coef_public_price_ttc: {
        Args: { p_product_id: string }
        Returns: number
      }
      count_products_by_source: { Args: { sources: string[] }; Returns: number }
      decrement_stock: {
        Args: { product_id: string; quantity: number }
        Returns: undefined
      }
      detect_all_product_exceptions: { Args: never; Returns: Json }
      detect_product_exceptions: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      find_products_by_refs: {
        Args: { refs: string[] }
        Returns: {
          matched_ref: string
          product_id: string
        }[]
      }
      generate_order_number: { Args: never; Returns: string }
      generate_purchase_order_number: { Args: never; Returns: string }
      get_b2b_price: {
        Args: { p_product_id: string; p_user_id: string }
        Returns: number
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_pricing_coefficient: {
        Args: { p_family: string; p_subfamily?: string }
        Returns: number
      }
      get_products_by_source: {
        Args: { p_limit?: number; p_offset?: number; sources: string[] }
        Returns: {
          attributs: Json
          cost_price: number
          ean: string
          id: string
          price_ht: number
          ref_b2b: string
          sku_interne: string
          source_val: string
          stock_quantity: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recompute_product_rollups: {
        Args: { p_product_id: string }
        Returns: Json
      }
      select_reference_offer_for_pricing: {
        Args: { p_product_id: string }
        Returns: {
          created_at: string | null
          delivery_delay_days: number | null
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          min_qty: number | null
          packaging: Json | null
          product_id: string
          purchase_price_ht: number | null
          pvp_ttc: number | null
          stock_qty: number | null
          supplier: string
          supplier_product_id: string
          tax_breakdown: Json | null
          updated_at: string | null
          vat_rate: number | null
        }
        SetofOptions: {
          from: "*"
          to: "supplier_offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
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
      app_role: ["admin", "user", "super_admin"],
    },
  },
} as const
