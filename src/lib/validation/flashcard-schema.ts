import { z } from 'zod';

export const flashcardFormSchema = z.object({
  front_text: z.string()
    .min(1, 'Front text is required')
    .max(1000, 'Front text must be less than 1000 characters'),
  back_text: z.string()
    .min(1, 'Back text is required')
    .max(2000, 'Back text must be less than 2000 characters'),
  subject: z.string().optional(),
  difficulty: z.number()
    .min(1, 'Difficulty must be at least 1')
    .max(3, 'Difficulty must be at most 3')
    .default(2),
  deck_id: z.string().nullable().optional(),
});

export type FlashcardFormValues = z.infer<typeof flashcardFormSchema>;

export const validateFlashcardForm = (data: unknown) => {
  return flashcardFormSchema.safeParse(data);
};