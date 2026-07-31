import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { LoaderIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { GridBG } from '~/components/background';
import { LinkedAccountsCard } from '~/components/linked-accounts-card';
import { MotionProvider, m, riseItem, staggerParent } from '~/components/motion';
import { PageHeading } from '~/components/page-heading';
import { SiteHeader } from '~/components/site-header';
import { TwoFactorCard } from '~/components/two-factor-card';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { setPassword as setPasswordFn } from '~/functions/account';
import { useAuth, useAuthOptions } from '~/hooks/use-auth';
import { useToast } from '~/hooks/use-toast';
import { authClient } from '~/lib/auth-client';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/account')({
  validateSearch: z.object({
    // error codes appended by better-auth's link-account error redirect
    error: z.string().optional(),
  }),
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const auth = await queryClient.ensureQueryData(useAuthOptions());
    if (!auth.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  head: () => ({ meta: [{ title: 'Account — Codenames' }] }),
  component: RouteComponent,
});

const cardTitleStyle = 'text-xl font-display font-bold uppercase tracking-wide';

function linkErrorMessage(code: string) {
  switch (code) {
    case "email_doesn't_match":
      return 'That GitHub account uses a different email than this account.';
    case 'account_already_linked_to_different_user':
      return 'That GitHub account is already linked to another user.';
    default:
      return 'Please try again later';
  }
}

function RouteComponent() {
  const auth = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const searchParams = Route.useSearch();

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await authClient.listAccounts()).data ?? [],
  });
  const accounts = accountsQuery.data ?? [];
  // While loading, assume a password exists so credential users don't see a set-password flash
  const hasPassword =
    accountsQuery.isPending || accounts.some((a) => a.providerId === 'credential');

  // Link failures land back here as ?error=<code> (from errorCallbackURL)
  useEffect(() => {
    if (!searchParams.error) return;
    toast({
      variant: 'destructiveOutline',
      title: 'Could not link GitHub',
      description: linkErrorMessage(searchParams.error),
    });
    navigate({ to: '/account', search: {}, replace: true });
  }, [searchParams.error, toast, navigate]);

  return (
    <MotionProvider>
      <div className="min-h-screen flex flex-col">
        <GridBG />
        <SiteHeader sticky />
        <main className="container mx-auto w-full px-4 py-8 max-w-2xl">
          <m.div variants={staggerParent} initial="hidden" animate="show" className="space-y-6">
            <PageHeading eyebrow="// Personnel file" title="Account" />
            <m.div variants={riseItem}>
              <ProfileCard initialName={auth.data?.user.name ?? ''} />
            </m.div>
            <m.div variants={riseItem}>
              <EmailCard initialEmail={auth.data?.user.email ?? ''} />
            </m.div>
            <m.div variants={riseItem}>
              <PasswordCard hasPassword={hasPassword} />
            </m.div>
            <m.div variants={riseItem}>
              <TwoFactorCard
                enabled={auth.data?.user.twoFactorEnabled ?? false}
                hasPassword={hasPassword}
              />
            </m.div>
            <m.div variants={riseItem}>
              <LinkedAccountsCard accounts={accounts} loading={accountsQuery.isPending} />
            </m.div>
            <m.div variants={riseItem}>
              <DangerZoneCard hasPassword={hasPassword} />
            </m.div>
          </m.div>
        </main>
      </div>
    </MotionProvider>
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
        <CardTitle className={cardTitleStyle}>Profile</CardTitle>
        <CardDescription>Your display name.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="account-name" className="block pb-1">
              Full Name
            </Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="justify-self-start"
            disabled={saving || name.trim() === ''}
          >
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
      toast({
        title: 'Confirmation email sent',
        description: 'Approve the change from your current email, then verify the new address.',
      });
    }
  }

  return (
    <Card className="backdrop-blur-sm bg-card/25">
      <CardHeader>
        <CardTitle className={cardTitleStyle}>Email</CardTitle>
        <CardDescription>
          The address you use to log in. Changing it requires confirmation from your current
          address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="account-email" className="block pb-1">
              Email
            </Label>
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

function PasswordCard({ hasPassword }: { hasPassword: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
    if (hasPassword) {
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
            error.code === 'INVALID_PASSWORD'
              ? 'Current password is incorrect.'
              : 'Please try again later',
        });
        return;
      }
      toast({ title: 'Password changed', description: 'Other sessions have been signed out.' });
    } else {
      try {
        await setPasswordFn({ data: { newPassword } });
      } catch {
        setSaving(false);
        toast({
          variant: 'destructiveOutline',
          title: 'Could not set password',
          description: 'Please try again later',
        });
        return;
      }
      setSaving(false);
      // Flips this card to change mode and unlocks 2FA / account deletion
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Password set' });
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  return (
    <Card className="backdrop-blur-sm bg-card/25">
      <CardHeader>
        <CardTitle className={cardTitleStyle}>Password</CardTitle>
        <CardDescription>
          {hasPassword
            ? 'Changing your password signs out your other sessions.'
            : 'You signed up with GitHub. Set a password to enable two-factor authentication and account deletion.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {hasPassword && (
            <div className="grid gap-2">
              <Label htmlFor="current-password" className="block pb-1">
                Current Password
              </Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="new-password" className="block pb-1">
              New Password
            </Label>
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
            <Label htmlFor="confirm-password" className="block pb-1">
              Confirm New Password
            </Label>
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
            disabled={
              saving ||
              (hasPassword && currentPassword === '') ||
              newPassword === '' ||
              mismatch ||
              tooShort
            }
          >
            {saving && <LoaderIcon className="animate-spin-slow" />}
            {hasPassword ? 'Change Password' : 'Set Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DangerZoneCard({ hasPassword }: { hasPassword: boolean }) {
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
        <CardTitle className={cn(cardTitleStyle, 'text-destructive')}>Danger Zone</CardTitle>
        <CardDescription>
          Deleting your account also deletes all of your rooms and word buckets.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 justify-items-start">
        {!hasPassword && (
          <p className="text-sm text-muted-foreground">
            Set a password above to delete your account.
          </p>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={!hasPassword}>
              Delete Account
            </Button>
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
              <Label htmlFor="delete-password" className="block pb-1">
                Password
              </Label>
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
