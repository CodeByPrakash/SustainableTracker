import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Trigger subtle haptic feedback for user interactions
 */
export const AppHaptics = {
  // Light tap on toggle/checkbox
  selection: async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Haptics unavailable in web or some emulators
    }
  },

  // Button press or modal opening
  impactLight: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  },

  // Completed workout set or rest timer start
  impactMedium: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  },

  // Finished session or saved routine
  success: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  },
};
