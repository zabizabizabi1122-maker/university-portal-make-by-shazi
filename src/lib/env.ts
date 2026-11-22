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

type Env = z.infer<typeof envSchema>

let cached: Env | undefined

/**
 * Validate on first use rather than at import time.
 *
 * Next.js imports the whole module graph while collecting page data during
 * `next build`. Throwing there makes deployments fail before the app can run,
 * even though no request has been served. Lazy validation keeps builds portable
 * while still failing fast (with a clear message) on the first server use.
 */
function loadEnv(): Env {
  if (cached) return cached

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

  cached = parsed.data
  return cached
}

export const env: Env = new Proxy({} as Env, {
  get(_target, property) {
    return loadEnv()[property as keyof Env]
  },
  has(_target, property) {
    return property in loadEnv()
  },
  ownKeys() {
    return Reflect.ownKeys(loadEnv())
  },
  getOwnPropertyDescriptor() {
    return { configurable: true, enumerable: true }
  },
})

export const isProduction = () => loadEnv().NODE_ENV === 'production'
export const isDevelopment = () => loadEnv().NODE_ENV === 'development'
