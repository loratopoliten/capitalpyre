-- ════════════════════════════════════════════════════════════
--  Capital Pyre — Database Schema
--  MySQL 8.0 · InnoDB · utf8mb4
--  Adapted from IAMS (UB CSI341) and extended.
-- ════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS capitalpyre_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE capitalpyre_db;

-- ── 1. USERS ──────────────────────────────────────────────
-- Adapted from IAMS users table.
-- Role ENUM updated: entrepreneur | sme | investor | admin
CREATE TABLE IF NOT EXISTS users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  firstname       VARCHAR(80)  NOT NULL,
  lastname        VARCHAR(80)  NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('entrepreneur','sme','investor','admin') NOT NULL,
  phone           VARCHAR(20),
  nationality     VARCHAR(80),
  date_of_birth   DATE,
  avatar_path     VARCHAR(300),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── 2. ENTREPRENEUR PROFILES ───────────────────────────────
-- Merges IAMS student + student_preferences into one table.
CREATE TABLE IF NOT EXISTS entrepreneur_profiles (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT NOT NULL UNIQUE,
  business_name       VARCHAR(200) NOT NULL,
  sector              VARCHAR(100),
  stage               ENUM('idea','pre-seed','seed','series-a','growth') DEFAULT 'idea',
  pitch_summary       TEXT,
  problem_statement   TEXT,
  solution            TEXT,
  market_size         VARCHAR(200),
  revenue_model       TEXT,
  traction            TEXT,
  funding_ask         DECIMAL(15,2),
  currency            VARCHAR(10) DEFAULT 'BWP',
  pitch_deck_path     VARCHAR(300),
  website             VARCHAR(200),
  linkedin            VARCHAR(200),
  crs_score           DECIMAL(5,2) DEFAULT 0,
  crs_breakdown       JSON,
  crs_computed_at     DATETIME,
  is_published        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 3. SME PROFILES ────────────────────────────────────────
-- Adapted from IAMS organisations table. Extended with CRS fields.
CREATE TABLE IF NOT EXISTS sme_profiles (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT NOT NULL UNIQUE,
  business_name       VARCHAR(200) NOT NULL,
  cipa_reg_no         VARCHAR(100),
  industry            VARCHAR(100),
  address             VARCHAR(300),
  website             VARCHAR(200),
  description         TEXT,
  year_established    YEAR,
  employee_count      SMALLINT UNSIGNED DEFAULT 1,
  revenue_band        ENUM('under-100k','100k-500k','500k-1m','1m-5m','above-5m'),
  required_skills     TEXT,
  funding_ask         DECIMAL(15,2),
  currency            VARCHAR(10) DEFAULT 'BWP',
  crs_score           DECIMAL(5,2) DEFAULT 0,
  crs_breakdown       JSON,
  crs_computed_at     DATETIME,
  approval_status     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  approved_by         INT,
  approved_at         DATETIME,
  is_published        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── 4. INVESTOR PROFILES ───────────────────────────────────
-- New table — no direct IAMS equivalent.
CREATE TABLE IF NOT EXISTS investor_profiles (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL UNIQUE,
  investor_type   ENUM('angel','vc','institutional','corporate') NOT NULL DEFAULT 'angel',
  firm_name       VARCHAR(200),
  bio             TEXT,
  min_ticket      DECIMAL(15,2),
  max_ticket      DECIMAL(15,2),
  currency        VARCHAR(10) DEFAULT 'BWP',
  sectors         JSON,
  preferred_stage JSON,
  risk_appetite   ENUM('low','medium','high') DEFAULT 'medium',
  min_crs_score   DECIMAL(5,2) DEFAULT 0,
  website         VARCHAR(200),
  linkedin        VARCHAR(200),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 5. SME FINANCIAL DOCUMENTS ─────────────────────────────
-- Tracks uploaded financial docs per SME (used in CRS computation).
CREATE TABLE IF NOT EXISTS sme_documents (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  sme_id       INT NOT NULL,
  doc_type     ENUM('income_statement','balance_sheet','tax_clearance','cipa_certificate','bank_statement','business_plan','other') NOT NULL,
  filename     VARCHAR(300) NOT NULL,
  file_path    VARCHAR(300) NOT NULL,
  file_size    INT,
  uploaded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sme_id) REFERENCES sme_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 6. MATCHES ─────────────────────────────────────────────
-- Adapted from IAMS allocations table.
-- Links investors to entrepreneurs/SMEs with a computed score.
CREATE TABLE IF NOT EXISTS matches (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  investor_id     INT NOT NULL,
  target_id       INT NOT NULL,  -- entrepreneur_profiles.id OR sme_profiles.id
  target_type     ENUM('entrepreneur','sme') NOT NULL,
  match_score     DECIMAL(5,2),
  score_breakdown JSON,
  is_manual       BOOLEAN NOT NULL DEFAULT FALSE,
  status          ENUM('suggested','pending','accepted','rejected','closed') NOT NULL DEFAULT 'pending',
  requested_by    INT,           -- user_id of who initiated
  responded_at    DATETIME,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_investor_target (investor_id, target_id, target_type),
  FOREIGN KEY (investor_id)  REFERENCES investor_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── 7. DEALS ───────────────────────────────────────────────
-- Created when a match is accepted. Tracks the funding transaction lifecycle.
CREATE TABLE IF NOT EXISTS deals (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  match_id     INT NOT NULL UNIQUE,
  deal_type    ENUM('equity','debt','grant','bond','convertible_note','other') DEFAULT 'equity',
  amount       DECIMAL(15,2),
  currency     VARCHAR(10) DEFAULT 'BWP',
  stage        ENUM('intro','nda','due_diligence','term_sheet','closed','terminated') NOT NULL DEFAULT 'intro',
  stage_notes  TEXT,
  closed_at    DATETIME,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 8. DEAL DOCUMENTS ──────────────────────────────────────
-- Adapted from IAMS final_reports. Tracks all deal-room documents.
CREATE TABLE IF NOT EXISTS deal_documents (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  deal_id      INT NOT NULL,
  uploaded_by  INT NOT NULL,
  doc_type     ENUM('nda','term_sheet','financial_statement','pitch_deck','legal','other') DEFAULT 'other',
  filename     VARCHAR(300) NOT NULL,
  file_path    VARCHAR(300) NOT NULL,
  file_size    INT,
  access_roles JSON,             -- e.g. ["investor","entrepreneur","admin"]
  uploaded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id)     REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 9. PROGRESS LOGBOOKS ───────────────────────────────────
-- Reused directly from IAMS logbooks. Entrepreneur posts weekly progress.
CREATE TABLE IF NOT EXISTS logbooks (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,      -- entrepreneur user id
  deal_id       INT NOT NULL,
  week_number   TINYINT UNSIGNED NOT NULL,
  activities    TEXT NOT NULL,
  milestones    TEXT,
  challenges    TEXT,
  next_steps    TEXT,
  submitted_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_editable   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_deal_week (user_id, deal_id, week_number),
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id)  REFERENCES deals(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 10. LOGBOOK REVIEWS ────────────────────────────────────
-- Reused directly from IAMS logbook_reviews.
CREATE TABLE IF NOT EXISTS logbook_reviews (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  logbook_id    INT NOT NULL,
  reviewer_id   INT NOT NULL,
  reviewer_type ENUM('investor','admin') NOT NULL,
  comment       TEXT NOT NULL,
  reviewed_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (logbook_id)  REFERENCES logbooks(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 11. ASSESSMENTS ────────────────────────────────────────
-- Adapted from IAMS assessments. Investor formally rates entrepreneur/SME post-deal.
CREATE TABLE IF NOT EXISTS assessments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  deal_id         INT NOT NULL,
  reviewer_id     INT NOT NULL,
  criteria_json   JSON,
  total_score     DECIMAL(5,2),
  max_score       DECIMAL(5,2) DEFAULT 100,
  grade           VARCHAR(5),
  comments        TEXT,
  submitted_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_deal_reviewer (deal_id, reviewer_id),
  FOREIGN KEY (deal_id)     REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 12. BOND POOLS ─────────────────────────────────────────
-- New table — no IAMS equivalent. Admin creates pools of vetted SMEs.
CREATE TABLE IF NOT EXISTS bond_pools (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  pool_name     VARCHAR(200) NOT NULL,
  description   TEXT,
  sme_ids       JSON NOT NULL,       -- array of sme_profiles.id
  total_value   DECIMAL(15,2),
  currency      VARCHAR(10) DEFAULT 'BWP',
  bond_rating   VARCHAR(10),         -- e.g. 'BBB', 'A-'
  coupon_rate   DECIMAL(5,2),        -- annual interest rate %
  maturity_date DATE,
  bse_listed    BOOLEAN NOT NULL DEFAULT FALSE,
  bse_listed_at DATETIME,
  status        ENUM('draft','active','matured','closed') NOT NULL DEFAULT 'draft',
  created_by    INT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── 13. MESSAGES ───────────────────────────────────────────
-- New table. Real-time 1:1 messages between matched parties.
CREATE TABLE IF NOT EXISTS messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  thread_id   VARCHAR(64) NOT NULL,  -- match_id as thread identifier
  sender_id   INT NOT NULL,
  receiver_id INT NOT NULL,
  content     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 14. NOTIFICATIONS ──────────────────────────────────────
-- Reused directly from IAMS notifications.
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  title      VARCHAR(200) NOT NULL,
  message    TEXT NOT NULL,
  type       ENUM('info','warning','deadline','success','system','match','deal') NOT NULL DEFAULT 'info',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 15. WATCHLIST ──────────────────────────────────────────
-- Investors save profiles for later review.
CREATE TABLE IF NOT EXISTS watchlist (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  investor_id INT NOT NULL,
  target_id   INT NOT NULL,
  target_type ENUM('entrepreneur','sme') NOT NULL,
  saved_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_watchlist (investor_id, target_id, target_type),
  FOREIGN KEY (investor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 16. PASSWORD RESET TOKENS ──────────────────────────────
-- Reused directly from IAMS.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT         NOT NULL,
  token      VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME    NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 17. AUDIT LOGS ─────────────────────────────────────────
-- New table — admin action trail.
CREATE TABLE IF NOT EXISTS audit_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  actor_id     INT,
  action       VARCHAR(100) NOT NULL,
  target_table VARCHAR(100),
  target_id    INT,
  details      JSON,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════
--  Performance Indexes (same strategy as IAMS)
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_users_role           ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_role_active    ON users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_users_verified       ON users(is_verified, is_active);

CREATE INDEX IF NOT EXISTS idx_ent_sector_stage     ON entrepreneur_profiles(sector, stage);
CREATE INDEX IF NOT EXISTS idx_ent_crs              ON entrepreneur_profiles(crs_score);
CREATE INDEX IF NOT EXISTS idx_ent_published        ON entrepreneur_profiles(is_published);

CREATE INDEX IF NOT EXISTS idx_sme_status           ON sme_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_sme_industry         ON sme_profiles(industry);
CREATE INDEX IF NOT EXISTS idx_sme_crs              ON sme_profiles(crs_score);

CREATE INDEX IF NOT EXISTS idx_matches_status       ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_investor     ON matches(investor_id, status);

CREATE INDEX IF NOT EXISTS idx_deals_stage          ON deals(stage);

CREATE INDEX IF NOT EXISTS idx_messages_thread      ON messages(thread_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver    ON messages(receiver_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notif_user_read      ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_logbook_deal_week    ON logbooks(deal_id, week_number);

CREATE INDEX IF NOT EXISTS idx_prt_token            ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_audit_actor          ON audit_logs(actor_id, created_at);
