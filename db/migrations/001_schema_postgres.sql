-- ════════════════════════════════════════════════════════════
--  Capital Pyre — PostgreSQL Schema
--  Converted from MySQL for Supabase deployment
-- ════════════════════════════════════════════════════════════

-- ENUMs
CREATE TYPE user_role        AS ENUM ('entrepreneur','sme','investor','admin');
CREATE TYPE stage_type       AS ENUM ('idea','pre-seed','seed','series-a','growth');
CREATE TYPE revenue_band     AS ENUM ('under-100k','100k-500k','500k-1m','1m-5m','above-5m');
CREATE TYPE approval_status  AS ENUM ('pending','approved','rejected');
CREATE TYPE investor_type    AS ENUM ('angel','vc','institutional','corporate');
CREATE TYPE risk_appetite    AS ENUM ('low','medium','high');
CREATE TYPE match_status     AS ENUM ('suggested','pending','accepted','rejected','closed');
CREATE TYPE deal_type        AS ENUM ('equity','debt','grant','bond','convertible_note','other');
CREATE TYPE deal_stage       AS ENUM ('intro','nda','due_diligence','term_sheet','closed','terminated');
CREATE TYPE doc_type_sme     AS ENUM ('income_statement','balance_sheet','tax_clearance','cipa_certificate','bank_statement','business_plan','other');
CREATE TYPE deal_doc_type    AS ENUM ('nda','term_sheet','financial_statement','pitch_deck','legal','other');
CREATE TYPE notif_type       AS ENUM ('info','warning','deadline','success','system','match','deal');
CREATE TYPE bond_status      AS ENUM ('draft','active','matured','closed');
CREATE TYPE pass_reason_type AS ENUM ('too_early','wrong_sector','crs_below_threshold','documentation_insufficient','ticket_size_mismatch','already_funded','no_longer_available','other');
CREATE TYPE funding_timeline AS ENUM ('immediate','1-3months','3-6months','6-12months','exploring');
CREATE TYPE crs_role         AS ENUM ('entrepreneur','sme');
CREATE TYPE deal_event_type  AS ENUM ('created','stage_advanced','stage_note_added','document_uploaded','marked_inactive','reopened','deadline_extended','closed','terminated');
CREATE TYPE reviewer_type    AS ENUM ('investor','admin');
CREATE TYPE target_type      AS ENUM ('entrepreneur','sme');

-- ── 1. USERS
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  firstname       VARCHAR(80)  NOT NULL,
  lastname        VARCHAR(80)  NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            user_role    NOT NULL,
  phone           VARCHAR(20),
  nationality     VARCHAR(80),
  date_of_birth   DATE,
  avatar_path     VARCHAR(300),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. ENTREPRENEUR PROFILES
