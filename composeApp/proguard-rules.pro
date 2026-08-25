# R8 rules for the release build.
#
# The reason this file matters more than usual: the release build minifies and
# shrinks, and every failure it causes is invisible in debug. A missing keep rule
# does not fail the build — it produces an app that installs, launches, and then
# throws when it tries to deserialise a search result. Debug builds never
# exercise any of this.
#
# Most dependencies here (Compose, Coil, SQLDelight, OkHttp, RevenueCat,
# OneSignal) ship consumer rules inside their artifacts and need nothing added.
# What follows is the part nobody can ship for us: our own reflective surfaces.

# ---------------------------------------------------------------------------
# kotlinx.serialization
#
# Serializers are generated as synthetic $$serializer classes and looked up
# reflectively through each type's Companion. R8 sees no call site for either
# and removes both, which surfaces as SerializationException at runtime.
# ---------------------------------------------------------------------------
-keepattributes *Annotation*, InnerClasses, Signature, RuntimeVisibleAnnotations, AnnotationDefault

-keepclassmembers @kotlinx.serialization.Serializable class ** {
    *** Companion;
    *** INSTANCE;
    kotlinx.serialization.KSerializer serializer(...);
}

-if @kotlinx.serialization.Serializable class **
-keep, includedescriptorclasses class <1>$$serializer { *; }

-keep, includedescriptorclasses class com.chinesepowered.backlogue.**$$serializer { *; }
-keepclassmembers class com.chinesepowered.backlogue.** {
    *** Companion;
}

# The DTOs the Worker's JSON is parsed into.
-keep @kotlinx.serialization.Serializable class com.chinesepowered.backlogue.data.remote.dto.** { *; }

# ---------------------------------------------------------------------------
# Navigation type-safe routes
#
# PileRoute, SearchRoute and DetailRoute are @Serializable and are resolved by
# type at runtime, so they have the same problem as the DTOs with none of the
# same visibility — a stripped route is a crash on navigate, not on parse.
# ---------------------------------------------------------------------------
-keep class com.chinesepowered.backlogue.PileRoute { *; }
-keep class com.chinesepowered.backlogue.SearchRoute { *; }
-keep class com.chinesepowered.backlogue.DetailRoute { *; }
-keepclassmembers class com.chinesepowered.backlogue.DetailRoute {
    <init>(...);
}

# ---------------------------------------------------------------------------
# Koin
#
# Dependencies are resolved by reflective type lookup, so anything only ever
# constructed through a module has no visible call site.
# ---------------------------------------------------------------------------
-keep class com.chinesepowered.backlogue.di.** { *; }
-keepclassmembers class com.chinesepowered.backlogue.** {
    public <init>(...);
}
-dontwarn org.koin.**

# ---------------------------------------------------------------------------
# Ktor
#
# Ktor's engine and plugin registry load implementations via ServiceLoader, and
# it references JVM-server classes that are absent on Android — harmless, but
# they fail the build as warnings unless silenced.
# ---------------------------------------------------------------------------
-keep class io.ktor.client.engine.okhttp.** { *; }
-keepclassmembers class io.ktor.** { volatile <fields>; }
-dontwarn io.ktor.**
-dontwarn kotlinx.coroutines.**
-dontwarn org.slf4j.**
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# ---------------------------------------------------------------------------
# SQLDelight
#
# The generated database and its query classes are instantiated by name from
# the schema, and the JDBC/Android drivers reference each other's absent halves.
# ---------------------------------------------------------------------------
-keep class com.chinesepowered.backlogue.db.** { *; }
-dontwarn app.cash.sqldelight.**

# ---------------------------------------------------------------------------
# Keep our own domain model intact.
#
# Small, and it is the layer everything else is expressed in — shrinking it buys
# almost nothing and makes any crash report much harder to read.
# ---------------------------------------------------------------------------
-keep class com.chinesepowered.backlogue.domain.model.** { *; }

# Enum values() / valueOf() are used reflectively by serialization.
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ---------------------------------------------------------------------------
# Crash reports worth reading.
#
# Line numbers cost nothing and turn an obfuscated stack trace into one that can
# actually be acted on from Play Console.
# ---------------------------------------------------------------------------
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
