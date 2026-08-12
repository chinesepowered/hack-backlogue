package com.chinesepowered.backlogue.di

import com.chinesepowered.backlogue.BacklogueConfig
import com.chinesepowered.backlogue.billing.ProAccess
import com.chinesepowered.backlogue.billing.createProAccess
import com.chinesepowered.backlogue.data.BacklogueRepository
import com.chinesepowered.backlogue.data.local.DatabaseDriverFactory
import com.chinesepowered.backlogue.data.remote.BacklogueApi
import com.chinesepowered.backlogue.data.remote.createBacklogueHttpClient
import com.chinesepowered.backlogue.push.AlertSync
import com.chinesepowered.backlogue.db.BacklogueDatabase
import com.chinesepowered.backlogue.ui.detail.DetailViewModel
import com.chinesepowered.backlogue.ui.pile.PileViewModel
import com.chinesepowered.backlogue.ui.search.SearchViewModel
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
