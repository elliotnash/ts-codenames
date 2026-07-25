import { privateEnv } from '@/env';
import { betterAuth } from 'better-auth';
import { admin, twoFactor } from 'better-auth/plugins';
import { changeEmailConfirmationTemplate } from '~/emails/change-email-confirmation';
import { otpCodeTemplate } from '~/emails/otp-code';
import { resetPasswordTemplate } from '~/emails/reset-password';
import { verifyEmailTemplate } from '~/emails/verify-email';
import { pool } from './db';
import { sendMail } from './mailer';

export const auth = betterAuth({
  appName: 'Codenames',
  database: pool,
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: 'Verify your email',
        body: verifyEmailTemplate({ name: user.name, url }),
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: 'Reset your password',
        body: resetPasswordTemplate({ name: user.name, url }),
      });
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },
  socialProviders: {
    github: {
      clientId: privateEnv().githubClientId,
      clientSecret: privateEnv().githubClientSecret,
    },
  },
  account: {
    accountLinking: {
      // GitHub sign-in with a matching (locally verified) email auto-links
      trustedProviders: ['github'],
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      // Sent to the OLD address; approving it triggers verification of the new one.
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendMail({
          to: user.email,
          subject: 'Approve your email change',
          body: changeEmailConfirmationTemplate({ name: user.name, newEmail, url }),
        });
      },
    },
    deleteUser: {
      enabled: true,
    },
  },
  plugins: [
    twoFactor({
      issuer: 'Codenames',
      otpOptions: {
        sendOTP: async ({ user, otp }) => {
          await sendMail({
            to: user.email,
            subject: `${otp} is your verification code`,
            body: otpCodeTemplate({ name: user.name, otp }),
          });
        },
      },
    }),
    admin(),
  ],
});
