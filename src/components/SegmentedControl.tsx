import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/colors';

interface SegmentOption<T extends string> {
  label: string;
  value: T;
  activeBackgroundColor?: string;
  activeTextColor?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={option.value}
            style={[
              styles.segment,
              isActive
                ? [
                    styles.activeSegment,
                    option.activeBackgroundColor ? { backgroundColor: option.activeBackgroundColor } : null,
                  ]
                : null,
            ]}
            onPress={() => onChange(option.value)}
          >
            <Text
              style={[
                styles.label,
                isActive ? styles.activeLabel : null,
                isActive && option.activeTextColor ? { color: option.activeTextColor } : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.divider,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  activeSegment: {
    backgroundColor: colors.surface,
    borderColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  activeLabel: {
    color: colors.primary,
  },
});
