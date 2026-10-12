-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "data" JSONB;

-- The seed's notifications linked to routes of an earlier draft of the
-- frontend; point them to the current ones.
UPDATE "notifications"
SET "link" = '/student/applications'
WHERE "link" LIKE '/postulaciones/%';

UPDATE "notifications"
SET "link" = regexp_replace("link", '^/ofertas/([^/]+)/postulantes$', '/employer/offers/\1/applications')
WHERE "link" ~ '^/ofertas/[^/]+/postulantes$';
