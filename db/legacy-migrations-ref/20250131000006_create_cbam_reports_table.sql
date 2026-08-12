-- Migration: Create CBAM Reports Table
-- Description: Stores CBAM calculation results and PDF reports

CREATE TABLE IF NOT EXISTS public.cbam_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  product_name TEXT NOT NULL,
  country TEXT NOT NULL,
  period TEXT NOT NULL,
  energy_em NUMERIC(15, 4) NOT NULL DEFAULT 0,
  materials_em NUMERIC(15, 4) NOT NULL DEFAULT 0,
  transport_em NUMERIC(15, 4) NOT NULL DEFAULT 0,
  process_em NUMERIC(15, 4) NOT NULL DEFAULT 0,
  total_em NUMERIC(15, 4) NOT NULL DEFAULT 0,
  pdf_url TEXT,
  raw_json JSONB NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cbam_reports_user_id ON public.cbam_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_cbam_reports_created_at ON public.cbam_reports(created_at DESC);

-- Enable RLS
ALTER TABLE public.cbam_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own reports
CREATE POLICY "Users can view their own CBAM reports"
  ON public.cbam_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own reports
CREATE POLICY "Users can insert their own CBAM reports"
  ON public.cbam_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own reports
CREATE POLICY "Users can update their own CBAM reports"
  ON public.cbam_reports
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own reports
CREATE POLICY "Users can delete their own CBAM reports"
  ON public.cbam_reports
  FOR DELETE
  USING (auth.uid() = user_id);




