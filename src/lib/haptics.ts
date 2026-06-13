import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * ⚡ Premium Haptic Feedback Utility
 * Only triggers on native platforms to avoid console noise on web.
 */
export const hapticFeedback = {
  impact: async (style: ImpactStyle = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style });
      } catch (e) {
        console.warn('Haptics failed', e);
      }
    }
  },
  notification: async (type: NotificationType = NotificationType.Success) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.notification({ type });
      } catch (e) {
        console.warn('Haptics failed', e);
      }
    }
  },
  selection: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.selectionStart();
      } catch (e) {
        console.warn('Haptics failed', e);
      }
    }
  }
};
