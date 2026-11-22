import { z } from 'zod'

/**
 * Environment validation for UniPortal.
 *
 * This module is imported by every server entry point. If a required variable
 * is missing or invalid, the import throws so the application refuses to start.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Database (Prisma / MySQL)
  DATABASE_URL: z.string().trim().min(1, 'DATABASE_URL is required.'),

  // Supabase is optional: the university dashboards use Prisma/MySQL directly.
  // The keys remain available for the legacy OTP helpers.
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().default(''),

  // Session signing secret
  JWT_SECRET: z
    .string()
    .trim()
    .min(32, 'JWT_SECRET is required and must be at least 32 characters long.'),
})

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
})

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || 'environment'}: ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment configuration:\n${details}\nSee .env.example for the required variables.`)
}

export const env = parsed.data

export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
