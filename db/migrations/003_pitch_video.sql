USE capitalpyre_db;
ALTER TABLE entrepreneur_profiles
  ADD COLUMN IF NOT EXISTS pitch_video_url VARCHAR(500) NULL AFTER pitch_summary;

-- Also add funding_timeline if not already there (from 002)
ALTER TABLE entrepreneur_profiles
  MODIFY COLUMN funding_timeline ENUM('immediate','1-3months','3-6months','6-12months','exploring') DEFAULT 'exploring';
