USE capitalpyre_db;

-- This script resets the admin password.
-- The hash below corresponds to: CapitalPyre@2026
-- After running this, log in with: admin@capitalpyre.com / CapitalPyre@2026
-- Then change your password immediately.

UPDATE users 
SET password_hash = '$2a$12$KqFXpbNMBLZ7G6HI3pFbKuqV5sVdAT.R6CvNuPOZGqcYZJMb2oV3u'
WHERE email = 'admin@capitalpyre.com';

-- Confirm it worked
SELECT id, email, role, is_verified, is_active FROM users WHERE email = 'admin@capitalpyre.com';
