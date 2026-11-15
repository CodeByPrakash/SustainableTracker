import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Typography, Spacing, Radius } from '../../theme';

interface SubjectProgressRowProps {
  subjectName: string;
  code?: string;
  completedTopics: number;
  totalTopics: number;
  color?: string;
}

export const SubjectProgressRow: React.FC<SubjectProgressRowProps> = ({
  subjectName,
  code,
  completedTopics,
  totalTopics,
  color,
}) => {
  const { colors } = useTheme();
  const barColor = color || colors.green;
  const percentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: totalTopics, now: completedTopics }}
      accessibilityLabel={`${subjectName}${code ? ` (${code})` : ''}: ${percentage}% completed, ${completedTopics} of ${totalTopics} topics`}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text style={[Typography.bodyMedium, { color: colors.ink }]}>{subjectName}</Text>
          {code ? <Text style={[Typography.captionSmall, { color: colors.inkMuted }]}>{code}</Text> : null}
        </View>
        <Text style={[Typography.caption, { color: barColor, fontWeight: '700' }]}>
          {percentage}% ({completedTopics}/{totalTopics})
        </Text>
      </View>

      <View style={[styles.barBackground, { backgroundColor: colors.surfaceMuted }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${percentage}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  barBackground: {
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
