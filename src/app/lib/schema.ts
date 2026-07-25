import { z } from 'zod';

export const authSearchSchema = z.object({
  // internal paths only — the (?!\/) blocks protocol-relative //host redirects
  redirect: z
    .string()
    .regex(/^\/(?!\/)/)
    .default('/')
    .catch('/'),
  // error codes appended by better-auth redirects (OAuth failures, verify-email)
  error: z.string().optional(),
});

export const twoFactorSearchSchema = authSearchSchema.extend({
  // which second-factor methods the account has available
  totp: z.boolean().default(false).catch(false),
  otp: z.boolean().default(false).catch(false),
});

export const verifyEmailSearchSchema = authSearchSchema.extend({
  email: z.string().optional(),
});
