package com.chinesepowered.backlogue.push

/**
 * The device's identity to the push service.
 *
 * Kept behind an interface because OneSignal has no Kotlin Multiplatform SDK —
 * Android and iOS use entirely separate native libraries, and the JVM target
 * has no push at all. Everything upstream only needs "what id do I send to the
 * Worker, if any", which is the same question on every platform.
 */
interface PushRegistrar {
    /** Initialises the push SDK. No-op when unconfigured. */
    fun start(appId: String)

    /**
     * The OneSignal subscription id for this device, or null when push is
     * unconfigured, permission was declined, or registration has not completed.
     * Callers must treat null as "not yet" rather than "never" — it commonly
     * resolves a second or two after start.
     */
    fun subscriptionId(): String?

    /** Prompts for notification permission. Safe to call more than once. */
    suspend fun requestPermission(): Boolean
}

/**
 * Used on iOS (where OneSignal is owned by Swift), on the JVM screenshot
 * target, and in tests. Each platform module binds its own implementation, so
 * no expect/actual seam is needed for something this small.
 */
class NoPushRegistrar : PushRegistrar {
    override fun start(appId: String) = Unit
    override fun subscriptionId(): String? = null
    override suspend fun requestPermission(): Boolean = false
}
