import { useQueryClient } from '@tanstack/react-query';
import { CopyIcon, DownloadIcon, LoaderIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp';
import { Label } from '~/components/ui/label';
import { useToast } from '~/hooks/use-toast';
import { authClient } from '~/lib/auth-client';

export function TwoFactorCard({
  enabled,
  hasPassword,
}: {
  enabled: boolean;
  hasPassword: boolean;
}) {
  return (
    <Card className="backdrop-blur-sm bg-card/25">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
          {enabled && <Badge>Enabled</Badge>}
        </div>
        <CardDescription>
          {enabled
            ? 'Logging in requires a code from your authenticator app, an emailed code, or a backup code.'
            : 'Require a code from an authenticator app when logging in.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 justify-items-start">
        {!hasPassword && (
          <p className="text-sm text-muted-foreground">
            Set a password above to manage two-factor authentication.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <>
              <RegenerateBackupCodesDialog disabled={!hasPassword} />
              <DisableDialog disabled={!hasPassword} />
            </>
          ) : (
            <EnableWizard disabled={!hasPassword} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BackupCodesView({ codes }: { codes: string[] }) {
  const { toast } = useToast();

  const copy = async () => {
    await navigator.clipboard.writeText(codes.join('\n'));
    toast({ title: 'Backup codes copied' });
  };

  const download = () => {
    const blob = new Blob([`Codenames backup codes\n\n${codes.join('\n')}\n`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codenames-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border bg-muted/50 p-4 font-mono text-sm">
        {codes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <CopyIcon /> Copy
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          <DownloadIcon /> Download
        </Button>
      </div>
    </div>
  );
}

type WizardStep = 'password' | 'verify' | 'backup';

function EnableWizard({ disabled }: { disabled: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>('password');
  const [password, setPassword] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const secret = totpUri ? (new URL(totpUri).searchParams.get('secret') ?? '') : '';

  const reset = () => {
    setStep('password');
    setPassword('');
    setTotpUri('');
    setBackupCodes([]);
    setCode('');
  };

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await authClient.twoFactor.enable({ password });
    setBusy(false);
    if (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not start setup',
        description:
          error.code === 'INVALID_PASSWORD' ? 'Password is incorrect.' : 'Please try again later',
      });
    } else {
      setTotpUri(data.totpURI);
      setBackupCodes(data.backupCodes);
      setStep('verify');
    }
  }

  async function handleVerify(value: string) {
    if (busy) return;
    setBusy(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code: value });
    setBusy(false);
    if (error) {
      setCode('');
      toast({
        variant: 'destructiveOutline',
        title: 'Invalid code',
        description: 'Please try again',
      });
    } else {
      setStep('backup');
    }
  }

  async function handleDone() {
    await queryClient.refetchQueries({ queryKey: ['auth'] });
    setOpen(false);
    reset();
    toast({ title: 'Two-factor authentication enabled' });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Enrollment isn't active until the code is verified, so closing early is safe.
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled}>Enable 2FA</Button>
      </DialogTrigger>
      <DialogContent>
        {step === 'password' && (
          <>
            <DialogHeader>
              <DialogTitle>Enable two-factor authentication</DialogTitle>
              <DialogDescription>Confirm your password to begin setup.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEnable} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="enable-2fa-password">Password</Label>
                <Input
                  id="enable-2fa-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busy || password === ''}>
                  {busy && <LoaderIcon className="animate-spin-slow" />}
                  Continue
                </Button>
              </DialogFooter>
            </form>
          </>
        )}

        {step === 'verify' && (
          <>
            <DialogHeader>
              <DialogTitle>Scan the QR code</DialogTitle>
              <DialogDescription>
                Scan with your authenticator app, then enter the 6-digit code it shows.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 justify-items-center">
              <div className="rounded-md bg-white p-3">
                <QRCodeSVG value={totpUri} size={168} />
              </div>
              <div className="grid gap-1 text-center">
                <span className="text-xs text-muted-foreground">
                  Or enter this key manually:
                </span>
                <code className="rounded bg-muted px-2 py-1 font-mono text-xs break-all">
                  {secret}
                </code>
              </div>
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                onComplete={handleVerify}
                autoFocus
                disabled={busy}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </>
        )}

        {step === 'backup' && (
          <>
            <DialogHeader>
              <DialogTitle>Save your backup codes</DialogTitle>
              <DialogDescription>
                Each code can be used once to log in if you lose access to your authenticator.
              </DialogDescription>
            </DialogHeader>
            <BackupCodesView codes={backupCodes} />
            <DialogFooter>
              <Button onClick={handleDone}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RegenerateBackupCodesDialog({ disabled }: { disabled: boolean }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRegenerate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
    setBusy(false);
    if (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not regenerate backup codes',
        description:
          error.code === 'INVALID_PASSWORD' ? 'Password is incorrect.' : 'Please try again later',
      });
    } else {
      setCodes(data.backupCodes);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPassword('');
          setCodes(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          Regenerate Backup Codes
        </Button>
      </DialogTrigger>
      <DialogContent>
        {codes ? (
          <>
            <DialogHeader>
              <DialogTitle>Your new backup codes</DialogTitle>
              <DialogDescription>
                Previous backup codes no longer work. Save these somewhere safe.
              </DialogDescription>
            </DialogHeader>
            <BackupCodesView codes={codes} />
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Regenerate backup codes</DialogTitle>
              <DialogDescription>
                This invalidates all of your existing backup codes.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRegenerate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="regen-codes-password">Password</Label>
                <Input
                  id="regen-codes-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busy || password === ''}>
                  {busy && <LoaderIcon className="animate-spin-slow" />}
                  Regenerate
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DisableDialog({ disabled }: { disabled: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleDisable() {
    setBusy(true);
    const { error } = await authClient.twoFactor.disable({ password });
    setBusy(false);
    if (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not disable 2FA',
        description:
          error.code === 'INVALID_PASSWORD' ? 'Password is incorrect.' : 'Please try again later',
      });
    } else {
      await queryClient.refetchQueries({ queryKey: ['auth'] });
      toast({ title: 'Two-factor authentication disabled' });
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={disabled}>
          Disable 2FA
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
          <AlertDialogDescription>
            Your account will no longer require a second factor to log in. Enter your password to
            confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="disable-2fa-password">Password</Label>
          <Input
            id="disable-2fa-password"
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
            disabled={password === '' || busy}
            onClick={(e) => {
              e.preventDefault();
              handleDisable();
            }}
          >
            {busy && <LoaderIcon className="animate-spin-slow" />}
            Disable
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
