package com.backlogue.app.ui.detail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.backlogue.app.data.BacklogueRepository
import com.backlogue.app.domain.model.BacklogStatus
import com.backlogue.app.domain.model.BacklogEntry
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class DetailUiState(
    val item: BacklogEntry? = null,
    val isLoading: Boolean = true,
    val removed: Boolean = false,
)

class DetailViewModel(
    private val repository: BacklogueRepository,
    private val id: Long,
) : ViewModel() {

    val state: StateFlow<DetailUiState> = repository.observeById(id)
        .map { DetailUiState(item = it, isLoading = false, removed = it == null) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = DetailUiState(),
        )

    fun setStatus(status: BacklogStatus) {
        viewModelScope.launch { repository.setStatus(id, status) }
    }

    /** Tapping the active rating clears it — otherwise a mis-tap is permanent. */
    fun rate(rating: Int) {
        viewModelScope.launch {
            val current = state.value.item?.rating
            repository.rate(id, if (current == rating) null else rating)
        }
    }

    fun setNote(note: String) {
        viewModelScope.launch { repository.setNote(id, note) }
    }

    fun remove() {
        viewModelScope.launch { repository.remove(id) }
    }
}
