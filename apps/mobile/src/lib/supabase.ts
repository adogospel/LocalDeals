import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

import { authStorage } from '@/lib/auth-storage';
import { env } from '@/lib/env';
import type { Database } from '@/types/database';

const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'sb_publishable_localdeals_not_configured';

export const supabase = createClient<Database>(
  env.supabaseUrl || fallbackUrl,
  env.supabasePublishableKey || fallbackKey,
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);
