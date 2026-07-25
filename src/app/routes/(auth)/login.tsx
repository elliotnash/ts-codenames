import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useForm } from '@tanstack/react-form';

import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { GridBG } from '~/components/background';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { FieldInfo } from '~/components/ui/field-info';
import { GithubIcon } from '~/components/github-icon';
import { authClient } from '~/lib/auth-client';
import { useToast } from '~/hooks/use-toast';
import { LoaderIcon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, useAuthOptions } from '~/hooks/use-auth';
import { authSearchSchema } from '~/lib/schema';

export const Route = createFileRoute('/(auth)/login')({
  component: RouteComponent,
  validateSearch: authSearchSchema,
  beforeLoad: async ({ search, context: { queryClient } }) => {
    // Redirect if already authenticated
    const auth = await queryClient.ensureQueryData(useAuthOptions());
    if (auth.isAuthenticated) {
      throw redirect({ href: search.redirect });
    }
  },
});

function RouteComponent() {
  return (
    <div>
      <GridBG />

      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

const loginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().nonempty(),
});

function githubErrorMessage(code: string) {
  switch (code) {
    case 'access_denied':
      return 'Sign-in was cancelled on GitHub.';
    case 'account_not_linked':
      return "Verify this account's email first, then sign in with GitHub to link it.";
    case 'email_not_found':
      return 'GitHub did not share an email address.';
    default:
      return 'Please try again later';
  }
}

function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'form'>) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onChange: loginFormSchema,
    },
    onSubmit: async ({ value }) => {
      const { data, error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      });
      if (data && 'twoFactorRedirect' in data) {
        // the auth client's onTwoFactorRedirect hook navigates to /two-factor
        return;
      }
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
                  to="/forgot-password"
                  className="underline underline-offset-4 transition-colors hover:text-foreground/80"
                  onClick={() => inUseToast.dismiss()}
                >
                  reset your password
                </Link>
              </>
            ),
          });
        } else if (error.code === 'EMAIL_NOT_VERIFIED') {
          toast({
            variant: 'destructiveOutline',
            title: 'Email not verified',
            description: 'Verify your email before logging in',
          });
          await navigate({
            to: '/verify-email',
            search: { email: value.email, redirect: searchParams.redirect },
          });
        } else {
          toast({
            variant: 'destructiveOutline',
            title: 'Unknown error signing in',
            description: 'Please try again later',
          });
        }
      } else {
        queryClient.refetchQueries({ queryKey: ['auth'] });
        await navigate({ href: searchParams.redirect });
      }
    },
  });

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  // OAuth failures land back here as ?error=<code> (from errorCallbackURL)
  useEffect(() => {
    if (!searchParams.error) return;
    toast({
      variant: 'destructiveOutline',
      title: 'GitHub sign-in failed',
      description: githubErrorMessage(searchParams.error),
    });
    navigate({ to: '/login', search: { redirect: searchParams.redirect }, replace: true });
  }, [searchParams.error, searchParams.redirect, toast, navigate]);

  async function handleGithubSignIn() {
    setGithubLoading(true);
    const { error } = await authClient.signIn.social({
      provider: 'github',
      callbackURL: searchParams.redirect,
      errorCallbackURL: `/login?redirect=${encodeURIComponent(searchParams.redirect)}`,
    });
    // on success the browser navigates to GitHub; only errors return here
    if (error) {
      setGithubLoading(false);
      toast({
        variant: 'destructiveOutline',
        title: 'Could not start GitHub sign-in',
        description: 'Please try again later',
      });
    }
  }

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
                  to="/forgot-password"
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
          Log In
        </Button>
        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span className="relative z-10 bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={githubLoading}
          onClick={handleGithubSignIn}
        >
          {githubLoading ? <LoaderIcon className="animate-spin-slow" /> : <GithubIcon />}
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
