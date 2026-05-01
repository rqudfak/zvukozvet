@extends('layouts.app')
@section('title','Главная')
@section('content')
<link rel="stylesheet" href="{{ asset('css/announcements.css') }}">

<div class="announcements-header">
    <h2>Доска объявлений</h2>
    
    @if($announcements->hasPages())
    <div class="pagination pagination-top">
        {{ $announcements->links('pagination::numbers') }}
    </div>
    @endif

    @auth
        <a href="{{ route('announcements.create') }}" class="btn-submit">Создать объявление</a>
    @endauth
</div>

<div class="announcements-main">
<!-- Блок фильтрации -->
<div class="filters-container">
    <form method="GET" action="{{ route('announcements.index') }}" id="filters-form">
        @csrf
        <!-- Тип -->
        <div class="filter-section">
            <h3 class="filter-title">Тип</h3>
            <div class="filter-tags">
                <!-- при выборе жанра автоматически выбирается соответствующий тип -->
                @php
                    $selectedTypes = request('types', []) ?: [];
                    $selectedGenres = request('genres', []) ?: [];
                    $bookGenreNames = $allGenres->where('type', 'Книга')->pluck('name')->toArray();
                    $gameGenreNames = $allGenres->where('type', 'Видеоигра')->pluck('name')->toArray();
                    $typeBookChecked = in_array('Книга', $selectedTypes) || count(array_intersect($selectedGenres, $bookGenreNames)) > 0;
                    $typeGameChecked = in_array('Видеоигра', $selectedTypes) || count(array_intersect($selectedGenres, $gameGenreNames)) > 0;
                @endphp
                <label class="filter-tag">
                    <input type="checkbox" name="types[]" value="Книга"
                           {{ $typeBookChecked ? 'checked' : '' }}
                           data-auto-submit>
                    <span>Книга</span>
                </label>
                <label class="filter-tag">
                    <input type="checkbox" name="types[]" value="Видеоигра"
                           {{ $typeGameChecked ? 'checked' : '' }}
                           data-auto-submit>
                    <span>Видеоигра</span>
                </label>
            </div>
        </div>

        <div class="filter-divider"></div>

        <!-- Жанр -->
        <div class="filter-section">
            <h3 class="filter-title">Жанр</h3>
            <div class="filter-tags filter-tags-grid">
                @foreach($allGenres as $genre)
                    <label class="filter-tag">
                        <input type="checkbox" name="genres[]" value="{{ $genre->name }}"
                               {{ in_array($genre->name, $selectedGenres) ? 'checked' : '' }}
                               data-auto-submit>
                        <span>{{ $genre->name }}</span>
                    </label>
                @endforeach
            </div>
        </div>

        <div class="filter-divider"></div>

        <!-- Пол -->
        <div class="filter-section">
            <h3 class="filter-title">Пол</h3>
            <div class="filter-radio-group">
                <label class="filter-radio">
                    <input type="radio" name="gender" value="Мужской" 
                           {{ request('gender') === 'Мужской' ? 'checked' : '' }}
                           data-auto-submit>
                    <span>Мужской</span>
                </label>
                <label class="filter-radio">
                    <input type="radio" name="gender" value="Женский" 
                           {{ request('gender') === 'Женский' ? 'checked' : '' }}
                           data-auto-submit>
                    <span>Женский</span>
                </label>
            </div>
        </div>

        <div class="filter-divider"></div>

        <!-- Поиск -->
        <div class="filter-section">
            <h3 class="filter-title">Поиск</h3>
            <input type="text" name="search" value="{{ request('search') }}" 
                   placeholder="Поиск по названию" class="filter-search-input"
                   data-submit-on-enter>
        </div>

        <!-- Кнопки -->
        <div class="filter-actions">
            <button type="submit" class="btn-submit">Применить</button>
            <a href="{{ route('announcements.index') }}" class="btn-switch">Сброс</a>
        </div>
    </form>
</div>

<!-- Блок объявлений -->
<div class="announcements-grid">
    @forelse($announcements as $announcement)
        <div class="announcement-card" style="--genre-color: {{ $announcement->color }}">
            <div class="announcement-title-row">
                <h3 class="announcement-title">
                    <a href="{{ route('announcements.show', $announcement) }}">{{ $announcement->title }}</a>
                </h3>
                <span class="announcement-date">{{ $announcement->created_at->format('d.m.y') }}</span>
            </div>
            
            <div class="announcement-type-genre-section">
                <div class="genre-icon-container" style="background-color: {{ $announcement->color }}">
                    @if($announcement->genre_icon)
                        <img src="{{ \App\Models\Genre::publicUrlForStoredIcon($announcement->genre_icon) }}"
                             alt="{{ $announcement->genre }}"
                             class="genre-icon"
                             data-hide-on-error>
                    @endif
                </div>
                <div class="type-genre-info">
                    <div class="type-row">
                        <span class="type-label">Тип:</span>
                        <span class="type-value">{{ $announcement->type }}</span>
                    </div>
                    <div class="genre-row">
                        <span class="genre-label">Жанр:</span>
                        <span class="genre-value">{{ $announcement->genre }}</span>
                    </div>
                </div>
            </div>
            
            <div class="announcement-details">
                <div class="detail-item">
                    <span class="detail-label">Языки:</span>
                    <span class="detail-value">{{ $announcement->languages }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Голос озвучивания:</span>
                    <span class="detail-value">{{ $announcement->gender }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Срок:</span>
                    <span class="detail-value">{{ $announcement->duration }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Описание:</span>
                    <span class="detail-value">{{ Str::limit($announcement->description, 100) }}</span>
                </div>
            </div>
        </div>
    @empty
        <p class="no-announcements">Объявлений пока нет. @auth<a href="{{ route('announcements.create') }}">Создайте первое!</a>@endauth</p>
    @endforelse
</div>
</div>

@if($announcements->hasPages())
    <div class="pagination pagination-bottom">
        {{ $announcements->links('pagination::numbers') }}
    </div>
@endif
@endsection
