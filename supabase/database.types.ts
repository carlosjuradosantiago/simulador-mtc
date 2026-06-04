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
      attempt: {
        Row: {
          end_time: string | null
          exam_type_id: number
          id: number
          score: number | null
          start_time: string | null
          user_id: number
        }
        Insert: {
          end_time?: string | null
          exam_type_id: number
          id?: number
          score?: number | null
          start_time?: string | null
          user_id: number
        }
        Update: {
          end_time?: string | null
          exam_type_id?: number
          id?: number
          score?: number | null
          start_time?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk7hdrl81o6marvnl2vs8enwiq4"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fkmo44pyujv9j15rix11jyg45ch"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "exam_type"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_answer: {
        Row: {
          answered_at: string | null
          attempt_id: number
          id: number
          is_correct: boolean
          option_id: number
          question_id: number
        }
        Insert: {
          answered_at?: string | null
          attempt_id: number
          id?: number
          is_correct: boolean
          option_id: number
          question_id: number
        }
        Update: {
          answered_at?: string | null
          attempt_id?: number
          id?: number
          is_correct?: boolean
          option_id?: number
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk11cm3o50jd190b12d6f2fssax"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "question_option"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fki1kc32oh8t6x8wixcj2h59ai9"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fkqxc3sishtma45tk7ubfhrdbfv"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempt"
            referencedColumns: ["id"]
          },
        ]
      }
      categoria: {
        Row: {
          descripcion: string | null
          estado: number | null
          id: number
          id_padre: number | null
          id_tipo_examen: number
          nombre: string
        }
        Insert: {
          descripcion?: string | null
          estado?: number | null
          id?: never
          id_padre?: number | null
          id_tipo_examen: number
          nombre: string
        }
        Update: {
          descripcion?: string | null
          estado?: number | null
          id?: never
          id_padre?: number | null
          id_tipo_examen?: number
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "categoria_id_padre_fkey"
            columns: ["id_padre"]
            isOneToOne: false
            referencedRelation: "categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categoria_id_tipo_examen_fkey"
            columns: ["id_tipo_examen"]
            isOneToOne: false
            referencedRelation: "tipo_examen"
            referencedColumns: ["id"]
          },
        ]
      }
      categoria_pregunta: {
        Row: {
          id: number
          id_categoria: number
          id_pregunta: number
        }
        Insert: {
          id?: number
          id_categoria: number
          id_pregunta: number
        }
        Update: {
          id?: number
          id_categoria?: number
          id_pregunta?: number
        }
        Relationships: [
          {
            foreignKeyName: "categoria_pregunta_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categoria_pregunta_id_pregunta_fkey"
            columns: ["id_pregunta"]
            isOneToOne: false
            referencedRelation: "pregunta"
            referencedColumns: ["id"]
          },
        ]
      }
      category: {
        Row: {
          description: string | null
          estado: number
          exam_type_id: number
          id: number
          name: string
          parent_id: number | null
        }
        Insert: {
          description?: string | null
          estado: number
          exam_type_id: number
          id?: number
          name: string
          parent_id?: number | null
        }
        Update: {
          description?: string | null
          estado?: number
          exam_type_id?: number
          id?: number
          name?: string
          parent_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk1c05rrr9byak1d9vricf3c6o9"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "exam_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk2y94svpmqttx80mshyny85wqr"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
        ]
      }
      clases: {
        Row: {
          actualizado_en: string
          creado_en: string
          descripcion: string | null
          duracion_minutos: number
          esta_activa: boolean
          id: number
          orden: number
          slug: string
          titulo: string
          total_lecciones: number
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          descripcion?: string | null
          duracion_minutos?: number
          esta_activa?: boolean
          id?: number
          orden?: number
          slug: string
          titulo: string
          total_lecciones?: number
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          descripcion?: string | null
          duracion_minutos?: number
          esta_activa?: boolean
          id?: number
          orden?: number
          slug?: string
          titulo?: string
          total_lecciones?: number
        }
        Relationships: []
      }
      configuracion_usuario: {
        Row: {
          actualizado_en: string
          categoria_preferida_id: number | null
          creado_en: string
          id_usuario: number
          notificaciones_habilitadas: boolean
          tema: string
        }
        Insert: {
          actualizado_en?: string
          categoria_preferida_id?: number | null
          creado_en?: string
          id_usuario: number
          notificaciones_habilitadas?: boolean
          tema?: string
        }
        Update: {
          actualizado_en?: string
          categoria_preferida_id?: number | null
          creado_en?: string
          id_usuario?: number
          notificaciones_habilitadas?: boolean
          tema?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_usuario_categoria_preferida_id_fkey"
            columns: ["categoria_preferida_id"]
            isOneToOne: false
            referencedRelation: "categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracion_usuario_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracion_usuario_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "vw_ranking_usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "configuracion_usuario_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "vw_resumen_usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      cuentas_sociales: {
        Row: {
          actualizado_en: string | null
          alcance: string | null
          correo_proveedor: string | null
          creado_en: string | null
          esta_activo: boolean | null
          expira_en: string | null
          id: number
          id_usuario: number
          id_usuario_proveedor: string
          nombre_proveedor: string | null
          proveedor: string
          tipo_token: string | null
          token_acceso_proveedor: string | null
          token_refresco_proveedor: string | null
          url_foto_proveedor: string | null
        }
        Insert: {
          actualizado_en?: string | null
          alcance?: string | null
          correo_proveedor?: string | null
          creado_en?: string | null
          esta_activo?: boolean | null
          expira_en?: string | null
          id: number
          id_usuario: number
          id_usuario_proveedor: string
          nombre_proveedor?: string | null
          proveedor: string
          tipo_token?: string | null
          token_acceso_proveedor?: string | null
          token_refresco_proveedor?: string | null
          url_foto_proveedor?: string | null
        }
        Update: {
          actualizado_en?: string | null
          alcance?: string | null
          correo_proveedor?: string | null
          creado_en?: string | null
          esta_activo?: boolean | null
          expira_en?: string | null
          id?: number
          id_usuario?: number
          id_usuario_proveedor?: string
          nombre_proveedor?: string | null
          proveedor?: string
          tipo_token?: string | null
          token_acceso_proveedor?: string | null
          token_refresco_proveedor?: string | null
          url_foto_proveedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_sociales_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_sociales_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_ranking_usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "cuentas_sociales_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_resumen_usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      edge_function_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          error_stack: string | null
          function_name: string
          handler: string | null
          id: number
          level: string
          message: string
          method: string | null
          path: string | null
          request_id: string | null
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          function_name: string
          handler?: string | null
          id?: number
          level?: string
          message: string
          method?: string | null
          path?: string | null
          request_id?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          error_stack?: string | null
          function_name?: string
          handler?: string | null
          id?: number
          level?: string
          message?: string
          method?: string | null
          path?: string | null
          request_id?: string | null
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      exam_type: {
        Row: {
          description: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      historial_membresias: {
        Row: {
          accion: string
          creado_en: string | null
          fecha_fin_anterior: string | null
          fecha_fin_nueva: string | null
          fecha_inicio_anterior: string | null
          fecha_inicio_nueva: string | null
          id: number
          id_membresia: number
          id_transaccion: number | null
          id_usuario: number
          notas: string | null
        }
        Insert: {
          accion: string
          creado_en?: string | null
          fecha_fin_anterior?: string | null
          fecha_fin_nueva?: string | null
          fecha_inicio_anterior?: string | null
          fecha_inicio_nueva?: string | null
          id?: number
          id_membresia: number
          id_transaccion?: number | null
          id_usuario: number
          notas?: string | null
        }
        Update: {
          accion?: string
          creado_en?: string | null
          fecha_fin_anterior?: string | null
          fecha_fin_nueva?: string | null
          fecha_inicio_anterior?: string | null
          fecha_inicio_nueva?: string | null
          id?: number
          id_membresia?: number
          id_transaccion?: number | null
          id_usuario?: number
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_membresias_id_membresia_fkey"
            columns: ["id_membresia"]
            isOneToOne: false
            referencedRelation: "membresias_usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_membresias_id_transaccion_fkey"
            columns: ["id_transaccion"]
            isOneToOne: false
            referencedRelation: "transacciones_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_membresias_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_membresias_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_ranking_usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "historial_membresias_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_resumen_usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      id_pregunta: {
        Row: {
          id: number | null
        }
        Insert: {
          id?: number | null
        }
        Update: {
          id?: number | null
        }
        Relationships: []
      }
      intento: {
        Row: {
          aprobado: boolean | null
          created_at: string
          fecha_fin: string | null
          fecha_inicio: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: number
          id_categoria: number | null
          id_sesion_practica: number | null
          id_tipo_examen: number
          id_usuario: number
          porcentaje: number | null
          preguntas_marcadas: Json
          puntuacion: number | null
          respuestas_correctas: number | null
          respuestas_detalle: Json
          respuestas_incorrectas: number | null
          sin_responder: number | null
          tipo_intento: string | null
          topic_breakdown: Json
          total_preguntas: number | null
        }
        Insert: {
          aprobado?: boolean | null
          created_at?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: number
          id_categoria?: number | null
          id_sesion_practica?: number | null
          id_tipo_examen: number
          id_usuario: number
          porcentaje?: number | null
          preguntas_marcadas?: Json
          puntuacion?: number | null
          respuestas_correctas?: number | null
          respuestas_detalle?: Json
          respuestas_incorrectas?: number | null
          sin_responder?: number | null
          tipo_intento?: string | null
          topic_breakdown?: Json
          total_preguntas?: number | null
        }
        Update: {
          aprobado?: boolean | null
          created_at?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: number
          id_categoria?: number | null
          id_sesion_practica?: number | null
          id_tipo_examen?: number
          id_usuario?: number
          porcentaje?: number | null
          preguntas_marcadas?: Json
          puntuacion?: number | null
          respuestas_correctas?: number | null
          respuestas_detalle?: Json
          respuestas_incorrectas?: number | null
          sin_responder?: number | null
          tipo_intento?: string | null
          topic_breakdown?: Json
          total_preguntas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "intento_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intento_id_sesion_practica_fkey"
            columns: ["id_sesion_practica"]
            isOneToOne: false
            referencedRelation: "sesion_practica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intento_id_tipo_examen_fkey"
            columns: ["id_tipo_examen"]
            isOneToOne: false
            referencedRelation: "tipo_examen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intento_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intento_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_ranking_usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "intento_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_resumen_usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      lecciones_clase: {
        Row: {
          actualizado_en: string
          creado_en: string
          descripcion: string | null
          duracion_minutos: number
          esta_activa: boolean
          id: number
          id_clase: number
          orden: number
          titulo: string
          url_video: string | null
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          descripcion?: string | null
          duracion_minutos?: number
          esta_activa?: boolean
          id?: number
          id_clase: number
          orden?: number
          titulo: string
          url_video?: string | null
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          descripcion?: string | null
          duracion_minutos?: number
          esta_activa?: boolean
          id?: number
          id_clase?: number
          orden?: number
          titulo?: string
          url_video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lecciones_clase_id_clase_fkey"
            columns: ["id_clase"]
            isOneToOne: false
            referencedRelation: "clases"
            referencedColumns: ["id"]
          },
        ]
      }
      libro_reclamaciones: {
        Row: {
          acepta_terminos: boolean
          apellidos: string
          autoriza_envio_correo: boolean
          created_at: string
          departamento: string
          descripcion_bien: string
          detalle_reclamo: string
          direccion: string
          distrito: string
          email: string
          es_menor_de_edad: boolean
          estado_reclamo: string
          fecha_incidente: string
          fecha_limite_respuesta: string | null
          fecha_registro: string
          fecha_respuesta: string | null
          id: number
          ip_origen: string | null
          monto_reclamado: number | null
          nombre_completo: string
          nombre_padre_tutor: string | null
          nombres: string
          numero_documento: string
          numero_reclamo: string
          pedido_consumidor: string
          provincia: string
          respondido_por: string | null
          respuesta_proveedor: string | null
          telefono: string
          tipo_bien: string
          tipo_documento: string
          tipo_reclamo: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          acepta_terminos?: boolean
          apellidos: string
          autoriza_envio_correo?: boolean
          created_at?: string
          departamento: string
          descripcion_bien: string
          detalle_reclamo: string
          direccion: string
          distrito: string
          email: string
          es_menor_de_edad?: boolean
          estado_reclamo?: string
          fecha_incidente: string
          fecha_limite_respuesta?: string | null
          fecha_registro?: string
          fecha_respuesta?: string | null
          id?: number
          ip_origen?: string | null
          monto_reclamado?: number | null
          nombre_completo: string
          nombre_padre_tutor?: string | null
          nombres: string
          numero_documento: string
          numero_reclamo: string
          pedido_consumidor: string
          provincia: string
          respondido_por?: string | null
          respuesta_proveedor?: string | null
          telefono: string
          tipo_bien: string
          tipo_documento: string
          tipo_reclamo: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          acepta_terminos?: boolean
          apellidos?: string
          autoriza_envio_correo?: boolean
          created_at?: string
          departamento?: string
          descripcion_bien?: string
          detalle_reclamo?: string
          direccion?: string
          distrito?: string
          email?: string
          es_menor_de_edad?: boolean
          estado_reclamo?: string
          fecha_incidente?: string
          fecha_limite_respuesta?: string | null
          fecha_registro?: string
          fecha_respuesta?: string | null
          id?: number
          ip_origen?: string | null
          monto_reclamado?: number | null
          nombre_completo?: string
          nombre_padre_tutor?: string | null
          nombres?: string
          numero_documento?: string
          numero_reclamo?: string
          pedido_consumidor?: string
          provincia?: string
          respondido_por?: string | null
          respuesta_proveedor?: string | null
          telefono?: string
          tipo_bien?: string
          tipo_documento?: string
          tipo_reclamo?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      membership_plans: {
        Row: {
          created_at: string | null
          description: string | null
          duration_months: number
          exam_type_id: number
          features: string | null
          id: number
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_months: number
          exam_type_id: number
          features?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_months?: number
          exam_type_id?: number
          features?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk67xq1i8r96clxwu77g9x20p15"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "exam_type"
            referencedColumns: ["id"]
          },
        ]
      }
      membresias_usuario: {
        Row: {
          actualizado_en: string | null
          creado_en: string | null
          esta_activa: boolean | null
          fecha_fin: string
          fecha_inicio: string
          id: number
          id_plan_membresia: number
          id_usuario: number
        }
        Insert: {
          actualizado_en?: string | null
          creado_en?: string | null
          esta_activa?: boolean | null
          fecha_fin: string
          fecha_inicio: string
          id?: number
          id_plan_membresia: number
          id_usuario: number
        }
        Update: {
          actualizado_en?: string | null
          creado_en?: string | null
          esta_activa?: boolean | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: number
          id_plan_membresia?: number
          id_usuario?: number
        }
        Relationships: [
          {
            foreignKeyName: "membresias_usuario_id_plan_membresia_fkey"
            columns: ["id_plan_membresia"]
            isOneToOne: false
            referencedRelation: "planes_membresia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membresias_usuario_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membresias_usuario_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_ranking_usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "membresias_usuario_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_resumen_usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      multimedia_pregunta: {
        Row: {
          datos: string
          descripcion: string | null
          id: number
          id_pregunta: number
          orden: number | null
          tipo_multimedia: string
        }
        Insert: {
          datos: string
          descripcion?: string | null
          id?: number
          id_pregunta: number
          orden?: number | null
          tipo_multimedia: string
        }
        Update: {
          datos?: string
          descripcion?: string | null
          id?: number
          id_pregunta?: number
          orden?: number | null
          tipo_multimedia?: string
        }
        Relationships: [
          {
            foreignKeyName: "multimedia_pregunta_id_pregunta_fkey"
            columns: ["id_pregunta"]
            isOneToOne: false
            referencedRelation: "pregunta"
            referencedColumns: ["id"]
          },
        ]
      }
      opcion_pregunta: {
        Row: {
          datos_multimedia: string | null
          es_correcta: boolean
          id: number
          id_pregunta: number
          orden: number | null
          texto: string
          tipo_multimedia: string | null
        }
        Insert: {
          datos_multimedia?: string | null
          es_correcta?: boolean
          id?: number
          id_pregunta: number
          orden?: number | null
          texto: string
          tipo_multimedia?: string | null
        }
        Update: {
          datos_multimedia?: string | null
          es_correcta?: boolean
          id?: number
          id_pregunta?: number
          orden?: number | null
          texto?: string
          tipo_multimedia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opcion_pregunta_id_pregunta_fkey"
            columns: ["id_pregunta"]
            isOneToOne: false
            referencedRelation: "pregunta"
            referencedColumns: ["id"]
          },
        ]
      }
      planes_membresia: {
        Row: {
          actualizado_en: string | null
          caracteristicas: string | null
          creado_en: string | null
          descripcion: string | null
          duracion_meses: number
          esta_activo: boolean | null
          id: number
          id_tipo_examen: number
          nombre: string
          precio: number
        }
        Insert: {
          actualizado_en?: string | null
          caracteristicas?: string | null
          creado_en?: string | null
          descripcion?: string | null
          duracion_meses: number
          esta_activo?: boolean | null
          id: number
          id_tipo_examen: number
          nombre: string
          precio: number
        }
        Update: {
          actualizado_en?: string | null
          caracteristicas?: string | null
          creado_en?: string | null
          descripcion?: string | null
          duracion_meses?: number
          esta_activo?: boolean | null
          id?: number
          id_tipo_examen?: number
          nombre?: string
          precio?: number
        }
        Relationships: [
          {
            foreignKeyName: "planes_membresia_id_tipo_examen_fkey"
            columns: ["id_tipo_examen"]
            isOneToOne: false
            referencedRelation: "tipo_examen"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_session: {
        Row: {
          answered_questions: number | null
          category_id: number
          correct_answers: number | null
          created_at: string | null
          created_by: string | null
          current_question_index: number | null
          end_time: string | null
          exam_type_id: number
          id: number
          practice_mode: string
          precision_percentage: number | null
          start_time: string | null
          status: string
          total_questions: number | null
          updated_at: string | null
          updated_by: string | null
          user_id: number
        }
        Insert: {
          answered_questions?: number | null
          category_id: number
          correct_answers?: number | null
          created_at?: string | null
          created_by?: string | null
          current_question_index?: number | null
          end_time?: string | null
          exam_type_id: number
          id?: number
          practice_mode: string
          precision_percentage?: number | null
          start_time?: string | null
          status: string
          total_questions?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id: number
        }
        Update: {
          answered_questions?: number | null
          category_id?: number
          correct_answers?: number | null
          created_at?: string | null
          created_by?: string | null
          current_question_index?: number | null
          end_time?: string | null
          exam_type_id?: number
          id?: number
          practice_mode?: string
          precision_percentage?: number | null
          start_time?: string | null
          status?: string
          total_questions?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk8ljoci7mpawwq5t8mtp3hi4en"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fkdmlo4m3q5r4p6opwu9wulbkq8"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fktcrqoncbfcraamsqenndcsut6"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "exam_type"
            referencedColumns: ["id"]
          },
        ]
      }
      pregunta: {
        Row: {
          actualizado_en: string | null
          clase: string | null
          creado_en: string | null
          dificultad: number | null
          explicacion: string | null
          fundamento: string | null
          id: number
          id_tipo_examen: number
          numero_pdf: number | null
          tema: string | null
          texto: string | null
          tipo_pregunta: string
          tipo_seccion: string | null
        }
        Insert: {
          actualizado_en?: string | null
          clase?: string | null
          creado_en?: string | null
          dificultad?: number | null
          explicacion?: string | null
          fundamento?: string | null
          id?: number
          id_tipo_examen: number
          numero_pdf?: number | null
          tema?: string | null
          texto?: string | null
          tipo_pregunta: string
          tipo_seccion?: string | null
        }
        Update: {
          actualizado_en?: string | null
          clase?: string | null
          creado_en?: string | null
          dificultad?: number | null
          explicacion?: string | null
          fundamento?: string | null
          id?: number
          id_tipo_examen?: number
          numero_pdf?: number | null
          tema?: string | null
          texto?: string | null
          tipo_pregunta?: string
          tipo_seccion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pregunta_id_tipo_examen_fkey"
            columns: ["id_tipo_examen"]
            isOneToOne: false
            referencedRelation: "tipo_examen"
            referencedColumns: ["id"]
          },
        ]
      }
      progreso_clase_usuario: {
        Row: {
          actualizado_en: string
          id_clase: number
          id_usuario: number
          lecciones_completadas: number
          progreso_porcentaje: number
          ultima_leccion_id: number | null
        }
        Insert: {
          actualizado_en?: string
          id_clase: number
          id_usuario: number
          lecciones_completadas?: number
          progreso_porcentaje?: number
          ultima_leccion_id?: number | null
        }
        Update: {
          actualizado_en?: string
          id_clase?: number
          id_usuario?: number
          lecciones_completadas?: number
          progreso_porcentaje?: number
          ultima_leccion_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progreso_clase_usuario_id_clase_fkey"
            columns: ["id_clase"]
            isOneToOne: false
            referencedRelation: "clases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progreso_clase_usuario_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progreso_clase_usuario_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_ranking_usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "progreso_clase_usuario_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_resumen_usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "progreso_clase_usuario_ultima_leccion_id_fkey"
            columns: ["ultima_leccion_id"]
            isOneToOne: false
            referencedRelation: "lecciones_clase"
            referencedColumns: ["id"]
          },
        ]
      }
      question: {
        Row: {
          created_at: string | null
          difficulty: number | null
          exam_type_id: number
          explanation: string | null
          id: number
          question_type: string
          text: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          difficulty?: number | null
          exam_type_id: number
          explanation?: string | null
          id?: number
          question_type: string
          text?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          difficulty?: number | null
          exam_type_id?: number
          explanation?: string | null
          id?: number
          question_type?: string
          text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fklfvaf1vulq50gd5i6w5gbgagh"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "exam_type"
            referencedColumns: ["id"]
          },
        ]
      }
      question_category: {
        Row: {
          category_id: number
          id: number
          question_id: number
        }
        Insert: {
          category_id: number
          id?: number
          question_id: number
        }
        Update: {
          category_id?: number
          id?: number
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk8am7a16ooqygccfeff0csl6ed"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fktd86c15n034sh16lgpcucfm6p"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question"
            referencedColumns: ["id"]
          },
        ]
      }
      question_media: {
        Row: {
          data: string
          description: string | null
          id: number
          media_type: string
          ord: number | null
          question_id: number
        }
        Insert: {
          data: string
          description?: string | null
          id?: number
          media_type: string
          ord?: number | null
          question_id: number
        }
        Update: {
          data?: string
          description?: string | null
          id?: number
          media_type?: string
          ord?: number | null
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk82yx9bydjqggrrw680o1ku7bw"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question"
            referencedColumns: ["id"]
          },
        ]
      }
      question_option: {
        Row: {
          id: number
          is_correct: boolean
          media_data: string | null
          media_type: string | null
          ord: number | null
          question_id: number
          text: string
        }
        Insert: {
          id?: number
          is_correct?: boolean
          media_data?: string | null
          media_type?: string | null
          ord?: number | null
          question_id: number
          text: string
        }
        Update: {
          id?: number
          is_correct?: boolean
          media_data?: string | null
          media_type?: string | null
          ord?: number | null
          question_id?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "fkmmdv54rmm5hkgxbn1008ix87n"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question"
            referencedColumns: ["id"]
          },
        ]
      }
      respuesta_intento: {
        Row: {
          es_correcta: boolean
          id: number
          id_intento: number
          id_opcion: number
          id_pregunta: number
          respondido_en: string | null
        }
        Insert: {
          es_correcta: boolean
          id?: number
          id_intento: number
          id_opcion: number
          id_pregunta: number
          respondido_en?: string | null
        }
        Update: {
          es_correcta?: boolean
          id?: number
          id_intento?: number
          id_opcion?: number
          id_pregunta?: number
          respondido_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "respuesta_intento_id_intento_fkey"
            columns: ["id_intento"]
            isOneToOne: false
            referencedRelation: "intento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuesta_intento_id_opcion_fkey"
            columns: ["id_opcion"]
            isOneToOne: false
            referencedRelation: "opcion_pregunta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuesta_intento_id_pregunta_fkey"
            columns: ["id_pregunta"]
            isOneToOne: false
            referencedRelation: "pregunta"
            referencedColumns: ["id"]
          },
        ]
      }
      sesion_practica: {
        Row: {
          actualizado_en: string | null
          actualizado_por: string | null
          aprobado: boolean | null
          creado_en: string | null
          creado_por: string | null
          created_at: string | null
          estado: string
          fecha_fin: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: number
          id_categoria: number
          id_tipo_examen: number
          id_usuario: number
          ids_preguntas: Json | null
          indice_pregunta_actual: number | null
          modo_practica: string
          porcentaje: number | null
          porcentaje_precision: number | null
          preguntas_marcadas: Json
          preguntas_respondidas: number | null
          respuestas_correctas: number | null
          respuestas_detalle: Json
          respuestas_incorrectas: number
          sin_responder: number
          tiempo_total: number | null
          tipo_sesion: string | null
          topic_breakdown: Json
          total_preguntas: number | null
          updated_at: string | null
        }
        Insert: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          aprobado?: boolean | null
          creado_en?: string | null
          creado_por?: string | null
          created_at?: string | null
          estado?: string
          fecha_fin?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: number
          id_categoria: number
          id_tipo_examen: number
          id_usuario: number
          ids_preguntas?: Json | null
          indice_pregunta_actual?: number | null
          modo_practica?: string
          porcentaje?: number | null
          porcentaje_precision?: number | null
          preguntas_marcadas?: Json
          preguntas_respondidas?: number | null
          respuestas_correctas?: number | null
          respuestas_detalle?: Json
          respuestas_incorrectas?: number
          sin_responder?: number
          tiempo_total?: number | null
          tipo_sesion?: string | null
          topic_breakdown?: Json
          total_preguntas?: number | null
          updated_at?: string | null
        }
        Update: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          aprobado?: boolean | null
          creado_en?: string | null
          creado_por?: string | null
          created_at?: string | null
          estado?: string
          fecha_fin?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: number
          id_categoria?: number
          id_tipo_examen?: number
          id_usuario?: number
          ids_preguntas?: Json | null
          indice_pregunta_actual?: number | null
          modo_practica?: string
          porcentaje?: number | null
          porcentaje_precision?: number | null
          preguntas_marcadas?: Json
          preguntas_respondidas?: number | null
          respuestas_correctas?: number | null
          respuestas_detalle?: Json
          respuestas_incorrectas?: number
          sin_responder?: number
          tiempo_total?: number | null
          tipo_sesion?: string | null
          topic_breakdown?: Json
          total_preguntas?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sesion_practica_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesion_practica_id_tipo_examen_fkey"
            columns: ["id_tipo_examen"]
            isOneToOne: false
            referencedRelation: "tipo_examen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesion_practica_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesion_practica_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_ranking_usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "sesion_practica_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_resumen_usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      social_accounts: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: number
          is_active: boolean | null
          provider: string
          provider_access_token: string | null
          provider_email: string | null
          provider_name: string | null
          provider_picture_url: string | null
          provider_refresh_token: string | null
          provider_user_id: string
          scope: string | null
          token_type: string | null
          updated_at: string | null
          user_id: number
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: number
          is_active?: boolean | null
          provider: string
          provider_access_token?: string | null
          provider_email?: string | null
          provider_name?: string | null
          provider_picture_url?: string | null
          provider_refresh_token?: string | null
          provider_user_id: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id: number
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: number
          is_active?: boolean | null
          provider?: string
          provider_access_token?: string | null
          provider_email?: string | null
          provider_name?: string | null
          provider_picture_url?: string | null
          provider_refresh_token?: string | null
          provider_user_id?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk6rmxxiton5yuvu7ph2hcq2xn7"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tipo_examen: {
        Row: {
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          descripcion?: string | null
          id?: never
          nombre: string
        }
        Update: {
          descripcion?: string | null
          id?: never
          nombre?: string
        }
        Relationships: []
      }
      transacciones_pago: {
        Row: {
          actualizado_en: string | null
          correo_cliente: string | null
          creado_en: string | null
          culqi_charge_id: string | null
          culqi_token_id: string | null
          descripcion: string | null
          estado: string
          fecha_pago: string | null
          id: number
          id_plan_membresia: number
          id_usuario: number
          mensaje_error: string | null
          metodo_pago: string
          moneda: string | null
          monto: number
          respuesta_culqi: Json | null
          telefono_cliente: string | null
        }
        Insert: {
          actualizado_en?: string | null
          correo_cliente?: string | null
          creado_en?: string | null
          culqi_charge_id?: string | null
          culqi_token_id?: string | null
          descripcion?: string | null
          estado: string
          fecha_pago?: string | null
          id?: number
          id_plan_membresia: number
          id_usuario: number
          mensaje_error?: string | null
          metodo_pago: string
          moneda?: string | null
          monto: number
          respuesta_culqi?: Json | null
          telefono_cliente?: string | null
        }
        Update: {
          actualizado_en?: string | null
          correo_cliente?: string | null
          creado_en?: string | null
          culqi_charge_id?: string | null
          culqi_token_id?: string | null
          descripcion?: string | null
          estado?: string
          fecha_pago?: string | null
          id?: number
          id_plan_membresia?: number
          id_usuario?: number
          mensaje_error?: string | null
          metodo_pago?: string
          moneda?: string | null
          monto?: number
          respuesta_culqi?: Json | null
          telefono_cliente?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transacciones_pago_id_plan_membresia_fkey"
            columns: ["id_plan_membresia"]
            isOneToOne: false
            referencedRelation: "planes_membresia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_pago_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_pago_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_ranking_usuarios"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "transacciones_pago_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "vw_resumen_usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      user_memberships: {
        Row: {
          created_at: string | null
          end_date: string
          id: number
          is_active: boolean | null
          membership_plan_id: number
          start_date: string
          updated_at: string | null
          user_id: number
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: number
          is_active?: boolean | null
          membership_plan_id: number
          start_date: string
          updated_at?: string | null
          user_id: number
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: number
          is_active?: boolean | null
          membership_plan_id?: number
          start_date?: string
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk3aftj3ypdb19itnsapcxykedv"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fkhe1hvgjpdth3xh0p4ogsl7c01"
            columns: ["membership_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          business_name: string | null
          created_at: string | null
          document_number: string | null
          document_type: string | null
          email: string
          email_verified: boolean | null
          enabled: boolean | null
          first_name: string | null
          fiscal_address: string | null
          id: number
          last_name: string | null
          password: string
          phone: string | null
          receipt_type: string | null
          social_id: string | null
          social_picture_url: string | null
          social_provider: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string | null
          email: string
          email_verified?: boolean | null
          enabled?: boolean | null
          first_name?: string | null
          fiscal_address?: string | null
          id?: number
          last_name?: string | null
          password: string
          phone?: string | null
          receipt_type?: string | null
          social_id?: string | null
          social_picture_url?: string | null
          social_provider?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string
          email_verified?: boolean | null
          enabled?: boolean | null
          first_name?: string | null
          fiscal_address?: string | null
          id?: number
          last_name?: string | null
          password?: string
          phone?: string | null
          receipt_type?: string | null
          social_id?: string | null
          social_picture_url?: string | null
          social_provider?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          actualizado_en: string | null
          apellido: string | null
          contrasena: string | null
          correo_electronico: string
          correo_verificado: boolean | null
          creado_en: string | null
          esta_activo: boolean | null
          esta_verificado: boolean | null
          habilitado: boolean | null
          id: number
          id_social: string | null
          nombre_usuario: string
          primer_nombre: string | null
          proveedor_social: string | null
          url_foto_social: string | null
        }
        Insert: {
          actualizado_en?: string | null
          apellido?: string | null
          contrasena?: string | null
          correo_electronico: string
          correo_verificado?: boolean | null
          creado_en?: string | null
          esta_activo?: boolean | null
          esta_verificado?: boolean | null
          habilitado?: boolean | null
          id?: number
          id_social?: string | null
          nombre_usuario: string
          primer_nombre?: string | null
          proveedor_social?: string | null
          url_foto_social?: string | null
        }
        Update: {
          actualizado_en?: string | null
          apellido?: string | null
          contrasena?: string | null
          correo_electronico?: string
          correo_verificado?: boolean | null
          creado_en?: string | null
          esta_activo?: boolean | null
          esta_verificado?: boolean | null
          habilitado?: boolean | null
          id?: number
          id_social?: string | null
          nombre_usuario?: string
          primer_nombre?: string | null
          proveedor_social?: string | null
          url_foto_social?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vw_ranking_usuarios: {
        Row: {
          categoria: string | null
          correo_electronico: string | null
          id_categoria: number | null
          id_usuario: number | null
          intentos: number | null
          nombre_usuario: string | null
          promedio: number | null
          ultimo_intento: string | null
        }
        Relationships: []
      }
      vw_resumen_usuario: {
        Row: {
          id_usuario: number | null
          intentos_aprobados: number | null
          promedio_general: number | null
          total_intentos: number | null
          ultimo_intento: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
