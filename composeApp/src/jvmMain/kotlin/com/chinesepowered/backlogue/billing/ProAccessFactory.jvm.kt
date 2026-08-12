package com.chinesepowered.backlogue.billing

/**
 * The JVM target exists only to render screenshots, and screenshots of the free
 * tier are the ones worth having — the paywall is reachable from there.
 */
actual fun createProAccess(apiKey: String, debug: Boolean): ProAccess = StubProAccess()
