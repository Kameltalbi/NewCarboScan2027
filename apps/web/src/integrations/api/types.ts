/** Types applicatifs Newcarboscan-2027 — sans générateur Supabase. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  // Schéma porté par PostgreSQL ; les types fins seront générés depuis le SQL.
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
