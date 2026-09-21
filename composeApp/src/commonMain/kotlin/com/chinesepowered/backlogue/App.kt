package com.chinesepowered.backlogue

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.chinesepowered.backlogue.billing.ProAccess
import com.chinesepowered.backlogue.billing.PurchaseOutcome
import com.chinesepowered.backlogue.domain.capture.CaptureCandidate
import com.chinesepowered.backlogue.push.AlertSync
import com.chinesepowered.backlogue.ui.detail.DetailScreen
import com.chinesepowered.backlogue.ui.detail.DetailViewModel
import com.chinesepowered.backlogue.ui.paywall.PaywallSheet
import com.chinesepowered.backlogue.ui.pile.PileScreen
import com.chinesepowered.backlogue.ui.pile.PileViewModel
import com.chinesepowered.backlogue.ui.search.SearchScreen
import com.chinesepowered.backlogue.ui.search.SearchViewModel
import com.chinesepowered.backlogue.ui.theme.BacklogueTheme
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

@Serializable
object PileRoute

@Serializable
object SearchRoute

@Serializable
data class DetailRoute(val id: Long)

/**
 * @param initialCandidate set when the app was launched by a share, so the
 *        share lands directly on search with the parsed game already applied.
 */
@Composable
fun App(
    initialCandidate: CaptureCandidate? = null,
    navController: NavHostController = rememberNavController(),
) {
    BacklogueTheme {
        val proAccess = koinInject<ProAccess>()
        val alertSync = koinInject<AlertSync>()
        val config = koinInject<BacklogueConfig>()
        var showPaywall by remember { mutableStateOf(false) }

        LaunchedEffect(Unit) {
            proAccess.start()
            proAccess.refresh()
        }

        // Separate effect because this one never returns — it collects the pile
        // for as long as the app is alive. Sharing an effect with the one-shot
        // RevenueCat setup above would mean the refresh never completed.
        LaunchedEffect(Unit) {
            alertSync.run(config.oneSignalAppId)
        }

        NavHost(
            navController = navController,
            startDestination = if (initialCandidate != null) SearchRoute else PileRoute,
        ) {
            composable<PileRoute> {
                val viewModel = koinViewModel<PileViewModel>()
                PileScreen(
                    viewModel = viewModel,
                    onOpenGame = { navController.navigate(DetailRoute(it)) },
                    onAddGame = { navController.navigate(SearchRoute) },
                    onShowPaywall = { showPaywall = true },
                )
            }

            composable<SearchRoute> {
                val viewModel = koinViewModel<SearchViewModel>()
                LaunchedEffect(initialCandidate) {
                    initialCandidate?.let(viewModel::onCandidate)
                }
                SearchScreen(
                    viewModel = viewModel,
                    onBack = {
                        if (!navController.popBackStack()) {
                            navController.navigate(PileRoute)
                        }
                    },
                    onShowPaywall = { showPaywall = true },
                    autoFocus = initialCandidate == null,
                )
            }

            composable<DetailRoute> { entry ->
                val route = entry.toRoute<DetailRoute>()
                val viewModel = koinViewModel<DetailViewModel> { parametersOf(route.id) }
                DetailScreen(viewModel = viewModel, onBack = { navController.popBackStack() })
            }
        }

        if (showPaywall) {
            var busy by remember { mutableStateOf(false) }
            var message by remember { mutableStateOf<String?>(null) }
            val scope = rememberCoroutineScope()

            /**
             * Purchase and restore differ only in which call they make, and both
             * must leave the sheet open on anything except success — closing it
             * on a failure hides the reason the user did not get what they paid
             * for.
             */
            fun run(action: suspend () -> PurchaseOutcome) {
                scope.launch {
                    busy = true
                    message = null
                    when (val outcome = action()) {
                        PurchaseOutcome.Success -> showPaywall = false
                        // Backing out of the store sheet is not an error and
                        // gets no error message.
                        PurchaseOutcome.Cancelled -> Unit
                        PurchaseOutcome.Unavailable ->
                            message = "Nothing to buy or restore right now."
                        is PurchaseOutcome.Failed ->
                            message = outcome.message ?: "That didn't go through."
                    }
                    busy = false
                }
            }

            PaywallSheet(
                onDismiss = { showPaywall = false },
                onPurchase = { run { proAccess.purchase() } },
                onRestore = { run { proAccess.restore() } },
                busy = busy,
                message = message,
            )
        }
    }
}
