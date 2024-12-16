import { useForm } from '@tanstack/react-form';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { GridBG } from '~/components/background';
import { Button } from '~/components/ui/button';
import { FieldInfo } from '~/components/ui/field-info';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { authClient } from '~/lib/auth-client';
import { LoaderIcon } from 'lucide-react';
import { cn } from '~/lib/utils';
import { useToast } from '~/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const Route = createFileRoute('/(auth)/register')({
  component: RouteComponent,
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

const RegisterFormSchema = z.object({
  fullName: z.string().nonempty('Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
});

function RegisterForm({ className, ...props }: React.ComponentPropsWithoutRef<'form'>) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onChange: RegisterFormSchema,
    },
    onSubmit: async ({ value }) => {
      const { data, error } = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name: value.fullName,
      });
      if (error) {
        console.log('Registration error');
        console.log(error);
        if (error.code === 'USER_ALREADY_EXISTS') {
          const inUseToast = toast({
            variant: 'destructiveOutline',
            title: 'Email already in use',
            description: (
              <>
                Please try{' '}
                <Link
                  to="/login"
                  className="underline underline-offset-4 transition-colors hover:text-foreground/80"
                  onClick={() => inUseToast.dismiss()}
                >
                  signing in
                </Link>
              </>
            ),
          });
        } else {
          toast({
            variant: 'destructiveOutline',
            title: 'Unknown error signing up',
            description: 'Please try again later',
          });
        }
      } else {
        queryClient.refetchQueries({ queryKey: ['auth'] });
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
