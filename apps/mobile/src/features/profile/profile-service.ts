import { fetch } from 'expo/fetch';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import type { AppLanguage, Profile } from '@/types/database';

export type ProfileUpdate = {
  displayName: string;
  cityId: number | null;
  customCity: string;
  neighborhoodId: number | null;
  customNeighborhood: string;
  preferredLanguage: AppLanguage;
  avatarPath?: string | null;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  values: ProfileUpdate,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      display_name: values.displayName.trim(),
      city_id: values.cityId,
      neighborhood_id: values.neighborhoodId,
      custom_city: values.cityId ? null : values.customCity.trim(),
      custom_neighborhood: values.neighborhoodId ? null : values.customNeighborhood.trim(),
      preferred_language: values.preferredLanguage,
      avatar_path: values.avatarPath,
      onboarding_completed: true,
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function pickAvatar(): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Autorisez l’accès aux photos pour choisir un avatar.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.72,
  });

  return result.canceled ? null : result.assets[0];
}

export async function uploadAvatar(
  userId: string,
  asset: ImagePicker.ImagePickerAsset,
): Promise<string> {
  const extension = asset.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const arrayBuffer = await fetch(asset.uri).then((response) => response.arrayBuffer());

  const { data, error } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
    contentType: asset.mimeType ?? 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;
  return data.path;
}

export function getAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(file|content|data|https?):/.test(path)) return path;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
