-- Add explicit business hierarchy roles without rewriting the applied baseline migration.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MARKETING_MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ORDER_ADMIN';
