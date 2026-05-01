@extends('layouts.app')
@section('title', 'Редактировать жанр')
@section('content')
<link rel="stylesheet" href="{{ asset('css/announcements.css') }}">
<link rel="stylesheet" href="{{ asset('css/admin.css') }}">

<div class="form-container">
    <h2>Редактировать жанр</h2>
    <form action="{{ route('genres.update', $genre) }}" method="POST" enctype="multipart/form-data" class="announcement-form">
        @csrf
        @method('PUT')

        <div class="form-group">
            <label for="name">Название жанра</label>
            <input type="text" id="name" name="name" value="{{ old('name', $genre->name) }}" required>
            @error('name')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>

        <div class="form-group">
            <label for="type">Тип</label>
            <select id="type" name="type" required>
                <option value="Книга" {{ old('type', $genre->type) === 'Книга' ? 'selected' : '' }}>Книга</option>
                <option value="Видеоигра" {{ old('type', $genre->type) === 'Видеоигра' ? 'selected' : '' }}>Видеоигра</option>
            </select>
            @error('type')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>

        <div class="form-group">
            <label for="color">Цвет (hex)</label>
            <input type="text" id="color" name="color" value="{{ old('color', $genre->color) }}" required>
            @error('color')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>

        <div class="form-group">
            <label for="icon">Иконка жанра (png/jpg/webp)</label>
            @if($genre->icon)
                <div style="margin-bottom:8px;">
                    <img src="{{ \App\Models\Genre::publicUrlForStoredIcon($genre->icon) }}" alt="{{ $genre->name }}" width="48" height="48">
                </div>
            @endif
            <input type="file" id="icon" name="icon" accept="image/*">
            @error('icon')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>

        <div class="form-actions">
            <button type="submit" class="btn-submit">Сохранить</button>
            <a href="{{ route('genres.index') }}" class="btn-cancel">Отмена</a>
        </div>
    </form>
</div>
@endsection

