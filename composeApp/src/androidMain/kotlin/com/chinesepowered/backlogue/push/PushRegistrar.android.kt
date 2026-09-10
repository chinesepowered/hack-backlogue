package com.chinesepowered.backlogue.push

import android.content.Context
import com.chinesepowered.backlogue.BuildConfig
import com.onesignal.OneSignal
import com.onesignal.debug.LogLevel

class OneSignalPushRegistrar(private val context: Context) : PushRegistrar {

    private var started = false

    override fun start(appId: String) {
        if (started || appId.isBlank()) return

        // OneSignal defaults to WARN, which means a healthy init and a silently
        // failing one look identical in logcat — that cost a whole debugging
        // session. Debug builds say what they are doing.
        if (BuildConfig.DEBUG) OneSignal.Debug.logLevel = LogLevel.VERBOSE

        OneSignal.initWithContext(context, appId)
        started = true
    }

    /**
     * Empty until OneSignal has completed registration with its backend, which
     * happens asynchronously after [start]. Normalised to null so callers do
     * not send a blank id to the Worker and register a device that can never
     * be reached.
     */
    override fun subscriptionId(): String? =
        if (!started) null else OneSignal.User.pushSubscription.id.takeIf { it.isNotBlank() }

    override suspend fun requestPermission(): Boolean {
        if (!started) return false
        return OneSignal.Notifications.requestPermission(true)
    }
}
