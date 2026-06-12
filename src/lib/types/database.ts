export type UserRole =
  | "admin"
  | "installator"
  | "bemyndiget"
  | "prosjektleder"
  | "elektriker"
  | "montor";
export type ProjectStatus = "aktiv" | "paa_vent" | "ferdigstilt" | "arkivert";
export type ProjectPhase =
  | "bidding"
  | "production"
  | "completed"
  | "lost"
  | "cancelled";

export const PROJECT_PHASE_LABELS: Record<ProjectPhase, { no: string; en: string }> = {
  bidding: { no: "Tilbud", en: "Bidding" },
  production: { no: "Produksjon", en: "Production" },
  completed: { no: "Fullført", en: "Completed" },
  lost: { no: "Tapt", en: "Lost" },
  cancelled: { no: "Avlyst", en: "Cancelled" },
};
export type InstallationType = "bolig" | "naering" | "telecom" | "ev";
export type DocumentKind =
  | "risikovurdering"
  | "sluttkontroll"
  | "samsvarserklaering"
  | "forenklet_sikkerhet"
  | "sja"
  | "ruh"
  | "startup_checklist"
  | "stikkprovekontroll"
  | "internkontroll"
  | "custom";
export type DocumentStatus = "utkast" | "signert";
export type DeviationSeverity = "lav" | "middels" | "hoey" | "kritisk";
export type DeviationStatus = "apen" | "under_arbeid" | "lukket";
export type TaskStatus = "initiated" | "in_progress" | "resolved";

export type CategoryFieldType = "text" | "number" | "dropdown" | "yes_no";
export interface CategoryField {
  key: string;
  label: string;
  type: CategoryFieldType;
  required?: boolean;
  options?: string[]; // For dropdown
  hint?: string;
}
export type CategoryFieldSchema = CategoryField[];

