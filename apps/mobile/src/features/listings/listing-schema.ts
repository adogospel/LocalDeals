import { z } from 'zod';

import type { ListingCondition } from '@/types/database';

export const MAX_LISTING_PHOTOS = 6;
export const MAX_LISTING_IMAGE_BYTES = 6 * 1024 * 1024;

export type ListingPhoto = {
  uri: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  width: number;
  height: number;
};

export const listingSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(20).max(2000),
  price: z.number().int().min(100).max(1_000_000_000),
  categoryId: z.number().int().positive(),
  condition: z.enum(['new', 'like_new', 'good', 'fair']),
  cityId: z.number().int().positive().nullable(),
  cityName: z.string().trim().max(80),
  customCity: z.string().trim().max(80),
  neighborhoodId: z.number().int().positive().nullable(),
  neighborhoodName: z.string().trim().max(100),
  customNeighborhood: z.string().trim().max(100),
  photos: z.array(z.object({
    uri: z.string().min(1),
    fileName: z.string().nullable(),
    mimeType: z.string().nullable(),
    fileSize: z.number().nullable(),
    width: z.number().positive(),
    height: z.number().positive(),
  })).min(1).max(MAX_LISTING_PHOTOS),
}).superRefine((values, context) => {
  if (!values.cityId) {
    context.addIssue({ code: 'custom', path: ['cityId'], message: 'city_required' });
  }
  if (!values.neighborhoodId) {
    context.addIssue({ code: 'custom', path: ['neighborhoodId'], message: 'neighborhood_required' });
  }
  values.photos.forEach((photo, index) => {
    if (photo.fileSize && photo.fileSize > MAX_LISTING_IMAGE_BYTES) {
      context.addIssue({ code: 'custom', path: ['photos', index], message: 'image_too_large' });
    }
    if (photo.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimeType)) {
      context.addIssue({ code: 'custom', path: ['photos', index], message: 'image_type_invalid' });
    }
  });
});

export type ListingFormValues = z.infer<typeof listingSchema>;

export type ListingDraft = Omit<ListingFormValues, 'price'> & {
  priceText: string;
};

export function parsePriceInput(value: string): number | null {
  const normalized = value.replace(/[\s.,]/g, '');
  if (!/^\d+$/.test(normalized)) return null;
  const price = Number(normalized);
  return Number.isSafeInteger(price) ? price : null;
}

export const listingConditions: ListingCondition[] = ['new', 'like_new', 'good', 'fair'];
