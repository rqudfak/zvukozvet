@extends('layouts.app')
@section('title', 'Управление жанрами')
@section('content')
<link rel="stylesheet" href="{{ asset('css/announcements.css') }}">
<link rel="stylesheet" href="{{ asset('css/admin.css') }}">

<div class="admin-tabs" style="margin-bottom: 20px;">
    <a href="{{ route('admin.index') }}" class="admin-tab">Главная админки</a>
    <a href="{{ route('genres.index') }}" class="admin-tab admin-tab-active">Жанры</a>
    <a href="{{ route('admin.announcements.index') }}" class="admin-tab">Объявления</a>
    <a href="{{ route('admin.users.index') }}" class="admin-tab">Пользователи</a>
</div>

<div class="form-container">
    <h2>Добавить жанр</h2>
    <form action="{{ route('genres.store') }}" method="POST" enctype="multipart/form-data" class="announcement-form">
        @csrf
        <div class="form-group">
            <label for="name">Название жанра</label>
            <input type="text" id="name" name="name" value="{{ old('name') }}" required>
            @error('name')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>

        <div class="form-group">
            <label for="type">Тип</label>
            <select id="type" name="type" required>
                <option value="Книга" {{ old('type') === 'Книга' ? 'selected' : '' }}>Книга</option>
                <option value="Видеоигра" {{ old('type') === 'Видеоигра' ? 'selected' : '' }}>Видеоигра</option>
            </select>
            @error('type')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>

        <div class="form-group">
            <label for="color">Цвет</label>
            <select id="color" name="color" required>
                <option value="#F1642E">Оранжевый</option>
                <option value="#C4C3E3">Голубой</option>
                <option value="#FFC44B">Жёлтый</option>
                <option value="#A3B565">Зелёный</option>
            </select>
        </div>

        <div class="form-group">
            <label for="icon">Иконка жанра (png/jpg/webp)</label>
            <input type="file" id="icon" name="icon" accept="image/*">
            @error('icon')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>

        <div class="form-actions">
            <button type="submit" class="btn-submit">Сохранить жанр</button>
            <a href="{{ route('admin.index') }}" class="btn-cancel">Назад в админку</a>
        </div>
    </form>
</div>

<div class="admin-table-container" style="margin-top: 30px;">
    <h2>Жанры книг</h2>
    <table class="admin-table">
        <thead>
            <tr>
                <th>Название</th>
                <th>Цвет</th>
                <th>Иконка</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody>
            @forelse($bookGenres as $genre)
                <tr>
                    <td>{{ $genre->name }}</td>
                    <td>
                        <span style="display:inline-block;width:16px;height:16px;background:{{ $genre->color }};border-radius:3px;margin-right:5px;"></span>
                        {{ $genre->color }}
                    </td>
                    <td>
                        @if($genre->icon)
                            <img src="{{ \App\Models\Genre::publicUrlForStoredIcon($genre->icon) }}" alt="{{ $genre->name }}" width="32" height="32">
                        @else
                            —
                        @endif
                    </td>
                    <td>
                        <button type="button" class="btn-edit-genre" data-url="{{ route('genres.update', $genre) }}" data-name="{{ e($genre->name) }}" data-type="{{ e($genre->type) }}" data-color="{{ e($genre->color) }}">Изменить</button>
                        <form action="{{ route('genres.destroy', $genre) }}" method="POST" style="display:inline;">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="btn-delete" data-confirm="Удалить жанр?">Удалить</button>
                        </form>
                    </td>
                </tr>
            @empty
                <tr><td colspan="5" class="text-center">Жанров нет</td></tr>
            @endforelse
        </tbody>
    </table>
</div>

