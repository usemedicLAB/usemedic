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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ambulance_bookings: {
        Row: {
          created_at: string
          fee: number
          id: string
          lat: number | null
          lng: number | null
          location_text: string
          patient_id: string
          rating: number | null
          ref: string
          status: Database["public"]["Enums"]["booking_status"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee?: number
          id?: string
          lat?: number | null
          lng?: number | null
          location_text: string
          patient_id: string
          rating?: number | null
          ref?: string
          status?: Database["public"]["Enums"]["booking_status"]
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee?: number
          id?: string
          lat?: number | null
          lng?: number | null
          location_text?: string
          patient_id?: string
          rating?: number | null
          ref?: string
          status?: Database["public"]["Enums"]["booking_status"]
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambulance_bookings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "ambulance_units"
            referencedColumns: ["id"]
          },
        ]
      }
      ambulance_units: {
        Row: {
          created_at: string
          id: string
          price: number
          status: Database["public"]["Enums"]["ambulance_status"]
          type: Database["public"]["Enums"]["ambulance_type"]
          unit_code: string
          unit_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["ambulance_status"]
          type?: Database["public"]["Enums"]["ambulance_type"]
          unit_code: string
          unit_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["ambulance_status"]
          type?: Database["public"]["Enums"]["ambulance_type"]
          unit_code?: string
          unit_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          created_at: string
          doctor_id: string
          fee: number | null
          id: string
          mode: Database["public"]["Enums"]["appointment_mode"]
          paid_at: string | null
          patient_id: string
          payment_ref: string | null
          reason: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          fee?: number | null
          id?: string
          mode: Database["public"]["Enums"]["appointment_mode"]
          paid_at?: string | null
          patient_id: string
          payment_ref?: string | null
          reason?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          fee?: number | null
          id?: string
          mode?: Database["public"]["Enums"]["appointment_mode"]
          paid_at?: string | null
          patient_id?: string
          payment_ref?: string | null
          reason?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          id: string
          image_url: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      consultations: {
        Row: {
          appointment_id: string
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          started_at: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_availability: {
        Row: {
          doctor_id: string
          end_time: string
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          doctor_id: string
          end_time: string
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          doctor_id?: string
          end_time?: string
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: []
      }
      doctor_documents: {
        Row: {
          doctor_id: string
          file_path: string
          id: string
          type: Database["public"]["Enums"]["doc_type"]
          uploaded_at: string
        }
        Insert: {
          doctor_id: string
          file_path: string
          id?: string
          type: Database["public"]["Enums"]["doc_type"]
          uploaded_at?: string
        }
        Update: {
          doctor_id?: string
          file_path?: string
          id?: string
          type?: Database["public"]["Enums"]["doc_type"]
          uploaded_at?: string
        }
        Relationships: []
      }
      doctor_profiles: {
        Row: {
          bio: string | null
          created_at: string
          fee: number | null
          kyc_notes: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          languages: string[] | null
          license_number: string | null
          location: string | null
          patients_count: number | null
          rating: number | null
          reviews_count: number | null
          specialty: string | null
          updated_at: string
          user_id: string
          years_exp: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          fee?: number | null
          kyc_notes?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          languages?: string[] | null
          license_number?: string | null
          location?: string | null
          patients_count?: number | null
          rating?: number | null
          reviews_count?: number | null
          specialty?: string | null
          updated_at?: string
          user_id: string
          years_exp?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          fee?: number | null
          kyc_notes?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          languages?: string[] | null
          license_number?: string | null
          location?: string | null
          patients_count?: number | null
          rating?: number | null
          reviews_count?: number | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
          years_exp?: number | null
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          created_at: string
          file_path: string | null
          id: string
          notes: string | null
          patient_id: string
          title: string | null
          type: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          title?: string | null
          type: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          title?: string | null
          type?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          body: string | null
          consultation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          body?: string | null
          consultation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string | null
          consultation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      pharmacy_order_items: {
        Row: {
          created_at: string
          id: string
          name: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_id: string
          product_id: string
          quantity: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_products"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_orders: {
        Row: {
          created_at: string
          delivery_address: string
          delivery_fee: number
          id: string
          paid_at: string | null
          patient_id: string
          payment_ref: string | null
          ref: string
          status: Database["public"]["Enums"]["pharmacy_order_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_address: string
          delivery_fee?: number
          id?: string
          paid_at?: string | null
          patient_id: string
          payment_ref?: string | null
          ref?: string
          status?: Database["public"]["Enums"]["pharmacy_order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_address?: string
          delivery_fee?: number
          id?: string
          paid_at?: string | null
          patient_id?: string
          payment_ref?: string | null
          ref?: string
          status?: Database["public"]["Enums"]["pharmacy_order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      pharmacy_products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          id: string
          image_url: string | null
          in_stock: boolean
          name: string
          price: number
          requires_rx: boolean
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          id?: string
          image_url?: string | null
          in_stock?: boolean
          name: string
          price?: number
          requires_rx?: boolean
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          id?: string
          image_url?: string | null
          in_stock?: boolean
          name?: string
          price?: number
          requires_rx?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          consultation_id: string | null
          doctor_id: string
          id: string
          issued_at: string
          items: Json
          patient_id: string
          pdf_path: string | null
        }
        Insert: {
          consultation_id?: string | null
          doctor_id: string
          id?: string
          issued_at?: string
          items?: Json
          patient_id: string
          pdf_path?: string | null
        }
        Update: {
          consultation_id?: string | null
          doctor_id?: string
          id?: string
          issued_at?: string
          items?: Json
          patient_id?: string
          pdf_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          dob: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          dob?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          dob?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          appointment_id: string | null
          comment: string | null
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          rating: number
        }
        Insert: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          rating: number
        }
        Update: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
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
          role: Database["public"]["Enums"]["app_role"]
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
      current_user_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_or_create_consultation: {
        Args: { _appointment_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_appointments: {
        Args: never
        Returns: {
          doctor_avatar: string
          doctor_id: string
          doctor_name: string
          fee: number
          id: string
          mode: Database["public"]["Enums"]["appointment_mode"]
          paid_at: string
          patient_id: string
          payment_ref: string
          reason: string
          scheduled_at: string
          specialty: string
          status: Database["public"]["Enums"]["appointment_status"]
        }[]
      }
      recompute_doctor_rating: {
        Args: { _doctor_id: string }
        Returns: undefined
      }
    }
    Enums: {
      ambulance_status: "available" | "busy"
      ambulance_type:
        | "basic_life_support"
        | "advanced_life_support"
        | "patient_transport"
      app_role: "user" | "doctor" | "admin"
      appointment_mode: "chat" | "voice" | "video" | "in_person"
      appointment_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      booking_status:
        | "dispatched"
        | "en_route"
        | "arrived"
        | "completed"
        | "cancelled"
      doc_type: "license" | "gov_id" | "selfie" | "certificate"
      kyc_status: "pending" | "approved" | "rejected"
      pharmacy_order_status:
        | "processing"
        | "dispatched"
        | "delivered"
        | "cancelled"
      product_category:
        | "prescription"
        | "otc"
        | "vitamins"
        | "devices"
        | "wellness"
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
      ambulance_status: ["available", "busy"],
      ambulance_type: [
        "basic_life_support",
        "advanced_life_support",
        "patient_transport",
      ],
      app_role: ["user", "doctor", "admin"],
      appointment_mode: ["chat", "voice", "video", "in_person"],
      appointment_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      booking_status: [
        "dispatched",
        "en_route",
        "arrived",
        "completed",
        "cancelled",
      ],
      doc_type: ["license", "gov_id", "selfie", "certificate"],
      kyc_status: ["pending", "approved", "rejected"],
      pharmacy_order_status: [
        "processing",
        "dispatched",
        "delivered",
        "cancelled",
      ],
      product_category: [
        "prescription",
        "otc",
        "vitamins",
        "devices",
        "wellness",
      ],
    },
  },
} as const
