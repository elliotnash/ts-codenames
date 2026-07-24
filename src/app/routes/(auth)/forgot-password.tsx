import { useForm } from '@tanstack/react-form';
import { createFileRoute, Link } from '@tanstack/react-router';
import { LoaderIcon, MailIcon } from 'lucide-react';
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

export const Route = createFileRoute('/(auth)/forgot-password')({
  component: RouteComponent,
});

function RouteComponent() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  return (
    <div>
      <GridBG />

      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          {sentTo ? <SentCard email={sentTo} /> : <ForgotPasswordForm onSent={setSentTo} />}
        </div>
      </div>
    </div>
  );
}

function SentCard({ email }: { email: string }) {
  return (
    <Card className="backdrop-blur-sm bg-card/25">
      <CardHeader className="text-center">
        <MailIcon className="mx-auto size-10 text-primary" />
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          If an account exists for <span className="font-medium text-foreground">{email}</span>,
          we sent it a password reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
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

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

function ForgotPasswordForm({
  onSent,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'form'> & { onSent: (email: string) => void }) {
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      email: '',
    },
    validators: {
      onChange: forgotPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.requestPasswordReset({
        email: value.email,
        redirectTo: '/reset-password',
      });
      if (error) {
        toast({
          variant: 'destructiveOutline',
          title: 'Could not send reset email',
          description: 'Please try again later',
        });
      } else {
        // The endpoint always succeeds for unknown emails too (enumeration protection)
        onSent(value.email);
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
        <h1 className="text-2xl font-bold">Forgot your password?</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your email and we'll send you a link to reset it
        </p>
      </div>
      <div className="grid gap-6">
        <form.Field
          name="email"
          children={(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Email</Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                type="email"
                placeholder="me@example.com"
                required
              />
              <FieldInfo field={field} hasSubmitted={hasSubmitted} />
            </div>
          )}
        />

        <Button type="submit" className="w-full">
          {form.state.isSubmitting && <LoaderIcon className="animate-spin-slow" />}
          Send reset link
        </Button>
      </div>
      <div className="text-center text-sm">
        Remembered it?{' '}
        <Link
          to="/login"
          className="underline underline-offset-4 transition-colors hover:text-foreground/80"
        >
          Log in
        </Link>
      </div>
    </form>
  );
}
