-- Seed default admin user (username: admin, password: admin1234)
INSERT INTO admin_users (username, password_hash, role)
VALUES ('admin', '$2a$10$xNaFxR/uvWhTOAlA8lyGwuenXRC92iVT3rg00aUspEni5IaxcNcjq', 'superadmin')
ON CONFLICT (username) DO NOTHING;
