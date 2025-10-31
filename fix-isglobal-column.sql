ALTER TABLE roles DROP COLUMN IF EXISTS isglobal;
ALTER TABLE roles ADD COLUMN "isGlobal" boolean DEFAULT true;

