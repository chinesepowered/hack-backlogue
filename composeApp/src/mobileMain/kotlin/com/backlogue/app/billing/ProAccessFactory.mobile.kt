package com.backlogue.app.billing

actual fun createProAccess(apiKey: String, debug: Boolean): ProAccess =
    if (apiKey.isBlank()) StubProAccess() else RevenueCatProAccess(apiKey, debug)
