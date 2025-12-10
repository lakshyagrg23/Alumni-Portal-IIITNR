-- Add superadmin role and admin permissions infrastructure
DO $$
DECLARE cons_name text;
BEGIN
  -- Drop existing CHECK constraint on users.role if it only allows ('admin','alumni')
  SELECT conname INTO cons_name
  FROM pg_constraint
  WHERE conrelid = 'public.users'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%IN%(\'admin\', \'alumni\')%';

  IF cons_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', cons_name);
  END IF;

  -- Ensure role column exists
  PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='role';
  -- Re-add a permissive CHECK including superadmin
  BEGIN
    ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin','admin','alumni'));
  EXCEPTION WHEN duplicate_object THEN
    -- constraint already exists
    NULL;
  END;

  -- Enforce only a single superadmin
  CREATE UNIQUE INDEX IF NOT EXISTS ux_users_single_superadmin ON public.users (role) WHERE role='superadmin';

END $$ LANGUAGE plpgsql;

-- Permissions table for granular admin capabilities
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_admin_permissions_user_perm ON public.admin_permissions(user_id, permission);

-- Helpful defaults: no data seeding here to avoid accidental assignment.
