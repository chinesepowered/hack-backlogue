package com.backlogue.app.data.local

import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.driver.native.NativeSqliteDriver
import com.backlogue.app.db.BacklogueDatabase

actual class DatabaseDriverFactory {
    actual fun create(): SqlDriver =
        NativeSqliteDriver(BacklogueDatabase.Schema, "backlogue.db")
}
