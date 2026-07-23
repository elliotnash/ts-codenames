import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { LoaderIcon } from 'lucide-react';
import { useState } from 'react';
import { GridBG } from '~/components/background';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { UserMenu } from '~/components/user-menu';
import { useAuth, useAuthOptions } from '~/hooks/use-auth';
import { useToast } from '~/hooks/use-toast';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/account')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const auth = await queryClient.ensureQueryData(useAuthOptions());
    if (!auth.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const auth = useAuth();

  return (
    <main className="container min-h-screen w-full flex flex-col p-0">
      <GridBG />
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md">
          <div className="container flex h-16 items-center justify-between px-4">
            <h1 className="text-2xl font-bold">Account Settings</h1>
            <UserMenu className="bg-card/25" />
          </div>
        </header>
        <main className="container px-4 py-8 max-w-2xl space-y-6">
          <ProfileCard initialName={auth.data?.user.name ?? ''} />
          <EmailCard initialEmail={auth.data?.user.email ?? ''} />
          <PasswordCard />
          <DangerZoneCard />
        </main>
      </div>
    </main>
  );
}

function ProfileCard({ initialName }: { initialName: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setSaving(false);
    if (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not update name',
        description: 'Please try again later',
      });
    } else {
      await queryClient.refetchQueries({ queryKey: ['auth'] });
      toast({ title: 'Name updated' });
    }
  }

  return (
    <Card className="backdrop-blur-sm bg-card/25">
      <CardHeader>
        <CardTitle className="text-xl">Profile</CardTitle>
        <CardDescription>Your display name.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="account-name">Full Name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="justify-self-start" disabled={saving || name.trim() === ''}>
            {saving && <LoaderIcon className="animate-spin-slow" />}
            Save Name
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EmailCard({ initialEmail }: { initialEmail: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await authClient.changeEmail({ newEmail: email.trim() });
    setSaving(false);
    if (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not change email',
        description:
          error.code === 'COULDNT_UPDATE_YOUR_EMAIL'
            ? 'That email may already be in use.'
            : 'Please try again later',
      });
    } else {
      await queryClient.refetchQueries({ queryKey: ['auth'] });
      toast({ title: 'Email updated', description: 'Use your new email the next time you log in.' });
    }
  }

  return (
    <Card className="backdrop-blur-sm bg-card/25">
      <CardHeader>
        <CardTitle className="text-xl">Email</CardTitle>
        <CardDescription>The address you use to log in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="account-email">Email</Label>
            <Input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="justify-self-start"
            disabled={saving || email.trim() === '' || email.trim() === initialEmail}
          >
            {saving && <LoaderIcon className="animate-spin-slow" />}
            Save Email
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const mismatch = confirmPassword !== '' && newPassword !== confirmPassword;
  const tooShort = newPassword !== '' && newPassword.length < 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch || tooShort) return;
    setSaving(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setSaving(false);
    if (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not change password',
        description:
          error.code === 'INVALID_PASSWORD' ? 'Current password is incorrect.' : 'Please try again later',
      });
    } else {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Password changed', description: 'Other sessions have been signed out.' });
    }
  }

  return (
    <Card className="backdrop-blur-sm bg-card/25">
      <CardHeader>
        <CardTitle className="text-xl">Password</CardTitle>
        <CardDescription>Changing your password signs out your other sessions.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            {tooShort && (
              <p className="text-sm font-medium text-destructive">
                Password must be at least 8 characters
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            {mismatch && (
              <p className="text-sm font-medium text-destructive">Passwords do not match</p>
            )}
          </div>
          <Button
            type="submit"
            className="justify-self-start"
            disabled={saving || currentPassword === '' || newPassword === '' || mismatch || tooShort}
          >
            {saving && <LoaderIcon className="animate-spin-slow" />}
            Change Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DangerZoneCard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const { error } = await authClient.deleteUser({ password });
    setDeleting(false);
    if (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not delete account',
        description:
          error.code === 'INVALID_PASSWORD' ? 'Password is incorrect.' : 'Please try again later',
      });
    } else {
      await queryClient.refetchQueries({ queryKey: ['auth'] });
      await navigate({ to: '/' });
    }
  }

  return (
    <Card className="backdrop-blur-sm bg-card/25 border-destructive/50">
      <CardHeader>
        <CardTitle className="text-xl text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          Deleting your account also deletes all of your rooms and word buckets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete Account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your account, rooms, and word buckets. Enter your password
                to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="delete-password">Password</Label>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={password === '' || deleting}
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
              >
                {deleting && <LoaderIcon className="animate-spin-slow" />}
                Delete Forever
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
