import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';

// Fallback preset alarm chime asset
const DEFAULT_ALARM_ASSET = require('../../assets/sounds/daycraft_chime.wav');

// Audio Engine state
type AudioModuleType = 'expo-audio' | 'none';

let detectedModule: AudioModuleType | null = null;
let activeAudioPlayer: any = null;
let previewTimeoutId: ReturnType<typeof setTimeout> | null = null;
let hapticIntervalId: ReturnType<typeof setInterval> | null = null;

function getAudioModule(): AudioModuleType {
  if (detectedModule !== null) return detectedModule;

  // Use official modern expo-audio (supported in Expo SDK 58 & Expo Go)
  try {
    const expoAudio = require('expo-audio');
    if (expoAudio && typeof expoAudio.createAudioPlayer === 'function') {
      detectedModule = 'expo-audio';
      return detectedModule;
    }
  } catch {
    // expo-audio not available
  }

  detectedModule = 'none';
  return detectedModule;
}

/**
 * Configure global audio mode for alarm playback (ensures playback even in silent mode).
 */
export async function configureAlarmAudioMode(): Promise<void> {
  const engine = getAudioModule();
  if (engine === 'expo-audio') {
    try {
      const expoAudio = require('expo-audio');
      await expoAudio.setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });
    } catch {
      // Ignore audio mode configuration error
    }
  }
}

/**
 * Prompts user to pick an audio file from their device.
 * Copies selected file permanently to app's document directory so it survives cache clearing.
 */
export async function pickCustomAlarmAudio(): Promise<{
  uri: string;
  name: string;
  size?: number;
} | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const sourceUri = asset.uri;
    const cleanFileName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Create permanent alarm sounds folder if it doesn't exist
    const docDir = (FileSystem as any).documentDirectory || '';
    const alarmFolder = `${docDir}alarms/`;

    try {
      const folderInfo = await (FileSystem as any).getInfoAsync(alarmFolder);
      if (!folderInfo.exists) {
        await (FileSystem as any).makeDirectoryAsync(alarmFolder, { intermediates: true });
      }
    } catch {
      // Ignore if folder exists or not supported
    }

    const destPath = `${alarmFolder}${Date.now()}_${cleanFileName}`;

    try {
      await (FileSystem as any).copyAsync({
        from: sourceUri,
        to: destPath,
      });
      return {
        uri: destPath,
        name: asset.name,
        size: asset.size,
      };
    } catch {
      // Fallback to cache URI if copying failed
      return {
        uri: sourceUri,
        name: asset.name,
        size: asset.size,
      };
    }
  } catch (err) {
    console.warn('Notice: Custom audio picking fallback:', err);
    return null;
  }
}

/**
 * Plays the alarm sound. Loops indefinitely until stopAlarmSound is called.
 */
export async function playAlarmSound(
  soundUri?: string | null,
  isLooping: boolean = true
): Promise<boolean> {
  try {
    await configureAlarmAudioMode();
    await stopAlarmSound();

    const engine = getAudioModule();

    // Strategy A: expo-audio (Official Expo SDK 58 audio engine)
    if (engine === 'expo-audio') {
      try {
        const expoAudio = require('expo-audio');
        const source = soundUri && soundUri.trim().length > 0 ? { uri: soundUri } : DEFAULT_ALARM_ASSET;
        const player = expoAudio.createAudioPlayer(source);
        player.loop = isLooping;
        player.volume = 1.0;
        player.play();
        activeAudioPlayer = player;
        return true;
      } catch (err) {
        console.warn('Notice: expo-audio playback fallback:', err);
      }
    }

    // Strategy B: Fallback haptic pulses
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (isLooping) {
        hapticIntervalId = setInterval(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }, 1500);
      }
    } catch {
      // Haptics fallback
    }

    return true;
  } catch (err) {
    console.warn('Notice: Audio playback failed:', err);
    return false;
  }
}

/**
 * Stops any currently playing alarm or preview sound.
 */
export async function stopAlarmSound(): Promise<void> {
  if (previewTimeoutId) {
    clearTimeout(previewTimeoutId);
    previewTimeoutId = null;
  }

  if (hapticIntervalId) {
    clearInterval(hapticIntervalId);
    hapticIntervalId = null;
  }

  if (activeAudioPlayer) {
    try {
      activeAudioPlayer.pause();
      if (typeof activeAudioPlayer.remove === 'function') {
        activeAudioPlayer.remove();
      }
    } catch {
      // Ignore
    } finally {
      activeAudioPlayer = null;
    }
  }
}

/**
 * Previews an alarm sound for a short duration (default 7 seconds).
 */
export async function previewAlarmSound(
  soundUri?: string | null,
  durationMs: number = 7000
): Promise<void> {
  await stopAlarmSound();
  const success = await playAlarmSound(soundUri, false);
  if (success) {
    previewTimeoutId = setTimeout(async () => {
      await stopAlarmSound();
    }, durationMs);
  }
}

/**
 * Returns whether an alarm sound is currently playing.
 */
export async function isAlarmSoundPlaying(): Promise<boolean> {
  if (activeAudioPlayer) {
    return !!activeAudioPlayer.playing;
  }
  return !!hapticIntervalId;
}
