package com.chinesepowered.backlogue.push

import com.chinesepowered.backlogue.data.BacklogueRepository
import com.chinesepowered.backlogue.data.remote.BacklogueApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

/**
 * Keeps the Worker's idea of what this device cares about in step with the pile.
 *
 * Only unresolved games are registered. A game the player has already beaten or
 * bounced off needs no release-date alert, and sending the whole pile would mean
 * the sweep does work for every game anyone ever added.
 */
class AlertSync(
    private val repository: BacklogueRepository,
    private val api: BacklogueApi,
    private val push: PushRegistrar,
) {
    @OptIn(FlowPreview::class)
    suspend fun run(appId: String) {
        if (appId.isBlank() || !api.isConfigured) return

        push.start(appId)

        repository.observePile()
            .map { pile ->
                pile.filterNot { it.status.isResolved }
                    .map { it.game.igdbId }
                    .sorted()
            }
            .distinctUntilChanged()
            // Adding three games in a row should be one registration, not
            // three. Also gives OneSignal time to finish registering after a
            // cold start, which is when the pile first emits.
            .debounce(2_000)
            .collect { igdbIds ->
                log("pile changed: ${igdbIds.size} unresolved game(s)")
                if (igdbIds.isEmpty()) return@collect

                // Ask only once there is something worth being notified about.
                // Prompting on first launch, before the user has saved a single
                // game, is how apps get permanently denied.
                log("requesting notification permission…")
                val granted = push.requestPermission()
                log("permission granted=$granted")

                val subscriptionId = awaitSubscriptionId()
                if (subscriptionId == null) {
                    log("no subscription id after $RegistrationAttempts attempts — not registering")
                    return@collect
                }
                log("registering ${igdbIds.size} game(s) for $subscriptionId")
                when (val result = api.watch(subscriptionId, igdbIds)) {
                    is com.chinesepowered.backlogue.data.remote.ApiResult.Success -> log("watch registered OK")
                    is com.chinesepowered.backlogue.data.remote.ApiResult.Failure ->
                        log("watch FAILED: ${result.reason} ${result.message.orEmpty()}")
                }
            }
    }

    /**
     * OneSignal registers with its backend asynchronously, so the id is
     * routinely absent for a second or two after start. Failing to register
     * because we asked too early would be invisible and permanent until the
     * next pile change, so poll briefly instead.
     */
    private suspend fun awaitSubscriptionId(): String? {
        repeat(RegistrationAttempts) {
            push.subscriptionId()?.let { return it }
            delay(RegistrationRetryDelayMs)
        }
        return null
    }

    /**
     * Deliberately plain println so it reaches logcat on Android and stdout on
     * desktop without a logging dependency. This path failed silently twice
     * during development — every branch through it now says what it did.
     */
    private fun log(message: String) = println("Backlogue/AlertSync: $message")

    private companion object {
        /**
         * Five seconds was not enough. FCM token registration on a cold install
         * routinely takes longer, and when this window expired the device was
         * simply never registered — no error, no retry until the pile happened
         * to change again, which for a settled pile is never. Thirty seconds
         * costs nothing (it is a suspending poll on a background flow) and
         * covers a slow first launch.
         */
        const val RegistrationAttempts = 12
        const val RegistrationRetryDelayMs = 2_500L
    }
}
