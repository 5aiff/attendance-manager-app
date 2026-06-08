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
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    alignItems: 'center',
    borderRadius: 5,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  activeSegment: {
    backgroundColor: colors.surface,
    shadowColor: '#000000',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  activeLabel: {
    color: colors.primary,
  },
});
