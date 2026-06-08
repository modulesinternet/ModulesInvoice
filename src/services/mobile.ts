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

export const getAppVersionInfo = async (): Promise<{ version: string; build: string }> => {
  try {
    const info = await App.getInfo();
    return {
      version: info.version || '1.1.2',
      build: info.build || '12',
    };
  } catch (err) {
    return {
      version: '1.1.2', // Beautiful default/preset to display
      build: '12',
    };
  }
};

// Exit the native app
export const exitApp = async (): Promise<void> => {
  try {
    await App.exitApp();
  } catch (err) {
    console.warn("Could not exit app in this context: ", err);
  }
};

// Listen to native backbutton press
export const addBackButtonListener = async (onBackButton: (canGoBack: boolean) => void): Promise<{ remove: () => void }> => {
  try {
    const listener = await App.addListener('backButton', (data) => {
      onBackButton(data.canGoBack);
    });
    return {
      remove: () => {
        listener.remove();
      }
    };
  } catch (err) {
    console.log("Capacitor backButton unsupported in browser context.");
    return {
      remove: () => {}
    };
  }
};

// Import LocalNotifications for native overlay alerts
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './api';

export const setupPushNotifications = async (
  userId: string, 
  onRouteNeeded: (route: string) => void
): Promise<void> => {
  if (!isMobileDevice()) {
    console.log("FCM setup skipped: Not running on a native mobile device platform.");
    return;
  }

  try {
    // Check permission
    let status = await PushNotifications.checkPermissions();
    if (status.receive !== 'granted') {
      const requested = await PushNotifications.requestPermissions();
      if (requested.receive !== 'granted') {
        console.warn("FCM Push notification permission denied by user.");
        return;
      }
    }

    // Register with Apple / Google push services
    await PushNotifications.register();

    // Listen for FCM token generation
    await PushNotifications.addListener('registration', async (token) => {
      console.log('Mobile device registered with FCM. Token:', token.value);
      // Dispatch token registration payload to backend proxy
      try {
        const result = await api.registerFcmToken(userId, token.value, 'android');
        console.log('FCM token synchronization result:', result);
      } catch (err) {
        console.error('Error synchronizing FCM token with backend:', err);
      }
    });

    // Listen for registration errors
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('FCM registration failed:', error);
    });

    // Listen for when push notification arrives while app is open
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('FCM push notification received in foreground:', notification);
      // Display/trigger standard local overlay notification for better visual parity in foreground
      triggerLocalNotification(
        notification.title || "Message Received", 
        notification.body || "New update registered."
      );
    });

    // Listen for push notification action perform (tapping the notification bubble)
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('User performed action on FCM notification:', action);
      const data = action.notification.data;
      if (data && data.route) {
        console.log('FCM notification requested routing navigation to:', data.route);
        onRouteNeeded(data.route);
      }
    });

  } catch (err) {
    console.error("Capacitor PushNotifications invocation failure:", err);
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') {
      const request = await LocalNotifications.requestPermissions();
      return request.display === 'granted';
    }
    return true;
  } catch (err) {
    console.warn("Native local notification permission check skipped/unsupported:", err);
    return false;
  }
};

export const triggerLocalNotification = async (title: string, body: string): Promise<void> => {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      // Fallback to standard web alert to prevent silent updates
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body });
          }
        });
      }
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 100000),
          schedule: { at: new Date(Date.now() + 500) }, // fire almost instantly
          sound: undefined,
          actionTypeId: "",
          extra: null
        }
      ]
    });
  } catch (err) {
    console.warn("Capacitor LocalNotification error, falling back to Web browser Notification API: ", err);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
  }
};


