package com.chinesepowered.backlogue.data.local

import android.content.Context
import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.driver.android.AndroidSqliteDriver
import com.chinesepowered.backlogue.db.BacklogueDatabase

actual class DatabaseDriverFactory(private val context: Context) {
    actual fun create(): SqlDriver =
        AndroidSqliteDriver(BacklogueDatabase.Schema, context, "backlogue.db")
}
