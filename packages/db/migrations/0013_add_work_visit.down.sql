-- Reverts 0013_add_work_visit.
ALTER TABLE action DROP CONSTRAINT action_visit_source;
ALTER TABLE action DROP CONSTRAINT action_visit;
ALTER TABLE action DROP COLUMN visit_id;
DROP TABLE visit;
