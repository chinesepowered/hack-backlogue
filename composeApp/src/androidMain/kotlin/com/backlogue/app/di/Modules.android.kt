package com.backlogue.app.di

import com.backlogue.app.data.local.DatabaseDriverFactory
import com.backlogue.app.push.OneSignalPushRegistrar
import com.backlogue.app.push.PushRegistrar
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import org.koin.android.ext.koin.androidContext
import org.koin.core.module.Module
import org.koin.dsl.module

actual val ioDispatcher: CoroutineDispatcher = Dispatchers.IO

actual fun platformModule(): Module = module {
    single { DatabaseDriverFactory(androidContext()) }

    // Overrides the common createPushRegistrar(): OneSignal needs a Context,
    // which only the platform module can supply.
    single<PushRegistrar> { OneSignalPushRegistrar(androidContext()) }
}
