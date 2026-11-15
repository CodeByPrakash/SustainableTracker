import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Bell, Music, Moon, Volume2, CheckCircle2 } from 'lucide-react-native';
import { useTheme, Typography } from '../theme';
import type { AlarmItem } from '../db/queries/alarmQueries';
import { formatTime12 } from '../utils/dateUtils';
import { stopAlarmSound } from '../utils/alarmAudio';

interface AlarmRingingModalProps {
  visible: boolean;
  alarm: AlarmItem | null;
  onDismiss: () => void;
  onSnooze: (alarm: AlarmItem) => void;
}

export function AlarmRingingModal({
  visible,
  alarm,
  onDismiss,
  onSnooze,
}: AlarmRingingModalProps) {
  const { colors } = useTheme();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    if (!visible) return;

    const updateNow = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${mins}`);
    };

    updateNow();
    const interval = setInterval(updateNow, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible || !alarm) return null;

  const displayTime = formatTime12(currentTime || alarm.time);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={[styles.backdrop, { backgroundColor: 'rgba(15, 23, 42, 0.90)' }]}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.orange,
            },
          ]}
        >
          {/* Pulsing Bell Icon Badge */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.orangeSoft, borderColor: colors.orange },
            ]}
          >
            <Bell size={40} color={colors.orange} />
          </View>

          {/* Alarm Label */}
          <Text
            style={[
              styles.alarmLabel,
              { color: colors.inkMuted },
            ]}
            accessibilityRole="header"
          >
            {alarm.label || 'Wake Up Routine'}
          </Text>

          {/* Large Clock Display */}
          <Text
            style={[
              styles.clockText,
              { color: colors.ink },
            ]}
            accessibilityLabel={`Alarm ringing. Current time is ${displayTime}`}
          >
            {displayTime}
          </Text>

          {/* Playing Music Badge */}
          <View
            style={[
              styles.soundBadge,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.line },
            ]}
          >
            {alarm.sound_type === 'custom' ? (
              <Music size={16} color={colors.orange} style={{ marginRight: 6 }} />
            ) : (
              <Volume2 size={16} color={colors.orange} style={{ marginRight: 6 }} />
            )}
            <Text
              style={[styles.soundText, { color: colors.ink }]}
              numberOfLines={1}
            >
              {alarm.sound_name}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Snooze Button */}
            <TouchableOpacity
              style={[
                styles.snoozeButton,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.line,
                },
              ]}
              onPress={async () => {
                await stopAlarmSound();
                onSnooze(alarm);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Snooze alarm for ${alarm.snooze_minutes || 9} minutes`}
              accessibilityHint="Pauses alarm sound and triggers reminder in 9 minutes"
              activeOpacity={0.75}
            >
              <Moon size={18} color={colors.ink} style={{ marginRight: 8 }} />
              <Text style={[styles.snoozeButtonText, { color: colors.ink }]}>
                Snooze ({alarm.snooze_minutes || 9}m)
              </Text>
            </TouchableOpacity>

            {/* Dismiss Button */}
            <TouchableOpacity
              style={[
                styles.dismissButton,
                { backgroundColor: colors.orange },
              ]}
              onPress={async () => {
                await stopAlarmSound();
                onDismiss();
              }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss and turn off alarm"
              accessibilityHint="Stops the alarm audio and turns off alarm for today"
              activeOpacity={0.8}
            >
              <CheckCircle2 size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.dismissButtonText}>
                I'm Awake — Dismiss
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 2,
    padding: 28,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alarmLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  clockText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 40,
    letterSpacing: -1,
    marginBottom: 16,
  },
  soundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: '90%',
    marginBottom: 28,
  },
  soundText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    flexShrink: 1,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  snoozeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
  },
  snoozeButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    minHeight: 52,
  },
  dismissButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
