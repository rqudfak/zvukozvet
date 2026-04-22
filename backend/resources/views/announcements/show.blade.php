@extends('layouts.app')
@section('title', $announcement->title)
@section('content')
<link rel="stylesheet" href="{{ asset('css/announcements.css') }}">
<link rel="stylesheet" href="{{ asset('css/announcements_show.css') }}">

<div class="announcement-detail">
    <div class="announcement-detail-header" style="border-left: 4px solid {{ $announcement->color }}">
        <div class="announcement-detail-meta">
            @if($announcement->genre_icon)
                <img src="{{ asset('images/genres/' . $announcement->genre_icon) }}" 
                     alt="{{ $announcement->genre }}" 
                     class="genre-icon-large"
                     data-hide-on-error>
            @endif
            <div>
                <span class="announcement-type">{{ $announcement->type }}</span>
                <span class="announcement-genre">{{ $announcement->genre }}</span>
            </div>
        </div>
        
        @auth
            @if($announcement->user_id === auth()->id())
                <div class="announcement-actions">
                    <a href="{{ route('announcements.edit', $announcement) }}" class="btn-submit">Редактировать</a>
                    <form action="{{ route('announcements.destroy', $announcement) }}" method="POST" style="display: inline;">
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="btn-submit" data-confirm="Вы уверены, что хотите удалить объявление?">Удалить</button>
                    </form>
                </div>
            @endif
        @endauth
    </div>
    
    <h1 class="announcement-detail-title">{{ $announcement->title }}</h1>
    
    <div class="announcement-detail-info">
        <div class="info-item">
            <strong>Автор:</strong> {{ $announcement->user->name }}
        </div>
        <div class="info-item">
            <strong>Дата создания:</strong> {{ $announcement->created_at->format('d.m.Y H:i') }}
        </div>
        <div class="info-item">
            <strong>Языки:</strong> {{ $announcement->languages }}
        </div>
        <div class="info-item">
            <strong>Пол:</strong> {{ $announcement->gender }}
        </div>
        <div class="info-item">
            <strong>Срок:</strong> {{ $announcement->duration }}
        </div>
    </div>
    
    <div class="announcement-detail-description">
        <h3>Описание</h3>
        <div style="white-space: pre-line;">{{ $announcement->description }}</div>
    </div>

    <div class="announcement-detail-fragment">
        <h3>Текст</h3>
        <div style="white-space: pre-line;">{{ $announcement->fragment }}</div>
    </div>
    
    <div class="announcement-detail-footer">
        <a href="{{ route('announcements.index') }}" class="btn-back">← Назад к списку</a>
    </div>
</div>

