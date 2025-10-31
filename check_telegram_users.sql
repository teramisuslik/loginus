SELECT id, email, "firstName", "availableAuthMethods", "messengerMetadata" 
FROM users 
WHERE "messengerMetadata"::jsonb->'telegram'->>'userId' = '1063129435';
