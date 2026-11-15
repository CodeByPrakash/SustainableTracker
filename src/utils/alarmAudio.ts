import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';

// Fallback preset alarm chime asset
const DEFAULT_ALARM_ASSET = require('../../assets/sounds/daycraft_chime.wav');

// Audio Engine Abstraction (supports both expo-audio and expo-av lazily without startup crash)
type AudioModuleType = 'expo-audio' | 'expo-av' | 'none';

let detectedModule: AudioModuleType | null = null;
let activeExpoAudioPlayer: any = null;
let activeExpoAvSound: any = null;
let previewTimeoutId: ReturnType<typeof setTimeout> | null = null;
let hapticIntervalId: ReturnType<typeof setInterval> | null = null;

function getAudioModule(): AudioModuleType {
  if (detectedModule !== null) return detectedModule;

  // 1. Try modern expo-audio first (supported in Expo SDK 58 & Expo Go)
  try {
    const expoAudio = require('expo-audio');
    if (expoAudio && typeof expoAudio.createAudioPlayer === 'function') {
      detectedModule = 'expo-audio';
      return detectedModule;
    }
  } catch {
    // expo-audio not available
  }

  // 2. Try expo-av (development builds & older builds)
  try {
    const expoAv = require('expo-av');
    if (expoAv && expoAv.Audio) {
      detectedModule = 'expo-av';
      return detectedModule;
    }
  } catch {
    // expo-av native module not available in this environment
  }

  detectedModule = 'none';
  return detectedModule;
}

/**
 * Configure global audio mode for alarm playback (ensures playback even in silent mode).
 */
export async function configureAlarmAudioMode(): Promise<void> {
  const engine = getAudioModule();
  try {
    if (engine === 'expo-audio') {
      const expoAudio = require('expo-audio');
      await expoAudio.setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });
    } else if (engine === 'expo-av') {
      const expoAv = require('expo-av');
      await expoAv.Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
    }
  } catch (err) {
    // Ignore audio mode configuration error
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

    // Strategy A: expo-audio (Modern SDK 58)
    if (engine === 'expo-audio') {
      try {
        const expoAudio = require('expo-audio');
        const source = soundUri && soundUri.trim().length > 0 ? { uri: soundUri } : DEFAULT_ALARM_ASSET;
        const player = expoAudio.createAudioPlayer(source);
        player.loop = isLooping;
        player.volume = 1.0;
        player.play();
        activeExpoAudioPlayer = player;
        return true;
      } catch (err) {
        console.warn('Notice: expo-audio playback fallback:', err);
      }
    }

    // Strategy B: expo-av
    if (engine === 'expo-av') {
      try {
        const expoAv = require('expo-av');
        const sound = new expoAv.Audio.Sound();
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
        activeExpoAvSound = sound;
        await sound.playAsync();
        return true;
      } catch (err) {
        console.warn('Notice: expo-av playback fallback:', err);
      }
    }

    // Strategy C: Fallback in environments without native audio module (e.g. Expo Go without ExponentAV)
    // Run gentle recurring haptic feedback so the user still has an active tactile wake alert
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

  if (activeExpoAudioPlayer) {
    try {
      activeExpoAudioPlayer.pause();
      if (typeof activeExpoAudioPlayer.remove === 'function') {
        activeExpoAudioPlayer.remove();
      }
    } catch {
      // Ignore
    } finally {
      activeExpoAudioPlayer = null;
    }
  }

  if (activeExpoAvSound) {
    try {
      await activeExpoAvSound.stopAsync();
      await activeExpoAvSound.unloadAsync();
    } catch {
      // Ignore
    } finally {
      activeExpoAvSound = null;
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
  if (activeExpoAudioPlayer) {
    return !!activeExpoAudioPlayer.playing;
  }
  if (activeExpoAvSound) {
    try {
      const status = await activeExpoAvSound.getStatusAsync();
      return status.isLoaded && status.isPlaying;
    } catch {
      return false;
    }
  }
  return !!hapticIntervalId;
}