export const TASK_STATUS_LABELS: Record<TaskStatus, { no: string; en: string }> = {
  initiated: { no: "Startet", en: "Initiated" },
  in_progress: { no: "Pågår", en: "In progress" },
  resolved: { no: "Løst", en: "Resolved" },
};

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          firma: string;
          org_nr: string | null;
          selskap_adresse: string | null;
          selskap_postnr: string | null;
          selskap_sted: string | null;
          selskap_telefon: string | null;
          selskap_epost: string | null;
          installator_navn: string | null;
          installator_tittel: string | null;
          installator_telefon: string | null;
          installator_epost: string | null;
          logo_url: string | null;
          primary_color: string | null;
          industry: string | null;
          employee_count_est: number | null;
          plan: string | null;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          firma: string;
          org_nr?: string | null;
          selskap_adresse?: string | null;
          selskap_postnr?: string | null;
          selskap_sted?: string | null;
          selskap_telefon?: string | null;
          selskap_epost?: string | null;
          installator_navn?: string | null;
          installator_tittel?: string | null;
          installator_telefon?: string | null;
          installator_epost?: string | null;
          logo_url?: string | null;
          primary_color?: string | null;
          industry?: string | null;
          employee_count_est?: number | null;
          plan?: string | null;
          trial_ends_at?: string | null;
        };
        Update: {
          firma?: string;
          org_nr?: string | null;
          selskap_adresse?: string | null;
          selskap_postnr?: string | null;
          selskap_sted?: string | null;
          selskap_telefon?: string | null;
          selskap_epost?: string | null;
          installator_navn?: string | null;
          installator_tittel?: string | null;
          installator_telefon?: string | null;
          installator_epost?: string | null;
          logo_url?: string | null;
          primary_color?: string | null;
          industry?: string | null;
          employee_count_est?: number | null;
          plan?: string | null;
          trial_ends_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          title: string | null;
          phone: string | null;
          role: UserRole;
          signature_data_url: string | null;
          notify_deviation_assigned: boolean;
          notify_comment_added: boolean;
          notify_task_assigned: boolean;
          notify_daily_digest: boolean;
          active: boolean;
          organization_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          title?: string | null;
          phone?: string | null;
          role?: UserRole;
          signature_data_url?: string | null;
          notify_deviation_assigned?: boolean;
          notify_comment_added?: boolean;
          notify_task_assigned?: boolean;
          notify_daily_digest?: boolean;
          active?: boolean;
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          title?: string | null;
          phone?: string | null;
          role?: UserRole;
          signature_data_url?: string | null;
          notify_deviation_assigned?: boolean;
          notify_comment_added?: boolean;
          notify_task_assigned?: boolean;
          notify_daily_digest?: boolean;
          active?: boolean;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      project_categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          order_index: number;
          is_active: boolean;
          field_schema: CategoryFieldSchema;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          order_index?: number;
          is_active?: boolean;
          field_schema?: CategoryFieldSchema;
          organization_id?: string | null;
        };
        Update: {
          slug?: string;
          name?: string;
          description?: string | null;
          order_index?: number;
          is_active?: boolean;
          field_schema?: CategoryFieldSchema;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      project_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          default_category_id: string | null;
          default_phase: ProjectPhase | null;
          default_installation_type: string | null;
          default_description: string | null;
          default_assigned_to: string | null;
          default_stage_id: string | null;
          default_category_data: Record<string, unknown>;
          order_index: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          default_category_id?: string | null;
          default_phase?: ProjectPhase | null;
          default_installation_type?: string | null;
          default_description?: string | null;
          default_assigned_to?: string | null;
          default_stage_id?: string | null;
          default_category_data?: Record<string, unknown>;
          order_index?: number;
          is_active?: boolean;
          organization_id?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          default_category_id?: string | null;
          default_phase?: ProjectPhase | null;
          default_installation_type?: string | null;
          default_description?: string | null;
          default_assigned_to?: string | null;
          default_stage_id?: string | null;
          default_category_data?: Record<string, unknown>;
          order_index?: number;
          is_active?: boolean;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      task_types: {
        Row: {
          id: string;
          slug: string;
          label_no: string;
          label_en: string;
          order_index: number;
          is_active: boolean;
          created_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          label_no: string;
          label_en: string;
          order_index?: number;
          is_active?: boolean;
          organization_id?: string | null;
        };
        Update: {
          slug?: string;
          label_no?: string;
          label_en?: string;
          order_index?: number;
          is_active?: boolean;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string | null;
          title: string;
          description: string | null;
          task_type_slug: string | null;
          status: TaskStatus;
          assigned_to: string | null;
          group_id: string | null;
          due_date: string | null;
          reported_by: string;
          resolved_at: string | null;
          resolved_by: string | null;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          title: string;
          description?: string | null;
          task_type_slug?: string | null;
          status?: TaskStatus;
          assigned_to?: string | null;
          group_id?: string | null;
          due_date?: string | null;
          reported_by: string;
          organization_id?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          task_type_slug?: string | null;
          project_id?: string | null;
          status?: TaskStatus;
          assigned_to?: string | null;
          group_id?: string | null;
          due_date?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_entries: {
        Row: {
          id: string;
          project_id: string | null;
          group_id: string | null;
          title: string | null;
          start_date: string;
          end_date: string;
          status: string;
          locked: boolean;
          locked_reason: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          group_id?: string | null;
          title?: string | null;
          start_date: string;
          end_date: string;
          status?: string;
          locked?: boolean;
          locked_reason?: string | null;
          notes?: string | null;
          created_by?: string | null;
          organization_id?: string | null;
        };
        Update: {
          project_id?: string | null;
          group_id?: string | null;
          title?: string | null;
          start_date?: string;
          end_date?: string;
          status?: string;
          locked?: boolean;
          locked_reason?: string | null;
          notes?: string | null;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      schedule_off_periods: {
        Row: {
          id: string;
          group_id: string | null;
          start_date: string;
          end_date: string;
          reason: string;
          notes: string | null;
          locked: boolean;
          locked_reason: string | null;
          created_by: string | null;
          created_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          group_id?: string | null;
          start_date: string;
          end_date: string;
          reason?: string;
          notes?: string | null;
          locked?: boolean;
          locked_reason?: string | null;
          created_by?: string | null;
          organization_id?: string | null;
        };
        Update: {
          group_id?: string | null;
          start_date?: string;
          end_date?: string;
          reason?: string;
          notes?: string | null;
          locked?: boolean;
          locked_reason?: string | null;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      substances: {
        Row: {
          id: string;
          name: string;
          manufacturer: string | null;
          cas_number: string | null;
          usage_area: string | null;
          storage_location: string | null;
          ghs_pictograms: string[];
          hazard_statements: string | null;
          precautionary_measures: string | null;
          sds_file_path: string | null;
          sds_revision_date: string | null;
          quantity_estimate: string | null;
          notes: string | null;
          active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          manufacturer?: string | null;
          cas_number?: string | null;
          usage_area?: string | null;
          storage_location?: string | null;
          ghs_pictograms?: string[];
          hazard_statements?: string | null;
          precautionary_measures?: string | null;
          sds_file_path?: string | null;
          sds_revision_date?: string | null;
          quantity_estimate?: string | null;
          notes?: string | null;
          active?: boolean;
          created_by?: string | null;
          organization_id?: string | null;
        };
        Update: {
          name?: string;
          manufacturer?: string | null;
          cas_number?: string | null;
          usage_area?: string | null;
          storage_location?: string | null;
          ghs_pictograms?: string[];
          hazard_statements?: string | null;
          precautionary_measures?: string | null;
          sds_file_path?: string | null;
          sds_revision_date?: string | null;
          quantity_estimate?: string | null;
          notes?: string | null;
          active?: boolean;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      issue_reports: {
        Row: {
          id: string;
          reported_by: string | null;
          title: string;
          description: string | null;
          severity: "lav" | "middels" | "hoey";
          status: "apen" | "under_arbeid" | "lukket";
          page_url: string | null;
          user_agent: string | null;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          reported_by: string;
          title: string;
          description?: string | null;
          severity?: "lav" | "middels" | "hoey";
          status?: "apen" | "under_arbeid" | "lukket";
          page_url?: string | null;
          user_agent?: string | null;
          admin_notes?: string | null;
          organization_id?: string | null;
        };
        Update: {
          status?: "apen" | "under_arbeid" | "lukket";
          admin_notes?: string | null;
          resolved_at?: string | null;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "issue_reports_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      email_log: {
        Row: {
          id: string;
          recipient: string;
          subject: string;
          body_text: string | null;
          body_html: string | null;
          category: string;
          related_project_id: string | null;
          related_deviation_id: string | null;
          status: string;
          provider_message_id: string | null;
          error: string | null;
          sent_by: string | null;
          sent_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          recipient: string;
          subject: string;
          body_text?: string | null;
          body_html?: string | null;
          category: string;
          related_project_id?: string | null;
          related_deviation_id?: string | null;
          status?: string;
          provider_message_id?: string | null;
          error?: string | null;
          sent_by?: string | null;
          organization_id?: string | null;
        };
        Update: {
          status?: string;
          error?: string | null;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          project_number: string;
          title: string;
          customer_name: string | null;
          customer_org_number: string | null;
          customer_contact: string | null;
          customer_email: string | null;
          customer_phone: string | null;
          customer_address: string | null;
          customer_postal_code: string | null;
          customer_city: string | null;
          site_company: string | null;
          site_address: string | null;
          site_house_number: string | null;
          site_house_letter: string | null;
          site_postal_code: string | null;
          site_city: string | null;
          site_ssb_number: string | null;
          description: string | null;
          installation_type: InstallationType | null;
          customer_id: string | null;
          site_id: string | null;
          stage_id: string | null;
          status: ProjectStatus;
          created_by: string;
          assigned_to: string | null;
          scheduled_start_date: string | null;
          scheduled_end_date: string | null;
          phase: ProjectPhase;
          category_id: string | null;
          category_data: Record<string, unknown>;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          project_number: string;
          title: string;
          customer_name?: string | null;
          customer_org_number?: string | null;
          customer_contact?: string | null;
          customer_email?: string | null;
          customer_phone?: string | null;
          customer_address?: string | null;
          customer_postal_code?: string | null;
          customer_city?: string | null;
          site_company?: string | null;
          site_address?: string | null;
          site_house_number?: string | null;
          site_house_letter?: string | null;
          site_postal_code?: string | null;
          site_city?: string | null;
          site_ssb_number?: string | null;
          description?: string | null;
          installation_type?: InstallationType | null;
          customer_id?: string | null;
          site_id?: string | null;
          stage_id?: string | null;
          status?: ProjectStatus;
          created_by: string;
          assigned_to?: string | null;
          scheduled_start_date?: string | null;
          scheduled_end_date?: string | null;
          phase?: ProjectPhase;
          category_id?: string | null;
          category_data?: Record<string, unknown>;
          completed_at?: string | null;
          organization_id?: string | null;
        };
        Update: {
          project_number?: string;
          title?: string;
          customer_name?: string | null;
          customer_org_number?: string | null;
          customer_contact?: string | null;
          customer_email?: string | null;
          customer_phone?: string | null;
          customer_address?: string | null;
          customer_postal_code?: string | null;
          customer_city?: string | null;
          site_company?: string | null;
          site_address?: string | null;
          site_house_number?: string | null;
          site_house_letter?: string | null;
          site_postal_code?: string | null;
          site_city?: string | null;
          site_ssb_number?: string | null;
          description?: string | null;
          installation_type?: InstallationType | null;
          customer_id?: string | null;
          site_id?: string | null;
          stage_id?: string | null;
          status?: ProjectStatus;
          assigned_to?: string | null;
          scheduled_start_date?: string | null;
          scheduled_end_date?: string | null;
          phase?: ProjectPhase;
          category_id?: string | null;
          category_data?: Record<string, unknown>;
          completed_at?: string | null;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      project_comments: {
        Row: {
          id: string;
          project_id: string;
          author_id: string;
          body: string;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          author_id: string;
          body: string;
          organization_id?: string | null;
        };
        Update: {
          body?: string;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_comments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          project_id: string | null;
          kind: DocumentKind;
          version: number;
          status: DocumentStatus;
          data: Record<string, unknown>;
          pdf_path: string | null;
          signed_by: string | null;
          signed_at: string | null;
          signature_snapshot: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          kind: DocumentKind;
          version?: number;
          status?: DocumentStatus;
          data?: Record<string, unknown>;
          pdf_path?: string | null;
          signed_by?: string | null;
          signed_at?: string | null;
          signature_snapshot?: string | null;
          created_by: string;
          organization_id?: string | null;
        };
        Update: {
          status?: DocumentStatus;
          data?: Record<string, unknown>;
          pdf_path?: string | null;
          signed_by?: string | null;
          signed_at?: string | null;
          signature_snapshot?: string | null;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_signed_by_fkey";
            columns: ["signed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      deviations: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          severity: DeviationSeverity;
          status: DeviationStatus;
          reported_by: string;
          assigned_to: string | null;
          resolution: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          severity?: DeviationSeverity;
          status?: DeviationStatus;
          reported_by: string;
          assigned_to?: string | null;
          resolution?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          organization_id?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          severity?: DeviationSeverity;
          status?: DeviationStatus;
          assigned_to?: string | null;
          resolution?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deviations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deviations_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deviations_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      certificates: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          issuer: string | null;
          issued_date: string | null;
          expires_date: string | null;
          file_path: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          issuer?: string | null;
          issued_date?: string | null;
          expires_date?: string | null;
          file_path: string;
          notes?: string | null;
          organization_id?: string | null;
        };
        Update: {
          name?: string;
          issuer?: string | null;
          issued_date?: string | null;
          expires_date?: string | null;
          file_path?: string;
          notes?: string | null;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "certificates_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      document_templates: {
        Row: {
          kind: DocumentKind;
          definition: Record<string, unknown>;
          is_hidden: boolean;
          updated_at: string;
          updated_by: string | null;
          organization_id: string | null;
        };
        Insert: {
          kind: DocumentKind;
          definition: Record<string, unknown>;
          is_hidden?: boolean;
          updated_by?: string | null;
          organization_id?: string | null;
        };
        Update: {
          definition?: Record<string, unknown>;
          is_hidden?: boolean;
          updated_by?: string | null;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      custom_templates: {
        Row: {
          id: string;
          name: string;
          subtitle: string | null;
          description: string | null;
          definition: Record<string, unknown>;
          is_hidden: boolean;
          ai_generated: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          subtitle?: string | null;
          description?: string | null;
          definition?: Record<string, unknown>;
          is_hidden?: boolean;
          ai_generated?: boolean;
          created_by?: string | null;
          organization_id?: string | null;
        };
        Update: {
          name?: string;
          subtitle?: string | null;
          description?: string | null;
          definition?: Record<string, unknown>;
          is_hidden?: boolean;
          ai_generated?: boolean;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      routines: {
        Row: {
          id: number;
          number: number | null;
          category: string | null;
          title_no: string;
          title_en: string;
          description_no: string | null;
          description_en: string | null;
          file_path_en: string | null;
          file_path_no: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: number;
          number?: number | null;
          category?: string | null;
          title_no: string;
          title_en: string;
          description_no?: string | null;
          description_en?: string | null;
          file_path_en?: string | null;
          file_path_no?: string | null;
          active?: boolean;
          organization_id?: string | null;
        };
        Update: {
          number?: number | null;
          category?: string | null;
          title_no?: string;
          title_en?: string;
          description_no?: string | null;
          description_en?: string | null;
          file_path_en?: string | null;
          file_path_no?: string | null;
          active?: boolean;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: string;
          firma: string;
          org_nr: string | null;
          selskap_adresse: string | null;
          selskap_postnr: string | null;
          selskap_sted: string | null;
          selskap_telefon: string | null;
          selskap_epost: string | null;
          installator_navn: string | null;
          installator_tittel: string | null;
          installator_telefon: string | null;
          installator_epost: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          firma: string;
          org_nr?: string | null;
          selskap_adresse?: string | null;
          selskap_postnr?: string | null;
          selskap_sted?: string | null;
          selskap_telefon?: string | null;
          selskap_epost?: string | null;
          installator_navn?: string | null;
          installator_tittel?: string | null;
          installator_telefon?: string | null;
          installator_epost?: string | null;
          updated_by?: string | null;
        };
        Update: {
          firma?: string;
          org_nr?: string | null;
          selskap_adresse?: string | null;
          selskap_postnr?: string | null;
          selskap_sted?: string | null;
          selskap_telefon?: string | null;
          selskap_epost?: string | null;
          installator_navn?: string | null;
          installator_tittel?: string | null;
          installator_telefon?: string | null;
          installator_epost?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          name: string;
          org_number: string | null;
          contact_person: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          postal_code: string | null;
          city: string | null;
          notes: string | null;
          map_color: string | null;
          active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          org_number?: string | null;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          postal_code?: string | null;
          city?: string | null;
          notes?: string | null;
          map_color?: string | null;
          active?: boolean;
          created_by?: string | null;
          organization_id?: string | null;
        };
        Update: {
          name?: string;
          org_number?: string | null;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          postal_code?: string | null;
          city?: string | null;
          notes?: string | null;
          map_color?: string | null;
          active?: boolean;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      sites: {
        Row: {
          id: string;
          customer_id: string | null;
          external_site_id: string | null;
          name: string;
          address: string | null;
          postal_code: string | null;
          city: string | null;
          province: string | null;
          ssb_number: string | null;
          latitude: number | null;
          longitude: number | null;
          site_type: string | null;
          notes: string | null;
          active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          external_site_id?: string | null;
          name: string;
          address?: string | null;
          postal_code?: string | null;
          city?: string | null;
          province?: string | null;
          ssb_number?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          site_type?: string | null;
          notes?: string | null;
          active?: boolean;
          created_by?: string | null;
          organization_id?: string | null;
        };
        Update: {
          customer_id?: string | null;
          external_site_id?: string | null;
          name?: string;
          address?: string | null;
          postal_code?: string | null;
          city?: string | null;
          province?: string | null;
          ssb_number?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          site_type?: string | null;
          notes?: string | null;
          active?: boolean;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sites_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      project_stages: {
        Row: {
          id: string;
          name: string;
          order_index: number;
          color: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          order_index?: number;
          color?: string | null;
          description?: string | null;
          is_active?: boolean;
          organization_id?: string | null;
        };
        Update: {
          name?: string;
          order_index?: number;
          color?: string | null;
          description?: string | null;
          is_active?: boolean;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          description: string | null;
          color: string | null;
          gantt_section_id: string | null;
          gantt_sort_order: number;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          description?: string | null;
          color?: string | null;
          gantt_section_id?: string | null;
          gantt_sort_order?: number;
          organization_id?: string | null;
        };
        Update: {
          name?: string;
          email?: string | null;
          description?: string | null;
          color?: string | null;
          gantt_section_id?: string | null;
          gantt_sort_order?: number;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      gantt_sections: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
          organization_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          organization_id?: string | null;
        };
        Update: {
          name?: string;
          sort_order?: number;
          organization_id?: string | null;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          organization_id: string | null;
        };
        Insert: {
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Record<string, unknown>;
          organization_id?: string | null;
        };
        Update: {
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Record<string, unknown>;
          organization_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_my_open_counts: {
        Args: Record<string, never>;
        Returns: {
          tasks_count: number;
          deviations_count: number;
          certs_expiring_count: number;
        }[];
      };
      current_organization_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      signup_organization: {
        Args: {
          p_user_id: string;
          p_firma: string;
          p_org_nr?: string | null;
          p_employee_count?: number | null;
          p_full_name?: string | null;
        };
        Returns: string;
      };
      check_signup_rate_limit: {
        Args: {
          p_ip: string;
          p_email?: string | null;
        };
        Returns: boolean;
      };
      mark_signup_success: {
        Args: {
          p_ip: string;
          p_email: string;
        };
        Returns: void;
      };
      purge_old_signup_attempts: {
        Args: Record<string, never>;
        Returns: void;
      };
      set_organization_id_if_null: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      storage_object_org_id: {
        Args: { p_bucket: string; p_name: string };
        Returns: string | null;
      };
    };
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      document_kind: DocumentKind;
      document_status: DocumentStatus;
      deviation_severity: DeviationSeverity;
      deviation_status: DeviationStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

// Convenience row aliases
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type Deviation = Database["public"]["Tables"]["deviations"]["Row"];
export type Certificate = Database["public"]["Tables"]["certificates"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_log"]["Row"];
export type AppSettings = Database["public"]["Tables"]["app_settings"]["Row"];
export type Routine = Database["public"]["Tables"]["routines"]["Row"];
export type CustomTemplate = Database["public"]["Tables"]["custom_templates"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Site = Database["public"]["Tables"]["sites"]["Row"];
export type ProjectStage = Database["public"]["Tables"]["project_stages"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, { no: string; en: string }> = {
  risikovurdering: { no: "Risikovurdering", en: "Risk assessment" },
  sluttkontroll: { no: "Sluttkontroll", en: "Final inspection" },
  samsvarserklaering: { no: "Samsvarserklæring", en: "Declaration of conformity" },
  forenklet_sikkerhet: {
    no: "Forenklet sikkerhet (lav risiko)",
    en: "Simplified safety (low risk)",
  },
  sja: {
    no: "Sikker Jobb Analyse (SJA)",
    en: "Safe Job Analysis (SJA)",
  },
  ruh: {
    no: "RUH — Rapport uønsket hendelse",
    en: "Incident Report (RUH)",
  },
  startup_checklist: {
    no: "Oppstartssjekkliste",
    en: "Startup Checklist",
  },
  stikkprovekontroll: {
    no: "Stikkprøvekontroll",
    en: "Spot Check",
  },
  internkontroll: {
    no: "Internkontroll",
    en: "Internal Control",
  },
  custom: {
    no: "Egendefinert skjema",
    en: "Custom form",
  },
};

export const ROLE_LABELS: Record<UserRole, { no: string; en: string }> = {
  admin: { no: "Administrator", en: "Administrator" },
  installator: { no: "Installatør", en: "Authorised installer" },
  bemyndiget: { no: "Bemyndiget", en: "Authorised person" },
  prosjektleder: { no: "Prosjektleder", en: "Project manager" },
  elektriker: { no: "Elektriker", en: "Electrician" },
  montor: { no: "Montør", en: "Assembly worker" },
};

// Roller som kan signere Samsvarserklæring (FEL § 12)
export const SAMSVAR_SIGNING_ROLES: UserRole[] = [
  "admin",
  "installator",
  "bemyndiget",
];

// Roller som har forhøyede rettigheter (ser alle dokumenter, kan tildele oppgaver)
export const ELEVATED_ROLES: UserRole[] = [
  "admin",
  "installator",
  "bemyndiget",
  "prosjektleder",
];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, { no: string; en: string }> = {
  aktiv: { no: "Aktiv", en: "Active" },
  paa_vent: { no: "På vent", en: "On hold" },
  ferdigstilt: { no: "Ferdigstilt", en: "Completed" },
  arkivert: { no: "Arkivert", en: "Archived" },
};

export const INSTALLATION_TYPE_LABELS: Record<InstallationType, { no: string; en: string }> = {
  bolig: { no: "Bolig", en: "Residential" },
  naering: { no: "Næring / Industri", en: "Commercial / Industrial" },
  telecom: { no: "Telecom / Mast", en: "Telecom / Mast" },
  ev: { no: "Ladeanlegg / EV", en: "EV charging" },
};

export const SEVERITY_LABELS: Record<DeviationSeverity, { no: string; en: string }> = {
  lav: { no: "Lav", en: "Low" },
  middels: { no: "Middels", en: "Medium" },
  hoey: { no: "Høy", en: "High" },
  kritisk: { no: "Kritisk", en: "Critical" },
};

export const DEVIATION_STATUS_LABELS: Record<DeviationStatus, { no: string; en: string }> = {
  apen: { no: "Åpen", en: "Open" },
  under_arbeid: { no: "Under arbeid", en: "In progress" },
  lukket: { no: "Lukket", en: "Closed" },
};
