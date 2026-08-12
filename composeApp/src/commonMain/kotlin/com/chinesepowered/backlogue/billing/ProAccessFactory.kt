package com.chinesepowered.backlogue.billing

/**
 * Builds the platform's [ProAccess].
 *
 * This exists because RevenueCat ships no JVM artifact, and the JVM target is
 * what lets us render the real UI offscreen for store screenshots. Rather than
 * treat that as a workaround, it is modelled as what it actually is: in-app
 * purchases are a mobile concern, and platforms without a store get a free-tier
 * implementation instead of a broken one.
 *
 * @param apiKey blank on any build without store credentials, which yields the
 *        stub rather than a crash — a fresh clone stays runnable.
 */
expect fun createProAccess(apiKey: String, debug: Boolean): ProAccess
