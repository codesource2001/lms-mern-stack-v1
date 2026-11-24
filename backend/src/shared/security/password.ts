import argon2 from 'argon2';

import { env } from '../../config/env.js';

/**
 * A valid Argon2id hash for a value that is not any user's password. Verifying
 * against it keeps unknown-account logins roughly as expensive as known-account
 * logins, reducing timing-based account enumeration.
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$A4o9fhob2HV9HufSsHW3QQ$u5KT7dREOIHvaXHgz9r91fw8ldX5nN3eBYuQDajKwqw';

export interface PasswordOptions {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}

export interface PasswordService {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
  verifyDummy(password: string): Promise<boolean>;
}

export function createPasswordService(options: PasswordOptions): PasswordService {
  const argonOptions = {
    type: argon2.argon2id as 2,
    memoryCost: options.memoryCost,
    timeCost: options.timeCost,
    parallelism: options.parallelism,
  };

  const verify = async (hash: string, password: string): Promise<boolean> => {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  };

  return {
    hash(password) {
      return argon2.hash(password, argonOptions);
    },
    verify,
    verifyDummy(password) {
      return verify(DUMMY_HASH, password);
    },
  };
}

export const passwordService = createPasswordService({
  memoryCost: env.ARGON2_MEMORY_KIB,
  timeCost: env.ARGON2_TIME_COST,
  parallelism: env.ARGON2_PARALLELISM,
});