@auth
    {{-- Блок отклика для обычного пользователя --}}
    @if(auth()->id() !== $announcement->user_id)
        <div class="announcement-detail" style="margin-top: 25px;">
            <h3>Отклик на объявление</h3>

            @if($userResponse)
                <p><strong>Ваш текущий отклик:</strong></p>
                <div class="response-item">
                    @if($userResponse->message)
                        <p>{{ $userResponse->message }}</p>
                    @endif
                    <audio controls src="{{ asset('storage/' . $userResponse->audio_path) }}"></audio>
                    <p>Статус: {{ $userResponse->status }}</p>
                    <form action="{{ route('announcements.responses.destroy', [$announcement, $userResponse]) }}" method="POST" style="margin-top:10px;">
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="btn-submit" data-confirm="Удалить отклик?">Удалить отклик</button>
                    </form>
                </div>
            @else
                <form action="{{ route('announcements.responses.store', $announcement) }}" method="POST" enctype="multipart/form-data" class="announcement-form" style="margin-top: 15px;">
                    @csrf
                    <div class="form-group">
                        <label for="message">Сообщение (необязательно)</label>
                        <textarea name="message" id="message" rows="4" placeholder="Напишите сопроводительное сообщение (по желанию)">{{ old('message') }}</textarea>
                        @error('message')
                            <span class="error">{{ $message }}</span>
                        @enderror
                    </div>

                    <div class="form-group">
                        <label for="audio">Аудиофайл (обязательно)</label>
                        <input type="file" name="audio" id="audio" accept="audio/*" required>
                        @error('audio')
                            <span class="error">{{ $message }}</span>
                        @enderror
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn-submit" id="respond-submit" disabled>Откликнуться</button>
                    </div>
                </form>

                <script nonce="{{ $cspNonce }}">
                    document.addEventListener('DOMContentLoaded', function () {
                        const audioInput = document.getElementById('audio');
                        const submitBtn = document.getElementById('respond-submit');

                        function toggleButton() {
                            submitBtn.disabled = !audioInput.value;
                        }

                        audioInput.addEventListener('change', toggleButton);
                        toggleButton();
                    });
                </script>
            @endif
        </div>
    @else
        {{-- Блок откликов для автора объявления --}}
        <div class="announcement-detail" style="margin-top: 25px;">
            <h3>Отклики пользователей</h3>

            @if(isset($responses) && $responses->count())
                @foreach($responses as $response)
                    <div class="response-item">
                        <p>
                            <strong>
                                <a href="{{ route('users.show', $response->user) }}">
                                    {{ $response->user->name }}
                                </a>
                            </strong>
                        </p>
                        @if($response->message)
                            <p>{{ $response->message }}</p>
                        @endif
                        <audio controls src="{{ asset('storage/' . $response->audio_path) }}"></audio>
                        <form action="{{ route('announcements.responses.updateStatus', [$announcement, $response]) }}" method="POST" class="response-status-form">
                            @csrf
                            @method('PATCH')
                            <label>
                                Статус:
                                <select name="status" data-auto-submit>
                                    @foreach(\App\Models\AnnouncementResponse::STATUSES as $status)
                                        <option value="{{ $status }}" {{ $response->status === $status ? 'selected' : '' }}>
                                            {{ $status }}
                                        </option>
                                    @endforeach
                                    
                                </select>
                            </label>
                        </form>
                        @if($response->status === 'Принято' && isset($acceptedResponse) && $acceptedResponse->id === $response->id)
                            @if(isset($existingReview) && $existingReview)
                                <div class="review-existing" style="margin-top:12px; padding:12px; background:#f9f9f9; border-radius:6px;">
                                    <strong>Ваш отзыв:</strong> {{ $existingReview->message }}
                                    <span class="review-rating">
                                        @for($i = 1; $i <= 5; $i++)
                                            <span class="review-star {{ $i <= $existingReview->rating ? 'filled' : '' }}">★</span>
                                        @endfor
                                    </span>
                                    <form action="{{ route('reviews.destroy', $existingReview) }}" method="POST" style="display:inline; margin-left:12px;">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="btn-submit" style="padding:4px 12px; font-size:12px;" data-confirm="Удалить отзыв?">Удалить отзыв</button>
                                    </form>
                                </div>
                            @else
                                <div class="review-form-wrap" style="margin-top:12px;">
                                    <strong>Оставить отзыв пользователю {{ $response->user->name }}</strong>
                                    <form action="{{ route('reviews.store') }}" method="POST" class="announcement-form" style="margin-top:8px;">
                                        @csrf
                                        <input type="hidden" name="announcement_id" value="{{ $announcement->id }}">
                                        <div class="form-group">
                                            <label for="review_message">Сообщение</label>
                                            <textarea name="message" id="review_message" rows="3" required>{{ old('message') }}</textarea>
                                            @error('message')
                                                <span class="error">{{ $message }}</span>
                                            @enderror
                                        </div>
                                        <div class="form-group">
                                            <label>Рейтинг (звёзды)</label>
                                            <select name="rating" required>
                                                @for($i = 1; $i <= 5; $i++)
                                                    <option value="{{ $i }}" {{ old('rating', 5) == $i ? 'selected' : '' }}>{{ $i }} ★</option>
                                                @endfor
                                            </select>
                                        </div>
                                        <button type="submit" class="btn-submit">Отправить отзыв</button>
                                    </form>
                                </div>
                            @endif
                        @endif
                    </div>
                @endforeach
            @else
                <p>Откликов пока нет.</p>
            @endif
        </div>
    @endif
@else
    <div class="announcement-detail" style="margin-top: 25px;">
        <p>Чтобы откликнуться на объявление, пожалуйста, <a href="{{ route('login') }}">войдите</a> или <a href="{{ route('register') }}">зарегистрируйтесь</a>.</p>
    </div>
@endauth
@endsection
