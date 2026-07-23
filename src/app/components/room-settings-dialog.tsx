import { useRouter } from '@tanstack/react-router';
import { LoaderIcon, Settings } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
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
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import type { Bucket } from '~/functions/buckets';
import { updateRoomSettings } from '~/functions/rooms';
import { useToast } from '~/hooks/use-toast';
import { BOARD_SIZE, unionBucketWords } from '~/lib/deal';

export function RoomSettingsDialog({
  room,
  buckets,
}: {
  room: { id: string; code: string; hasPassword: boolean; buckets: { id: string }[] };
  buckets: Bucket[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => room.buckets.map((bucket) => bucket.id));
  const [passworded, setPassworded] = useState(room.hasPassword);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const uniqueWords = unionBucketWords(
    buckets.filter((bucket) => selectedIds.includes(bucket.id)),
  ).length;

  function toggleBucket(id: string, checked: boolean) {
    setSelectedIds((ids) => (checked ? [...ids, id] : ids.filter((other) => other !== id)));
  }

  const needsPasswordValue = passworded && !room.hasPassword && newPassword === '';
  const canSave = selectedIds.length > 0 && uniqueWords >= BOARD_SIZE && !needsPasswordValue && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateRoomSettings({
        data: {
          roomId: room.id,
          bucketIds: selectedIds,
          password: !passworded
            ? room.hasPassword
              ? { action: 'remove' }
              : { action: 'keep' }
            : newPassword !== ''
              ? { action: 'set', value: newPassword }
              : { action: 'keep' },
        },
      });
      await router.invalidate();
      setNewPassword('');
      setOpen(false);
      toast({ title: 'Room updated', description: `Settings for ${room.code} were saved.` });
    } catch (error) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not save settings',
        description: error instanceof Error ? error.message : 'Please try again later',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Room settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Room Settings</DialogTitle>
          <DialogDescription>
            Change the word buckets and password for <span className="font-mono">{room.code}</span>.
            New games deal from the selected buckets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Word Buckets</Label>
          <div className="rounded-md border divide-y max-h-52 overflow-y-auto">
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
          </div>
          <p
            className={
              uniqueWords >= BOARD_SIZE ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'
            }
          >
            {uniqueWords} unique words selected (at least {BOARD_SIZE} needed)
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor={`passworded-${room.id}`}>Password protected</Label>
            <Switch
              id={`passworded-${room.id}`}
              checked={passworded}
              onCheckedChange={setPassworded}
            />
          </div>
          {passworded && (
            <div className="space-y-1">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={room.hasPassword ? 'Unchanged' : 'Enter a password'}
                autoComplete="new-password"
              />
              {room.hasPassword && (
                <p className="text-xs text-muted-foreground">
                  Setting a new password signs out everyone who already joined with the old one.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving && <LoaderIcon className="animate-spin-slow" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
