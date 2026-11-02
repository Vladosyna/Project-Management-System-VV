-- Reverts 0010_add_intake_restricted_note.
DROP TABLE restricted_note;
DROP FUNCTION app.may_read_restricted(uuid);
ALTER TABLE site DROP COLUMN pm_id, DROP COLUMN sales_owner_id;
DROP FUNCTION app.actor_roles();
