@extends('layouts.app')
@section('title', 'Профиль ' . $user->name)
@section('content')
<link rel="stylesheet" href="{{ asset('css/announcements.css') }}">
<link rel="stylesheet" href="{{ asset('css/profile.css') }}">

@php
    // гарантируем корректные числа даже если контроллер не передал переменные
    $totalAchievements = $totalAchievements ?? \App\Models\Achievement::query()->count();
    $earnedAchievements = $earnedAchievements ?? $user->achievements()->count();
    $achievementsProgressPercent = $achievementsProgressPercent ?? ($totalAchievements > 0
        ? (int) round(min(100, ($earnedAchievements / $totalAchievements) * 100))
        : 0);
@endphp

<h2 class="page-title">Профиль</h2>

<div class="profile-card">
    <div class="profile-header">
        <div class="profile-avatar-wrap">
            @if($user->avatar && $user->avatar !== 'defult.png')
                <img src="{{ asset('storage/avatars/' . $user->avatar) }}" alt="Аватар" class="profile-avatar" data-fallback-src="{{ asset('images/defult.png') }}">
            @else
                <img src="{{ asset('images/defult.png') }}" alt="Аватар" class="profile-avatar">
            @endif
        </div>
        <div class="profile-info">
            <p class="profile-name">{{ $user->name }}</p>
            <p><strong>Голос озвучивания:</strong> {{ $user->gender ?? '—' }}</p>
            <p><strong>Языки:</strong> {{ $user->language ?? '—' }}</p>
            <p><strong>Тембр:</strong> {{ $user->timbre ?? '—' }}</p>
            <p><strong>На сайте:</strong> с {{ $user->created_at->format('d.m.Y') }}</p>
            <div class="profile-achievements-bar-wrap">
                <strong>Достижения:</strong> {{ $earnedAchievements }}/{{ $totalAchievements }}
                <div class="profile-achievements-bar">
                    <div class="profile-achievements-bar-fill" style="width: {{ $achievementsProgressPercent }}%"></div>
                </div>
            </div>
            @if($canEdit)
                <a href="{{ route('users.edit', $user) }}" class="btn-edit-profile">Редактировать</a>
                
    <div class="profile-security-section">
        <h4>🔒 Безопасность аккаунта</h4>
        
        @if(auth()->user()->two_factor_enabled)
            <div class="security-status enabled">
                <span class="badge-success">✓ Двухфакторная аутентификация включена</span>
                <p class="security-note">При входе в аккаунт вам будет приходить код подтверждения на почту.</p>
                
                <form action="{{ route('2fa.disable') }}" method="POST" class="inline-form">
                    @csrf
                    <div class="password-confirm">
                        <input type="password" name="password" placeholder="Введите текущий пароль" required>
                        <button type="submit" class="btn-security disable" data-confirm="Отключить двухфакторную аутентификацию?">
                            Отключить 2FA
                        </button>
                    </div>
                </form>
                
                
            </div>
        @else
            <div class="security-status disabled">
                <span class="badge-warning">✗ Двухфакторная аутентификация не настроена</span>
                <p class="security-note">Включите 2FA для дополнительной защиты вашего аккаунта.</p>
                
                <form action="{{ route('2fa.enable') }}" method="POST">
                    @csrf
                    <div class="password-confirm">
                        <input type="password" name="password" placeholder="Введите текущий пароль" required>
                        <button type="submit" class="btn-security enable">Включить 2FA</button>
                    </div>
                </form>
            </div>
        @endif
    </div>
            @endif
        </div>
    </div>

    <div class="profile-tabs">
        <button type="button" class="profile-tab active" data-tab="portfolio">Портфолио</button>
        @if($canEdit)
            <button type="button" class="profile-tab" data-tab="my-announcements">Мои объявления</button>
        @endif
        <button type="button" class="profile-tab" data-tab="reviews">Отзывы</button>
        <button type="button" class="profile-tab" data-tab="achievements">Достижения</button>
    </div>

    <div class="profile-tab-content active" id="tab-portfolio">
        @if($canEdit)
            <div class="portfolio-upload">
                <form action="{{ route('users.portfolio.store', $user) }}" method="POST" enctype="multipart/form-data" class="portfolio-form">
                    @csrf
                    <label class="portfolio-upload-label">+ Загрузить запись</label>
                    <input type="file" name="audio" accept=".mp3,.wav,.ogg,.m4a" required class="portfolio-file-input" id="portfolio-audio">
                    <input type="text" name="description" placeholder="Описание записи" class="portfolio-desc-input">
                    <button type="submit" class="btn-submit">Добавить</button>
                </form>
            </div>
        @endif
        <div class="portfolio-list">
            @forelse($user->portfolioItems as $item)
                <div class="portfolio-item">
                    <span class="portfolio-item-date">{{ $item->created_at->format('d.m.Y') }}</span>
                    <p class="portfolio-item-desc">{{ $item->description ?: '—' }}</p>
                    <div class="portfolio-item-audio">
                        <audio controls src="{{ asset('storage/' . $item->audio_path) }}"></audio>
                    </div>
                    @if($canEdit)
                        <form action="{{ route('users.portfolio.destroy', [$user, $item]) }}" method="POST" class="portfolio-item-delete">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="btn-delete-small" title="Удалить">×</button>
                        </form>
                    @endif
                </div>
            @empty
                <p class="profile-empty">Записей в портфолио пока нет.</p>
            @endforelse
        </div>
    </div>

    @if($canEdit)
        <div class="profile-tab-content" id="tab-my-announcements">
            <div class="my-announcements-list">
                @forelse($myAnnouncements as $announcement)
                    <div class="my-announcement-item">
                        <div class="my-announcement-top">
                            <a class="my-announcement-title" href="{{ route('announcements.show', $announcement) }}">
                                {{ $announcement->title }}
                            </a>
                            <span class="my-announcement-date">{{ $announcement->created_at->format('d.m.Y') }}</span>
                        </div>
                        <div class="my-announcement-meta">
                            <span class="my-announcement-status">Статус: {{ $announcement->status }}</span>
                            @if(($announcement->accepted_responses_count ?? 0) > 0)
                                <span class="my-announcement-badge accepted">Есть принятый отклик</span>
                            @else
                                <span class="my-announcement-badge active">Актуально</span>
                            @endif
                        </div>
                        <div class="my-announcement-desc">
                            {{ Str::limit($announcement->description, 140) }}
                        </div>
                    </div>
                @empty
                    <p class="profile-empty">Объявлений пока нет.</p>
                @endforelse
            </div>
        </div>
    @endif

    <div class="profile-tab-content" id="tab-reviews">
        <div class="reviews-list">
            @forelse($user->reviewsReceived as $review)
                <div class="review-item">
                    <div class="review-header">
                        <span class="review-author">{{ $review->reviewer->name ?? 'Пользователь' }}</span>
                        <span class="review-date">{{ $review->created_at->format('d.m.Y') }}</span>
                    </div>
                    <p class="review-message">{{ $review->message }}</p>
                    <div class="review-rating">
                        @for($i = 1; $i <= 5; $i++)
                            <span class="review-star {{ $i <= $review->rating ? 'filled' : '' }}">★</span>
                        @endfor
                    </div>
                    @if(auth()->id() === $review->reviewer_id)
                        <form action="{{ route('reviews.destroy', $review) }}" method="POST" style="display:inline;">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="btn-delete-small">Удалить отзыв</button>
                        </form>
                    @endif
                </div>
            @empty
                <p class="profile-empty">Отзывов пока нет.</p>
            @endforelse
        </div>
    </div>

    <div class="profile-tab-content" id="tab-achievements">
        <div class="achievements-grid">
            @forelse($allAchievements as $achievement)
                @php
                    $unlocked = in_array($achievement->id, $userAchievementIds ?? []);
                @endphp
                <div class="achievement-item {{ $unlocked ? 'unlocked' : 'locked' }}" title="{{ $achievement->description }}">
                    @if($achievement->icon)
                        <img src="{{ asset('images/achievements/' . $achievement->icon) }}" alt="" class="achievement-icon">
                    @else
                        <div class="achievement-icon-placeholder">🏆</div>
                    @endif
                    <span class="achievement-name">{{ $achievement->name }}</span>
                    @if($achievement->description)
                        <span class="achievement-desc">{{ $achievement->description }}</span>
                    @endif
                </div>
            @empty
                <p class="profile-empty">Список достижений пока не заполнен.</p>
            @endforelse
        </div>
    </div>
</div>

<script nonce="{{ $cspNonce }}">
// открыть нужную вкладку по ?tab=...
(function() {
    try {
        var params = new URLSearchParams(window.location.search);
        var initialTab = params.get('tab');
        if (!initialTab) return;
        var btn = document.querySelector('.profile-tab[data-tab="' + initialTab + '"]');
        if (btn) btn.click();
    } catch (e) {}
})();

document.querySelectorAll('.profile-tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var tab = this.getAttribute('data-tab');
        document.querySelectorAll('.profile-tab').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.profile-tab-content').forEach(function(c) { c.classList.remove('active'); });
        this.classList.add('active');
        var content = document.getElementById('tab-' + tab);
        if (content) content.classList.add('active');
    });
});
</script>
@endsection
