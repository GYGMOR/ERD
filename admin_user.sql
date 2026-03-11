-- 1. Sicherstellen, dass die nötige Extension für Passwort-Hashing aktiviert ist
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Einen neuen Mandanten (Tenant) für Vierkorken erstellen und die ID speichern
DO $$ 
DECLARE
    new_tenant_id UUID;
BEGIN
    INSERT INTO tenants (name, domain) 
    VALUES ('Vierkorken', 'vierkorken.ch') 
    RETURNING id INTO new_tenant_id;

    -- 3. Den Admin-Benutzer für diesen Mandanten anlegen
    INSERT INTO users (
        tenant_id, 
        email, 
        password_hash, 
        first_name, 
        last_name, 
        role, 
        is_active
    ) VALUES (
        new_tenant_id, 
        'admin@vierkorken.ch', 
        crypt('Init1234!', gen_salt('bf')), -- Passwort wird sicher als bcrypt Hash gespeichert
        'Admin', 
        'Vierkorken', 
        'admin', 
        true
    );
END $$;
