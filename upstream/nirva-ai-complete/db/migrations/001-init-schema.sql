-- NMD Database Schema Initialization
-- Production-ready schema with indexing and constraints

-- Content Management
CREATE TABLE IF NOT EXISTS nmd_content (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'post',
  source_lang TEXT NOT NULL DEFAULT 'en',
  content_status TEXT NOT NULL DEFAULT 'draft',
  tags TEXT NOT NULL DEFAULT '[]',
  scheduled_at TIMESTAMP,
  scheduled_platforms TEXT,
  organization_id TEXT NOT NULL DEFAULT 'org_default',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL DEFAULT 'system',
  updated_by TEXT NOT NULL DEFAULT 'system',
  deleted_at TIMESTAMP
);

CREATE INDEX idx_nmd_content_org_status ON nmd_content(organization_id, content_status);
CREATE INDEX idx_nmd_content_created ON nmd_content(created_at DESC);
CREATE INDEX idx_nmd_content_scheduled ON nmd_content(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Content Versions
CREATE TABLE IF NOT EXISTS nmd_content_versions (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES nmd_content(id),
  organization_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  change_message TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

CREATE INDEX idx_nmd_versions_content ON nmd_content_versions(content_id, version_number);
CREATE INDEX idx_nmd_versions_org ON nmd_content_versions(organization_id);

-- Templates
CREATE TABLE IF NOT EXISTS nmd_content_templates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  metadata TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nmd_templates_org_category ON nmd_content_templates(organization_id, category);
CREATE INDEX idx_nmd_templates_usage ON nmd_content_templates(usage_count DESC);

-- Metrics
CREATE TABLE IF NOT EXISTS nmd_custom_metrics (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  formula TEXT,
  unit TEXT,
  target_value NUMERIC,
  current_value NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nmd_metrics_org ON nmd_custom_metrics(organization_id, is_active);

CREATE TABLE IF NOT EXISTS nmd_metric_readings (
  id TEXT PRIMARY KEY,
  metric_id TEXT NOT NULL REFERENCES nmd_custom_metrics(id),
  organization_id TEXT NOT NULL,
  value NUMERIC NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nmd_readings_metric ON nmd_metric_readings(metric_id, timestamp DESC);

-- Collaboration
CREATE TABLE IF NOT EXISTS nmd_comments (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  mentions_json TEXT DEFAULT '[]',
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nmd_comments_content ON nmd_comments(content_id, created_at DESC);

CREATE TABLE IF NOT EXISTS nmd_activity_logs (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nmd_activity_content ON nmd_activity_logs(content_id, timestamp DESC);

-- Alerts
CREATE TABLE IF NOT EXISTS nmd_alert_rules (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  metric TEXT NOT NULL,
  condition TEXT NOT NULL,
  threshold NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notify_channels TEXT NOT NULL DEFAULT '["email"]',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nmd_rules_org ON nmd_alert_rules(organization_id, is_active);

CREATE TABLE IF NOT EXISTS nmd_alerts (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL REFERENCES nmd_alert_rules(id),
  organization_id TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX idx_nmd_alerts_org ON nmd_alerts(organization_id, triggered_at DESC);

-- Webhooks
CREATE TABLE IF NOT EXISTS nmd_webhook_subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_triggered_at TIMESTAMP,
  UNIQUE(organization_id, url)
);

CREATE INDEX idx_nmd_webhooks_org ON nmd_webhook_subscriptions(organization_id, is_active);

CREATE TABLE IF NOT EXISTS nmd_webhook_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP
);

CREATE INDEX idx_nmd_webhook_events_org ON nmd_webhook_events(organization_id, timestamp DESC);

-- ROI & Financial
CREATE TABLE IF NOT EXISTS nmd_content_roi (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  revenue NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  roi NUMERIC,
  conversion_rate NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nmd_roi_content ON nmd_content_roi(content_id);
CREATE INDEX idx_nmd_roi_org ON nmd_content_roi(organization_id);

-- Approval Workflow
CREATE TABLE IF NOT EXISTS nmd_approval_tasks (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  steps_json TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_nmd_approval_org ON nmd_approval_tasks(organization_id, status);

-- A/B Testing
CREATE TABLE IF NOT EXISTS nmd_a_b_tests (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  variant_a TEXT NOT NULL,
  variant_b TEXT NOT NULL,
  results_json TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nmd_tests_org ON nmd_a_b_tests(organization_id);

-- Audit Logs
CREATE TABLE IF NOT EXISTS nmd_audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  resource TEXT NOT NULL,
  detail TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nmd_audit_actor ON nmd_audit_logs(actor);
CREATE INDEX idx_nmd_audit_action ON nmd_audit_logs(action);
CREATE INDEX idx_nmd_audit_timestamp ON nmd_audit_logs(timestamp DESC);

-- Organizations
CREATE TABLE IF NOT EXISTS nmd_organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

CREATE INDEX idx_nmd_org_status ON nmd_organizations(status);
