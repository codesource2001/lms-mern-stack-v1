import { z } from 'zod';

const channelSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
});

export const preferencesSchema = z.object({
  announcements: channelSchema,
  deadlines: channelSchema,
  grades: channelSchema,
  system: channelSchema,
});

export type PreferencesForm = z.infer<typeof preferencesSchema>;
