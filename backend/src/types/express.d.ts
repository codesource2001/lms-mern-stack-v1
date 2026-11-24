import type { ValidatedData } from '../middlewares/validate.js';
import type { AuthPrincipal } from '../modules/auth/auth.types.js';

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
    validated?: ValidatedData;
    auth?: AuthPrincipal;
  }
}

export {};
