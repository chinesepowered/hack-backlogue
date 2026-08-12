package com.backlogue.app.ui.pile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.backlogue.app.billing.ProAccess
import com.backlogue.app.billing.ProLimits
import com.backlogue.app.data.BacklogueRepository
import com.backlogue.app.domain.model.BacklogStatus
import com.backlogue.app.domain.model.BacklogEntry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class PileUiState(
    val items: List<BacklogEntry> = emptyList(),
    /**
     * Counts across the *whole* pile, not [items].
     *
     * Deriving these from the filtered list is a trap: with a filter active,
     * every status except the selected one drops to zero, the filter row hides
     * those chips, and the only way back is the All chip. The counts have to
     * outlive the filter that is using them.
     */
    val statusCounts: Map<BacklogStatus, Int> = emptyMap(),
    val filter: BacklogStatus? = null,
    val totalCount: Long = 0,
    val isPro: Boolean = false,
    val isLoading: Boolean = true,
) {

    /** Only surfaced as we approach the cap — never as a persistent nag. */
    val showFreeTierHint: Boolean
        get() = !isPro && totalCount >= ProLimits.FreePileLimit - 5

    val remainingFreeSlots: Int
        get() = (ProLimits.FreePileLimit - totalCount).coerceAtLeast(0).toInt()
}

class PileViewModel(
    private val repository: BacklogueRepository,
    private val proAccess: ProAccess,
) : ViewModel() {

    private val filter = MutableStateFlow<BacklogStatus?>(null)

    val state: StateFlow<PileUiState> = combine(
        repository.observePile(),
        filter,
        repository.observeCount(),
        proAccess.isPro,
    ) { all, activeFilter, count, isPro ->
        PileUiState(
            items = if (activeFilter == null) all else all.filter { it.status == activeFilter },
            statusCounts = all.groupingBy { it.status }.eachCount(),
            filter = activeFilter,
            totalCount = count,
            isPro = isPro,
            isLoading = false,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = PileUiState(),
    )

    fun setFilter(status: BacklogStatus?) {
        filter.value = status
    }

    fun setStatus(id: Long, status: BacklogStatus) {
        viewModelScope.launch { repository.setStatus(id, status) }
    }

    fun remove(id: Long) {
        viewModelScope.launch { repository.remove(id) }
    }
}
