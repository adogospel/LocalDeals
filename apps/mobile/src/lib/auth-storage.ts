import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1800;
const KEYCHAIN_SERVICE = 'cm.localdeals.auth';

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  keychainService: KEYCHAIN_SERVICE,
};

function safeKey(key: string): string {
  return `localdeals.${key.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

async function removeNativeValue(key: string): Promise<void> {
  const normalizedKey = safeKey(key);
  const countValue = await SecureStore.getItemAsync(`${normalizedKey}.count`, secureOptions);
  const count = Number(countValue ?? 0);

  await Promise.all([
    SecureStore.deleteItemAsync(`${normalizedKey}.count`, secureOptions),
    ...Array.from({ length: Number.isFinite(count) ? count : 0 }, (_, index) =>
      SecureStore.deleteItemAsync(`${normalizedKey}.${index}`, secureOptions),
    ),
  ]);
}

export const authStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;

    const normalizedKey = safeKey(key);
    const countValue = await SecureStore.getItemAsync(`${normalizedKey}.count`, secureOptions);
    const count = Number(countValue ?? 0);
    if (!Number.isInteger(count) || count < 1) return null;

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(`${normalizedKey}.${index}`, secureOptions),
      ),
    );
    if (chunks.some((chunk) => chunk === null)) return null;
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }

    await removeNativeValue(key);
    const normalizedKey = safeKey(key);
    const chunks = Array.from(
      { length: Math.ceil(value.length / CHUNK_SIZE) },
      (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    );

    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(`${normalizedKey}.${index}`, chunk, secureOptions),
      ),
    );
    await SecureStore.setItemAsync(`${normalizedKey}.count`, String(chunks.length), secureOptions);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await removeNativeValue(key);
  },
};
