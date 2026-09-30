import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

type PackageManifest = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

type AppConfig = {
  expo: {
    ios?: { bundleIdentifier?: string };
    android?: { package?: string };
    runtimeVersion?: { policy?: string };
  };
};

const packageManifest = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as PackageManifest;

const appConfig = JSON.parse(
  readFileSync(new URL('../../app.json', import.meta.url), 'utf8'),
) as AppConfig;

describe('SDK 57 configuration contract', () => {
  it('pins the stable SDK 57 runtime versions', () => {
    expect(packageManifest.dependencies.expo).toMatch(/^~57\.\d+\.\d+$/);
    expect(packageManifest.dependencies['react-native']).toBe('0.86.3');
    expect(packageManifest.dependencies.react).toBe('19.2.3');
    expect(packageManifest.dependencies['react-native-reanimated']).toBe('4.5.1');
    expect(packageManifest.dependencies['react-native-worklets']).toBe('0.10.1');
  });

  it('contains no prerelease direct dependency', () => {
    const directVersions = {
      ...packageManifest.dependencies,
      ...packageManifest.devDependencies,
    };

    expect(Object.values(directVersions)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/(?:alpha|beta|canary|rc\.)/i)]),
    );
  });

  it('keeps native identifiers and fingerprint runtime versioning', () => {
    expect(appConfig.expo.ios?.bundleIdentifier).toBe('cm.localdeals.app');
    expect(appConfig.expo.android?.package).toBe('cm.localdeals.app');
    expect(appConfig.expo.runtimeVersion?.policy).toBe('fingerprint');
  });
});
