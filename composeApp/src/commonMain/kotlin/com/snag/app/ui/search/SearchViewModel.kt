package com.snag.app.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.snag.app.billing.ProAccess
import com.snag.app.data.SnagRepository
import com.snag.app.data.remote.ApiResult
import com.snag.app.domain.capture.CaptureCandidate
import com.snag.app.domain.model.BacklogStatus
import com.snag.app.domain.model.DiscoverySource
import com.snag.app.domain.model.Game
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

data class SearchUiState(
    val query: String = "",
    val results: List<Game> = emptyList(),
    val snaggedIgdbIds: Set<Long> = emptySet(),
    val isSearching: Boolean = false,
    val error: SearchError? = null,
    /** Set when arriving from a share; drives the "we caught this" banner. */
    val candidate: CaptureCandidate? = null,
    val blockedByFreeLimit: Boolean = false,
)

enum class SearchError { Offline, RateLimited, ServerError, NotConfigured, Unknown }

class SearchViewModel(
    private val repository: SnagRepository,
    private val proAccess: ProAccess,
) : ViewModel() {

    private val _state = MutableStateFlow(SearchUiState())
    val state: StateFlow<SearchUiState> = _state.asStateFlow()

    private val queryFlow = MutableStateFlow("")

    @OptIn(FlowPreview::class)
    private val searchJob = queryFlow
        .debounce(280)
        .distinctUntilChanged()
        .onEach { runSearch(it) }
        .launchIn(viewModelScope)

    fun onQueryChange(value: String) {
        _state.value = _state.value.copy(query = value)
        queryFlow.value = value
    }

    /**
     * Entry point from the share sheet. A high-confidence candidate resolves
     * straight to results; a low-confidence one still pre-fills the box so the
     * user edits rather than types from scratch.
     */
    fun onCandidate(candidate: CaptureCandidate) {
        _state.value = _state.value.copy(candidate = candidate, query = candidate.query)
        queryFlow.value = candidate.query
    }

    fun snag(game: Game, status: BacklogStatus = BacklogStatus.Wishlist) {
        viewModelScope.launch {
            val count = repository.count()
            if (!proAccess.canSnagMore(count)) {
                _state.value = _state.value.copy(blockedByFreeLimit = true)
                return@launch
            }

            val candidate = _state.value.candidate
            repository.snag(
                game = game,
                status = status,
                source = candidate?.source ?: DiscoverySource.Manual,
                sourceUrl = candidate?.url,
            )
            _state.value = _state.value.copy(
                snaggedIgdbIds = _state.value.snaggedIgdbIds + game.igdbId,
            )
        }
    }

    fun dismissFreeLimit() {
        _state.value = _state.value.copy(blockedByFreeLimit = false)
    }

    private suspend fun runSearch(query: String) {
        if (query.isBlank()) {
            _state.value = _state.value.copy(results = emptyList(), isSearching = false, error = null)
            return
        }

        _state.value = _state.value.copy(isSearching = true, error = null)

        when (val result = repository.search(query)) {
            is ApiResult.Success -> {
                val snagged = result.value.filter { repository.isSnagged(it.igdbId) }.map { it.igdbId }
                _state.value = _state.value.copy(
                    results = result.value,
                    snaggedIgdbIds = _state.value.snaggedIgdbIds + snagged,
                    isSearching = false,
                    error = null,
                )
            }

            is ApiResult.Failure -> _state.value = _state.value.copy(
                isSearching = false,
                error = when (result.reason) {
                    ApiResult.Reason.Offline -> SearchError.Offline
                    ApiResult.Reason.RateLimited -> SearchError.RateLimited
                    ApiResult.Reason.ServerError -> SearchError.ServerError
                    ApiResult.Reason.NotConfigured -> SearchError.NotConfigured
                    ApiResult.Reason.Unknown -> SearchError.Unknown
                },
            )
        }
    }
}
