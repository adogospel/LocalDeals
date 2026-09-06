import { supabase } from '@/lib/supabase';
import type { City, Neighborhood } from '@/types/database';

export async function getCities(): Promise<City[]> {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return data;
}

export async function getNeighborhoods(cityId: number): Promise<Neighborhood[]> {
  const { data, error } = await supabase
    .from('neighborhoods')
    .select('*')
    .eq('city_id', cityId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
}
