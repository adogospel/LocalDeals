import { fetch } from 'expo/fetch';
import { randomUUID } from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { cacheKeys, getCachedValue, setCachedValue } from '@/lib/cache';
import { supabase } from '@/lib/supabase';
import type {
  Category,
  Listing as DatabaseListing,
  ListingCondition,
  ListingImage,
  ListingStatus,
  Profile,
} from '@/types/database';

import { listings as mockListings, type Listing } from './mock-listings';
import {
  buildOrderedPrefixSearchQuery,
  filterAndSortListings,
  type ListingFilters,
} from './listing-filters';
import {
  MAX_LISTING_IMAGE_BYTES,
  MAX_LISTING_PHOTOS,
  type ListingFormValues,
  type ListingPhoto,
} from './listing-schema';
import { isListingVisibleInMarketplace } from './listing-status';

export type { ListingFilters, ListingSort } from './listing-filters';

type ListingQueryRow = DatabaseListing & {
  category: Category | null;
  images: ListingImage[] | null;
  seller: Pick<Profile, 'id' | 'display_name' | 'avatar_path'> | null;
  favorites: { user_id: string }[] | null;
};

const LISTING_SELECT = `
  id, seller_id, category_id, title, description, price, condition, status,
  city_id, neighborhood_id, custom_city, custom_neighborhood, city, neighborhood,
  published_at, created_at, updated_at,
  category:categories(id, slug, label_fr, label_en, symbol, sort_order, is_active, created_at),
  images:listing_images(id, listing_id, storage_path, position, width, height, created_at),
  seller:profiles(id, display_name, avatar_path),
  favorites(user_id)
`;

export const fallbackCategories: Category[] = [
  ['telephones', 'Téléphones', 'Phones', 'iphone'],
  ['informatique', 'Informatique', 'Computers', 'laptopcomputer'],
  ['electronique', 'Électronique', 'Electronics', 'headphones'],
  ['mode', 'Mode', 'Fashion', 'tshirt.fill'],
  ['maison', 'Maison', 'Home', 'house.fill'],
  ['vehicules', 'Véhicules', 'Vehicles', 'car.fill'],
  ['beaute', 'Beauté', 'Beauty', 'sparkles'],
  ['sports-loisirs', 'Sports & loisirs', 'Sports & leisure', 'figure.run'],
  ['bebe-enfant', 'Bébé & enfant', 'Baby & kids', 'figure.2.and.child.holdinghands'],
  ['livres', 'Livres', 'Books', 'book.fill'],
  ['autres', 'Autres', 'Other', 'shippingbox.fill'],
].map(([slug, labelFr, labelEn, symbol], index) => ({
  id: index + 1,
  slug,
  label_fr: labelFr,
  label_en: labelEn,
  symbol,
  sort_order: (index + 1) * 10,
  is_active: true,
  created_at: new Date(0).toISOString(),
}));

const conditionLabels: Record<ListingCondition, { fr: string; en: string }> = {
  new: { fr: 'Neuf', en: 'New' },
  like_new: { fr: 'Comme neuf', en: 'Like new' },
  good: { fr: 'Bon état', en: 'Good condition' },
  fair: { fr: 'État correct', en: 'Fair condition' },
};

export function getConditionLabel(condition: ListingCondition, language = 'fr'): string {
  return language.startsWith('en') ? conditionLabels[condition].en : conditionLabels[condition].fr;
}

