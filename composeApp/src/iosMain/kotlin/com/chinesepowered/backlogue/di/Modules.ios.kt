package com.chinesepowered.backlogue.di

import com.chinesepowered.backlogue.data.local.DatabaseDriverFactory
import com.chinesepowered.backlogue.push.PushRegistrar
import com.chinesepowered.backlogue.push.NoPushRegistrar
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.IO
import kotlinx.coroutines.Dispatchers
import org.koin.core.module.Module
import org.koin.dsl.module

actual val ioDispatcher: CoroutineDispatcher = Dispatchers.IO

actual fun platformModule(): Module = module {
    single { DatabaseDriverFactory() }
    // iOS push is owned by Swift: OneSignal's iOS SDK ships as a Swift package
    // with no Kotlin bindings, so init and permission prompting belong in
    // iOSApp.swift. Wiring it up means adding the OneSignal SPM dependency to
    // the Xcode project and replacing this with a class that reads
    // OneSignal.User.pushSubscription.id across the interop boundary. Until
    // then the app runs and alerts simply do not register on iOS.
    single<PushRegistrar> { NoPushRegistrar() }
}
