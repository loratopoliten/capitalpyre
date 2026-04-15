-- ════════════════════════════════════════════════════════════
--  Capital Pyre — Migration 002
--  Adds: crs_history, deal_events, ratings tables
--  Alters: matches, deals, entrepreneur_profiles,
--          investor_profiles, sme_profiles
-- ════════════════════════════════════════════════════════════

USE capitalpyre_db;

-- ── Add pass_reason to matches ────────────────────────────
ALTER TABLE matches
  ADD COLUMN pass_reason ENUM(
    'too_early','wrong_sector','crs_below_threshold',
    'documentation_insufficient','ticket_size_mismatch',
    'already_funded','no_longer_available','other'
  ) NULL AFTER responded_at,
  ADD COLUMN pass_note VARCHAR(300) NULL AFTER pass_reason;

-- ── Add deadline + activity tracking to deals ─────────────
ALTER TABLE deals
  ADD COLUMN deadline_at   DATETIME NULL AFTER stage_notes,
  ADD COLUMN last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER deadline_at;

-- ── Add funding_timeline to entrepreneur_profiles ─────────
ALTER TABLE entrepreneur_profiles
  ADD COLUMN funding_timeline ENUM('immediate','1-3months','3-6months','6-12months','exploring') 
  DEFAULT 'exploring' AFTER funding_ask;

-- ── Add is_featured to sme_profiles & entrepreneur_profiles
ALTER TABLE sme_profiles
  ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE AFTER is_published;

ALTER TABLE entrepreneur_profiles
  ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE AFTER is_published;

-- ── 18. CRS HISTORY ───────────────────────────────────────
-- Time-series of every CRS computation — the data moat foundation
CREATE TABLE IF NOT EXISTS crs_history (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  role         ENUM('entrepreneur','sme') NOT NULL,
  crs_score    DECIMAL(5,2) NOT NULL,
  breakdown    JSON NOT NULL,
  computed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_crs_history_user ON crs_history(user_id, computed_at);
CREATE INDEX IF NOT EXISTS idx_crs_history_role ON crs_history(role, crs_score);

-- ── 19. DEAL EVENTS ───────────────────────────────────────
-- Full stage progression log — enables time-to-close analytics
CREATE TABLE IF NOT EXISTS deal_events (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  deal_id      INT NOT NULL,
  actor_id     INT,
  event_type   ENUM(
    'created','stage_advanced','stage_note_added',
    'document_uploaded','marked_inactive','reopened',
    'deadline_extended','closed','terminated'
  ) NOT NULL,
  stage_from   VARCHAR(30),
  stage_to     VARCHAR(30),
  notes        TEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id)  REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_deal_events_deal ON deal_events(deal_id, created_at);

-- ── 20. RATINGS ───────────────────────────────────────────
-- Interaction-level reputation — captured at match stage, not just post-deal
CREATE TABLE IF NOT EXISTS ratings (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  rater_id        INT NOT NULL,
  ratee_id        INT NOT NULL,
  match_id        INT NOT NULL,
  -- Investor rates entrepreneur
  responsiveness  TINYINT UNSIGNED,  -- 1-5
  clarity         TINYINT UNSIGNED,  -- 1-5
  preparedness    TINYINT UNSIGNED,  -- 1-5
  -- Entrepreneur rates investor
  seriousness     TINYINT UNSIGNED,  -- 1-5
  communication   TINYINT UNSIGNED,  -- 1-5
  follow_through  TINYINT UNSIGNED,  -- 1-5
  overall_score   DECIMAL(3,1) GENERATED ALWAYS AS (
    CASE
      WHEN responsiveness IS NOT NULL THEN
        ROUND((responsiveness + clarity + preparedness) / 3.0, 1)
      WHEN seriousness IS NOT NULL THEN
        ROUND((seriousness + communication + follow_through) / 3.0, 1)
      ELSE NULL
    END
  ) STORED,
  comment         TEXT,
  rated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rater_match (rater_id, match_id),
  FOREIGN KEY (rater_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ratee_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (match_id)  REFERENCES matches(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_ratings_ratee ON ratings(ratee_id, rated_at);
