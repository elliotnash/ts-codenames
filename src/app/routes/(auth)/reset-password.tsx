import { useForm } from '@tanstack/react-form';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { LoaderIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { AuthShell } from '~/components/auth-shell';
import { m, riseItem } from '~/components/motion';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { FieldInfo } from '~/components/ui/field-info';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useToast } from '~/hooks/use-toast';
import { authClient } from '~/lib/auth-client';
import { cn } from '~/lib/utils';

const resetPasswordSearchSchema = z.object({
  token: z.string().optional(),
  // INVALID_TOKEN appended by better-auth's reset-password redirect
  error: z.string().optional(),
});

export const Route = createFileRoute('/(auth)/reset-password')({
  component: RouteComponent,
  head: () => ({ meta: [{ title: 'Reset password — Codenames' }] }),
  validateSearch: resetPasswordSearchSchema,
});

function RouteComponent() {
  const search = Route.useSearch();
  const [tokenRejected, setTokenRejected] = useState(false);
  const invalid = tokenRejected || search.error !== undefined || !search.token;

  return (
    <AuthShell>
      {invalid ? (
        <InvalidTokenCard />
      ) : (
        <ResetPasswordForm
          token={search.token as string}
          onTokenRejected={() => setTokenRejected(true)}
        />
      )}
    </AuthShell>
  );
}

function InvalidTokenCard() {
  return (
    <m.div variants={riseItem}>
      <Card className="backdrop-blur-sm bg-card/25">
        <CardHeader className="text-center">
          <TriangleAlertIcon className="mx-auto size-10 text-destructive" />
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            {'// Recovery'}
          </p>
          <CardTitle className="font-display text-2xl uppercase tracking-wide">
            Reset link invalid
          </CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired. Request a new one below.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button asChild className="w-full">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
          <div className="text-center text-sm">
            <Link
              to="/login"
              className="underline underline-offset-4 transition-colors hover:text-foreground/80"
            >
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
}

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
});

function ResetPasswordForm({
  token,
  onTokenRejected,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'form'> & { token: string; onTokenRejected: () => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    validators: {
      onChange: resetPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.resetPassword({
        newPassword: value.password,
        token,
      });
      if (error) {
        if (error.code === 'INVALID_TOKEN') {
          onTokenRejected();
        } else {
          toast({
            variant: 'destructiveOutline',
            title: 'Could not reset password',
            description: 'Please try again later',
          });
        }
      } else {
        toast({
          title: 'Password reset',
          description: 'Log in with your new password',
        });
        await navigate({ to: '/login' });
      }
    },
  });

  const [hasSubmitted, setHasSubmitted] = useState(false);

  return (
    <form
      className={cn('flex flex-col gap-6', className)}
      {...props}
      onSubmit={(e) => {
        setHasSubmitted(true);
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <m.div variants={riseItem} className="flex flex-col items-center gap-2 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">
          {'// New cipher'}
        </p>
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Reset password</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Choose a new password for your account
        </p>
      </m.div>
      <div className="grid gap-6">
        <form.Field
          name="password"
          children={(field) => (
            <m.div variants={riseItem} className="grid gap-2">
              <Label htmlFor={field.name} className="block pb-1">
                New Password
              </Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                type="password"
                required
              />
              <FieldInfo field={field} hasSubmitted={hasSubmitted} />
            </m.div>
          )}
        />

        <form.Field
          name="confirmPassword"
          validators={{
            onChangeListenTo: ['password'],
            onChange: ({ value, fieldApi }) => {
              if (value !== fieldApi.form.getFieldValue('password')) {
                return 'Passwords do not match';
              }
              return undefined;
            },
          }}
          children={(field) => (
            <m.div variants={riseItem} className="grid gap-2">
              <Label htmlFor={field.name} className="block pb-1">
                Confirm Password
              </Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                type="password"
                required
              />
              <FieldInfo field={field} hasSubmitted={hasSubmitted} />
            </m.div>
          )}
        />

        <m.div variants={riseItem}>
          <Button type="submit" className="w-full">
            {form.state.isSubmitting && <LoaderIcon className="animate-spin-slow" />}
            Reset password
          </Button>
        </m.div>
      </div>
    </form>
  );
}
