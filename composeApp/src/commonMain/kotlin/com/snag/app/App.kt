package com.snag.app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.snag.app.billing.ProAccess
import com.snag.app.domain.capture.CaptureCandidate
import com.snag.app.ui.detail.DetailScreen
import com.snag.app.ui.detail.DetailViewModel
import com.snag.app.ui.paywall.PaywallSheet
import com.snag.app.ui.pile.PileScreen
import com.snag.app.ui.pile.PileViewModel
import com.snag.app.ui.search.SearchScreen
import com.snag.app.ui.search.SearchViewModel
import com.snag.app.ui.theme.SnagTheme
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
    SnagTheme {
        val proAccess = koinInject<ProAccess>()
        var showPaywall by remember { mutableStateOf(false) }

        LaunchedEffect(Unit) {
            proAccess.start()
            proAccess.refresh()
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
                )
            }

            composable<DetailRoute> { entry ->
                val route = entry.toRoute<DetailRoute>()
                val viewModel = koinViewModel<DetailViewModel> { parametersOf(route.id) }
                DetailScreen(viewModel = viewModel, onBack = { navController.popBackStack() })
            }
        }

        if (showPaywall) {
            PaywallSheet(
                onDismiss = { showPaywall = false },
                onPurchase = { showPaywall = false },
                onRestore = { showPaywall = false },
            )
        }
    }
}
