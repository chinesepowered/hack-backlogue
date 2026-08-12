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
                if (igdbIds.isEmpty()) return@collect

                // Ask only once there is something worth being notified about.
                // Prompting on first launch, before the user has saved a single
                // game, is how apps get permanently denied.
                push.requestPermission()

                val subscriptionId = awaitSubscriptionId() ?: return@collect
                api.watch(subscriptionId, igdbIds)
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

    private companion object {
        const val RegistrationAttempts = 5
        const val RegistrationRetryDelayMs = 1_000L
    }
}
