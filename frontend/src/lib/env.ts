import { z } from 'zod';

const envSchema = z.object({
  VITE_APP_NAME: z.string().trim().min(1).default('Atrium LMS'),
  VITE_API_BASE_URL: z.string().trim().min(1).default('/api/v1'),
});

export const env = envSchema.parse({
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
});
