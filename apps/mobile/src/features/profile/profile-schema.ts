import { z } from 'zod';

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(50),
  cityId: z.number().int().positive().nullable(),
  cityName: z.string().trim().max(80),
  customCity: z.string().trim().max(80),
  neighborhoodId: z.number().int().positive().nullable(),
  neighborhoodName: z.string().trim().max(100),
  customNeighborhood: z.string().trim().max(100),
  preferredLanguage: z.enum(['fr', 'en']),
}).superRefine((values, context) => {
  if (!values.cityId && values.customCity.length < 2) {
    context.addIssue({ code: 'custom', path: ['customCity'], message: 'city_required' });
  }
  if (!values.neighborhoodId && values.customNeighborhood.length < 2) {
    context.addIssue({ code: 'custom', path: ['customNeighborhood'], message: 'neighborhood_required' });
  }
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
