package com.snag.app.di

import com.snag.app.SnagConfig
import com.snag.app.billing.ProAccess
import com.snag.app.billing.RevenueCatProAccess
import com.snag.app.billing.StubProAccess
import com.snag.app.data.SnagRepository
import com.snag.app.data.local.DatabaseDriverFactory
import com.snag.app.data.remote.SnagApi
import com.snag.app.data.remote.createSnagHttpClient
import com.snag.app.db.SnagDatabase
import com.snag.app.ui.detail.DetailViewModel
import com.snag.app.ui.pile.PileViewModel
import com.snag.app.ui.search.SearchViewModel
import kotlinx.coroutines.CoroutineDispatcher
import org.koin.core.module.Module
import org.koin.core.module.dsl.viewModel
import org.koin.core.parameter.parametersOf
import org.koin.dsl.module

/** SQLite work must not run on the Compose or Default dispatcher. */
expect val ioDispatcher: CoroutineDispatcher

/** Supplies the platform's database driver. */
expect fun platformModule(): Module

fun appModule(config: SnagConfig): Module = module {
    single { config }

    single { createSnagHttpClient() }
    single { SnagApi(client = get(), baseUrl = config.apiBaseUrl) }

    single { SnagDatabase(get<DatabaseDriverFactory>().create()) }
    single { SnagRepository(database = get(), api = get(), ioDispatcher = ioDispatcher) }

    // Without a RevenueCat key the app runs fully on the free tier rather than
    // crashing or silently granting Pro. That keeps a fresh clone usable and
    // keeps the paywall paths honest in development.
    single<ProAccess> {
        if (config.revenueCatApiKey.isBlank()) {
            StubProAccess()
        } else {
            RevenueCatProAccess(apiKey = config.revenueCatApiKey, debugLogging = config.debug)
        }
    }

    viewModel { PileViewModel(repository = get(), proAccess = get()) }
    viewModel { SearchViewModel(repository = get(), proAccess = get()) }
    viewModel { (id: Long) -> DetailViewModel(repository = get(), id = id) }
}

fun snagModules(config: SnagConfig): List<Module> = listOf(appModule(config), platformModule())

/** Re-exported so screens can pass a row id into [DetailViewModel]. */
fun detailParams(id: Long) = parametersOf(id)
