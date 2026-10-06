import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

type DeletionAssets = {
  avatar_paths?: string[];
  listing_image_paths?: string[];
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function listOwnedFiles(
  admin: SupabaseClient,
  bucket: 'avatars' | 'listing-images',
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    if (!data?.length) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) paths.push(path);
      else paths.push(...await listOwnedFiles(admin, bucket, path));
    }

    if (data.length < 100) break;
    offset += data.length;
  }

  return paths;
}

async function removeFiles(
  admin: SupabaseClient,
  bucket: 'avatars' | 'listing-images',
  paths: string[],
): Promise<void> {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  for (let index = 0; index < uniquePaths.length; index += 100) {
    const { error } = await admin.storage.from(bucket).remove(uniquePaths.slice(index, index + 100));
    if (error) throw error;
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: 'authentication_required' }, 401);

  let payload: { confirmation?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }
  if (payload.confirmation !== 'DELETE') {
    return jsonResponse({ error: 'invalid_confirmation' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return jsonResponse({ error: 'invalid_session' }, 401);

  const userId = userData.user.id;
  let fingerprint: string | null = null;

  try {
    const { data: assetData, error: assetError } = await admin
      .rpc('get_account_deletion_assets', { p_user_id: userId });
    if (assetError) throw assetError;

    const assets = (assetData ?? {}) as DeletionAssets;
    const [ownedAvatars, ownedListingImages] = await Promise.all([
      listOwnedFiles(admin, 'avatars', userId),
      listOwnedFiles(admin, 'listing-images', userId),
    ]);

    await removeFiles(admin, 'avatars', [
      ...(assets.avatar_paths ?? []),
      ...ownedAvatars,
    ]);
    await removeFiles(admin, 'listing-images', [
      ...(assets.listing_image_paths ?? []),
      ...ownedListingImages,
    ]);

    const { data: preparationData, error: preparationError } = await admin
      .rpc('prepare_account_deletion', { p_user_id: userId });
    if (preparationError) throw preparationError;

    const preparation = preparationData as { fingerprint?: string } | null;
    fingerprint = preparation?.fingerprint ?? null;
    if (!fingerprint) throw new Error('Account deletion fingerprint is missing.');

    const { error: deletionError } = await admin.auth.admin.deleteUser(userId, false);
    if (deletionError) throw deletionError;

    await admin.rpc('record_account_deletion_result', {
      p_fingerprint: fingerprint,
      p_completed: true,
      p_failure_code: null,
    });

    return jsonResponse({ status: 'deleted' }, 200);
  } catch (error) {
    if (fingerprint) {
      await admin.rpc('record_account_deletion_result', {
        p_fingerprint: fingerprint,
        p_completed: false,
        p_failure_code: error instanceof Error ? error.name : 'unknown',
      });
    }
    console.error('Account deletion failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: 'account_deletion_failed' }, 500);
  }
});
