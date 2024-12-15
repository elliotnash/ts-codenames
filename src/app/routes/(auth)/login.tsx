import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useForm, type FieldApi } from '@tanstack/react-form';

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { GradientBG } from '~/components/background';
import { z } from 'zod';
import { useState } from 'react';
import { FieldInfo } from '~/components/ui/field-info';
import { authClient } from '~/lib/auth-client';
import { useToast } from '~/hooks/use-toast';
import { LoaderIcon } from 'lucide-react';

export const Route = createFileRoute('/(auth)/login')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <GradientBG />

      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

const LoginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().nonempty(),
});

function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'form'>) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onChange: LoginFormSchema,
    },
    onSubmit: async ({ value }) => {
      const { data, error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      });
      if (error) {
        console.log('Log in error');
        console.log(error);
        if (error.code === 'INVALID_EMAIL_OR_PASSWORD') {
          const inUseToast = toast({
            variant: 'destructiveOutline',
            title: 'Invalid email or password',
            description: (
              <>
                If you have forgotten your password, you may{' '}
                <Link
                  to="/"
                  className="underline underline-offset-4 transition-colors hover:text-foreground/80"
                  onClick={() => inUseToast.dismiss()}
                >
                  reset your password
                </Link>
              </>
            ),
          });
        } else {
          toast({
            variant: 'destructiveOutline',
            title: 'Unknown error signing in',
            description: 'Please try again later',
          });
        }
      } else {
        await navigate({ to: '/' });
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
        <h1 className="text-2xl font-bold">Log in to your account</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your email below to log in to your account
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

        <form.Field
          name="password"
          children={(field) => (
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor={field.name}>Password</Label>
                <Link
                  to="/"
                  className="ml-auto text-sm underline-offset-4 hover:underline hover:text-foreground/80 transition-all"
                >
                  Forgot your password?
                </Link>
              </div>
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
          Log in
        </Button>
        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span className="relative z-10 bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
        <Button variant="outline" className="w-full">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <title>GitHub icon</title>
            <path
              d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
              fill="currentColor"
            />
          </svg>
          GitHub
        </Button>
      </div>
      <div className="text-center text-sm">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="underline underline-offset-4 transition-colors hover:text-foreground/80"
        >
          Register
        </Link>
      </div>
    </form>
  );
}
