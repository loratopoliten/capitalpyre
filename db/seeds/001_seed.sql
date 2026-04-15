-- ════════════════════════════════════════════════════════════
--  Capital Pyre — Seed Data
--  Default admin user (password: Admin@1234)
--  Change password immediately after first login.
-- ════════════════════════════════════════════════════════════

USE capitalpyre_db;

INSERT IGNORE INTO users (firstname, lastname, email, password_hash, role, is_verified, is_active)
VALUES (
  'Capital',
  'Admin',
  'admin@capitalpyre.com',
  '$2a$12$KqFXpbNMBLZ7G6HI3pFbKuqV5sVdAT.R6CvNuPOZGqcYZJMb2oV3u',
  'admin',
  TRUE,
  TRUE
);
