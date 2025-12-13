-- User Blocking and Reporting System
-- Enables users to block each other and report inappropriate behavior

-- Table: blocked_users
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id SERIAL PRIMARY KEY,
  blocker_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate blocks
  UNIQUE(blocker_user_id, blocked_user_id),
  
  -- Prevent self-blocking
  CHECK (blocker_user_id != blocked_user_id)
);

CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_user_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users(blocked_user_id);

COMMENT ON TABLE public.blocked_users IS 'Tracks which users have blocked each other';
COMMENT ON COLUMN public.blocked_users.blocker_user_id IS 'User who initiated the block';
COMMENT ON COLUMN public.blocked_users.blocked_user_id IS 'User who was blocked';

-- Table: user_reports
CREATE TABLE IF NOT EXISTS public.user_reports (
  id SERIAL PRIMARY KEY,
  reporter_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('harassment', 'spam', 'inappropriate_content', 'impersonation', 'other')),
  description TEXT NOT NULL,
  evidence_message_ids INTEGER[], -- Array of message IDs as evidence
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
  admin_notes TEXT,
  action_taken VARCHAR(50) CHECK (action_taken IN ('none', 'warning', 'temporary_block', 'permanent_block', 'account_suspension', 'content_removal')),
  reviewed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent self-reporting
  CHECK (reporter_user_id != reported_user_id)
);

CREATE INDEX idx_user_reports_reporter ON public.user_reports(reporter_user_id);
CREATE INDEX idx_user_reports_reported ON public.user_reports(reported_user_id);
CREATE INDEX idx_user_reports_status ON public.user_reports(status);
CREATE INDEX idx_user_reports_type ON public.user_reports(report_type);

COMMENT ON TABLE public.user_reports IS 'User-submitted reports of inappropriate behavior';
COMMENT ON COLUMN public.user_reports.report_type IS 'Category: harassment, spam, inappropriate_content, impersonation, other';
COMMENT ON COLUMN public.user_reports.status IS 'Report status: pending, under_review, resolved, dismissed';
COMMENT ON COLUMN public.user_reports.action_taken IS 'Admin action: none, warning, temporary_block, permanent_block, account_suspension, content_removal';

-- Table: user_warnings
CREATE TABLE IF NOT EXISTS public.user_warnings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  issued_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  warning_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  related_report_id INTEGER REFERENCES public.user_reports(id) ON DELETE SET NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_warnings_user ON public.user_warnings(user_id);
CREATE INDEX idx_user_warnings_issued ON public.user_warnings(issued_at DESC);

COMMENT ON TABLE public.user_warnings IS 'Official warnings issued to users by admins';

-- Table: user_suspensions
CREATE TABLE IF NOT EXISTS public.user_suspensions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  suspended_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  suspension_type VARCHAR(30) NOT NULL CHECK (suspension_type IN ('temporary', 'permanent')),
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP WITH TIME ZONE, -- NULL for permanent
  related_report_id INTEGER REFERENCES public.user_reports(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  lifted_at TIMESTAMP WITH TIME ZONE,
  lifted_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  lift_reason TEXT
);

CREATE INDEX idx_user_suspensions_user ON public.user_suspensions(user_id);
CREATE INDEX idx_user_suspensions_active ON public.user_suspensions(user_id, is_active) WHERE is_active = TRUE;

COMMENT ON TABLE public.user_suspensions IS 'Account suspensions with start/end dates';
COMMENT ON COLUMN public.user_suspensions.ends_at IS 'NULL for permanent suspension';
