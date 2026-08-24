package com.chinesepowered.backlogue.data.local

import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import com.chinesepowered.backlogue.db.BacklogueDatabase
import java.io.File

/**
 * File-backed, in the platform's usual per-user application directory.
 *
 * The screenshot renderer never touches this — it builds UI state directly —
 * so this can persist for real rather than being kept in memory for
 * reproducible renders.
 */
actual class DatabaseDriverFactory {
    actual fun create(): SqlDriver {
        val file = databaseFile()
        val isNew = !file.exists()
        file.parentFile?.mkdirs()

        val driver = JdbcSqliteDriver("jdbc:sqlite:${file.absolutePath}")
        // JdbcSqliteDriver does not create the schema on connect the way the
        // Android and native drivers do, so a first run has to do it by hand.
        if (isNew) BacklogueDatabase.Schema.create(driver)
        return driver
    }

    private fun databaseFile(): File {
        val home = System.getProperty("user.home")
        val os = System.getProperty("os.name").lowercase()
        val dir = when {
            os.contains("win") ->
                File(System.getenv("APPDATA") ?: "$home/AppData/Roaming", "Backlogue")
            os.contains("mac") ->
                File(home, "Library/Application Support/Backlogue")
            else ->
                File(System.getenv("XDG_DATA_HOME") ?: "$home/.local/share", "Backlogue")
        }
        return File(dir, "backlogue.db")
    }
}
