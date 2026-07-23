import { useRouter } from '@tanstack/react-router';
import { LoaderIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
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
import { Textarea } from '~/components/ui/textarea';
import { type Bucket, createBucket, updateBucket } from '~/functions/buckets';
import { useToast } from '~/hooks/use-toast';
import { type BucketFile, BucketFileSchema } from '~/lib/bucket-schema';

function parseWordList(input: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const raw of input.replaceAll('\n', ',').split(',')) {
    const word = raw.trim();
    const key = word.toLowerCase();
    if (word.length > 0 && !seen.has(key)) {
      seen.add(key);
      words.push(word);
    }
  }
  return words;
}

/** Create or edit a word bucket via the GUI form. */
export function BucketFormDialog({
  bucket,
  trigger,
}: {
  bucket?: Bucket;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(bucket?.name ?? '');
  const [description, setDescription] = useState(bucket?.description ?? '');
  const [language, setLanguage] = useState(bucket?.language ?? '');
  const [author, setAuthor] = useState(bucket?.author ?? '');
  const [words, setWords] = useState(bucket?.words.join(', ') ?? '');
  const [saving, setSaving] = useState(false);

  const wordCount = parseWordList(words).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = BucketFileSchema.safeParse({
      name,
      description: description || undefined,
      language: language || undefined,
      author: author || undefined,
      words: parseWordList(words),
    });
    if (!parsed.success) {
      toast({
        variant: 'destructiveOutline',
        title: 'Invalid bucket',
        description: 'Check the name and enter at least one word.',
      });
      return;
    }
    setSaving(true);
    try {
      if (bucket) {
        await updateBucket({ data: { id: bucket.id, ...parsed.data } });
      } else {
        await createBucket({ data: parsed.data });
      }
      await router.invalidate();
      setOpen(false);
      if (!bucket) {
        setName('');
        setDescription('');
        setLanguage('');
        setAuthor('');
        setWords('');
      }
      toast({
        title: bucket ? 'Bucket updated' : 'Bucket created',
        description: `${parsed.data.name} has ${parsed.data.words.length} words.`,
      });
    } catch (error) {
      toast({
        variant: 'destructiveOutline',
        title: `Could not ${bucket ? 'update' : 'create'} bucket`,
        description: error instanceof Error ? error.message : 'Please try again later',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bucket ? `Edit ${bucket.name}` : 'New Word Bucket'}</DialogTitle>
          <DialogDescription>
            A word bucket is a named list of words that rooms can deal boards from.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="bucket-name">Name</Label>
            <Input
              id="bucket-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Movie Night"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bucket-description">Description (optional)</Label>
            <Input
              id="bucket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Words from our favorite movies"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bucket-language">Language (optional)</Label>
              <Input
                id="bucket-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="en"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bucket-author">Author (optional)</Label>
              <Input
                id="bucket-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bucket-words">Words (comma-separated)</Label>
            <Textarea
              id="bucket-words"
              value={words}
              onChange={(e) => setWords(e.target.value)}
              placeholder="Apple, River, Knight, Comet, ..."
              className="min-h-32"
              required
            />
            <p className="text-xs text-muted-foreground">{wordCount} words</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && <LoaderIcon className="animate-spin-slow" />}
              {bucket ? 'Save Changes' : 'Create Bucket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Import a word bucket from its JSON representation (file upload or paste). */
export function BucketImportDialog({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  function parse(input: string): BucketFile | null {
    try {
      const result = BucketFileSchema.safeParse(JSON.parse(input));
      if (!result.success) {
        setError('The JSON does not match the bucket format (name plus an array of words).');
        return null;
      }
      setError(null);
      return result.data;
    } catch {
      setError('Not valid JSON.');
      return null;
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setJson(text);
    parse(text);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    const data = parse(json);
    if (!data) return;
    setImporting(true);
    try {
      await createBucket({ data });
      await router.invalidate();
      setOpen(false);
      setJson('');
      toast({ title: 'Bucket imported', description: `${data.name} has ${data.words.length} words.` });
    } catch (err) {
      toast({
        variant: 'destructiveOutline',
        title: 'Could not import bucket',
        description: err instanceof Error ? err.message : 'Please try again later',
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Word Bucket</DialogTitle>
          <DialogDescription>
            Upload or paste a bucket JSON file, like the ones the Export button produces.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleImport} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="bucket-file">JSON file</Label>
            <Input
              id="bucket-file"
              type="file"
              accept=".json,application/json"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bucket-json">Or paste JSON</Label>
            <Textarea
              id="bucket-json"
              value={json}
              onChange={(e) => {
                setJson(e.target.value);
                if (error) parse(e.target.value);
              }}
              placeholder='{ "name": "My Bucket", "words": ["Apple", "River"] }'
              className="min-h-32 font-mono text-xs"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={importing || json.trim() === ''}>
              {importing && <LoaderIcon className="animate-spin-slow" />}
              Import Bucket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Download a bucket as JSON in the shared BucketFile format. */
export function exportBucket(bucket: Bucket) {
  const file: BucketFile = {
    name: bucket.name,
    description: bucket.description ?? undefined,
    language: bucket.language ?? undefined,
    author: bucket.author ?? undefined,
    words: bucket.words,
  };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${bucket.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
