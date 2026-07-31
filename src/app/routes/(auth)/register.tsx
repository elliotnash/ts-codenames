import { useForm } from '@tanstack/react-form';
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { LoaderIcon } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { AuthShell } from '~/components/auth-shell';
import { GithubIcon } from '~/components/github-icon';
import { m, riseItem } from '~/components/motion';
import { Button } from '~/components/ui/button';
import { FieldInfo } from '~/components/ui/field-info';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useAuthOptions } from '~/hooks/use-auth';
import { useToast } from '~/hooks/use-toast';
import { authClient } from '~/lib/auth-client';
import { authSearchSchema } from '~/lib/schema';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/(auth)/register')({
  component: RouteComponent,
  head: () => ({ meta: [{ title: 'Register — Codenames' }] }),
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
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}

const registerFormSchema = z.object({
  fullName: z.string().nonempty('Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
});

function RegisterForm({ className, ...props }: React.ComponentPropsWithoutRef<'form'>) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const searchParams = Route.useSearch();

  const form = useForm({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onChange: registerFormSchema,
    },
    onSubmit: async ({ value }) => {
      // Duplicate emails also return a generic success (enumeration protection),
      // so there is no USER_ALREADY_EXISTS branch here.
      const { error } = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name: value.fullName,
        callbackURL: `/verify-email?redirect=${encodeURIComponent(searchParams.redirect)}`,
      });
      if (error) {
        console.log('Registration error');
        console.log(error);
        toast({
          variant: 'destructiveOutline',
          title: 'Unknown error signing up',
          description: 'Please try again later',
        });
      } else {
        await navigate({
          to: '/verify-email',
          search: { email: value.email, redirect: searchParams.redirect },
        });
      }
    },
  });

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  async function handleGithubSignIn() {
    setGithubLoading(true);
    const { error } = await authClient.signIn.social({
      provider: 'github',
      callbackURL: searchParams.redirect,
      // error display lives on the login page
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
      <m.div variants={riseItem} className="flex flex-col items-center gap-2 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">
          {'// Recruitment'}
        </p>
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">
          Create an account
        </h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your info below to create to an account
        </p>
      </m.div>
      <div className="grid gap-6">
        <form.Field
          name="fullName"
          children={(field) => (
            <m.div variants={riseItem} className="grid gap-2">
              <Label htmlFor={field.name} className="block pb-1">
                Full Name
              </Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Jane Doe"
                required
              />
              <FieldInfo field={field} hasSubmitted={hasSubmitted} />
            </m.div>
          )}
        />

        <form.Field
          name="email"
          children={(field) => (
            <m.div variants={riseItem} className="grid gap-2">
              <Label htmlFor={field.name} className="block pb-1">
                Email
              </Label>
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
            </m.div>
          )}
        />

        <form.Field
          name="password"
          children={(field) => (
            <m.div variants={riseItem} className="grid gap-2">
              <Label htmlFor={field.name} className="block pb-1">
                Password
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

        <m.div variants={riseItem} className="grid gap-6">
          <Button type="submit" className="w-full">
            {form.state.isSubmitting && <LoaderIcon className="animate-spin-slow" />}
            Register
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
        </m.div>
      </div>
      <m.div variants={riseItem} className="text-center text-sm">
        Already have an account?{' '}
        <Link
          to="/login"
          className="underline underline-offset-4 transition-colors hover:text-foreground/80"
        >
          Log in
        </Link>
      </m.div>
    </form>
  );
}
