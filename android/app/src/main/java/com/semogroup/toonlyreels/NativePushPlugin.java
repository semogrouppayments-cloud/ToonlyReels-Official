package com.semogroup.toonlyreels;

import android.content.Context;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.onesignal.OneSignal;
import com.onesignal.Continue;
import com.onesignal.IUserJwtInvalidatedListener;
import com.onesignal.notifications.INotificationClickListener;
import org.json.JSONObject;

@CapacitorPlugin(name = "NativePush")
public class NativePushPlugin extends Plugin {
    private INotificationClickListener clickListener;
    private IUserJwtInvalidatedListener jwtListener;
    @Override public void load() {
        clickListener = event -> {
            JSONObject data = event.getNotification().getAdditionalData();
            JSObject result = new JSObject();
            if (data != null) {
                result.put("notificationId", data.optString("notification_id", ""));
                result.put("videoId", data.optString("video_id", ""));
                result.put("commentId", data.optString("comment_id", ""));
            }
            notifyListeners("pushAction", result, true);
        };
        OneSignal.getNotifications().addClickListener(clickListener);
        jwtListener = event -> { JSObject data = new JSObject(); data.put("externalId", event.getExternalId()); notifyListeners("pushIdentityInvalidated", data, true); };
        OneSignal.addUserJwtInvalidatedListener(jwtListener);
    }
    private JSObject state() {
        JSObject value = new JSObject();
        value.put("permission", OneSignal.getNotifications().getPermission());
        value.put("optedIn", OneSignal.getUser().getPushSubscription().getOptedIn());
        return value;
    }
    @PluginMethod public void init(PluginCall call) {
        String appId = call.getString("appId");
        if (!ToonlyApplication.PUSH_APP_ID.equals(appId)) { call.reject("Unexpected notification app"); return; }
        call.resolve(state());
    }
    @PluginMethod public void getState(PluginCall call) { call.resolve(state()); }
    @PluginMethod public void login(PluginCall call) {
        String externalId = call.getString("externalId"), jwt = call.getString("jwt");
        if (externalId == null || jwt == null || jwt.isEmpty()) { call.reject("Verified notification identity required"); return; }
        getActivity().runOnUiThread(() -> {
            try {
                getContext().getSharedPreferences("toonly_push", Context.MODE_PRIVATE).edit().putBoolean("consented", true).apply();
                OneSignal.setConsentGiven(true);
                OneSignal.login(externalId, jwt);
                call.resolve();
            } catch (Exception error) { call.reject("Could not connect notification identity", error); }
        });
    }
    @PluginMethod public void refreshIdentity(PluginCall call) {
        String externalId = call.getString("externalId"), jwt = call.getString("jwt");
        if (externalId == null || jwt == null || jwt.isEmpty()) { call.reject("Verified identity required"); return; }
        OneSignal.updateUserJwt(externalId, jwt); call.resolve();
    }
    @PluginMethod public void logout(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            OneSignal.getUser().getPushSubscription().optOut();
            OneSignal.logout();
            // Keep consent so unsubscribe/logout requests can reach the provider.
            call.resolve();
        });
    }
    @PluginMethod public void setEnabled(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        getActivity().runOnUiThread(() -> {
            if (enabled && OneSignal.getNotifications().getPermission()) OneSignal.getUser().getPushSubscription().optIn();
            else OneSignal.getUser().getPushSubscription().optOut();
            call.resolve(state());
        });
    }
    @PluginMethod public void requestPermission(PluginCall call) {
        getActivity().runOnUiThread(() -> OneSignal.getNotifications().requestPermission(false, Continue.with(result -> {
            JSObject value = new JSObject(); value.put("granted", result.isSuccess() && Boolean.TRUE.equals(result.getData()));
            call.resolve(value);
        })));
    }
    @Override protected void handleOnDestroy() {
        if (jwtListener != null) OneSignal.removeUserJwtInvalidatedListener(jwtListener);
        if (clickListener != null) OneSignal.getNotifications().removeClickListener(clickListener);
    }
}
