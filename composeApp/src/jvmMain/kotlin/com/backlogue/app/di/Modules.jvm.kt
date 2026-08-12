package com.backlogue.app.di

import com.backlogue.app.data.local.DatabaseDriverFactory
import com.backlogue.app.push.PushRegistrar
import com.backlogue.app.push.NoPushRegistrar
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import org.koin.core.module.Module
import org.koin.dsl.module

actual val ioDispatcher: CoroutineDispatcher = Dispatchers.IO

actual fun platformModule(): Module = module {
    single { DatabaseDriverFactory() }
    single<PushRegistrar> { NoPushRegistrar() }
}
