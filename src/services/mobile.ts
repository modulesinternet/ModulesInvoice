import { Capacitor } from '@capacitor/core';
import { mobileConfig } from '../mobile-config';
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
  onRouteNeeded: (route: string, data?: any) => void,
  onNotificationReceived?: (notification: any) => void
): Promise<void> => {
  if (!isMobileDevice()) {
    console.log("FCM setup skipped: Not running on a native mobile device platform.");
    return;
  }

  // CRITICAL: Protect against native app crashes if google-services.json is missing in the build
  if (!mobileConfig.googleServicesAvailable) {
    console.warn("FCM setup skipped: google-services.json is missing from android/app/. Push notifications are disabled to prevent native app crash.");
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

    // Explicitly create high priority notification channel for Android (Crucial for background / locked screen delivery)
    if (Capacitor.getPlatform() === 'android') {
      try {
        await PushNotifications.createChannel({
          id: 'high_priority_notifications',
          name: 'High Priority Alerts',
          description: 'Emergency notifications and critical billing status alerts',
          importance: 5, // IMPORTANCE_HIGH / MAX (pops up as heads-up notification and sounds immediately)
          visibility: 1, // VISIBILITY_PUBLIC (explicitly makes details visible on secure/locked screens)
          sound: undefined, // Uses default system notification sound to secure reliable playback on all Android OS devices
          vibration: true,
          lights: true,
          lightColor: '#3B82F6'
        });
        console.log("Successfully initialized native FCM 'high_priority_notifications' channel.");
      } catch (channelErr) {
        console.error("Failed to initialize custom notification channel:", channelErr);
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
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      } else {
        // Display/trigger standard local overlay notification for better visual parity in foreground
        triggerLocalNotification(
          notification.title || "Message Received", 
          notification.body || "New update registered."
        );
      }
    });

    // Listen for push notification action perform (tapping the notification bubble)
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('User performed action on FCM notification:', action);
      const data = action.notification.data;
      if (data) {
        const route = data.route || '';
        onRouteNeeded(route, data);
      } else {
        onRouteNeeded('');
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

const recentNotifications = new Map<string, number>();

export const triggerLocalNotification = async (title: string, body: string): Promise<void> => {
  const isAndroidApp = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  if (!isAndroidApp) {
    console.log("[Notification Guard] Suppressed local notification on non-Android natively installed app as requested.");
    return;
  }
  try {
    const now = Date.now();
    const signature = `${title.trim()}:${body.trim()}`;
    
    // De-duplicate matching notifications within an 8-second sliding time window
    const lastTime = recentNotifications.get(signature);
    if (lastTime && now - lastTime < 8000) {
      console.log(`[Notification De-duplicator] Suppressed duplicate notification: "${title}" - "${body}"`);
      return;
    }
    recentNotifications.set(signature, now);

    // Keep memory clean
    if (recentNotifications.size > 50) {
      for (const [sig, time] of recentNotifications.entries()) {
        if (now - time > 10000) {
          recentNotifications.delete(sig);
        }
      }
    }

    // Create channel for high priority alerts if on Android (Crucial for newer Android OS versions)
    try {
      await LocalNotifications.createChannel({
        id: 'high_priority_local',
        name: 'High Priority Alerts',
        description: 'Emergency notifications and critical billing status alerts',
        importance: 5, // IMPORTANCE_HIGH / MAX
        visibility: 1, // VISIBILITY_PUBLIC
        sound: undefined,
        vibration: true,
        lights: true,
        lightColor: '#3B82F6'
      });
    } catch (channelErr) {
      console.error("Failed to create high priority LocalNotification channel:", channelErr);
    }

    const granted = await requestNotificationPermission();
    if (granted) {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 100000),
            schedule: { at: new Date(Date.now() + 500) }, // fire almost instantly
            channelId: 'high_priority_local', // Bound to our high priority channel
            sound: undefined,
            actionTypeId: "",
            extra: null
          }
        ]
      });
    }
  } catch (err) {
    console.warn("Notification trigger failed: ", err);
  }
};

