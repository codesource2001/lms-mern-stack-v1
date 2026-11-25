import { describe, expect, it } from 'vitest';

import { parseEnvironment } from '../src/config/env.js';

describe('environment validation', () => {
  it('applies documented development defaults and enables API docs outside production', () => {
    const env = parseEnvironment({ NODE_ENV: 'development' });

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 5000,
      API_PREFIX: '/api/v1',
      MONGODB_MAX_POOL_SIZE: 10,
      ENABLE_API_DOCS: true,
    });
    expect(env.MONGODB_URI).toMatch(/^mongodb:\/\//);
    expect(env.REDIS_URL).toMatch(/^redis:\/\//);
  });

  it('fails with field-level detail for malformed connection strings', () => {
    expect(() =>
      parseEnvironment({
        MONGODB_URI: 'http://localhost:27017/atrium',
        REDIS_URL: 'http://localhost:6379',
      }),
    ).toThrow(/MONGODB_URI: MONGODB_URI must start with mongodb:\/\/ or mongodb\+srv:\/\//);
  });

  it('rejects development credential placeholders in production', () => {
    expect(() =>
      parseEnvironment({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://atrium:local-dev-only-change-me@db:27017/atrium',
        REDIS_URL: 'redis://:local-dev-only-change-me@cache:6379',
      }),
    ).toThrow(/must not use the local development credential placeholder/);
  });

  it('disables API docs by default in production and allows an explicit override', () => {
    const base = {
      NODE_ENV: 'production' as const,
      MONGODB_URI: 'mongodb://db:27017/atrium',
      REDIS_URL: 'redis://cache:6379',
      AUTH_JWT_SECRET: 'production-jwt-secret-0123456789abcdef0123456789',
      AUTH_METADATA_SECRET: 'production-metadata-secret-0123456789abcdef',
      SMTP_HOST: 'smtp.example.com',
      APP_WEB_URL: 'https://atrium.example.com',
    };

    expect(parseEnvironment(base).ENABLE_API_DOCS).toBe(false);
    expect(parseEnvironment({ ...base, ENABLE_API_DOCS: 'true' }).ENABLE_API_DOCS).toBe(true);
  });

  it('bounds pool and timeout configuration', () => {
    expect(() => parseEnvironment({ MONGODB_MAX_POOL_SIZE: '101' })).toThrow(
      /MONGODB_MAX_POOL_SIZE/,
    );
    expect(() => parseEnvironment({ READINESS_TIMEOUT_MS: '10' })).toThrow(/READINESS_TIMEOUT_MS/);
  });

  it('defaults the job worker on outside tests and supports an explicit override', () => {
    expect(parseEnvironment({ NODE_ENV: 'development' }).JOBS_WORKER_ENABLED).toBe(true);
    expect(parseEnvironment({ NODE_ENV: 'test' }).JOBS_WORKER_ENABLED).toBe(false);
    expect(parseEnvironment({ JOBS_WORKER_ENABLED: 'false' }).JOBS_WORKER_ENABLED).toBe(false);
  });
});
