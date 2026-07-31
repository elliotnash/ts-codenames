import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { Check, LoaderIcon, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GridBG } from '~/components/background';
import { GameModeSelector } from '~/components/game-mode-selector';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
import { getBuckets } from '~/functions/buckets';
import { checkCodeAvailable, createRoom } from '~/functions/rooms';
import { useAuthOptions } from '~/hooks/use-auth';
import { useToast } from '~/hooks/use-toast';
import { BOARD_SIZE, unionBucketWords } from '~/lib/deal';
import { ROOM_CODE_REGEX } from '~/lib/room-codes';
import type { GameMode } from '~/lib/room-events';

export const Route = createFileRoute('/create')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const auth = await queryClient.ensureQueryData(useAuthOptions());
    if (!auth.isAuthenticated) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  loader: () => getBuckets(),
  component: RouteComponent,
});

function RouteComponent() {
  const buckets = Route.useLoaderData();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<GameMode>('classic');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const uniqueWords = useMemo(
    () => unionBucketWords(buckets.filter((bucket) => selectedIds.includes(bucket.id))).length,
    [buckets, selectedIds],
  );

  const normalizedCode = code.trim().toLowerCase();
  const codeValid = normalizedCode === '' || ROOM_CODE_REGEX.test(normalizedCode);
  const [debouncedCode] = useDebouncedValue(normalizedCode, 300);

  const availability = useQuery({
    queryKey: ['code-check', debouncedCode],
    queryFn: () => checkCodeAvailable({ data: { code: debouncedCode } }),
    enabled: debouncedCode !== '' && ROOM_CODE_REGEX.test(debouncedCode),
  });

  const codeTaken =
    normalizedCode !== '' &&
    normalizedCode === debouncedCode &&
    availability.data?.available === false;

  function toggleBucket(id: string, checked: boolean) {
    setSelectedIds((ids) => (checked ? [...ids, id] : ids.filter((other) => other !== id)));
  }

  const canSubmit =
    selectedIds.length > 0 && uniqueWords >= BOARD_SIZE && codeValid && !codeTaken && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { code: roomCode } = await createRoom({
        data: {
          code: normalizedCode || undefined,
          bucketIds: selectedIds,
          password: password || undefined,
          mode,
        },
      });
      await navigate({ to: '/game/$code', params: { code: roomCode } });
    } catch (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not create room',
        description: error instanceof Error ? error.message : 'Please try again later',
      });
      setSubmitting(false);
    }
  }

  return (
    <main className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center">
      <GridBG />
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Create New Room</h2>
          <p className="text-sm text-muted-foreground text-balance">
            A room is a shareable board with its own code — anyone with the link can play.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="block pb-1">Game Mode</Label>
            <GameModeSelector value={mode} onChange={setMode} />
          </div>

          <div className="space-y-2">
            <Label className="block pb-1">Word Buckets</Label>
            <div className="rounded-md border bg-card/25 backdrop-blur-sm divide-y max-h-64 overflow-y-auto">
              {buckets.map((bucket) => (
                <label
                  key={bucket.id}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/40 transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.includes(bucket.id)}
                    onCheckedChange={(checked) => toggleBucket(bucket.id, checked === true)}
                  />
                  <span className="flex-1 text-sm font-medium">{bucket.name}</span>
                  {bucket.isSystem && (
                    <Badge variant="outline" className="text-xs">
                      System
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{bucket.words.length} words</span>
                </label>
              ))}
              {buckets.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">No word buckets available yet.</p>
              )}
            </div>
            <p
              className={
                uniqueWords >= BOARD_SIZE
                  ? 'text-xs text-muted-foreground'
                  : 'text-xs text-destructive'
              }
            >
              {uniqueWords} unique words selected (at least {BOARD_SIZE} needed)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-code" className="block pb-1">
              Room Code (optional)
            </Label>
            <div className="relative">
              <Input
                id="room-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="brave-tiger"
                autoComplete="off"
              />
              {normalizedCode !== '' &&
                (!codeValid || codeTaken ? (
                  <X className="absolute right-2 top-2.5 h-4 w-4 text-red-500" />
                ) : availability.isFetching || normalizedCode !== debouncedCode ? (
                  <LoaderIcon className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground animate-spin-slow" />
                ) : availability.data?.available ? (
                  <Check className="absolute right-2 top-2.5 h-4 w-4 text-green-500" />
                ) : null)}
            </div>
            <p className="text-xs text-muted-foreground">
              {normalizedCode === ''
                ? "Leave blank and we'll pick one for you."
                : !codeValid
                  ? '3-24 characters: lowercase letters, digits, and inner hyphens.'
                  : codeTaken
                    ? 'That code is already taken.'
                    : 'Anyone can join at /game/' + normalizedCode}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-password" className="block pb-1">
              Password (optional)
            </Label>
            <Input
              id="room-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for an open room"
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Players will be asked for this password before they can see the board.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting && <LoaderIcon className="animate-spin-slow" />}
            Create Room
          </Button>
        </form>

        <Separator />

        <div className="text-center">
          <Button asChild variant="link">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
