import { z } from 'zod';

// Shared shape for bucket JSON import/export, system bucket files, and the GUI forms.
export const BucketFileSchema = z.object({
  name: z.string().trim().min(1).max(64),
  description: z.string().trim().max(500).optional(),
  language: z.string().trim().max(32).optional(),
  author: z.string().trim().max(64).optional(),
  words: z
    .array(z.string().trim().min(1).max(40))
    .min(1)
    .max(2000),
});

export type BucketFile = z.infer<typeof BucketFileSchema>;
