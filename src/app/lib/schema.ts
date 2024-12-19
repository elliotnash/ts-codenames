import { z } from 'zod';

export const authSearchSchema = z.object({
  redirect: z.enum(['/']).catch('/'),
});
