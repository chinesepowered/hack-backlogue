package com.chinesepowered.backlogue.data.local

import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import com.chinesepowered.backlogue.db.BacklogueDatabase

/**
 * In-memory only. Nothing on the JVM target should persist between runs — a
 * screenshot pass must produce the same pixels every time it is run.
 */
actual class DatabaseDriverFactory {
    actual fun create(): SqlDriver =
        JdbcSqliteDriver(JdbcSqliteDriver.IN_MEMORY).also(BacklogueDatabase.Schema::create)
}
