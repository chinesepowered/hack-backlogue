package com.backlogue.app.billing

import com.revenuecat.purchases.kmp.LogLevel
import com.revenuecat.purchases.kmp.Purchases
import com.revenuecat.purchases.kmp.PurchasesDelegate
import com.revenuecat.purchases.kmp.configure
import com.revenuecat.purchases.kmp.ktx.awaitCustomerInfo
import com.revenuecat.purchases.kmp.ktx.awaitOfferings
import com.revenuecat.purchases.kmp.ktx.awaitPurchase
import com.revenuecat.purchases.kmp.ktx.awaitRestore
import com.revenuecat.purchases.kmp.models.PurchasesTransactionException
import com.revenuecat.purchases.kmp.models.CustomerInfo
import com.revenuecat.purchases.kmp.models.PurchasesError
import com.revenuecat.purchases.kmp.models.StoreProduct
import com.revenuecat.purchases.kmp.models.StoreTransaction
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * The only file in the app that knows RevenueCat exists.
 *
 * Entitlement state is pushed rather than polled: [PurchasesDelegate] fires
 * whenever RevenueCat learns something new, including renewals and refunds that
 * happen while the app is backgrounded, so Pro can be revoked without the user
 * having to relaunch.
 */
class RevenueCatProAccess(
    private val apiKey: String,
    private val debugLogging: Boolean = false,
) : ProAccess {

    private val _isPro = MutableStateFlow(false)
    override val isPro: StateFlow<Boolean> = _isPro.asStateFlow()

    private var configured = false

    override fun start() {
        if (configured || apiKey.isBlank()) return

        if (debugLogging) Purchases.logLevel = LogLevel.DEBUG
        Purchases.configure(apiKey = apiKey)
        configured = true

        Purchases.sharedInstance.delegate = object : PurchasesDelegate {
            override fun onCustomerInfoUpdated(customerInfo: CustomerInfo) {
                _isPro.value = customerInfo.isPro
            }

            /**
             * App Store promoted purchases. We do not run any, so the deferred
             * purchase is simply never started — calling it would begin a
             * transaction the user did not ask for.
             */
            override fun onPurchasePromoProduct(
                product: StoreProduct,
                startPurchase: (
                    (PurchasesError, Boolean) -> Unit,
                    (StoreTransaction, CustomerInfo) -> Unit,
                ) -> Unit,
            ) = Unit
        }
    }

    override suspend fun refresh() {
        if (!configured) return
        // A failure here means we could not reach RevenueCat, which is not the
        // same as "not subscribed". Keeping the last known value avoids
        // yanking Pro away from a paying user who is briefly offline.
        runCatching { Purchases.sharedInstance.awaitCustomerInfo() }
            .onSuccess { _isPro.value = it.isPro }
    }

    override suspend fun purchase(): PurchaseOutcome {
        if (!configured) return PurchaseOutcome.Unavailable

        val offering = runCatching { Purchases.sharedInstance.awaitOfferings() }
            .getOrNull()
            ?.let { it.current ?: it[ProLimits.DefaultOfferingId] }
            ?: return PurchaseOutcome.Unavailable

        // The paywall sells a single thing, so the first package is the offer.
        // Multi-package pricing is configured in the RevenueCat dashboard and
        // would need the UI to let the user choose before this can change.
        val target = offering.availablePackages.firstOrNull()
            ?: return PurchaseOutcome.Unavailable

        return try {
            val result = Purchases.sharedInstance.awaitPurchase(target)
            _isPro.value = result.customerInfo.isPro
            if (_isPro.value) PurchaseOutcome.Success else PurchaseOutcome.Failed(null)
        } catch (cancellation: PurchasesTransactionException) {
            if (cancellation.userCancelled) {
                PurchaseOutcome.Cancelled
            } else {
                PurchaseOutcome.Failed(cancellation.message)
            }
        } catch (error: Throwable) {
            PurchaseOutcome.Failed(error.message)
        }
    }

    override suspend fun restore(): PurchaseOutcome {
        if (!configured) return PurchaseOutcome.Unavailable

        return runCatching { Purchases.sharedInstance.awaitRestore() }
            .fold(
                onSuccess = { info ->
                    _isPro.value = info.isPro
                    // Restoring with nothing to restore is not a failure, but it
                    // must not silently look like one either — the caller
                    // distinguishes so the UI can say "nothing to restore".
                    if (info.isPro) PurchaseOutcome.Success else PurchaseOutcome.Unavailable
                },
                onFailure = { PurchaseOutcome.Failed(it.message) },
            )
    }
}

private val CustomerInfo.isPro: Boolean
    get() = entitlements[ProLimits.EntitlementId]?.isActive == true
