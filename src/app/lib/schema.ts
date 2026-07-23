import { z } from 'zod';

export const authSearchSchema = z.object({
  // internal paths only — the (?!\/) blocks protocol-relative //host redirects
  redirect: z
    .string()
    .regex(/^\/(?!\/)/)
    .default('/')
    .catch('/'),
});
