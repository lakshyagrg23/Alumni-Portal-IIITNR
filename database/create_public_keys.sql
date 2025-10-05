-- Create table for storing users' public keys for E2E encryption
CREATE TABLE IF NOT EXISTS public_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_public_keys_user ON public_keys(user_id);

-- Trigger to update updated_at can be handled by existing update_updated_at_column trigger
