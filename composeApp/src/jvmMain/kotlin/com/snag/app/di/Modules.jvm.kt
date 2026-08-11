package com.snag.app.di

import com.snag.app.data.local.DatabaseDriverFactory
import com.snag.app.push.PushRegistrar
import com.snag.app.push.NoPushRegistrar
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import org.koin.core.module.Module
import org.koin.dsl.module

actual val ioDispatcher: CoroutineDispatcher = Dispatchers.IO

actual fun platformModule(): Module = module {
    single { DatabaseDriverFactory() }
    single<PushRegistrar> { NoPushRegistrar() }
}
