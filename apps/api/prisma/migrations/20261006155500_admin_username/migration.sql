ALTER TABLE "AdminUser"
  ADD COLUMN "username" TEXT;

UPDATE "AdminUser"
SET "username" = 'user-' || replace("id"::text, '-', '');

ALTER TABLE "AdminUser"
  ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "AdminUser_username_key"
  ON "AdminUser"("username");
