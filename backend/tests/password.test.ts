import { describe, expect, it } from 'vitest';

import { createPasswordService } from '../src/shared/security/password.js';

describe('password service', () => {
  const service = createPasswordService({ memoryCost: 8192, timeCost: 2, parallelism: 1 });

  it('hashes and verifies a password', async () => {
    const hash = await service.hash('correct horse battery staple');

    expect(hash).not.toBe('correct horse battery staple');
    await expect(service.verify(hash, 'correct horse battery staple')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong password')).resolves.toBe(false);
  });

  it('returns false for malformed hashes', async () => {
    await expect(service.verify('not-a-hash', 'password')).resolves.toBe(false);
  });

  it('rejects the dummy password', async () => {
    await expect(service.verifyDummy('any-password')).resolves.toBe(false);
  });
});
