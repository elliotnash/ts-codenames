import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { LoaderIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthShell } from '~/components/auth-shell';
import { m, riseItem } from '~/components/motion';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp';
import { Label } from '~/components/ui/label';
import { useAuthOptions } from '~/hooks/use-auth';
import { useToast } from '~/hooks/use-toast';
import { authClient } from '~/lib/auth-client';
import { twoFactorSearchSchema } from '~/lib/schema';

export const Route = createFileRoute('/(auth)/two-factor')({
  component: RouteComponent,
  head: () => ({ meta: [{ title: 'Two-factor — Codenames' }] }),
  validateSearch: twoFactorSearchSchema,
  beforeLoad: async ({ search, context: { queryClient } }) => {
    // Redirect if already authenticated
    const auth = await queryClient.ensureQueryData(useAuthOptions());
    if (auth.isAuthenticated) {
      throw redirect({ href: search.redirect });
    }
  },
});

type Mode = 'totp' | 'otp' | 'backup';

function RouteComponent() {
  const search = Route.useSearch();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>(search.totp || !search.otp ? 'totp' : 'otp');
  const [trustDevice, setTrustDevice] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setCode('');
  };

  const verify = async (value: string) => {
    if (!value || submitting) return;
    setSubmitting(true);
    const options = { code: value, trustDevice };
    const { error } =
      mode === 'totp'
        ? await authClient.twoFactor.verifyTotp(options)
        : mode === 'otp'
          ? await authClient.twoFactor.verifyOtp(options)
          : await authClient.twoFactor.verifyBackupCode(options);
    setSubmitting(false);
    if (error) {
      setCode('');
      if (error.code === 'INVALID_TWO_FACTOR_COOKIE') {
        toast({
          variant: 'destructiveOutline',
          title: 'Session expired',
          description: 'Please log in again',
        });
        await navigate({ to: '/login', search: { redirect: search.redirect } });
      } else if (error.code === 'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE') {
        toast({
          variant: 'destructiveOutline',
          title: 'Too many attempts',
          description: 'Request a new code and try again',
        });
      } else if (error.code === 'ACCOUNT_TEMPORARILY_LOCKED') {
        toast({
          variant: 'destructiveOutline',
          title: 'Account temporarily locked',
          description: 'Too many failed attempts — try again later',
        });
      } else {
        toast({
          variant: 'destructiveOutline',
          title: 'Invalid code',
          description: 'Please try again',
        });
      }
    } else {
      queryClient.refetchQueries({ queryKey: ['auth'] });
      await navigate({ href: search.redirect });
    }
  };

  const sendOtp = async () => {
    const { error } = await authClient.twoFactor.sendOtp();
    if (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not send code',
        description: error.message ?? 'Please try again later',
      });
    } else {
      setOtpSent(true);
      setCooldown(60);
      toast({ title: 'Code sent', description: 'Check your email for a verification code' });
    }
  };

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <m.div variants={riseItem} className="flex flex-col items-center gap-2 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            {'// Second key'}
          </p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide">
            Two-factor authentication
          </h1>
          <p className="text-balance text-sm text-muted-foreground">
            {mode === 'totp' && 'Enter the 6-digit code from your authenticator app'}
            {mode === 'otp' &&
              (otpSent
                ? 'Enter the 6-digit code we emailed you'
                : "We'll email a 6-digit code to your address")}
            {mode === 'backup' && 'Enter one of your backup codes'}
          </p>
        </m.div>

        <div className="grid gap-6">
          {mode === 'backup' ? (
            <m.form
              variants={riseItem}
              className="grid gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                verify(code);
              }}
            >
              <Label htmlFor="backup-code" className="block pb-1">
                Backup code
              </Label>
              <Input
                id="backup-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                autoFocus
                required
              />
            </m.form>
          ) : mode === 'otp' && !otpSent ? (
            <m.div variants={riseItem}>
              <Button onClick={sendOtp} className="w-full">
                Email me a code
              </Button>
            </m.div>
          ) : (
            <m.div variants={riseItem} className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                onComplete={verify}
                autoFocus
                disabled={submitting}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </m.div>
          )}

          <m.div variants={riseItem} className="flex items-center gap-2">
            <Checkbox
              id="trust-device"
              checked={trustDevice}
              onCheckedChange={(checked) => setTrustDevice(checked === true)}
            />
            <Label htmlFor="trust-device" className="text-sm font-normal">
              Trust this device for 30 days
            </Label>
          </m.div>

          {(mode === 'backup' || (mode === 'otp' && otpSent)) && (
            <Button onClick={() => verify(code)} disabled={submitting || !code} className="w-full">
              {submitting && <LoaderIcon className="animate-spin-slow" />}
              Verify
            </Button>
          )}

          {mode === 'otp' && otpSent && (
            <Button variant="outline" onClick={sendOtp} disabled={cooldown > 0} className="w-full">
              {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
            </Button>
          )}
        </div>

        <m.div
          variants={riseItem}
          className="flex flex-col items-center gap-1 text-center text-sm text-muted-foreground"
        >
          {mode !== 'totp' && search.totp && (
            <button
              type="button"
              onClick={() => switchMode('totp')}
              className="underline underline-offset-4 transition-colors hover:text-foreground/80"
            >
              Use your authenticator app
            </button>
          )}
          {mode !== 'otp' && search.otp && (
            <button
              type="button"
              onClick={() => switchMode('otp')}
              className="underline underline-offset-4 transition-colors hover:text-foreground/80"
            >
              Email me a code instead
            </button>
          )}
          {mode !== 'backup' && (
            <button
              type="button"
              onClick={() => switchMode('backup')}
              className="underline underline-offset-4 transition-colors hover:text-foreground/80"
            >
              Use a backup code
            </button>
          )}
        </m.div>
      </div>
    </AuthShell>
  );
}
