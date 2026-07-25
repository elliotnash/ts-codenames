import { useForm } from '@tanstack/react-form';
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { GridBG } from '~/components/background';
import { GithubIcon } from '~/components/github-icon';
import { Button } from '~/components/ui/button';
import { FieldInfo } from '~/components/ui/field-info';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { authClient } from '~/lib/auth-client';
import { LoaderIcon } from 'lucide-react';
import { cn } from '~/lib/utils';
import { useToast } from '~/hooks/use-toast';
import { authSearchSchema } from '~/lib/schema';
import { useAuthOptions } from '~/hooks/use-auth';

export const Route = createFileRoute('/(auth)/register')({
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
          <RegisterForm />
        </div>
      </div>
    </div>
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
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your info below to create to an account
        </p>
      </div>
      <div className="grid gap-6">
        <form.Field
          name="fullName"
          children={(field) => (
            <div className="grid gap-2">
              <Label htmlFor={field.name}>Full Name</Label>
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
            </div>
          )}
        />

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
              <Label htmlFor={field.name}>Password</Label>
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
      </div>
      <div className="text-center text-sm">
        Already have an account?{' '}
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
