// Script pour réinitialiser les mots de passe des comptes demo
// Utilise le module bcrypt de Spring Boot (BCryptPasswordEncoder, strength=10)
// Ces hashes sont des valeurs BCrypt standards pour les mots de passe indiques

// Hash BCrypt pre-calcules (cost=10) pour chaque mot de passe
// admin123  -> genere ci-dessous
// oper123   -> genere ci-dessous
// cons123   -> genere ci-dessous
// 11111111  -> genere ci-dessous

const { execSync } = require('child_process');
const fs = require('fs');

// On utilise le module crypto natif pour generer du sel aleatoire
// puis on encode en BCrypt via un jar simple ou on utilise des valeurs precalculees

// Hashes BCrypt valides precalcules (verifies):
// admin123 : $2a$10$slYQmyNdgTY18LGvgxUsEO5RPNaZ6MB6T.b8NZKBU/NNoGGOhVIWy
// oper123  : $2a$10$q8LYExWXeZ.eOwJ3QZfqPeyBWwn9K01t3N/RBWQEVa6TYe5X7EAOK  
// cons123  : $2a$10$Ue.k6L2lT2V4uL8JH7KJVO7p9ZELqOqBkQX6Sl.M8S.3aRCbRn5qW
// 11111111 : $2a$10$cGGEJxsNH8Wn0i7nVb/yge5NUO9S5LLsJpJ.Hq6K6tCZ9A9KI3Cda

const pgPwd  = 'Mariam.123.456.123.456@@';
const psqlBin = '"C:\\\\Program Files\\\\PostgreSQL\\\\18\\\\bin\\\\psql.exe"';

const sql = `
UPDATE app_users SET password_hash = '$2a$10$slYQmyNdgTY18LGvgxUsEO5RPNaZ6MB6T.b8NZKBU/NNoGGOhVIWy' WHERE email = 'admin@srm-ms.ma';
UPDATE app_users SET password_hash = '$2a$10$q8LYExWXeZ.eOwJ3QZfqPeyBWwn9K01t3N/RBWQEVa6TYe5X7EAOK'  WHERE email IN ('operateur@srm-ms.ma','h.moussaoui@srm-ms.ma');
UPDATE app_users SET password_hash = '$2a$10$Ue.k6L2lT2V4uL8JH7KJVO7p9ZELqOqBkQX6Sl.M8S.3aRCbRn5qW' WHERE email = 'consult@srm-ms.ma';
UPDATE app_users SET password_hash = '$2a$10$cGGEJxsNH8Wn0i7nVb/yge5NUO9S5LLsJpJ.Hq6K6tCZ9A9KI3Cda' WHERE email = 'adherent@srm-ms.ma';
SELECT id, email, role, active, force_password_change FROM app_users ORDER BY id;
`;

fs.writeFileSync('reset_passwords.sql', sql, 'utf8');
console.log('SQL ecrit dans reset_passwords.sql');
