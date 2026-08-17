-- ============================================
-- MediControl - Supabase Database Schema
-- ============================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard → SQL Editor → New Query

-- 1. PATIENTS TABLE
-- Stores patients/profiles under care
CREATE TABLE IF NOT EXISTS patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. MEDICATIONS TABLE
-- Stores each medication's info linked to user and patient
CREATE TABLE IF NOT EXISTS medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  how_to_take TEXT DEFAULT '',
  dose TEXT DEFAULT '',
  color TEXT DEFAULT '#8b5cf6',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MEDICATION SCHEDULES TABLE
-- Defines when each medication should be taken
CREATE TABLE IF NOT EXISTS medication_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  time_of_day TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. MEDICATION LOGS TABLE
-- Records actual intake (or missed doses)
CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES medication_schedules(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  taken_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_patients_created_by ON patients(created_by);
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient_id ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(patient_id, active);
CREATE INDEX IF NOT EXISTS idx_schedules_medication_id ON medication_schedules(medication_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day ON medication_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON medication_logs(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_logs_medication_date ON medication_logs(medication_id, scheduled_date);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- Patients: users can only CRUD their own
CREATE POLICY "Users can view own patients"
  ON patients FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own patients"
  ON patients FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own patients"
  ON patients FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own patients"
  ON patients FOR DELETE
  USING (auth.uid() = created_by);

-- Medications: users can only CRUD their own
CREATE POLICY "Users can view own medications"
  ON medications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medications"
  ON medications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medications"
  ON medications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own medications"
  ON medications FOR DELETE
  USING (auth.uid() = user_id);

-- Schedules: users can CRUD schedules for their own medications
CREATE POLICY "Users can view own schedules"
  ON medication_schedules FOR SELECT
  USING (
    medication_id IN (
      SELECT id FROM medications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own schedules"
  ON medication_schedules FOR INSERT
  WITH CHECK (
    medication_id IN (
      SELECT id FROM medications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own schedules"
  ON medication_schedules FOR UPDATE
  USING (
    medication_id IN (
      SELECT id FROM medications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own schedules"
  ON medication_schedules FOR DELETE
  USING (
    medication_id IN (
      SELECT id FROM medications WHERE user_id = auth.uid()
    )
  );

-- Logs: users can CRUD their own logs
CREATE POLICY "Users can view own logs"
  ON medication_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON medication_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs"
  ON medication_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs"
  ON medication_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
