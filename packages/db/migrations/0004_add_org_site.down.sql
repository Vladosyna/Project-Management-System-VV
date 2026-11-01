-- Reverts 0004_add_org_site.
DROP TABLE site;
DROP FUNCTION app.site_project_id_immutable();
