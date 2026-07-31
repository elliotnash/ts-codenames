import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { LoaderIcon, MailIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { AuthShell } from '~/components/auth-shell';
import { m, riseItem } from '~/components/motion';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { useAuthOptions } from '~/hooks/use-auth';
import { useToast } from '~/hooks/use-toast';
import { authClient } from '~/lib/auth-client';
import { verifyEmailSearchSchema } from '~/lib/schema';

export const Route = createFileRoute('/(auth)/verify-email')({
  component: RouteComponent,
  head: () => ({ meta: [{ title: 'Verify email — Codenames' }] }),
  validateSearch: verifyEmailSearchSchema,
  beforeLoad: async ({ search, context: { queryClient } }) => {
    // Clicking the emailed link auto-signs the user in and lands here —
    // continue straight to the original destination.
    const auth = await queryClient.ensureQueryData(useAuthOptions());
    if (auth.isAuthenticated) {
      throw redirect({ href: search.redirect });
    }
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);

  const resend = async () => {
    if (!search.email) return;
    setResending(true);
    const { error } = await authClient.sendVerificationEmail({
      email: search.email,
      callbackURL: `/verify-email?redirect=${encodeURIComponent(search.redirect)}`,
    });
    setResending(false);
    if (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not send verification email',
        description: 'Please try again later',
      });
    } else {
      toast({
        title: 'Verification email sent',
        description: `Check ${search.email} for a new link`,
      });
    }
  };

  return (
    <AuthShell>
      <m.div variants={riseItem}>
        <Card className="backdrop-blur-sm bg-card/25">
          <CardHeader className="text-center">
            {search.error ? (
              <>
                <TriangleAlertIcon className="mx-auto size-10 text-destructive" />
                <p className="font-mono text-xs uppercase tracking-widest text-primary">
                  {'// Confirmation'}
                </p>
                <CardTitle className="font-display text-2xl uppercase tracking-wide">
                  Verification link invalid
                </CardTitle>
                <CardDescription>
                  The link may have expired or already been used. Request a new one below.
                </CardDescription>
              </>
            ) : (
              <>
                <MailIcon className="mx-auto size-10 text-primary" />
                <p className="font-mono text-xs uppercase tracking-widest text-primary">
                  {'// Confirmation'}
                </p>
                <CardTitle className="font-display text-2xl uppercase tracking-wide">
                  Check your email
                </CardTitle>
                <CardDescription>
                  We sent a verification link to{' '}
                  <span className="font-medium text-foreground">
                    {search.email ?? 'your email address'}
                  </span>
                  . Click it to activate your account.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            {search.email && (
              <Button onClick={resend} disabled={resending} className="w-full">
                {resending && <LoaderIcon className="animate-spin-slow" />}
                Resend verification email
              </Button>
            )}
            <div className="text-center text-sm">
              Already verified?{' '}
              <Link
                to="/login"
                search={{ redirect: search.redirect }}
                className="underline underline-offset-4 transition-colors hover:text-foreground/80"
              >
                Log in
              </Link>
            </div>
          </CardContent>
        </Card>
      </m.div>
    </AuthShell>
  );
}
