-- Reverts 0020_add_oauth_provider.
DROP TABLE auth."oauthClientAssertion";
DROP TABLE auth."oauthConsent";
DROP TABLE auth."oauthAccessToken";
DROP TABLE auth."oauthRefreshToken";
DROP TABLE auth."oauthClientResource";
DROP TABLE auth."oauthResource";
DROP TABLE auth."oauthClient";
