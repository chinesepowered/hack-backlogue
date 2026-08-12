package com.chinesepowered.backlogue.billing

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * What Pro unlocks, and where the free tier stops.
 *
 * The boundary is a product decision that two of the awards pull against each
 * other on. A paywall that maximises revenue would cap the pile at five games
 * and gate the core loop; the influencer brief and the design award both ask
 * for a backlog that feels enjoyable rather than extractive. The compromise
 * here: the *core loop is never gated*. Adding, organising, rating, and
 * sharing are free forever, at a cap high enough that anyone who hits it is a
 * committed user rather than a curious one. Pro sells the things that only
 * matter once you already care — alerts, custom lists, and the year in review.
 */
object ProLimits {
    /**
     * Chosen from what a real backlog looks like, not from what converts best.
     * Median Steam libraries run to the low hundreds but active wishlists sit
     * far lower; 30 lets a genuine user live in the free tier for weeks.
     */
    const val FreePileLimit = 30

    const val EntitlementId = "pro"
    const val DefaultOfferingId = "default"
}

/**
 * Isolates the rest of the app from RevenueCat.
 *
 * Everything upstream of this interface treats Pro as a boolean that can change
 * at any time. That keeps purchase plumbing out of view models, and it means UI
 * and tests can run against [StubProAccess] without a store connection — which
 * matters here because in-app purchases cannot be tested in a CI container or
 * on a simulator.
 */
/**
 * Outcome of a purchase or restore.
 *
 * [Cancelled] is separated from [Failed] because it is not an error and must
 * never surface as one — a user who backs out of the store sheet has done
 * nothing wrong, and showing them a failure message for it is the fastest way
 * to make a paywall feel hostile.
 */
sealed interface PurchaseOutcome {
    data object Success : PurchaseOutcome
    data object Cancelled : PurchaseOutcome
    /** No store connection on this platform, or no offering configured. */
    data object Unavailable : PurchaseOutcome
    data class Failed(val message: String?) : PurchaseOutcome
}

interface ProAccess {
    val isPro: StateFlow<Boolean>

    /** Called once at app start. Safe to call when unconfigured. */
    fun start()

    /** Pulls fresh entitlement state, e.g. after returning from the paywall. */
    suspend fun refresh()

    /** Buys the default offering's first package. */
    suspend fun purchase(): PurchaseOutcome

    /** Re-applies entitlements already owned by this store account. */
    suspend fun restore(): PurchaseOutcome

    /**
     * Whether one more game fits. Kept here rather than in the repository so
     * the limit and the entitlement that lifts it stay in the same file.
     */
    fun canAddMore(currentCount: Long): Boolean =
        isPro.value || currentCount < ProLimits.FreePileLimit

    fun remainingFreeSlots(currentCount: Long): Int =
        if (isPro.value) Int.MAX_VALUE
        else (ProLimits.FreePileLimit - currentCount).coerceAtLeast(0).toInt()
}

/**
 * Used in tests, previews, and any build without store credentials. Defaults to
 * free so the paywall paths are the ones exercised by default.
 */
class StubProAccess(initiallyPro: Boolean = false) : ProAccess {
    private val _isPro = MutableStateFlow(initiallyPro)
    override val isPro: StateFlow<Boolean> = _isPro.asStateFlow()

    override fun start() = Unit
    override suspend fun refresh() = Unit

    // Deliberately not faking success. A stub that grants Pro would make the
    // paywall untestable and would hide a missing store configuration behind a
    // working-looking button.
    override suspend fun purchase(): PurchaseOutcome = PurchaseOutcome.Unavailable
    override suspend fun restore(): PurchaseOutcome = PurchaseOutcome.Unavailable

    fun setPro(value: Boolean) {
        _isPro.value = value
    }
}
