-- ================================================
-- MATCHCOTA - SEED DATA
-- ================================================
-- Script per omplir la BD amb dades de prova
--
-- Ús:
--   docker-compose exec db psql -U postgres -d matchcota -f /seed-data.sql
--
--   O des de l'host (si tens psql):
--   psql -h localhost -U postgres -d matchcota -f infrastructure/scripts/seed-data.sql
--
-- IMPORTANTE: Aquest script és idempotent (es pot executar múltiples vegades)
-- ================================================

BEGIN;

-- Activar extensió per generar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- 1. TENANTS (Protectores)
-- ================================================

-- Tenant 1: Demo (per testing general)
INSERT INTO tenants (id, slug, name, email, phone, city, postal_code, address, website, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'demo',
    'Protectora Demo',
    'info@demo.matchcota.tech',
    '933123456',
    'Barcelona',
    '08001',
    'Carrer de Prova, 123',
    'https://demo.matchcota.tech',
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = NOW();

-- Tenant 2: Barcelona
INSERT INTO tenants (id, slug, name, email, phone, city, postal_code, address, website, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'protectora-barcelona',
    'Protectora d''Animals de Barcelona',
    'info@protectorabcn.cat',
    '934567890',
    'Barcelona',
    '08025',
    'Carrer dels Animals, 45',
    'https://protectorabcn.cat',
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = NOW();

-- Tenant 3: Girona
INSERT INTO tenants (id, slug, name, email, phone, city, postal_code, address, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'protectora-girona',
    'Protectora d''Animals de Girona',
    'info@protectoragirona.cat',
    '972123456',
    'Girona',
    '17001',
    'Plaça Major, 10',
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = NOW();

-- ================================================
-- 2. USERS (Empleats de les protectores)
-- ================================================
-- Password per tots: "admin123"
-- Hash generat amb bcrypt 4.1.3 (compatible amb passlib 1.7.4)
-- NOTA: Aquest hash és per TESTING només. En producció usar hash diferent per cada user.

DO $$
DECLARE
    tenant_demo_id UUID;
    tenant_bcn_id UUID;
    tenant_girona_id UUID;
BEGIN
    -- Obtenir IDs dels tenants
    SELECT id INTO tenant_demo_id FROM tenants WHERE slug = 'demo';
    SELECT id INTO tenant_bcn_id FROM tenants WHERE slug = 'protectora-barcelona';
    SELECT id INTO tenant_girona_id FROM tenants WHERE slug = 'protectora-girona';

    -- Users per tenant DEMO
    INSERT INTO users (id, tenant_id, username, email, name, password_hash, created_at, updated_at)
    VALUES
        (gen_random_uuid(), tenant_demo_id, 'admin', 'admin@demo.com', 'Admin Demo', '$2b$12$S8zeJmjmzrfVCdEcLsQDvOTOvr21BSpbM0W03TSefJsnX2z4lr.Um', NOW(), NOW()),
        (gen_random_uuid(), tenant_demo_id, 'maria', 'maria@demo.com', 'Maria Garcia', '$2b$12$S8zeJmjmzrfVCdEcLsQDvOTOvr21BSpbM0W03TSefJsnX2z4lr.Um', NOW(), NOW()),
        (gen_random_uuid(), tenant_demo_id, 'jordi', 'jordi@demo.com', 'Jordi Puig', '$2b$12$S8zeJmjmzrfVCdEcLsQDvOTOvr21BSpbM0W03TSefJsnX2z4lr.Um', NOW(), NOW())
    ON CONFLICT (username) DO NOTHING;

    -- Users per tenant BARCELONA
    INSERT INTO users (id, tenant_id, username, email, name, password_hash, created_at, updated_at)
    VALUES
        (gen_random_uuid(), tenant_bcn_id, 'admin-bcn', 'admin@protectorabcn.cat', 'Anna Martínez', '$2b$12$S8zeJmjmzrfVCdEcLsQDvOTOvr21BSpbM0W03TSefJsnX2z4lr.Um', NOW(), NOW()),
        (gen_random_uuid(), tenant_bcn_id, 'veterinari', 'vet@protectorabcn.cat', 'Dr. Marc López', '$2b$12$S8zeJmjmzrfVCdEcLsQDvOTOvr21BSpbM0W03TSefJsnX2z4lr.Um', NOW(), NOW())
    ON CONFLICT (username) DO NOTHING;

    -- Users per tenant GIRONA
    INSERT INTO users (id, tenant_id, username, email, name, password_hash, created_at, updated_at)
    VALUES
        (gen_random_uuid(), tenant_girona_id, 'admin-girona', 'admin@protectoragirona.cat', 'Laura Serra', '$2b$12$S8zeJmjmzrfVCdEcLsQDvOTOvr21BSpbM0W03TSefJsnX2z4lr.Um', NOW(), NOW())
    ON CONFLICT (username) DO NOTHING;

END $$;

-- ================================================
-- 3. ANIMALS
-- ================================================

DO $$
DECLARE
    tenant_demo_id UUID;
    tenant_bcn_id UUID;
BEGIN
    SELECT id INTO tenant_demo_id FROM tenants WHERE slug = 'demo';
    SELECT id INTO tenant_bcn_id FROM tenants WHERE slug = 'protectora-barcelona';

    -- Animals per tenant DEMO
    INSERT INTO animals (
        id, tenant_id, name, species, breed, sex, birth_date,
        size, weight_kg, microchip_number, description, medical_conditions,
        energy_level, sociability, attention_needs,
        good_with_children, good_with_dogs, good_with_cats, experience_required,
        photo_urls, created_at, updated_at
    )
    VALUES
        -- Luna - Gossa ideal per famílies
        (
            gen_random_uuid(), tenant_demo_id, 'Luna', 'dog', 'Golden Retriever', 'female',
            '2020-03-15', 'large', 28.5, 'ES981234567890123',
            'Luna és una gossa molt afectuosa i tranquil·la. Perfecte per famílies amb nens. Li encanta jugar i passejar.',
            NULL,
            7.0, 9.0, 6.0, 10.0, 9.0, 8.0, 3.0,
            ARRAY['https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800'],
            NOW(), NOW()
        ),

        -- Max - Gos actiu
        (
            gen_random_uuid(), tenant_demo_id, 'Max', 'dog', 'Border Collie', 'male',
            '2019-07-22', 'medium', 18.2, 'ES981234567890124',
            'Max és un gos molt intel·ligent i actiu. Necessita molt exercici diari i estimulació mental. Ideal per gent esportista.',
            NULL,
            10.0, 8.0, 9.0, 7.0, 8.0, 6.0, 7.0,
            ARRAY['https://images.unsplash.com/photo-1568572933382-74d440642117?w=800'],
            NOW(), NOW()
        ),

        -- Mia - Gata tranquil·la
        (
            gen_random_uuid(), tenant_demo_id, 'Mia', 'cat', 'Mestís', 'female',
            '2021-05-10', 'small', 3.8, 'ES981234567890125',
            'Mia és una gata molt independent i tranquil·la. Li agrada estar tranquil·la i mirar per la finestra. Perfecte per apartament.',
            NULL,
            3.0, 6.0, 2.0, 8.0, 5.0, 9.0, 2.0,
            ARRAY['https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800'],
            NOW(), NOW()
        ),

        -- Rocky - Gos amb energia
        (
            gen_random_uuid(), tenant_demo_id, 'Rocky', 'dog', 'Pastor Alemany', 'male',
            '2018-11-03', 'large', 35.0, 'ES981234567890126',
            'Rocky és un gos protector i lleial. Ha tingut experiència amb nens i és molt obedient. Necessita espai i exercici.',
            'Displàsia lleu de maluc controlada amb medicació',
            8.0, 7.0, 8.0, 6.0, 6.0, 5.0, 8.0,
            ARRAY['https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=800'],
            NOW(), NOW()
        ),

        -- Nala - Gossa senior
        (
            gen_random_uuid(), tenant_demo_id, 'Nala', 'dog', 'Labrador Retriever', 'female',
            '2014-02-18', 'large', 26.0, 'ES981234567890127',
            'Nala és una gossa senior molt dolça i tranquil·la. Busca una llar on pugui passar els seus últims anys amb tranquil·litat i amor.',
            'Artrosi en articulacions posteriors',
            3.0, 9.0, 5.0, 10.0, 8.0, 9.0, 2.0,
            ARRAY['https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800'],
            NOW(), NOW()
        ),

        -- Simba - Gat jove
        (
            gen_random_uuid(), tenant_demo_id, 'Simba', 'cat', 'Europeu', 'male',
            '2022-08-20', 'small', 4.2, 'ES981234567890128',
            'Simba és un gat jove i juganet. Li encanta perseguir joguines i explorar. Seria feliç en una casa amb jardí.',
            NULL,
            8.0, 7.0, 6.0, 7.0, 6.0, 8.0, 3.0,
            ARRAY['https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=800'],
            NOW(), NOW()
        ),

        -- Bella - Gossa PPP
        (
            gen_random_uuid(), tenant_demo_id, 'Bella', 'dog', 'American Staffordshire Terrier', 'female',
            '2020-09-12', 'medium', 22.0, 'ES981234567890129',
            'Bella és una gossa molt dolça malgrat la seva aparença. És sociable i li encanten els nens. Necessita adoptant amb llicència PPP.',
            NULL,
            7.0, 9.0, 7.0, 9.0, 7.0, 6.0, 6.0,
            ARRAY['https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800'],
            NOW(), NOW()
        ),

        -- Toby - Gos petit
        (
            gen_random_uuid(), tenant_demo_id, 'Toby', 'dog', 'Jack Russell Terrier', 'male',
            '2021-01-30', 'small', 6.5, 'ES981234567890130',
            'Toby és un gos petit però amb molta energia. És perfecte per a un apartament si té passejades regulars. Molt intel·ligent.',
            NULL,
            9.0, 8.0, 7.0, 6.0, 7.0, 5.0, 5.0,
            ARRAY['https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=800'],
            NOW(), NOW()
        );

    -- Animals per tenant BARCELONA
    INSERT INTO animals (
        id, tenant_id, name, species, breed, sex, birth_date,
        size, weight_kg, description,
        energy_level, sociability, attention_needs,
        good_with_children, good_with_dogs, good_with_cats,
        created_at, updated_at
    )
    VALUES
        (
            gen_random_uuid(), tenant_bcn_id, 'Rex', 'dog', 'Mestís', 'male',
            '2019-06-15', 'medium', 15.0,
            'Gos trobat al carrer, molt sociable',
            8.0, 9.0, 6.0, 8.0, 9.0, 7.0,
            NOW(), NOW()
        ),
        (
            gen_random_uuid(), tenant_bcn_id, 'Nina', 'cat', 'Siamès', 'female',
            '2020-04-20', 'small', 3.5,
            'Gata elegant i independent',
            5.0, 7.0, 4.0, 6.0, 5.0, 8.0,
            NOW(), NOW()
        );

END $$;

-- ================================================
-- 4. QUESTIONNAIRES (opcional)
-- ================================================

DO $$
DECLARE
    tenant_demo_id UUID;
BEGIN
    SELECT id INTO tenant_demo_id FROM tenants WHERE slug = 'demo';

    INSERT INTO questionnaires (id, tenant_id, questions, answer_weights, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        tenant_demo_id,
        '{
            "questions": [
                {"id": 1, "text": "Tens experiència amb gossos?", "type": "multiple_choice", "options": ["No", "Poca", "Sí, molta"]},
                {"id": 2, "text": "Tens nens a casa?", "type": "boolean"},
                {"id": 3, "text": "Quant temps pots dedicar a passejar cada dia?", "type": "multiple_choice", "options": ["<30min", "30-60min", ">60min"]}
            ]
        }'::jsonb,
        '{
            "weights": {
                "1": [0, 0.5, 1],
                "2": [0, 1],
                "3": [0.3, 0.7, 1]
            }
        }'::jsonb,
        NOW(),
        NOW()
    )
    ON CONFLICT DO NOTHING;

END $$;

COMMIT;

-- ================================================
-- VERIFICACIÓ
-- ================================================

-- Mostrar resum de dades creades
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'SEED DATA COMPLETAT';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Tenants creats: %', (SELECT COUNT(*) FROM tenants);
    RAISE NOTICE 'Users creats: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Animals creats: %', (SELECT COUNT(*) FROM animals);
    RAISE NOTICE 'Questionnaires creats: %', (SELECT COUNT(*) FROM questionnaires);
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'CREDENCIALS DE TEST:';
    RAISE NOTICE '  Tenant: demo';
    RAISE NOTICE '  Users:';
    RAISE NOTICE '    - admin@demo.com / admin123';
    RAISE NOTICE '    - maria@demo.com / admin123';
    RAISE NOTICE '    - jordi@demo.com / admin123';
    RAISE NOTICE '';
    RAISE NOTICE 'PROVAR AMB:';
    RAISE NOTICE '  curl -H "X-Tenant-Slug: demo" http://localhost:8000/api/v1/tenant/current';
    RAISE NOTICE '  curl -H "X-Tenant-Slug: demo" http://localhost:8000/api/v1/animals';
    RAISE NOTICE '================================================';
END $$;