<div class="admin-table-container" style="margin-top: 30px;">
    <h2>Жанры видеоигр</h2>
    <table class="admin-table">
        <thead>
            <tr>
                <th>Название</th>
                <th>Цвет</th>
                <th>Иконка</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody>
            @forelse($gameGenres as $genre)
                <tr>
                    <td>{{ $genre->name }}</td>
                    <td>
                        <span style="display:inline-block;width:16px;height:16px;background:{{ $genre->color }};border-radius:3px;margin-right:5px;"></span>
                        {{ $genre->color }}
                    </td>
                    <td>
                        @if($genre->icon)
                            <img src="{{ \App\Models\Genre::publicUrlForStoredIcon($genre->icon) }}" alt="{{ $genre->name }}" width="32" height="32">
                        @else
                            —
                        @endif
                    </td>
                    <td>
                        <button type="button" class="btn-edit-genre" data-url="{{ route('genres.update', $genre) }}" data-name="{{ e($genre->name) }}" data-type="{{ e($genre->type) }}" data-color="{{ e($genre->color) }}">Изменить</button>
                        <form action="{{ route('genres.destroy', $genre) }}" method="POST" style="display:inline;">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="btn-delete" data-confirm="Удалить жанр?">Удалить</button>
                        </form>
                    </td>
                </tr>
            @empty
                <tr><td colspan="5" class="text-center">Жанров нет</td></tr>
            @endforelse
        </tbody>
    </table>
</div>

<!-- Модальное окно редактирования жанра -->
<div id="genre-edit-modal" class="modal" aria-hidden="true">
    <div class="modal-backdrop" data-modal-close></div>
    <div class="modal-box">
        <div class="modal-header">
            <h3>Редактировать жанр</h3>
            <button type="button" class="modal-close" data-modal-close aria-label="Закрыть">&times;</button>
        </div>
        <form id="genre-edit-form" method="POST" action="" enctype="multipart/form-data">
            @csrf
            @method('PUT')
            <div class="modal-body">
                <div class="form-group">
                    <label for="genre_edit_name">Название жанра</label>
                    <input type="text" id="genre_edit_name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="genre_edit_type">Тип</label>
                    <select id="genre_edit_type" name="type" required>
                        <option value="Книга">Книга</option>
                        <option value="Видеоигра">Видеоигра</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="genre_edit_color">Цвет</label>
                    <select id="genre_edit_color" name="color" required>
                        <option value="#F1642E">Оранжевый</option>
                        <option value="#C4C3E3">Голубой</option>
                        <option value="#FFC44B">Жёлтый</option>
                        <option value="#A3B565">Зелёный</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="genre_edit_icon">Иконка (оставить пустым, чтобы не менять)</label>
                    <input type="file" id="genre_edit_icon" name="icon" accept="image/*">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancel" data-modal-close>Отмена</button>
                <button type="submit" class="btn-submit">Сохранить</button>
            </div>
        </form>
    </div>
</div>

<script nonce="{{ $cspNonce }}">
(function() {
    var modal = document.getElementById('genre-edit-modal');
    var form = document.getElementById('genre-edit-form');
    if (!modal || !form) return;

    function openEdit(e) {
        var btn = e.target.closest('.btn-edit-genre');
        if (!btn) return;
        form.action = btn.getAttribute('data-url');
        document.getElementById('genre_edit_name').value = btn.getAttribute('data-name') || '';
        document.getElementById('genre_edit_type').value = btn.getAttribute('data-type') || 'Книга';
        document.getElementById('genre_edit_color').value = btn.getAttribute('data-color') || '#F1642E';
        document.getElementById('genre_edit_icon').value = '';
        modal.classList.add('modal-open');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        modal.classList.remove('modal-open');
        modal.setAttribute('aria-hidden', 'true');
    }

    document.querySelectorAll('.btn-edit-genre').forEach(function(b) { b.addEventListener('click', openEdit); });
    modal.querySelectorAll('[data-modal-close]').forEach(function(el) { el.addEventListener('click', closeModal); });
    modal.querySelector('.modal-box').addEventListener('click', function(e) { e.stopPropagation(); });
})();
</script>
@endsection