export async function getCategories(useFallback = false): Promise<Category[]> {
  if (useFallback) return fallbackCategories;
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

function getImageUrl(path: string): string {
  return supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
}

function getPostedLabel(date: string, language = 'fr'): string {
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  const elapsedMinutes = Math.round((new Date(date).getTime() - Date.now()) / 60000);
  if (Math.abs(elapsedMinutes) < 60) return formatter.format(elapsedMinutes, 'minute');
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (Math.abs(elapsedHours) < 24) return formatter.format(elapsedHours, 'hour');
  return formatter.format(Math.round(elapsedHours / 24), 'day');
}

function mapListing(row: ListingQueryRow, language = 'fr'): Listing {
  const images = [...(row.images ?? [])].sort((a, b) => a.position - b.position);
  const imageUrls = images.map((image) => getImageUrl(image.storage_path));
  const category = row.category;
  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    price: row.price,
    imageUrl: imageUrls[0] ?? '',
    imageUrls,
    category: language.startsWith('en')
      ? category?.label_en ?? 'Other'
      : category?.label_fr ?? 'Autres',
    categoryId: row.category_id,
    categorySlug: category?.slug,
    condition: getConditionLabel(row.condition, language),
    conditionCode: row.condition,
    status: row.status,
    city: row.city,
    neighborhood: row.neighborhood,
    postedLabel: getPostedLabel(row.published_at ?? row.created_at, language),
    createdAt: row.created_at,
    description: row.description,
    isFavorite: Boolean(row.favorites?.length),
    seller: {
      id: row.seller?.id ?? row.seller_id,
      name: row.seller?.display_name ?? (language.startsWith('en') ? 'Local seller' : 'Vendeur local'),
      avatarPath: row.seller?.avatar_path ?? null,
      rating: 0,
      reviews: 0,
      sales: 0,
      responseTime: language.startsWith('en') ? 'New LocalDeals seller' : 'Nouveau vendeur LocalDeals',
    },
  };
}

function getDevelopmentListings(filters: ListingFilters, includeHidden = false): Listing[] {
  const local = getCachedValue<Listing[]>(cacheKeys.localListings) ?? [];
  const favoriteIds = new Set(getCachedValue<string[]>(cacheKeys.localFavorites) ?? []);
  const combined = [...local, ...mockListings].map((listing) => ({
    ...listing,
    sellerId: listing.sellerId ?? `development-seller-${listing.id}`,
    seller: {
      ...listing.seller,
      id: listing.seller.id ?? listing.sellerId ?? `development-seller-${listing.id}`,
    },
    isFavorite: favoriteIds.has(listing.id),
  }));
  return filterAndSortListings(
    combined.filter((listing) => includeHidden || isListingVisibleInMarketplace(listing.status)),
    filters,
  );
}

export async function getListings(
  filters: ListingFilters = {},
  options: { development?: boolean; language?: string; limit?: number } = {},
): Promise<Listing[]> {
  if (options.development) return getDevelopmentListings(filters);

  let request = supabase
    .from('listings')
    .select(LISTING_SELECT)
    .in('status', ['published', 'reserved'])
    .limit(options.limit ?? 40);

  const searchQuery = buildOrderedPrefixSearchQuery(filters.query ?? '');
  if (searchQuery) {
    request = request.textSearch('search_vector', searchQuery, { config: 'simple' });
  }
  if (filters.categoryId != null) request = request.eq('category_id', filters.categoryId);
  if (filters.condition) request = request.eq('condition', filters.condition);
  if (filters.minPrice != null) request = request.gte('price', filters.minPrice);
  if (filters.maxPrice != null) request = request.lte('price', filters.maxPrice);
  if (filters.city != null) request = request.eq('city', filters.city);

  if (filters.sort === 'price_asc') request = request.order('price', { ascending: true });
  else if (filters.sort === 'price_desc') request = request.order('price', { ascending: false });
  else request = request.order('published_at', { ascending: false });

  const { data, error } = await request;
  if (error) throw error;
  return (data as unknown as ListingQueryRow[]).map((row) => mapListing(row, options.language));
}

