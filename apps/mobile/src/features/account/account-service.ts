import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { parseConsentStatus, type ConsentStatus } from '@/features/account/account-rules';
import { supabase } from '@/lib/supabase';

export type { ConsentStatus } from '@/features/account/account-rules';

export async function getConsentStatus(): Promise<ConsentStatus> {
  const { data, error } = await supabase.rpc('get_my_consent_status');
  if (error) throw error;
  return parseConsentStatus(data);
}

export async function acceptRequiredLegalDocuments(): Promise<ConsentStatus> {
  const { data, error } = await supabase.rpc('accept_required_legal_documents');
  if (error) throw error;
  return parseConsentStatus(data);
}

export async function exportPersonalData(): Promise<void> {
  const { data, error } = await supabase.rpc('export_my_personal_data');
  if (error) throw error;

  const filename = `localdeals-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(data, null, 2));

  if (!await Sharing.isAvailableAsync()) {
    file.delete();
    throw new Error('Le partage de fichiers n’est pas disponible sur cet appareil.');
  }

  try {
    await Sharing.shareAsync(file.uri, {
      dialogTitle: 'Exporter mes données LocalDeals',
      mimeType: 'application/json',
      UTI: 'public.json',
    });
  } finally {
    if (file.exists) file.delete();
  }
}

export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ status?: string; error?: string }>(
    'delete-account',
    { body: { confirmation: 'DELETE' } },
  );
  if (error) throw error;
  if (data?.status !== 'deleted') throw new Error('La suppression du compte n’a pas pu être confirmée.');
}
