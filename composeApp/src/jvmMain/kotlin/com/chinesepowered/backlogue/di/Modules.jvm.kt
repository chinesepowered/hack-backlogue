package com.chinesepowered.backlogue.di

import com.chinesepowered.backlogue.data.local.DatabaseDriverFactory
import com.chinesepowered.backlogue.push.PushRegistrar
import com.chinesepowered.backlogue.push.NoPushRegistrar
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import org.koin.core.module.Module
import org.koin.dsl.module

actual val ioDispatcher: CoroutineDispatcher = Dispatchers.IO

actual fun platformModule(): Module = module {
    single { DatabaseDriverFactory() }
    single<PushRegistrar> { NoPushRegistrar() }
}
