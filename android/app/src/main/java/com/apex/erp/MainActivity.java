package com.apex.erp;

import android.os.Bundle;
import android.view.WindowManager;
import android.os.Build;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Let the activity run over the lock screen and wake up the screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }

        try {
            // Disable native media playback user gesture restriction to allow immediate real-time ringtones & notification TTS
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
                System.out.println("MainActivity: Successfully disabled MediaPlaybackRequiresUserGesture for prompt billing notifications & ringtones.");
            }
        } catch (Exception e) {
            System.err.println("MainActivity: Bypassed WebView media gesture configuration error: " + e.getMessage());
        }
    }
}
