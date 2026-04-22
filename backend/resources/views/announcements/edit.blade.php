@extends('layouts.app')
@section('title','Редактировать объявление')
@section('content')
<link rel="stylesheet" href="{{ asset('css/announcements.css') }}">

<div class="form-container">
    <h2>Редактировать объявление</h2>
    
    <form action="{{ route('announcements.update', $announcement) }}" method="POST" class="announcement-form">
        @csrf
        @method('PUT')
        
        <div class="form-group">
            <label for="title">Название</label>
            <input type="text" name="title" id="title" value="{{ old('title', $announcement->title) }}" required>
            @error('title')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>
        
        <div class="form-group">
            <label for="type">Тип</label>
            <select name="type" id="type" required>
                <option value="Книга" {{ old('type', $announcement->type) === 'Книга' ? 'selected' : '' }}>Книга</option>
                <option value="Видеоигра" {{ old('type', $announcement->type) === 'Видеоигра' ? 'selected' : '' }}>Видеоигра</option>
            </select>
            @error('type')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>
        
        <div class="form-group">
            <label for="genre">Жанр</label>
            <select name="genre" id="genre" required>
                <option value="">Выберите жанр</option>
                <optgroup label="Книги" id="book-genres">
                    @foreach($bookGenres as $genre)
                        <option value="{{ $genre->name }}" {{ old('genre', $announcement->genre) === $genre->name ? 'selected' : '' }}>
                            {{ $genre->name }}
                        </option>
                    @endforeach
                </optgroup>
                <optgroup label="Видеоигры" id="game-genres" style="display: none;">
                    @foreach($gameGenres as $genre)
                        <option value="{{ $genre->name }}" {{ old('genre', $announcement->genre) === $genre->name ? 'selected' : '' }}>
                            {{ $genre->name }}
                        </option>
                    @endforeach
                </optgroup>
            </select>
            @error('genre')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>
        
        <div class="form-group">
            <label for="languages">Языки</label>
            <input type="text" name="languages" id="languages" value="{{ old('languages', $announcement->languages) }}" 
                   placeholder="Например: Русский, Английский" required>
            @error('languages')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>
        
        <div class="form-group">
            <label for="gender">Пол</label>
            <select name="gender" id="gender" required>
                <option value="Мужской">Мужской</option>
                <option value="Женский">Женский</option>
            </select>
            @error('gender')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>
        
        <div class="form-group">
            <label for="duration">Срок</label>
            <select name="duration" id="duration" required>
                <option value="Кратковременная роль">Кратковременная роль</option>
                <option value="Долгосрочная роль">Долгосрочная роль</option>
            </select>
            @error('duration')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>
        
        <div class="form-group">
            <label for="description">Описание</label>
            <textarea name="description" id="description" rows="3" required>{{ old('description', $announcement->description) }}</textarea>
            @error('description')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>

        <div class="form-group">
            <label for="fragment">Текст</label>
            <textarea name="fragment" id="fragment" rows="15" required>{{ old('fragment', $announcement->fragment)}}</textarea>
            @error('fragment')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>
        
        <div class="form-actions">
            <button type="submit" class="btn-submit">Сохранить изменения</button>
            <a href="{{ route('announcements.show', $announcement) }}" class="btn-cancel">Отмена</a>
        </div>
    </form>
</div>
<script src="{{ asset('js/announcements.js') }}"></script>
@endsection
