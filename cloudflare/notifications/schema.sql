CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  notification_date TEXT,
  application_start_date TEXT,
  last_date TEXT,
  exam_date TEXT,
  url TEXT NOT NULL,
  source_url TEXT,
  source_name TEXT,
  official INTEGER NOT NULL DEFAULT 1,
  summary TEXT,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  archived_at TEXT,
  archive_reason TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_exam_date ON notifications(exam_date);
CREATE INDEX IF NOT EXISTS idx_notifications_last_date ON notifications(last_date);
CREATE INDEX IF NOT EXISTS idx_notifications_updated_at ON notifications(updated_at);
CREATE INDEX IF NOT EXISTS idx_notifications_archived_at ON notifications(archived_at);
