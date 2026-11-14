import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Typography, Spacing, Radius } from '../../theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const confirmColor = destructive ? colors.danger : colors.orange;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[Typography.sectionTitle, { color: colors.ink }]}>
            {title}
          </Text>
          <Text
            style={[
              Typography.body,
              { color: colors.inkMuted, marginTop: Spacing.sm },
            ]}
          >
            {message}
          </Text>

          <View style={styles.actions}>
            {/* Cancel */}
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                {
                  borderColor: colors.line,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[Typography.button, { color: colors.ink }]}>
                {cancelLabel}
              </Text>
            </Pressable>

            {/* Confirm */}
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                {
                  backgroundColor: confirmColor,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[Typography.button, { color: '#FFFFFF' }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radius.card,
    padding: Spacing.xl,
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.button,
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
});
