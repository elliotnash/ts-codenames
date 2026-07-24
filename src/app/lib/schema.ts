import { z } from 'zod';

export const authSearchSchema = z.object({
  // internal paths only — the (?!\/) blocks protocol-relative //host redirects
  redirect: z
    .string()
    .regex(/^\/(?!\/)/)
    .default('/')
    .catch('/'),
});

export const twoFactorSearchSchema = authSearchSchema.extend({
  // which second-factor methods the account has available
  totp: z.boolean().default(false).catch(false),
  otp: z.boolean().default(false).catch(false),
});

export const verifyEmailSearchSchema = authSearchSchema.extend({
  email: z.string().optional(),
  // TOKEN_EXPIRED | INVALID_TOKEN | ... appended by better-auth's verify-email redirect
  error: z.string().optional(),
});
