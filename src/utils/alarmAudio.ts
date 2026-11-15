import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// Fallback preset alarm chime asset
const DEFAULT_ALARM_ASSET = require('../../assets/sounds/daycraft_chime.wav');

let activeSound: Audio.Sound | null = null;
let previewTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isAudioConfigured = false;

/**
 * Configure global audio mode for alarm playback (ensures playback even in silent mode).
 */
export async function configureAlarmAudioMode(): Promise<void> {
  if (isAudioConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    isAudioConfigured = true;
  } catch (err) {
    console.warn('Could not set audio mode:', err);
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
    console.warn('Error picking custom audio file:', err);
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

    const sound = new Audio.Sound();

    if (soundUri && soundUri.trim().length > 0) {
      await sound.loadAsync(
        { uri: soundUri },
        { shouldPlay: true, isLooping, volume: 1.0 }
      );
    } else {
      await sound.loadAsync(DEFAULT_ALARM_ASSET, {
        shouldPlay: true,
        isLooping,
        volume: 1.0,
      });
    }

    activeSound = sound;
    await sound.playAsync();
    return true;
  } catch (err) {
    console.warn('Failed to play alarm audio:', err);
    // If custom audio fails (e.g. invalid format or deleted file), try fallback preset
    if (soundUri) {
      try {
        const fallbackSound = new Audio.Sound();
        await fallbackSound.loadAsync(DEFAULT_ALARM_ASSET, {
          shouldPlay: true,
          isLooping,
          volume: 1.0,
        });
        activeSound = fallbackSound;
        await fallbackSound.playAsync();
        return true;
      } catch {
        return false;
      }
    }
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

  if (activeSound) {
    try {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
    } catch {
      // Ignore cleanup error
    } finally {
      activeSound = null;
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
  if (!activeSound) return false;
  try {
    const status = await activeSound.getStatusAsync();
    return status.isLoaded && status.isPlaying;
  } catch {
    return false;
  }
}
