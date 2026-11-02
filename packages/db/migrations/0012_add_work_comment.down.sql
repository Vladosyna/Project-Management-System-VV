-- Reverts 0012_add_work_comment.
ALTER TABLE action DROP CONSTRAINT action_comment_source;
ALTER TABLE action DROP COLUMN comment_id;
DROP TABLE comment;