CREATE TABLE entrepreneur_profiles (
  id                  SERIAL PRIMARY KEY,
  user_id             INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name       VARCHAR(200) NOT NULL,
  sector              VARCHAR(100),
  stage               stage_type DEFAULT 'idea',
  pitch_summary       TEXT,
  pitch_video_url     VARCHAR(500),
  problem_statement   TEXT,
  solution            TEXT,
  market_size         VARCHAR(200),
  revenue_model       TEXT,
  traction            TEXT,
  funding_ask         DECIMAL(15,2),
  funding_timeline    funding_timeline DEFAULT 'exploring',
  currency            VARCHAR(10) DEFAULT 'BWP',
  pitch_deck_path     VARCHAR(300),
  website             VARCHAR(200),
  linkedin            VARCHAR(200),
  crs_score           DECIMAL(5,2) DEFAULT 0,
  crs_breakdown       JSONB,
  crs_computed_at     TIMESTAMPTZ,
  is_published        BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. SME PROFILES
CREATE TABLE sme_profiles (
  id                  SERIAL PRIMARY KEY,
  user_id             INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name       VARCHAR(200) NOT NULL,
  cipa_reg_no         VARCHAR(100),
  industry            VARCHAR(100),
  address             VARCHAR(300),
  website             VARCHAR(200),
  description         TEXT,
  year_established    INT,
  employee_count      SMALLINT DEFAULT 1,
  revenue_band        revenue_band,
  required_skills     TEXT,
  funding_ask         DECIMAL(15,2),
  currency            VARCHAR(10) DEFAULT 'BWP',
  crs_score           DECIMAL(5,2) DEFAULT 0,
  crs_breakdown       JSONB,
  crs_computed_at     TIMESTAMPTZ,
  approval_status     approval_status NOT NULL DEFAULT 'pending',
  approved_by         INT REFERENCES users(id) ON DELETE SET NULL,
  approved_at         TIMESTAMPTZ,
  is_published        BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. INVESTOR PROFILES
CREATE TABLE investor_profiles (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  investor_type   investor_type NOT NULL DEFAULT 'angel',
  firm_name       VARCHAR(200),
  bio             TEXT,
  min_ticket      DECIMAL(15,2),
  max_ticket      DECIMAL(15,2),
  currency        VARCHAR(10) DEFAULT 'BWP',
  sectors         JSONB,
  preferred_stage JSONB,
  risk_appetite   risk_appetite DEFAULT 'medium',
  min_crs_score   DECIMAL(5,2) DEFAULT 0,
  website         VARCHAR(200),
  linkedin        VARCHAR(200),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. SME DOCUMENTS
CREATE TABLE sme_documents (
  id           SERIAL PRIMARY KEY,
  sme_id       INT NOT NULL REFERENCES sme_profiles(id) ON DELETE CASCADE,
  doc_type     doc_type_sme NOT NULL,
  filename     VARCHAR(300) NOT NULL,
  file_path    VARCHAR(300) NOT NULL,
  file_size    INT,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. MATCHES
CREATE TABLE matches (
  id              SERIAL PRIMARY KEY,
  investor_id     INT NOT NULL REFERENCES investor_profiles(id) ON DELETE CASCADE,
  target_id       INT NOT NULL,
  target_type     target_type NOT NULL,
  match_score     DECIMAL(5,2),
  score_breakdown JSONB,
  is_manual       BOOLEAN NOT NULL DEFAULT FALSE,
  status          match_status NOT NULL DEFAULT 'pending',
  requested_by    INT REFERENCES users(id) ON DELETE SET NULL,
  pass_reason     pass_reason_type,
  pass_note       VARCHAR(300),
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (investor_id, target_id, target_type)
);

-- ── 7. DEALS
CREATE TABLE deals (
  id               SERIAL PRIMARY KEY,
  match_id         INT NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  deal_type        deal_type DEFAULT 'equity',
  amount           DECIMAL(15,2),
  currency         VARCHAR(10) DEFAULT 'BWP',
  stage            deal_stage NOT NULL DEFAULT 'intro',
  stage_notes      TEXT,
  deadline_at      TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 8. DEAL DOCUMENTS
CREATE TABLE deal_documents (
  id           SERIAL PRIMARY KEY,
  deal_id      INT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  uploaded_by  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type     deal_doc_type DEFAULT 'other',
  filename     VARCHAR(300) NOT NULL,
  file_path    VARCHAR(300) NOT NULL,
  file_size    INT,
  access_roles JSONB,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. LOGBOOKS
CREATE TABLE logbooks (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id       INT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  week_number   SMALLINT NOT NULL,
  activities    TEXT NOT NULL,
  milestones    TEXT,
  challenges    TEXT,
  next_steps    TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_editable   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, deal_id, week_number)
);

-- ── 10. LOGBOOK REVIEWS
CREATE TABLE logbook_reviews (
  id            SERIAL PRIMARY KEY,
  logbook_id    INT NOT NULL REFERENCES logbooks(id) ON DELETE CASCADE,
  reviewer_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_type reviewer_type NOT NULL,
  comment       TEXT NOT NULL,
  reviewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 11. ASSESSMENTS
CREATE TABLE assessments (
  id              SERIAL PRIMARY KEY,
  deal_id         INT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  reviewer_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  criteria_json   JSONB,
  total_score     DECIMAL(5,2),
  max_score       DECIMAL(5,2) DEFAULT 100,
  grade           VARCHAR(5),
  comments        TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (deal_id, reviewer_id)
);

-- ── 12. BOND POOLS
CREATE TABLE bond_pools (
  id            SERIAL PRIMARY KEY,
  pool_name     VARCHAR(200) NOT NULL,
  description   TEXT,
  sme_ids       JSONB NOT NULL,
  total_value   DECIMAL(15,2),
  currency      VARCHAR(10) DEFAULT 'BWP',
  bond_rating   VARCHAR(10),
  coupon_rate   DECIMAL(5,2),
  maturity_date DATE,
  bse_listed    BOOLEAN NOT NULL DEFAULT FALSE,
  bse_listed_at TIMESTAMPTZ,
  status        bond_status NOT NULL DEFAULT 'draft',
  created_by    INT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 13. MESSAGES
CREATE TABLE messages (
  id          SERIAL PRIMARY KEY,
  thread_id   VARCHAR(64) NOT NULL,
  sender_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 14. NOTIFICATIONS
CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  message    TEXT NOT NULL,
  type       notif_type NOT NULL DEFAULT 'info',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 15. WATCHLIST
CREATE TABLE watchlist (
  id          SERIAL PRIMARY KEY,
  investor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id   INT NOT NULL,
  target_type target_type NOT NULL,
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (investor_id, target_id, target_type)
);

-- ── 16. PASSWORD RESET TOKENS
CREATE TABLE password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 17. AUDIT LOGS
CREATE TABLE audit_logs (
  id           SERIAL PRIMARY KEY,
  actor_id     INT REFERENCES users(id) ON DELETE SET NULL,
  action       VARCHAR(100) NOT NULL,
  target_table VARCHAR(100),
  target_id    INT,
  details      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 18. CRS HISTORY
CREATE TABLE crs_history (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        crs_role NOT NULL,
  crs_score   DECIMAL(5,2) NOT NULL,
  breakdown   JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 19. DEAL EVENTS
CREATE TABLE deal_events (
  id         SERIAL PRIMARY KEY,
  deal_id    INT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  actor_id   INT REFERENCES users(id) ON DELETE SET NULL,
  event_type deal_event_type NOT NULL,
  stage_from VARCHAR(30),
  stage_to   VARCHAR(30),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 20. RATINGS
CREATE TABLE ratings (
  id             SERIAL PRIMARY KEY,
  rater_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ratee_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id       INT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  responsiveness SMALLINT CHECK (responsiveness BETWEEN 1 AND 5),
  clarity        SMALLINT CHECK (clarity        BETWEEN 1 AND 5),
  preparedness   SMALLINT CHECK (preparedness   BETWEEN 1 AND 5),
  seriousness    SMALLINT CHECK (seriousness    BETWEEN 1 AND 5),
  communication  SMALLINT CHECK (communication  BETWEEN 1 AND 5),
  follow_through SMALLINT CHECK (follow_through BETWEEN 1 AND 5),
  comment        TEXT,
  rated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rater_id, match_id)
);

-- ── INDEXES
CREATE INDEX idx_users_role          ON users(role);
CREATE INDEX idx_users_role_active   ON users(role, is_active);
CREATE INDEX idx_ent_crs             ON entrepreneur_profiles(crs_score);
CREATE INDEX idx_ent_published       ON entrepreneur_profiles(is_published);
CREATE INDEX idx_sme_status          ON sme_profiles(approval_status);
CREATE INDEX idx_sme_crs             ON sme_profiles(crs_score);
CREATE INDEX idx_matches_status      ON matches(status);
CREATE INDEX idx_matches_investor    ON matches(investor_id, status);
CREATE INDEX idx_deals_stage         ON deals(stage);
CREATE INDEX idx_messages_thread     ON messages(thread_id, sent_at);
CREATE INDEX idx_notif_user_read     ON notifications(user_id, is_read);
CREATE INDEX idx_crs_history_user    ON crs_history(user_id, computed_at);
CREATE INDEX idx_deal_events_deal    ON deal_events(deal_id, created_at);
CREATE INDEX idx_ratings_ratee       ON ratings(ratee_id, rated_at);

-- ── updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'users','entrepreneur_profiles','sme_profiles','investor_profiles',
    'deals','assessments','bond_pools','logbooks'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END $$;
