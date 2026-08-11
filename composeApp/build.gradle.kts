import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import java.util.Properties

/**
 * Client keys live in local.properties (git-ignored) so a fresh clone builds
 * without them. The genuinely secret value — the Twitch client secret IGDB
 * requires — is never read here; it exists only in the Cloudflare Worker.
 */
val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

fun secretOrEmpty(key: String): String =
    (localProperties.getProperty(key) ?: System.getenv(key) ?: "").trim()

plugins {
    alias(libs.plugins.multiplatform)
    alias(libs.plugins.android.application)
    alias(libs.plugins.compose)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.serialization)
    alias(libs.plugins.sqldelight)
}

kotlin {
    // expect/actual classes are still flagged Beta. We use them only for the
    // two genuine platform seams (database driver, HTTP engine), which is the
    // intended use, so the warning is noise rather than signal.
    compilerOptions {
        freeCompilerArgs.add("-Xexpect-actual-classes")
    }

    // RevenueCat publishes no JVM artifact, so it cannot live in commonMain if
    // we want a JVM target. A `mobile` group holds it instead — which is the
    // honest description anyway: in-app purchases are a phone concern.
    // The JVM target exists to render the real UI offscreen for store
    // screenshots without an emulator (see jvmMain/ScreenshotGenerator.kt).
    applyDefaultHierarchyTemplate {
        common {
            group("mobile") {
                withAndroidTarget()
                withIos()
            }
        }
    }

    androidTarget {
        compilerOptions {
            jvmTarget.set(JvmTarget.JVM_17)
        }
    }

    jvm()

    // Apple Silicon only. Compose Multiplatform 1.11 stopped publishing
    // components-resources for iosX64, and the Intel simulator is not a target
    // anyone still ships against.
    listOf(
        iosArm64(),
        iosSimulatorArm64(),
    ).forEach { iosTarget ->
        iosTarget.binaries.framework {
            baseName = "ComposeApp"
            isStatic = true
        }
    }

    sourceSets {
        commonMain.dependencies {
            // The `compose.*` accessors are deprecated in Compose Multiplatform
            // 1.11, but the explicit coordinates they point to are not yet
            // published at this version, so migrating now breaks resolution.
            // Left as-is deliberately; revisit when 1.12 lands.
            //
            // materialIconsExtended is the only source of `Icons` here —
            // Compose Multiplatform's material3 does not bundle icons-core the
            // way the Android artifact does. It is pinned upstream to 1.7.3 and
            // is heavy for the four icons this app draws, so replacing them
            // with hand-authored ImageVectors is worth doing before release.
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.materialIconsExtended)
            implementation(compose.ui)
            implementation(compose.components.resources)

            implementation(libs.androidx.lifecycle.viewmodel)
            implementation(libs.androidx.lifecycle.runtime.compose)
            implementation(libs.androidx.navigation.compose)

            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.kotlinx.datetime)

            implementation(libs.ktor.client.core)
            implementation(libs.ktor.client.content.negotiation)
            implementation(libs.ktor.serialization.json)
            implementation(libs.ktor.client.logging)

            implementation(libs.sqldelight.runtime)
            implementation(libs.sqldelight.coroutines)

            implementation(libs.koin.core)
            implementation(libs.koin.compose)
            implementation(libs.koin.compose.viewmodel)

            implementation(libs.coil.compose)
            implementation(libs.coil.network.ktor)
        }

        val mobileMain by getting {
            dependencies {
                implementation(libs.purchases.core)
                implementation(libs.purchases.ui)
            }
        }

        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation(libs.kotlinx.coroutines.test)
            implementation(libs.ktor.client.mock)
        }

        androidMain.dependencies {
            implementation(compose.preview)
            implementation(libs.androidx.activity.compose)
            implementation(libs.androidx.core.ktx)
            implementation(libs.kotlinx.coroutines.android)
            implementation(libs.ktor.client.okhttp)
            implementation(libs.sqldelight.android.driver)
            implementation(libs.koin.android)
            implementation(libs.onesignal)
        }

        iosMain.dependencies {
            implementation(libs.ktor.client.darwin)
            implementation(libs.sqldelight.native.driver)
        }

        jvmMain.dependencies {
            implementation(compose.desktop.currentOs)
            implementation(libs.kotlinx.coroutines.swing)
            implementation(libs.ktor.client.okhttp)
            implementation(libs.sqldelight.jvm.driver)
        }
    }
}

android {
    namespace = "com.snag.app"
    compileSdk = libs.versions.android.compileSdk.get().toInt()

    defaultConfig {
        applicationId = "com.snag.app"
        minSdk = libs.versions.android.minSdk.get().toInt()
        targetSdk = libs.versions.android.targetSdk.get().toInt()
        versionCode = 1
        versionName = "0.1.0"

        buildConfigField("String", "SNAG_API_BASE_URL", "\"${secretOrEmpty("SNAG_API_BASE_URL")}\"")
        buildConfigField("String", "REVENUECAT_ANDROID_KEY", "\"${secretOrEmpty("REVENUECAT_ANDROID_KEY")}\"")
        buildConfigField("String", "ONESIGNAL_APP_ID", "\"${secretOrEmpty("ONESIGNAL_APP_ID")}\"")
    }

    sourceSets["main"].res.srcDirs("src/androidMain/res")
    sourceSets["main"].resources.srcDirs("src/commonMain/resources")

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
        debug {
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

sqldelight {
    databases {
        create("SnagDatabase") {
            packageName.set("com.snag.app.db")
        }
    }
}

dependencies {
    debugImplementation(compose.uiTooling)
}

/**
 * Renders store screenshots from the real composables, offscreen via Skia.
 * No emulator, no device, no Mac — `./gradlew screenshots`.
 */
tasks.register<JavaExec>("screenshots") {
    group = "snag"
    description = "Render App Store / Play Store screenshots to build/screenshots"

    val jvmCompilation = kotlin.jvm().compilations.getByName("main")
    dependsOn(jvmCompilation.compileTaskProvider)

    mainClass.set("com.snag.app.screenshots.ScreenshotGeneratorKt")
    classpath = files(
        jvmCompilation.output.allOutputs,
        jvmCompilation.runtimeDependencyFiles,
    )
    args = listOf(layout.buildDirectory.dir("screenshots").get().asFile.absolutePath)

    // Skia renders offscreen, but AWT still wants a display without this.
    systemProperty("java.awt.headless", "true")
}