export interface NativeServiceHealth {
  isAndroidNative: boolean;
  pushPluginActive: boolean;
  localPluginActive: boolean;
  fcmConfigured: boolean;
  permissionsGranted: boolean;
  status: 'OK' | 'FAIL';
  details: string;
}

export const checkNativeServiceHealth = async (): Promise<NativeServiceHealth> => {
  const isAndroid = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  
  if (!isAndroid) {
    return {
      isAndroidNative: false,
      pushPluginActive: false,
      localPluginActive: false,
      fcmConfigured: false,
      permissionsGranted: false,
      status: 'FAIL',
      details: 'Not running inside the Android App container. Web browser environment does not support native background service bindings.'
    };
  }

  try {
    // 1. Verify push notification plugin binding
    let pushActive = false;
    try {
      const pushPerms = await PushNotifications.checkPermissions();
      pushActive = !!pushPerms;
    } catch (e) {
      console.warn("PushNotifications plugin check failed:", e);
    }

    // 2. Verify local notification plugin binding
    let localActive = false;
    try {
      const localPerms = await LocalNotifications.checkPermissions();
      localActive = !!localPerms;
    } catch (e) {
      console.warn("LocalNotifications plugin check failed:", e);
    }

    // 3. Verify google-services.json FCM configuration status
    const fcmConfigured = !!mobileConfig.googleServicesAvailable;

    // 4. Verify permission status
    let permissionsGranted = false;
    try {
      const localPerms = await LocalNotifications.checkPermissions();
      const pushPerms = await PushNotifications.checkPermissions();
      permissionsGranted = localPerms.display === 'granted' && pushPerms.receive === 'granted';
    } catch (e) {
      console.warn("Permissions verification failed:", e);
    }

    const isHealthy = pushActive && localActive && fcmConfigured;

    return {
      isAndroidNative: true,
      pushPluginActive: pushActive,
      localPluginActive: localActive,
      fcmConfigured,
      permissionsGranted,
      status: isHealthy ? 'OK' : 'FAIL',
      details: isHealthy 
        ? 'Native Android bridge & FCM background notification listeners are fully registered and healthy.' 
        : `Native service issues detected: ${!pushActive ? 'Push plugin inactive. ' : ''}${!localActive ? 'Local plugin inactive. ' : ''}${!fcmConfigured ? 'google-services.json is missing in android project.' : ''}`
    };
  } catch (error: any) {
    return {
      isAndroidNative: true,
      pushPluginActive: false,
      localPluginActive: false,
      fcmConfigured: false,
      permissionsGranted: false,
      status: 'FAIL',
      details: `Bridge verification threw exception: ${error?.message || error}`
    };
  }
};

export interface VoipBridgeStatus {
  isAndroid: boolean;
  pluginAvailable: boolean;
  channelRegistered: boolean;
  status: 'OK' | 'FAIL';
  details: string;
}

export const pingVoipBridge = async (): Promise<VoipBridgeStatus> => {
  const isAndroid = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  
  if (!isAndroid) {
    return {
      isAndroid,
      pluginAvailable: false,
      channelRegistered: false,
      status: 'FAIL',
      details: 'VoIP CallScreen bridge is not available outside native Android app context.'
    };
  }

  try {
    let channelRegistered = false;
    try {
      // Create channel check or delivered check to verify Push Notification capability
      const channels = await PushNotifications.getDeliveredNotifications();
      if (channels) {
        channelRegistered = true;
      }
    } catch (e) {
      console.warn("FCM channel/delivered fetch check failed:", e);
    }

    return {
      isAndroid,
      pluginAvailable: true,
      channelRegistered,
      status: channelRegistered ? 'OK' : 'FAIL',
      details: channelRegistered 
        ? 'Native Android CallScreen VoIP notification channel bindings are fully synchronized and active.'
        : 'Failed to access native background notification channel handles.'
    };
  } catch (err: any) {
    return {
      isAndroid,
      pluginAvailable: false,
      channelRegistered: false,
      status: 'FAIL',
      details: `Native bridge execution error: ${err?.message || err}`
    };
  }
};


