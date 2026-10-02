-- =============================================================
-- Portal de Pasantías y Búsqueda Laboral Estudiantil
-- DML — initial catalog data + demo data for development
-- Run after schema.sql:  psql "$DATABASE_URL" -f database/seed.sql
--
-- Demo accounts (password for all: Password123!):
--   admin@pasantias.dev      ADMIN
--   rrhh@techsur.dev         EMPLOYER  (TechSur S.A.)
--   talento@datacorp.dev     EMPLOYER  (DataCorp SRL)
--   ana.gomez@alumnos.dev    STUDENT
--   lucas.perez@alumnos.dev  STUDENT
-- =============================================================

BEGIN;

-- bcrypt hashes generated in the DB ($2a$, compatible with the bcrypt npm package)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Catalogs ────────────────────────────────────────────────

INSERT INTO categories (id, name, slug) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Desarrollo de Software', 'desarrollo-de-software'),
  ('10000000-0000-0000-0000-000000000002', 'Datos y Analítica',      'datos-y-analitica'),
  ('10000000-0000-0000-0000-000000000003', 'Infraestructura y DevOps', 'infraestructura-y-devops'),
  ('10000000-0000-0000-0000-000000000004', 'Diseño UX/UI',           'diseno-ux-ui'),
  ('10000000-0000-0000-0000-000000000005', 'Soporte Técnico',        'soporte-tecnico'),
  ('10000000-0000-0000-0000-000000000006', 'QA y Testing',           'qa-y-testing');

INSERT INTO tags (id, name, slug) VALUES
  ('20000000-0000-0000-0000-000000000001', 'JavaScript', 'javascript'),
  ('20000000-0000-0000-0000-000000000002', 'TypeScript', 'typescript'),
  ('20000000-0000-0000-0000-000000000003', 'React',      'react'),
  ('20000000-0000-0000-0000-000000000004', 'Node.js',    'nodejs'),
  ('20000000-0000-0000-0000-000000000005', 'Python',     'python'),
  ('20000000-0000-0000-0000-000000000006', 'SQL',        'sql'),
  ('20000000-0000-0000-0000-000000000007', 'Java',       'java'),
  ('20000000-0000-0000-0000-000000000008', 'Docker',     'docker'),
  ('20000000-0000-0000-0000-000000000009', 'Figma',      'figma'),
  ('20000000-0000-0000-0000-000000000010', 'Inglés',     'ingles');

-- ─── Users ───────────────────────────────────────────────────

-- Demo accounts are created already verified (email_verified_at), since their
-- addresses are not real mailboxes.
INSERT INTO users (id, email, password_hash, role, email_verified_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@pasantias.dev',     crypt('Password123!', gen_salt('bf', 10)), 'ADMIN', now()),
  ('00000000-0000-0000-0000-000000000002', 'rrhh@techsur.dev',        crypt('Password123!', gen_salt('bf', 10)), 'EMPLOYER', now()),
  ('00000000-0000-0000-0000-000000000003', 'talento@datacorp.dev',    crypt('Password123!', gen_salt('bf', 10)), 'EMPLOYER', now()),
  ('00000000-0000-0000-0000-000000000004', 'ana.gomez@alumnos.dev',   crypt('Password123!', gen_salt('bf', 10)), 'STUDENT', now()),
  ('00000000-0000-0000-0000-000000000005', 'lucas.perez@alumnos.dev', crypt('Password123!', gen_salt('bf', 10)), 'STUDENT', now());

INSERT INTO companies (id, user_id, name, cuit, industry, description, website, province, city) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'TechSur S.A.', '30-71234567-8', 'Software',
   'Consultora de desarrollo de software a medida.', 'https://techsur.example.com', 'Mendoza', 'Mendoza'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   'DataCorp SRL', '30-79876543-2', 'Analítica de datos',
   'Soluciones de business intelligence para pymes.', 'https://datacorp.example.com', 'Córdoba', 'Córdoba');

INSERT INTO student_profiles (id, user_id, first_name, last_name, phone, career, institution, study_year, province, city, bio) VALUES
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004',
   'Ana', 'Gómez', '+54 261 555-0101', 'Tecnicatura en Programación', 'UTN', 2, 'Mendoza', 'Mendoza',
   'Estudiante de programación interesada en desarrollo frontend.'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005',
   'Lucas', 'Pérez', '+54 351 555-0202', 'Tecnicatura en Programación', 'UTN', 1, 'Córdoba', 'Córdoba',
   'Me interesan los datos y el backend.');

-- ─── Offers ──────────────────────────────────────────────────

INSERT INTO job_offers (id, company_id, category_id, title, description, requirements, type, modality, workload, province, city, vacancies, deadline) VALUES
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Pasante Desarrollador Frontend', 'Participarás en el desarrollo de interfaces web con React.',
   'Conocimientos de HTML, CSS, JavaScript y nociones de React.',
   'INTERNSHIP', 'HYBRID', 'PART_TIME', 'Mendoza', 'Mendoza', 2, CURRENT_DATE + 30),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Desarrollador Backend Junior (Node.js)', 'Desarrollo y mantenimiento de APIs REST.',
   'Node.js, TypeScript y bases de datos relacionales.',
   'JOB', 'REMOTE', 'FULL_TIME', NULL, NULL, 1, CURRENT_DATE + 45),
  ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   'Pasante Analista de Datos', 'Soporte al equipo de BI en la construcción de reportes.',
   'SQL básico y manejo de planillas de cálculo.',
   'INTERNSHIP', 'ON_SITE', 'PART_TIME', 'Córdoba', 'Córdoba', 1, CURRENT_DATE + 20);

UPDATE job_offers SET salary_min = 900000, salary_max = 1200000
 WHERE id = '50000000-0000-0000-0000-000000000002';

INSERT INTO job_offer_tags (offer_id, tag_id) VALUES
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003'),
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004'),
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006'),
  ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005'),
  ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006');

-- ─── Applications, messages and notifications ───────────────

INSERT INTO applications (id, offer_id, student_id, status, cover_letter, reviewed_at) VALUES
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   'ACCEPTED', 'Me gustaría sumarme al equipo de frontend.', now()),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002',
   'PENDING', 'Tengo experiencia con SQL en proyectos de la facultad.', NULL);

INSERT INTO messages (application_id, sender_id, body) VALUES
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   '¡Hola Ana! Queremos coordinar una entrevista. ¿Tenés disponibilidad esta semana?'),
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004',
   '¡Hola! Sí, el jueves por la tarde me queda bien.');

INSERT INTO notifications (user_id, type, title, body, link) VALUES
  ('00000000-0000-0000-0000-000000000004', 'APPLICATION_STATUS_CHANGED',
   'Tu postulación fue aceptada', 'TechSur S.A. aceptó tu postulación a "Pasante Desarrollador Frontend".',
   '/postulaciones/60000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', 'APPLICATION_RECEIVED',
   'Nueva postulación', 'Lucas Pérez se postuló a "Pasante Analista de Datos".',
   '/ofertas/50000000-0000-0000-0000-000000000003/postulantes');

COMMIT;