export async function getListing(
  listingId: string,
  options: { development?: boolean; language?: string } = {},
): Promise<Listing | null> {
  if (options.development) {
    return getDevelopmentListings({}, true).find((listing) => listing.id === listingId) ?? null;
  }
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('id', listingId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapListing(data as unknown as ListingQueryRow, options.language) : null;
}

export async function getFavoriteListings(
  options: { development?: boolean; language?: string } = {},
): Promise<Listing[]> {
  const items = await getListings({}, { ...options, limit: 100 });
  return items.filter((listing) => listing.isFavorite);
}

export async function getMyListings(userId: string, language = 'fr', development = false): Promise<Listing[]> {
  if (development) {
    return (getCachedValue<Listing[]>(cacheKeys.localListings) ?? [])
      .filter((listing) => listing.sellerId === userId);
  }
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ListingQueryRow[]).map((row) => mapListing(row, language));
}

export async function getListingsBySeller(userId: string, language = 'fr', development = false): Promise<Listing[]> {
  if (development) {
    return getDevelopmentListings({}).filter((listing) => listing.sellerId === userId);
  }
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('seller_id', userId)
    .in('status', ['published', 'reserved'])
    .order('published_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ListingQueryRow[]).map((row) => mapListing(row, language));
}

async function optimizePhoto(asset: ImagePicker.ImagePickerAsset): Promise<ListingPhoto> {
  const context = ImageManipulator.manipulate(asset.uri);
  const longestSide = Math.max(asset.width, asset.height);
  if (longestSide > 1800) {
    if (asset.width >= asset.height) context.resize({ width: 1800, height: null });
    else context.resize({ width: null, height: 1800 });
  }
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  return {
    uri: result.uri,
    fileName: `listing-${randomUUID()}.jpg`,
    mimeType: 'image/jpeg',
    fileSize: null,
    width: result.width,
    height: result.height,
  };
}

export async function pickListingPhotos(existingCount: number): Promise<ListingPhoto[]> {
  const remaining = MAX_LISTING_PHOTOS - existingCount;
  if (remaining <= 0) return [];
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Autorisez l’accès aux photos pour publier un article.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 1,
    orderedSelection: true,
  });
  if (result.canceled) return [];
  return Promise.all(result.assets.slice(0, remaining).map(optimizePhoto));
}

export async function takeListingPhoto(existingCount: number): Promise<ListingPhoto | null> {
  if (existingCount >= MAX_LISTING_PHOTOS) return null;
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Autorisez l’accès à l’appareil photo pour photographier votre article.');
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled) return null;
  return optimizePhoto(result.assets[0]);
}

async function uploadListingPhoto(
  userId: string,
  listingId: string,
  photo: ListingPhoto,
  position: number,
): Promise<ListingImage> {
  const arrayBuffer = await fetch(photo.uri).then((response) => response.arrayBuffer());
  if (arrayBuffer.byteLength > MAX_LISTING_IMAGE_BYTES) {
    throw new Error('Une photo dépasse la limite de 6 Mo après optimisation.');
  }
  const path = `${userId}/${listingId}/${randomUUID()}.jpg`;
  const { data: uploaded, error: uploadError } = await supabase.storage
    .from('listing-images')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('listing_images')
    .insert({
      listing_id: listingId,
      storage_path: uploaded.path,
      position,
      width: photo.width,
      height: photo.height,
    })
    .select('*')
    .single();
  if (error) {
    await supabase.storage.from('listing-images').remove([uploaded.path]);
    throw error;
  }
  return data;
}

