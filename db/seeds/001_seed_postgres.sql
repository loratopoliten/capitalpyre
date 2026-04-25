-- Capital Pyre — Seed Data (PostgreSQL)
-- Default admin: admin@capitalpyre.com / Admin@1234
-- Run scripts/reset_admin.js after deploying to set a fresh hash

INSERT INTO users (firstname, lastname, email, password_hash, role, is_verified, is_active)
VALUES (
  'Capital', 'Admin', 'admin@capitalpyre.com',
  '$2a$12$KqFXpbNMBLZ7G6HI3pFbKuqV5sVdAT.R6CvNuPOZGqcYZJMb2oV3u',
  'admin', TRUE, TRUE
) ON CONFLICT (email) DO NOTHING;
