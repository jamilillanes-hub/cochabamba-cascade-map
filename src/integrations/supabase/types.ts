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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alertas_oficiales: {
        Row: {
          cargado_por: string | null
          categoria: string
          codigo_boletin: string | null
          creado_en: string
          descripcion: string
          enlace_respaldo: string | null
          fuente_oficial: string
          id: string
          nivel: string
          provincias_afectadas: string[]
          titulo: string
          vigencia_hasta: string | null
        }
        Insert: {
          cargado_por?: string | null
          categoria: string
          codigo_boletin?: string | null
          creado_en?: string
          descripcion: string
          enlace_respaldo?: string | null
          fuente_oficial: string
          id?: string
          nivel: string
          provincias_afectadas: string[]
          titulo: string
          vigencia_hasta?: string | null
        }
        Update: {
          cargado_por?: string | null
          categoria?: string
          codigo_boletin?: string | null
          creado_en?: string
          descripcion?: string
          enlace_respaldo?: string | null
          fuente_oficial?: string
          id?: string
          nivel?: string
          provincias_afectadas?: string[]
          titulo?: string
          vigencia_hasta?: string | null
        }
        Relationships: []
      }
      indices_por_provincia: {
        Row: {
          actualizado_en: string
          fuente_oficial: string
          indice_asesinatos: number
          indice_derrumbes: number
          indice_general: number
          indice_incendios: number
          indice_inundaciones: number
          indice_robos: number
          provincia_id: string
        }
        Insert: {
          actualizado_en?: string
          fuente_oficial?: string
          indice_asesinatos?: number
          indice_derrumbes?: number
          indice_general?: number
          indice_incendios?: number
          indice_inundaciones?: number
          indice_robos?: number
          provincia_id: string
        }
        Update: {
          actualizado_en?: string
          fuente_oficial?: string
          indice_asesinatos?: number
          indice_derrumbes?: number
          indice_general?: number
          indice_incendios?: number
          indice_inundaciones?: number
          indice_robos?: number
          provincia_id?: string
        }
        Relationships: []
      }
      mensajes_comunidad: {
        Row: {
          autor_id: string
          autor_nombre: string
          contenido: string
          creado_en: string
          id: string
          provincia_id: string | null
          tema: string
        }
        Insert: {
          autor_id: string
          autor_nombre: string
          contenido: string
          creado_en?: string
          id?: string
          provincia_id?: string | null
          tema?: string
        }
        Update: {
          autor_id?: string
          autor_nombre?: string
          contenido?: string
          creado_en?: string
          id?: string
          provincia_id?: string | null
          tema?: string
        }
        Relationships: []
      }
      perfiles: {
        Row: {
          creado_en: string
          email: string
          id: string
          nombre_completo: string
          nombre_institucion: string | null
          provincia_id: string | null
          tipo_cuenta: string
        }
        Insert: {
          creado_en?: string
          email?: string
          id: string
          nombre_completo?: string
          nombre_institucion?: string | null
          provincia_id?: string | null
          tipo_cuenta?: string
        }
        Update: {
          creado_en?: string
          email?: string
          id?: string
          nombre_completo?: string
          nombre_institucion?: string | null
          provincia_id?: string | null
          tipo_cuenta?: string
        }
        Relationships: []
      }
      publicaciones_voluntariado: {
        Row: {
          autor_id: string
          creado_en: string
          cupos: number | null
          descripcion: string
          direccion: string
          fecha_horario: string | null
          id: string
          latitud: number | null
          longitud: number | null
          municipio_distrito: string | null
          nombre_institucion: string
          provincia_id: string
          telefono_contacto: string
          tipo_publicacion: string
          titulo: string
          verificada: boolean
        }
        Insert: {
          autor_id: string
          creado_en?: string
          cupos?: number | null
          descripcion: string
          direccion: string
          fecha_horario?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          municipio_distrito?: string | null
          nombre_institucion: string
          provincia_id: string
          telefono_contacto: string
          tipo_publicacion: string
          titulo: string
          verificada?: boolean
        }
        Update: {
          autor_id?: string
          creado_en?: string
          cupos?: number | null
          descripcion?: string
          direccion?: string
          fecha_horario?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          municipio_distrito?: string | null
          nombre_institucion?: string
          provincia_id?: string
          telefono_contacto?: string
          tipo_publicacion?: string
          titulo?: string
          verificada?: boolean
        }
        Relationships: []
      }
      reportes: {
        Row: {
          autor_id: string
          autor_nombre: string
          categoria_ia: string
          creado_en: string
          descripcion: string
          entidad_sugerida_ia: string | null
          estado_verificacion: string
          id: string
          latitud: number | null
          longitud: number | null
          moderado_por: string | null
          motivo_breve_ia: string | null
          municipio_distrito: string | null
          provincia_id: string
          telefono_sugerido_ia: string | null
          urgencia_ia: string
        }
        Insert: {
          autor_id: string
          autor_nombre?: string
          categoria_ia: string
          creado_en?: string
          descripcion: string
          entidad_sugerida_ia?: string | null
          estado_verificacion?: string
          id?: string
          latitud?: number | null
          longitud?: number | null
          moderado_por?: string | null
          motivo_breve_ia?: string | null
          municipio_distrito?: string | null
          provincia_id: string
          telefono_sugerido_ia?: string | null
          urgencia_ia: string
        }
        Update: {
          autor_id?: string
          autor_nombre?: string
          categoria_ia?: string
          creado_en?: string
          descripcion?: string
          entidad_sugerida_ia?: string | null
          estado_verificacion?: string
          id?: string
          latitud?: number | null
          longitud?: number | null
          moderado_por?: string | null
          motivo_breve_ia?: string | null
          municipio_distrito?: string | null
          provincia_id?: string
          telefono_sugerido_ia?: string | null
          urgencia_ia?: string
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
      es_moderador_o_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
