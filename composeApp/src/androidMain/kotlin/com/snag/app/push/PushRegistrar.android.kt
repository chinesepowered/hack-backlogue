package com.snag.app.push

import android.content.Context
import com.onesignal.OneSignal

class OneSignalPushRegistrar(private val context: Context) : PushRegistrar {

    private var started = false

    override fun start(appId: String) {
        if (started || appId.isBlank()) return
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
