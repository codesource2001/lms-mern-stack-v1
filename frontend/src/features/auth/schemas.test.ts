import { describe, expect, it } from 'vitest';

import { loginSchema, registerSchema } from '@/features/auth/schemas';

describe('auth schemas', () => {
  it('accepts a valid login', () => {
    expect(loginSchema.safeParse({ email: 'ada@example.com', password: 'password' }).success).toBe(
      true,
    );
  });

  it('rejects an invalid login email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'password' }).success).toBe(
      false,
    );
  });

  it('requires matching passwords on registration', () => {
    const result = registerSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password123456',
      confirmPassword: 'different-password',
    });

    expect(result.success).toBe(false);
  });
});
