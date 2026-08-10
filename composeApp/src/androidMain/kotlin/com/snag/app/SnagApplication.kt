package com.snag.app

import android.app.Application
import com.snag.app.di.snagModules
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin

class SnagApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        startKoin {
            androidContext(this@SnagApplication)
            modules(
                snagModules(
                    SnagConfig(
                        apiBaseUrl = BuildConfig.SNAG_API_BASE_URL,
                        revenueCatApiKey = BuildConfig.REVENUECAT_ANDROID_KEY,
                        oneSignalAppId = BuildConfig.ONESIGNAL_APP_ID,
                        debug = BuildConfig.DEBUG,
                    )
                )
            )
        }
    }
}
