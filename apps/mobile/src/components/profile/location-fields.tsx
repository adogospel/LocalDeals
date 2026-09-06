import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { TextField } from '@/components/ui/text-field';
import { getCities, getNeighborhoods } from '@/features/locations/location-service';
import { getErrorMessage } from '@/lib/errors';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { City, Neighborhood } from '@/types/database';

export type LocationValues = {
  cityId: number | null;
  cityName: string;
  customCity: string;
  neighborhoodId: number | null;
  neighborhoodName: string;
  customNeighborhood: string;
};

type LocationFieldsProps = {
  value: LocationValues;
  onChange: (value: LocationValues) => void;
};

type PickerMode = 'city' | 'neighborhood' | null;

export function LocationFields({ value, onChange }: LocationFieldsProps) {
  const { t } = useTranslation();
  const [cities, setCities] = useState<City[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [customCitySelected, setCustomCitySelected] = useState(() => Boolean(value.customCity));
  const [customNeighborhoodSelected, setCustomNeighborhoodSelected] = useState(() => Boolean(value.customNeighborhood));

  useEffect(() => {
    let active = true;
    setError(null);
    setLoading(true);
    void getCities()
      .then((items) => {
        if (active) setCities(items);
      })
      .catch((nextError) => {
        if (active) setError(getErrorMessage(nextError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadKey]);

  useEffect(() => {
    if (!value.cityId) {
      setNeighborhoods([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void getNeighborhoods(value.cityId)
      .then((items) => {
        if (active) setNeighborhoods(items);
      })
      .catch((nextError) => {
        if (active) setError(getErrorMessage(nextError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadKey, value.cityId]);

  const options = pickerMode === 'city' ? cities : neighborhoods;
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('fr');
    if (!normalizedQuery) return options;
    return options.filter((item) => item.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').includes(normalizedQuery));
  }, [options, query]);

  const openPicker = (mode: Exclude<PickerMode, null>) => {
    setQuery('');
    setPickerMode(mode);
  };

  const chooseCity = (city: City | null) => {
    setCustomCitySelected(!city);
    setCustomNeighborhoodSelected(!city);
    onChange({
      cityId: city?.id ?? null,
      cityName: city?.name ?? '',
      customCity: '',
      neighborhoodId: null,
      neighborhoodName: '',
      customNeighborhood: '',
    });
    setPickerMode(null);
  };

  const chooseNeighborhood = (neighborhood: Neighborhood | null) => {
    setCustomNeighborhoodSelected(!neighborhood);
    onChange({
      ...value,
      neighborhoodId: neighborhood?.id ?? null,
      neighborhoodName: neighborhood?.name ?? '',
      customNeighborhood: '',
    });
    setPickerMode(null);
  };

  const selectedCityLabel = customCitySelected ? value.customCity : value.cityName;
  const selectedNeighborhoodLabel = value.neighborhoodId
    ? value.neighborhoodName
    : value.customNeighborhood;

  return (
    <View style={styles.container}>
      <View style={styles.fieldGroup}>
        <AppText variant="bodyStrong">{t('profile.cityLabel')}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.cityLabel')}
          onPress={() => openPicker('city')}
          style={({ pressed }) => [styles.select, pressed ? styles.pressed : null]}
        >
          <View style={styles.selectCopy}>
            <SymbolView name="building.2.fill" size={17} tintColor={colors.orange} />
            <AppText color={selectedCityLabel ? colors.ink : colors.muted}>
              {selectedCityLabel || t('profile.cityPlaceholder')}
            </AppText>
          </View>
          {loading && cities.length === 0
            ? <ActivityIndicator size="small" color={colors.orange} />
            : <SymbolView name="chevron.down" size={13} tintColor={colors.slate} />}
        </Pressable>
      </View>

      {customCitySelected ? (
        <TextField
          label={t('profile.otherCityLabel')}
          placeholder={t('profile.otherCityPlaceholder')}
          value={value.customCity}
          autoCapitalize="words"
          maxLength={80}
          onChangeText={(customCity) => onChange({ ...value, customCity })}
        />
      ) : null}

      {!customCitySelected ? <View style={styles.fieldGroup}>
        <AppText variant="bodyStrong">{t('profile.neighborhoodLabel')}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.neighborhoodLabel')}
          disabled={!value.cityId}
          onPress={() => openPicker('neighborhood')}
          style={({ pressed }) => [
            styles.select,
            !value.cityId ? styles.disabled : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <View style={styles.selectCopy}>
            <SymbolView name="mappin.and.ellipse" size={17} tintColor={colors.orange} />
            <AppText color={selectedNeighborhoodLabel ? colors.ink : colors.muted}>
              {selectedNeighborhoodLabel || (value.cityId
                ? t('profile.neighborhoodPlaceholder')
                : t('profile.chooseCityFirst'))}
            </AppText>
          </View>
          <SymbolView name="chevron.down" size={13} tintColor={colors.slate} />
        </Pressable>
      </View> : null}

      {customCitySelected || customNeighborhoodSelected ? (
        <TextField
          label={t('profile.otherNeighborhoodLabel')}
          placeholder={t('profile.otherNeighborhoodPlaceholder')}
          value={value.customNeighborhood}
          autoCapitalize="words"
          maxLength={100}
          onChangeText={(customNeighborhood) => onChange({ ...value, customNeighborhood })}
        />
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <AppText accessibilityRole="alert" variant="caption" color={colors.danger} style={styles.errorText}>{error}</AppText>
          <Pressable accessibilityRole="button" onPress={() => setReloadKey((value) => value + 1)} style={styles.retryButton}>
            <AppText variant="caption" color={colors.orange}>{t('common.retry')}</AppText>
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={pickerMode !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerMode(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerMode(null)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeading}>
              <View>
                <AppText variant="title">
                  {pickerMode === 'city' ? t('profile.selectCity') : t('profile.selectNeighborhood')}
                </AppText>
                <AppText variant="caption" color={colors.slate}>
                  {pickerMode === 'city' ? t('profile.cityCoverage') : value.cityName}
                </AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => setPickerMode(null)} style={styles.closeButton}>
                <SymbolView name="xmark" size={15} tintColor={colors.ink} />
              </Pressable>
            </View>
            <View style={styles.search}>
              <SymbolView name="magnifyingglass" size={17} tintColor={colors.slate} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('profile.searchLocation')}
                placeholderTextColor={colors.muted}
                autoCorrect={false}
                style={styles.searchInput}
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {query && filteredOptions.length === 0 ? (
                <AppText variant="caption" color={colors.slate} style={styles.noResult}>{t('search.emptyTitle')}</AppText>
              ) : null}
              {filteredOptions.map((option) => {
                const selected = pickerMode === 'city'
                  ? value.cityId === option.id
                  : value.neighborhoodId === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => pickerMode === 'city'
                      ? chooseCity(option as City)
                      : chooseNeighborhood(option as Neighborhood)}
                    style={styles.option}
                  >
                    <AppText variant={selected ? 'bodyStrong' : 'body'}>{option.name}</AppText>
                    {selected ? <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.orange} /> : null}
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                onPress={() => pickerMode === 'city' ? chooseCity(null) : chooseNeighborhood(null)}
                style={[styles.option, styles.otherOption]}
              >
                <View style={styles.otherIcon}>
                  <SymbolView name="plus" size={15} tintColor={colors.orange} />
                </View>
                <View style={styles.otherCopy}>
                  <AppText variant="bodyStrong">{t('profile.otherOption')}</AppText>
                  <AppText variant="caption" color={colors.slate}>{t('profile.otherOptionHint')}</AppText>
                </View>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  fieldGroup: { gap: spacing.sm },
  select: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  selectCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.dangerSoft, padding: spacing.sm },
  errorText: { flex: 1 },
  retryButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.sm },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,32,51,0.34)' },
  sheet: { maxHeight: '82%', gap: spacing.md, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.surface, padding: spacing.lg, paddingBottom: spacing.xxl },
  sheetHandle: { width: 44, height: 4, alignSelf: 'center', borderRadius: radii.pill, backgroundColor: colors.border },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.background },
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.background, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, minHeight: 46, color: colors.ink, fontFamily: typography.regular, fontSize: 14 },
  option: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  noResult: { paddingVertical: spacing.lg, textAlign: 'center' },
  otherOption: { justifyContent: 'flex-start', gap: spacing.sm, borderBottomWidth: 0, paddingVertical: spacing.sm },
  otherIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.orangeSoft },
  otherCopy: { flex: 1, gap: 2 },
});
