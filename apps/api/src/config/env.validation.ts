import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('4000'),
  MYSQL_HOST: z.string().default('localhost'),
  MYSQL_PORT: z.string().default('3306'),
  MYSQL_DATABASE: z.string().min(1),
  MYSQL_USER: z.string().min(1),
  MYSQL_PASSWORD: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_DIR: z.string().optional(),
  JWT_ISSUER: z.string().url(),
  JWT_AUDIENCE: z.string().min(1),
  KEYCLOAK_API_CLIENT_ID: z.string().default('wikigouv-api'),
  KEYCLOAK_REALM: z.string().default('wikigouv'),
  KEYCLOAK_ISSUER_URL: z.string().url(),
  KEYCLOAK_ADMIN_CLIENT_ID: z.string().default('wikigouv-admin-service'),
  KEYCLOAK_ADMIN_CLIENT_SECRET: z.string().min(1),
  JWKS_URI: z.string().url(),
  AUTH_FALLBACK_ENABLED: z.string().default('false'),
  AUTH_FALLBACK_TOKEN: z.string().default(''),
  AI_RATE_LIMIT_MAX: z.string().default('20'),
  AI_RATE_LIMIT_WINDOW_MS: z.string().default('60000')
});

export type EnvConfig = z.infer<typeof schema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  return schema.parse(config);
}
