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
        ]
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
        ]
      }
      products: {
        Row: {
          badge: string | null
          category: string
          created_at: string
          description: string | null
          dimensions_cm: string | null
          ean: string | null
          eco: boolean | null
          eco_contribution: number | null
          eco_tax: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          manufacturer_code: string | null
          margin_percent: number | null
          min_stock_alert: number | null
          name: string
          price: number
          price_ht: number | null
          price_ttc: number | null
          reorder_quantity: number | null
          stock_quantity: number | null
          tva_rate: number | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          badge?: string | null
          category: string
          created_at?: string
          description?: string | null
          dimensions_cm?: string | null
          ean?: string | null
          eco?: boolean | null
          eco_contribution?: number | null
          eco_tax?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          manufacturer_code?: string | null
          margin_percent?: number | null
          min_stock_alert?: number | null
          name: string
          price: number
          price_ht?: number | null
          price_ttc?: number | null
          reorder_quantity?: number | null
          stock_quantity?: number | null
          tva_rate?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          badge?: string | null
          category?: string
          created_at?: string
          description?: string | null
          dimensions_cm?: string | null
          ean?: string | null
          eco?: boolean | null
          eco_contribution?: number | null
          eco_tax?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          manufacturer_code?: string | null
          margin_percent?: number | null
          min_stock_alert?: number | null
          name?: string
          price?: number
          price_ht?: number | null
          price_ttc?: number | null
          reorder_quantity?: number | null
          stock_quantity?: number | null
          tva_rate?: number | null
          updated_at?: string
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
      stock_receptions: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          purchase_order_id: string | null
          received_by: string
          reception_date: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          received_by: string
          reception_date?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string | null
          received_by?: string
          reception_date?: string | null
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
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          delivery_terms: string | null
          email: string | null
          id: string
          is_active: boolean | null
          minimum_order_amount: number | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          postal_code: string | null
          siret: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          delivery_terms?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          minimum_order_amount?: number | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          delivery_terms?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          minimum_order_amount?: number | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          updated_at?: string
          vat_number?: string | null
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
      [_ in never]: never
    }
    Functions: {
      decrement_stock: {
        Args: { product_id: string; quantity: number }
        Returns: undefined
      }
      generate_order_number: { Args: never; Returns: string }
      generate_purchase_order_number: { Args: never; Returns: string }
      get_current_user_role: {
        Args: never
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
