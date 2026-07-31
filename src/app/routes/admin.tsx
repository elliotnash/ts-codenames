import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { LoaderIcon, MoreHorizontalIcon } from 'lucide-react';
import { useState } from 'react';
import { GridBG } from '~/components/background';
import { MotionProvider, m, riseItem, staggerParent } from '~/components/motion';
import { PageHeading } from '~/components/page-heading';
import { SiteHeader } from '~/components/site-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  adminDeleteUser,
  adminDisableTwoFactor,
  forceResetPassword,
  getAdminUsers,
  setUserRole,
} from '~/functions/admin';
import { useAuth, useAuthOptions } from '~/hooks/use-auth';
import { useToast } from '~/hooks/use-toast';

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const auth = await queryClient.ensureQueryData(useAuthOptions());
    if (!auth.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    if (auth.data?.user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
  },
  loader: () => getAdminUsers(),
  head: () => ({ meta: [{ title: 'Admin — Codenames' }] }),
  component: RouteComponent,
});

type AdminUser = Awaited<ReturnType<typeof getAdminUsers>>[number];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function RouteComponent() {
  const users = Route.useLoaderData();

  return (
    <MotionProvider>
      <div className="min-h-screen flex flex-col">
        <GridBG />
        <SiteHeader sticky />
        <main className="container mx-auto w-full px-4 py-8">
          <m.div variants={staggerParent} initial="hidden" animate="show" className="space-y-6">
            <PageHeading eyebrow="// Command" title="Admin" />
            <m.div variants={riseItem}>
              <Card className="backdrop-blur-sm bg-card/25">
                <CardHeader>
                  <CardTitle className="text-xl font-display font-bold uppercase tracking-wide">
                    Users
                  </CardTitle>
                  <CardDescription>
                    All registered accounts. Storage approximates the size of each user's rooms and
                    word buckets.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>2FA</TableHead>
                        <TableHead className="text-right">Rooms</TableHead>
                        <TableHead className="text-right">Buckets</TableHead>
                        <TableHead className="text-right">Storage</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <UserRow key={user.id} user={user} />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </m.div>
          </m.div>
        </main>
      </div>
    </MotionProvider>
  );
}

type Action = 'forceReset' | 'disable2fa' | 'makeAdmin' | 'removeAdmin' | 'delete';

const actionCopy: Record<Action, { title: string; description: string; button: string }> = {
  forceReset: {
    title: 'Force a password reset?',
    description:
      "This invalidates the user's current password, signs them out everywhere, and emails them a reset link.",
    button: 'Force Reset',
  },
  disable2fa: {
    title: 'Disable two-factor authentication?',
    description: 'The user will be able to log in with just their password.',
    button: 'Disable 2FA',
  },
  makeAdmin: {
    title: 'Grant admin access?',
    description: 'The user will be able to see and manage all accounts.',
    button: 'Make Admin',
  },
  removeAdmin: {
    title: 'Remove admin access?',
    description: 'The user will no longer be able to access the admin page.',
    button: 'Remove Admin',
  },
  delete: {
    title: 'Delete this user?',
    description: 'This permanently deletes their account, rooms, and word buckets.',
    button: 'Delete Forever',
  },
};

function UserRow({ user }: { user: AdminUser }) {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);

  const isSelf = auth.data?.user.id === user.id;
  const isAdmin = user.role === 'admin';

  async function run(action: Action) {
    setBusy(true);
    try {
      const data = { userId: user.id };
      if (action === 'forceReset') {
        await forceResetPassword({ data });
        toast({ title: 'Password reset forced', description: `Reset email sent to ${user.email}` });
      } else if (action === 'disable2fa') {
        await adminDisableTwoFactor({ data });
        toast({ title: '2FA disabled', description: `for ${user.email}` });
      } else if (action === 'makeAdmin' || action === 'removeAdmin') {
        await setUserRole({
          data: { ...data, role: action === 'makeAdmin' ? 'admin' : 'user' },
        });
        toast({ title: action === 'makeAdmin' ? 'Admin granted' : 'Admin removed' });
      } else {
        await adminDeleteUser({ data });
        toast({ title: 'User deleted', description: user.email });
      }
      await router.invalidate();
    } catch (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'Please try again later',
      });
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{user.name}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {user.email}
            {!user.emailVerified && <Badge variant="outline">unverified</Badge>}
          </div>
        </TableCell>
        <TableCell>
          {isAdmin ? <Badge>admin</Badge> : <Badge variant="secondary">user</Badge>}
        </TableCell>
        <TableCell>
          {user.twoFactorEnabled ? (
            <Badge variant="secondary">on</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="text-right">{user.roomCount}</TableCell>
        <TableCell className="text-right">{user.bucketCount}</TableCell>
        <TableCell className="text-right">{formatBytes(user.storageBytes)}</TableCell>
        <TableCell className="text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString()}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={busy}>
                {busy ? (
                  <LoaderIcon className="h-4 w-4 animate-spin-slow" />
                ) : (
                  <MoreHorizontalIcon className="h-4 w-4" />
                )}
                <span className="sr-only">User actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPending('forceReset')}>
                Force password reset
              </DropdownMenuItem>
              {user.twoFactorEnabled && (
                <DropdownMenuItem onClick={() => setPending('disable2fa')}>
                  Disable 2FA
                </DropdownMenuItem>
              )}
              {!isSelf &&
                (isAdmin ? (
                  <DropdownMenuItem onClick={() => setPending('removeAdmin')}>
                    Remove admin
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setPending('makeAdmin')}>
                    Make admin
                  </DropdownMenuItem>
                ))}
              {!isSelf && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setPending('delete')}
                  >
                    Delete user
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          {pending && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{actionCopy[pending].title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {user.email} — {actionCopy[pending].description}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={
                    pending === 'delete'
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : undefined
                  }
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault();
                    run(pending);
                  }}
                >
                  {busy && <LoaderIcon className="animate-spin-slow" />}
                  {actionCopy[pending].button}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
