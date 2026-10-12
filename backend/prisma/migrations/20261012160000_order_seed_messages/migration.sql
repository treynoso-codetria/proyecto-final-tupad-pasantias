-- Data fix, no schema change. The two messages of the seed were inserted with
-- the same created_at, so the order of the conversation was undefined: the
-- student's reply is moved one minute later. It only touches that seed row,
-- and only while both messages still share the timestamp.
UPDATE "messages" AS m
SET "created_at" = m."created_at" + interval '1 minute'
WHERE m."application_id" = '60000000-0000-0000-0000-000000000001'
  AND m."sender_id" = '00000000-0000-0000-0000-000000000004'
  AND EXISTS (
    SELECT 1 FROM "messages" AS q
    WHERE q."application_id" = m."application_id"
      AND q."sender_id" = '00000000-0000-0000-0000-000000000002'
      AND q."created_at" = m."created_at"
  );
