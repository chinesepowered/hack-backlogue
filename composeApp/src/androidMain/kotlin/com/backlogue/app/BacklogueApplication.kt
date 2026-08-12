package com.backlogue.app

import android.app.Application
import com.backlogue.app.di.backlogueModules
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin

class BacklogueApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        startKoin {
            androidContext(this@BacklogueApplication)
            modules(
                backlogueModules(
                    BacklogueConfig(
                        apiBaseUrl = BuildConfig.BACKLOGUE_API_BASE_URL,
                        revenueCatApiKey = BuildConfig.REVENUECAT_ANDROID_KEY,
                        oneSignalAppId = BuildConfig.ONESIGNAL_APP_ID,
                        debug = BuildConfig.DEBUG,
                    )
                )
            )
        }
    }
}