export async function createPublishedListing(
  userId: string,
  values: ListingFormValues,
): Promise<string> {
  const { data: draft, error: draftError } = await supabase
    .from('listings')
    .insert({
      seller_id: userId,
      category_id: values.categoryId,
      title: values.title.trim(),
      description: values.description.trim(),
      price: values.price,
      condition: values.condition,
      status: 'draft',
      city_id: values.cityId,
      neighborhood_id: values.neighborhoodId,
      custom_city: values.cityId ? null : values.customCity.trim(),
      custom_neighborhood: values.neighborhoodId ? null : values.customNeighborhood.trim(),
      city: values.cityName || values.customCity,
      neighborhood: values.neighborhoodName || values.customNeighborhood,
    })
    .select('id')
    .single();
  if (draftError) throw draftError;

  const uploadedPaths: string[] = [];
  try {
    for (const [position, photo] of values.photos.entries()) {
      const image = await uploadListingPhoto(userId, draft.id, photo, position);
      uploadedPaths.push(image.storage_path);
    }
    const { error: publishError } = await supabase
      .from('listings')
      .update({ status: 'published' })
      .eq('id', draft.id);
    if (publishError) throw publishError;
    return draft.id;
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from('listing-images').remove(uploadedPaths);
    await supabase.from('listings').delete().eq('id', draft.id);
    throw error;
  }
}

export function createDevelopmentListing(
  userId: string,
  sellerName: string,
  values: ListingFormValues,
  category: Category,
  language = 'fr',
): string {
  const id = `development-listing-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const listing: Listing = {
    id,
    sellerId: userId,
    title: values.title.trim(),
    price: values.price,
    imageUrl: values.photos[0].uri,
    imageUrls: values.photos.map((photo) => photo.uri),
    category: language.startsWith('en') ? category.label_en : category.label_fr,
    categoryId: category.id,
    categorySlug: category.slug,
    condition: getConditionLabel(values.condition, language),
    conditionCode: values.condition,
    status: 'published',
    city: values.cityName || values.customCity,
    neighborhood: values.neighborhoodName || values.customNeighborhood,
    postedLabel: language.startsWith('en') ? 'now' : 'à l’instant',
    createdAt,
    description: values.description.trim(),
    isFavorite: false,
    seller: {
      id: userId,
      name: sellerName,
      rating: 0,
      reviews: 0,
      sales: 0,
      responseTime: language.startsWith('en') ? 'Development profile' : 'Profil de développement',
    },
  };
  const current = getCachedValue<Listing[]>(cacheKeys.localListings) ?? [];
  setCachedValue(cacheKeys.localListings, [listing, ...current]);
  return id;
}

export async function toggleFavorite(
  userId: string,
  listingId: string,
  isFavorite: boolean,
  development = false,
): Promise<boolean> {
  if (development) {
    const current = new Set(getCachedValue<string[]>(cacheKeys.localFavorites) ?? []);
    if (isFavorite) current.delete(listingId);
    else current.add(listingId);
    setCachedValue(cacheKeys.localFavorites, [...current]);
    return !isFavorite;
  }
  if (isFavorite) {
    const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from('favorites').insert({ user_id: userId, listing_id: listingId });
  if (error) throw error;
  return true;
}

export async function updateListingStatus(listingId: string, status: ListingStatus, development = false): Promise<void> {
  if (development) {
    const current = getCachedValue<Listing[]>(cacheKeys.localListings) ?? [];
    setCachedValue(cacheKeys.localListings, current.map((listing) => listing.id === listingId ? { ...listing, status } : listing));
    return;
  }
  const { error } = await supabase
    .from('listings')
    .update({ status })
    .eq('id', listingId)
    .select('id, status')
    .single();
  if (error) throw error;
}

export async function deleteListing(listingId: string, development = false): Promise<void> {
  if (development) {
    const current = getCachedValue<Listing[]>(cacheKeys.localListings) ?? [];
    setCachedValue(cacheKeys.localListings, current.filter((listing) => listing.id !== listingId));
    return;
  }
  const { data: images, error: imagesError } = await supabase
    .from('listing_images')
    .select('storage_path')
    .eq('listing_id', listingId);
  if (imagesError) throw imagesError;
  const paths = images.map((image) => image.storage_path);
  const { error } = await supabase.from('listings').delete().eq('id', listingId);
  if (error) throw error;
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from('listing-images').remove(paths);
    if (storageError) console.warn('[listings] orphaned images after listing deletion', { listingId });
  }
}
