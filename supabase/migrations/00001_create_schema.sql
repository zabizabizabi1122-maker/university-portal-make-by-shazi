-- UniSphere Database Schema
-- Migration: 00001_create_schema.sql
-- Creates all core tables for the UniSphere platform

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'president', 'student');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('pending', 'approved', 'rejected', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE event_approval_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE registration_status AS ENUM ('registered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  password    TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'student',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT profiles_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

-- ============================================================================
-- OTP CODES
-- ============================================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  attempts    INT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON otp_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_lookup ON otp_codes (user_id, used, expires_at);

-- ============================================================================
-- SOCIETIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS societies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL,
  contact_info  TEXT,
  president_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT societies_president_unique UNIQUE (president_id)
);

CREATE INDEX IF NOT EXISTS idx_societies_president ON societies (president_id);

-- ============================================================================
-- MEMBERSHIPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id  UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      membership_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memberships_society ON memberships (society_id);
CREATE INDEX IF NOT EXISTS idx_memberships_student ON memberships (student_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships (society_id, status);

-- ============================================================================
-- EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id              UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  description             TEXT,
  venue                   TEXT NOT NULL,
  start_date              TIMESTAMPTZ NOT NULL,
  end_date                TIMESTAMPTZ NOT NULL,
  registration_deadline   TIMESTAMPTZ NOT NULL,
  capacity                INT NOT NULL,
  proposed_budget         DECIMAL(12,2) NOT NULL DEFAULT 0,
  approved_budget         DECIMAL(12,2),
  approval_status         event_approval_status NOT NULL DEFAULT 'draft',
  approval_remarks        TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT events_capacity_positive CHECK (capacity >= 1),
  CONSTRAINT events_budget_non_negative CHECK (proposed_budget >= 0),
  CONSTRAINT events_dates_valid CHECK (start_date < end_date),
  CONSTRAINT events_deadline_valid CHECK (registration_deadline <= start_date)
);

CREATE INDEX IF NOT EXISTS idx_events_society ON events (society_id);
CREATE INDEX IF NOT EXISTS idx_events_approval_status ON events (approval_status);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events (start_date, end_date);

-- ============================================================================
-- REGISTRATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS registrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      registration_status NOT NULL DEFAULT 'registered',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT registrations_unique UNIQUE (event_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_student ON registrations (student_id);

-- ============================================================================
-- VOLUNTEER INVITATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS volunteer_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      invitation_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT invitations_unique UNIQUE (event_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_invitations_event ON volunteer_invitations (event_id);
CREATE INDEX IF NOT EXISTS idx_invitations_student ON volunteer_invitations (student_id);

-- ============================================================================
-- TASKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  assignee_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  priority      task_priority NOT NULL DEFAULT 'medium',
  status        task_status NOT NULL DEFAULT 'todo',
  due_date      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_event ON tasks (event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (event_id, status);

-- ============================================================================
-- EXPENSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT expenses_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_expenses_event ON expenses (event_id);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, read) WHERE read = false;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to atomically register for an event with capacity check
CREATE OR REPLACE FUNCTION register_for_event(
  p_event_id UUID,
  p_student_id UUID
) RETURNS UUID AS $$
DECLARE
  v_capacity INT;
  v_registered INT;
  v_event_status event_approval_status;
  v_deadline TIMESTAMPTZ;
  v_start TIMESTAMPTZ;
  v_existing UUID;
  v_reg_id UUID;
BEGIN
  -- Lock the event row for update
  SELECT capacity, approval_status, registration_deadline, start_date
  INTO v_capacity, v_event_status, v_deadline, v_start
  FROM events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF v_event_status != 'approved' THEN
    RAISE EXCEPTION 'Event is not approved for registration';
  END IF;

  IF now() > v_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  IF now() > v_start THEN
    RAISE EXCEPTION 'Event has already started';
  END IF;

  -- Check for existing active registration
  SELECT id INTO v_existing
  FROM registrations
  WHERE event_id = p_event_id AND student_id = p_student_id AND status = 'registered';

  IF FOUND THEN
    RAISE EXCEPTION 'Already registered for this event';
  END IF;

  -- Count active registrations
  SELECT COUNT(*) INTO v_registered
  FROM registrations
  WHERE event_id = p_event_id AND status = 'registered';

  IF v_registered >= v_capacity THEN
    RAISE EXCEPTION 'Event is at full capacity';
  END IF;

  -- Handle re-registration (cancelled → registered)
  SELECT id INTO v_existing
  FROM registrations
  WHERE event_id = p_event_id AND student_id = p_student_id AND status = 'cancelled';

  IF FOUND THEN
    UPDATE registrations SET status = 'registered', created_at = now()
    WHERE id = v_existing
    RETURNING id INTO v_reg_id;
  ELSE
    INSERT INTO registrations (event_id, student_id, status)
    VALUES (p_event_id, p_student_id, 'registered')
    RETURNING id INTO v_reg_id;
  END IF;

  RETURN v_reg_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles', 'societies', 'memberships', 'events', 'tasks', 'expenses'])
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER trigger_updated_at_%s
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- NOTE: RLS policies are permissive by default. Since we use a service_role key
-- on the server side (which bypasses RLS), and the anon key is only used for
-- Realtime subscriptions, we create broad read policies for now.
-- Fine-grained policies will be tightened in later phases.

-- For the server-side operations (service_role bypasses RLS), we don't need
-- additional policies. For client-side Realtime, we need SELECT policies:

-- Allow authenticated reading of notifications (for Realtime)
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (true);

-- Allow reading events (for Realtime registration counts)
CREATE POLICY "Anyone can read events"
  ON events FOR SELECT
  USING (true);

-- Allow reading registrations (for Realtime counts)
CREATE POLICY "Anyone can read registrations"
  ON registrations FOR SELECT
  USING (true);

-- ============================================================================
-- SEED: Administrator Account
-- ============================================================================
-- Password: 'admin123' hashed with scrypt
-- This will be inserted by the seed script, not here, to use proper scrypt hashing.
