import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';

// Detect if running on an actual native device (iOS/Android)
export const isMobileDevice = () => {
  return Capacitor.isNativePlatform();
};

// Check if online or offline
export interface ConnectionStatus {
  connected: boolean;
  connectionType: string;
}

export const getNetworkStatus = async (): Promise<ConnectionStatus> => {
  try {
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType,
    };
  } catch (err) {
    // Web fallback
    return {
      connected: navigator.onLine,
      connectionType: 'wifi',
    };
  }
};

export const addNetworkListener = async (callback: (status: ConnectionStatus) => void): Promise<{ remove: () => void }> => {
  try {
    const listener = await Network.addListener('networkStatusChange', (status) => {
      callback({
        connected: status.connected,
        connectionType: status.connectionType,
      });
    });
    return {
      remove: () => {
        listener.remove();
      }
    };
  } catch (err) {
    // Web fallback
    const onlineHandler = () => callback({ connected: true, connectionType: 'wifi' });
    const offlineHandler = () => callback({ connected: false, connectionType: 'none' });
    
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    
    return {
      remove: () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
      }
    };
  }
};

// Camera capture: returns a base64 string
export const capturePhoto = async (): Promise<string | null> => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt // Prompts user to select Camera or Gallery
    });
    return image.base64String ? `data:image/jpeg;base64,${image.base64String}` : null;
  } catch (err) {
    console.warn("Capacitor camera failed/cancelled, fallback to standard file input pattern:", err);
    return null;
  }
};

// Share text / link natively
export const shareContent = async (title: string, text: string, url?: string): Promise<boolean> => {
  try {
    const canShareResult = await Share.canShare();
    if (canShareResult.value) {
      await Share.share({
        title,
        text,
        url,
        dialogTitle: 'Share Document'
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Capacitor share failed/cancelled:", err);
    return false;
  }
};

// Listen to app lifecycle state modifications
export const addLifecycleListener = async (onResume: () => void, onPause?: () => void): Promise<{ remove: () => void }> => {
  try {
    const listener = await App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        onResume();
      } else if (onPause) {
        onPause();
      }
    });
    return {
      remove: () => {
        listener.remove();
      }
    };
  } catch (err) {
    // Web visibility fallback
    const handler = () => {
      if (document.visibilityState === 'visible') {
        onResume();
      } else if (document.visibilityState === 'hidden' && onPause) {
        onPause();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return {
      remove: () => {
        document.removeEventListener('visibilitychange', handler);
      }
    };
  }
};
