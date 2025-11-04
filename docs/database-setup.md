# Neon Database Setup Guide

This project uses [Neon](https://neon.com/) for storing agent-related data (agents, chats, messages) in PostgreSQL.

## Initial Setup

1. **Install Neon CLI** (if not already installed):
   ```bash
   npm install -g neonctl
   ```

2. **Authenticate with Neon**:
   ```bash
   npx neonctl@latest init
   ```
   This will open a browser for authentication.

3. **Create a Neon Project**:
   - Go to [Neon Console](https://console.neon.tech/)
   - Create a new project
   - Copy the connection string

4. **Set Environment Variable**:
   Add your Neon connection string to `.env`:
   ```env
   DATABASE_URL=postgresql://username:password@host/database?sslmode=require
   ```

5. **Generate and Apply Migrations**:
   ```bash
   npm run db:generate  # Generate migration files from schema
   npm run db:push      # Push schema to database (for development)
   ```

   Or for production:
   ```bash
   npm run db:migrate   # Run migrations (for production)
   ```

## Database Schema

The database includes three main tables:

- **agents**: Stores agent configurations and wallet information
- **chat_threads**: Stores chat thread metadata
- **chat_messages**: Stores individual chat messages

See `lib/db/schema.ts` for the complete schema definition.

## Database Commands

- `npm run db:generate` - Generate migration files from schema changes
- `npm run db:push` - Push schema changes directly to database (dev only)
- `npm run db:migrate` - Run migrations (production)
- `npm run db:studio` - Open Drizzle Studio to view/edit data

## User Management

Currently, the system uses a simple `userId` from the `x-user-id` header (defaults to `'default-user'`). You should replace the `getUserId()` function in API routes with your actual authentication logic.

## Migration from File Storage

If you have existing data in `.composer-data/` directory, you'll need to migrate it manually or create a migration script.

