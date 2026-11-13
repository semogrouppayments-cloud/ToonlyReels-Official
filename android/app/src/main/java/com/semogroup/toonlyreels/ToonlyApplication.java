package com.semogroup.toonlyreels;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import com.onesignal.OneSignal;

public class ToonlyApplication extends Application {
    public static final String PUSH_APP_ID = "627d3af8-e1fa-45be-b98c-74c47ddab90a";
    @Override public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            NotificationChannel normal = new NotificationChannel("toonly_activity", "ToonlyReels activity", NotificationManager.IMPORTANCE_DEFAULT);
            NotificationChannel silent = new NotificationChannel("toonly_activity_silent", "ToonlyReels silent activity", NotificationManager.IMPORTANCE_LOW);
            silent.setSound(null, null); silent.enableVibration(false);
            manager.createNotificationChannel(normal); manager.createNotificationChannel(silent);
        }
        OneSignal.setConsentRequired(true);
        OneSignal.initWithContext(this, PUSH_APP_ID);
        // Preserve the SDK subscription on background/cold launches. No permission popup here.
        OneSignal.setConsentGiven(getSharedPreferences("toonly_push", MODE_PRIVATE).getBoolean("consented", false));
    }
}
