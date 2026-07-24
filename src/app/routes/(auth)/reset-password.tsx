import { useForm } from '@tanstack/react-form';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { LoaderIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { GridBG } from '~/components/background';
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
  validateSearch: resetPasswordSearchSchema,
});

function RouteComponent() {
  const search = Route.useSearch();
  const [tokenRejected, setTokenRejected] = useState(false);
  const invalid = tokenRejected || search.error !== undefined || !search.token;

  return (
    <div>
      <GridBG />

      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          {invalid ? (
            <InvalidTokenCard />
          ) : (
            <ResetPasswordForm token={search.token as string} onTokenRejected={() => setTokenRejected(true)} />
          )}
        </div>
      </div>
    </div>
  );
}

function InvalidTokenCard() {
  return (
    <Card className="backdrop-blur-sm bg-card/25">
      <CardHeader className="text-center">
        <TriangleAlertIcon className="mx-auto size-10 text-destructive" />
        <CardTitle>Reset link invalid</CardTitle>
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
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Choose a new password for your account
        </p>
      </div>
      <div className="grid gap-6">
        <form.Field
          name="password"
          children={(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>New Password</Label>
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
            </div>
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
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Confirm Password</Label>
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
            </div>
          )}
        />

        <Button type="submit" className="w-full">
          {form.state.isSubmitting && <LoaderIcon className="animate-spin-slow" />}
          Reset password
        </Button>
      </div>
    </form>
  );
}
