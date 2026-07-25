import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { auth } from '~/lib/auth';
import { requestHeaders } from '~/lib/session';

/** For OAuth-only users; better-auth rejects it if a password already exists. */
export const setPassword = createServerFn({ method: 'POST' })
  .validator(z.object({ newPassword: z.string().min(8).max(128) }))
  .handler(async ({ data }) => {
    await auth.api.setPassword({
      body: { newPassword: data.newPassword },
      headers: requestHeaders(),
    });
  });
