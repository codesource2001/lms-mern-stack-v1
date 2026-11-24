import { config as loadEnvFile } from 'dotenv';
import { z } from 'zod';

loadEnvFile({ quiet: true });

const LOCAL_DEV_MARKER = 'local-dev-only-change-me';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const webUrlSchema = z
  .string()
  .trim()
  .max(2_048)
  .default('http://localhost:5173')
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'APP_WEB_URL must be an absolute http(s) URL');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(5000),
    API_PREFIX: z
      .string()
      .regex(/^\/[a-z0-9/_-]*$/i, 'API_PREFIX must be an absolute path such as /api/v1')
      .default('/api/v1'),
    APP_VERSION: z.string().trim().min(1).default('0.1.0'),
    APP_WEB_URL: webUrlSchema,
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .refine((origins) => origins.length > 0, 'At least one CORS origin is required'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    ENABLE_API_DOCS: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    MONGODB_URI: z
      .string()
      .min(1)
      .regex(/^mongodb(\+srv)?:\/\//, 'MONGODB_URI must start with mongodb:// or mongodb+srv://')
      .default(`mongodb://atrium:${LOCAL_DEV_MARKER}@localhost:27017/atrium?authSource=admin`),
    MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(100)
      .max(60_000)
      .default(5_000),
    REDIS_URL: z
      .string()
      .min(1)
      .regex(/^rediss?:\/\//, 'REDIS_URL must start with redis:// or rediss://')
      .default(`redis://:${LOCAL_DEV_MARKER}@localhost:6379`),
    REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(5_000),
    DEPENDENCY_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    DEPENDENCY_RETRY_DELAY_MS: z.coerce.number().int().min(100).max(30_000).default(1_000),
    READINESS_TIMEOUT_MS: z.coerce.number().int().min(100).max(30_000).default(2_000),
    AUTH_JWT_SECRET: z
      .string()
      .min(32, 'AUTH_JWT_SECRET must be at least 32 characters')
      .max(512)
      .default(`local-dev-only-change-me-jwt-secret-minimum-32`),
    AUTH_JWT_ISSUER: z.string().trim().min(1).max(100).default('atrium-lms'),
    AUTH_JWT_AUDIENCE: z.string().trim().min(1).max(100).default('atrium-api'),
    AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(900),
    AUTH_REFRESH_IDLE_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
    AUTH_REFRESH_ABSOLUTE_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    AUTH_COOKIE_NAME: z
      .string()
      .regex(/^[A-Za-z0-9_-]{3,64}$/, 'AUTH_COOKIE_NAME must be a safe cookie name')
      .default('atrium_refresh'),
    AUTH_COOKIE_SECURE: z.enum(['true', 'false']).optional(),
    AUTH_METADATA_SECRET: z
      .string()
      .min(32, 'AUTH_METADATA_SECRET must be at least 32 characters')
      .max(512)
      .default(`local-dev-only-change-me-metadata-secret-minimum-32`),
    AUTH_VERIFICATION_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(10_080).default(1_440),
    AUTH_PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(1_440).default(30),
    AUTH_MAX_LOGIN_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
    AUTH_LOCKOUT_BASE_MS: z.coerce.number().int().min(60_000).max(604_800_000).default(900_000),
    AUTH_LOCKOUT_MAX_MS: z.coerce.number().int().min(60_000).max(2_592_000_000).default(86_400_000),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(60_000).max(86_400_000).default(900_000),
    AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1_000).default(10),
    AUTH_REGISTER_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1_000).default(5),
    AUTH_PASSWORD_RESET_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1_000).default(5),
    AUTH_REFRESH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1_000).default(120),
    AUTH_VERIFY_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1_000).default(20),
    ARGON2_MEMORY_KIB: z.coerce.number().int().min(8_192).max(1_048_576).default(19_456),
    ARGON2_TIME_COST: z.coerce.number().int().min(2).max(10).default(2),
    ARGON2_PARALLELISM: z.coerce.number().int().min(1).max(8).default(1),
    EMAIL_FROM: z.string().trim().min(3).max(320).default('Atrium LMS <no-reply@atrium.local>'),
    SMTP_HOST: z.string().trim().min(1).max(255).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
    SMTP_SECURE: booleanString,
    SMTP_USER: z.string().trim().max(255).optional(),
    SMTP_PASSWORD: z.string().max(512).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.AUTH_REFRESH_IDLE_TTL_DAYS > value.AUTH_REFRESH_ABSOLUTE_TTL_DAYS) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_REFRESH_IDLE_TTL_DAYS'],
        message: 'AUTH_REFRESH_IDLE_TTL_DAYS cannot exceed AUTH_REFRESH_ABSOLUTE_TTL_DAYS',
      });
    }

    if (value.AUTH_LOCKOUT_BASE_MS > value.AUTH_LOCKOUT_MAX_MS) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_LOCKOUT_BASE_MS'],
        message: 'AUTH_LOCKOUT_BASE_MS cannot exceed AUTH_LOCKOUT_MAX_MS',
      });
    }

    if (value.AUTH_JWT_SECRET === value.AUTH_METADATA_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_METADATA_SECRET'],
        message: 'AUTH_METADATA_SECRET must differ from AUTH_JWT_SECRET',
      });
    }

    if ((value.SMTP_USER === undefined) !== (value.SMTP_PASSWORD === undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_USER'],
        message: 'SMTP_USER and SMTP_PASSWORD must be provided together',
      });
    }

    if (value.NODE_ENV !== 'production') {
      return;
    }

    for (const key of [
      'MONGODB_URI',
      'REDIS_URL',
      'AUTH_JWT_SECRET',
      'AUTH_METADATA_SECRET',
    ] as const) {
      if (value[key].includes(LOCAL_DEV_MARKER)) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} must not use the local development credential placeholder in production`,
        });
      }
    }

    if (value.SMTP_HOST === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST is required in production',
      });
    }

    if (value.AUTH_COOKIE_SECURE === 'false') {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_COOKIE_SECURE'],
        message: 'AUTH_COOKIE_SECURE cannot be false in production',
      });
    }

    let webUrl: URL | undefined;
    try {
      webUrl = new URL(value.APP_WEB_URL);
    } catch {
      webUrl = undefined;
    }

    if (webUrl?.protocol !== 'https:') {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_WEB_URL'],
        message: 'APP_WEB_URL must use https in production',
      });
    }
  });

type ParsedEnv = z.infer<typeof envSchema>;

export type Env = Omit<ParsedEnv, 'ENABLE_API_DOCS' | 'AUTH_COOKIE_SECURE'> & {
  ENABLE_API_DOCS: boolean;
  AUTH_COOKIE_SECURE: boolean;
};

/**
 * Parses an environment bag without touching process state. Exported so
 * configuration failures can be tested directly instead of inferred from a
 * crashed process.
 */
export function parseEnvironment(input: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(input);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return {
    ...parsed.data,
    ENABLE_API_DOCS: parsed.data.ENABLE_API_DOCS ?? parsed.data.NODE_ENV !== 'production',
    AUTH_COOKIE_SECURE:
      parsed.data.AUTH_COOKIE_SECURE === 'true' || parsed.data.NODE_ENV === 'production',
  };
}

export const env = parseEnvironment(process.env);
