import { useQueryClient } from '@tanstack/react-query';
import { KeyRoundIcon, LoaderIcon } from 'lucide-react';
import { useState } from 'react';
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
import { GithubIcon } from '~/components/github-icon';
import { useToast } from '~/hooks/use-toast';
import { authClient } from '~/lib/auth-client';

export function LinkedAccountsCard({
  accounts,
  loading,
}: {
  accounts: { providerId: string }[];
  loading: boolean;
}) {
  const hasPassword = accounts.some((a) => a.providerId === 'credential');
  const hasGithub = accounts.some((a) => a.providerId === 'github');

  return (
    <Card className="backdrop-blur-sm bg-card/25">
      <CardHeader>
        <CardTitle className="text-xl">Linked Accounts</CardTitle>
        <CardDescription>Sign-in methods connected to your account.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {loading ? (
          <LoaderIcon className="animate-spin-slow text-muted-foreground" />
        ) : (
          <>
            {hasPassword && (
              <div className="flex items-center gap-3">
                <KeyRoundIcon className="size-5 shrink-0" />
                <div className="grid">
                  <span className="text-sm font-medium">Email & Password</span>
                  <span className="text-sm text-muted-foreground">Password sign-in</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <GithubIcon className="size-5 shrink-0" />
              <div className="grid">
                <span className="text-sm font-medium">GitHub</span>
                <span className="text-sm text-muted-foreground">
                  {hasGithub ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <div className="ml-auto">
                {hasGithub ? (
                  <UnlinkGithubDialog lastMethod={accounts.length <= 1} />
                ) : (
                  <LinkGithubButton />
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LinkGithubButton() {
  const { toast } = useToast();
  const [linking, setLinking] = useState(false);

  async function handleLink() {
    setLinking(true);
    const { error } = await authClient.linkSocial({
      provider: 'github',
      callbackURL: '/account',
      errorCallbackURL: '/account',
    });
    // on success the browser navigates to GitHub; only errors return here
    if (error) {
      setLinking(false);
      toast({
        variant: 'destructiveOutline',
        title: 'Could not start GitHub linking',
        description: 'Please try again later',
      });
    }
  }

  return (
    <Button variant="outline" disabled={linking} onClick={handleLink}>
      {linking && <LoaderIcon className="animate-spin-slow" />}
      Link GitHub
    </Button>
  );
}

function UnlinkGithubDialog({ lastMethod }: { lastMethod: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function handleUnlink() {
    setBusy(true);
    const { error } = await authClient.unlinkAccount({ providerId: 'github' });
    setBusy(false);
    if (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not unlink GitHub',
        description:
          error.code === 'SESSION_EXPIRED'
            ? 'Please log in again to unlink accounts.'
            : error.code === 'FAILED_TO_UNLINK_LAST_ACCOUNT'
              ? 'This is your only sign-in method — set a password first.'
              : 'Please try again later',
      });
    } else {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'GitHub unlinked' });
    }
  }

  if (lastMethod) {
    return (
      <Button variant="outline" disabled title="Set a password first — this is your only sign-in method">
        Unlink
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Unlink</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unlink GitHub?</AlertDialogTitle>
          <AlertDialogDescription>
            You will no longer be able to log in with GitHub. You can link it again at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              handleUnlink();
            }}
          >
            {busy && <LoaderIcon className="animate-spin-slow" />}
            Unlink
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
