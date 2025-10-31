# Loginus Project Setup Status

## Completed Steps

1. ✅ Cloned repository from https://github.com/teramisuslik/vselena
2. ✅ Copied backend to `loginus-backend/`
3. ✅ Copied frontend to `frontend/`
4. ✅ Started Docker containers
5. ⚠️ Fixed migration issues in:
   - CreateInvitations.ts - Added missing `acceptedById` column
   - CreateOrganizationRoles.ts - Added IF EXISTS to DROP CONSTRAINT statements

## Remaining Issues

The migration `CreateOrganizationRoles1761340259371` references a `system_settings` table that doesn't exist in our database. This table needs to be created before the migration tries to modify it.

## Next Steps

1. Either create the system_settings table before running this migration
2. Or modify the CreateOrganizationRoles migration to wrap system_settings operations in a table existence check

## Docker Containers

Containers are running:
- Backend: http://localhost:3001
- Frontend: http://localhost:3002
- Database: localhost:5432
- Adminer: http://localhost:8080

## Database Credentials

- Host: localhost (postgres in docker)
- Port: 5432
- Database: loginus_dev
- Username: loginus
- Password: loginus_secret

## Admin User

- Email: admin@vselena.ru
- Password: admin123 (needs verification)

