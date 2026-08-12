package com.backlogue.app.di

import com.backlogue.app.BacklogueConfig
import com.backlogue.app.billing.ProAccess
import com.backlogue.app.billing.createProAccess
import com.backlogue.app.data.BacklogueRepository
import com.backlogue.app.data.local.DatabaseDriverFactory
import com.backlogue.app.data.remote.BacklogueApi
import com.backlogue.app.data.remote.createBacklogueHttpClient
import com.backlogue.app.push.AlertSync
import com.backlogue.app.db.BacklogueDatabase
import com.backlogue.app.ui.detail.DetailViewModel
import com.backlogue.app.ui.pile.PileViewModel
import com.backlogue.app.ui.search.SearchViewModel
import kotlinx.coroutines.CoroutineDispatcher
import org.koin.core.module.Module
import org.koin.core.module.dsl.viewModel
import org.koin.core.parameter.parametersOf
import org.koin.dsl.module

/** SQLite work must not run on the Compose or Default dispatcher. */
expect val ioDispatcher: CoroutineDispatcher

/** Supplies the platform's database driver. */
expect fun platformModule(): Module

fun appModule(config: BacklogueConfig): Module = module {
    single { config }

    single { createBacklogueHttpClient() }
    single { BacklogueApi(client = get(), baseUrl = config.apiBaseUrl) }

    single { BacklogueDatabase(get<DatabaseDriverFactory>().create()) }
    single { BacklogueRepository(database = get(), api = get(), ioDispatcher = ioDispatcher) }

    // Without a RevenueCat key the app runs fully on the free tier rather than
    // crashing or silently granting Pro. That keeps a fresh clone usable and
    // keeps the paywall paths honest in development.
    single<ProAccess> { createProAccess(config.revenueCatApiKey, config.debug) }

    single { AlertSync(repository = get(), api = get(), push = get()) }

    viewModel { PileViewModel(repository = get(), proAccess = get()) }
    viewModel { SearchViewModel(repository = get(), proAccess = get()) }
    viewModel { (id: Long) -> DetailViewModel(repository = get(), id = id) }
}

fun backlogueModules(config: BacklogueConfig): List<Module> = listOf(appModule(config), platformModule())

/** Re-exported so screens can pass a row id into [DetailViewModel]. */
fun detailParams(id: Long) = parametersOf(id)
