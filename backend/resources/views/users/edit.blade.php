@extends('layouts.app')
@section('title', 'Редактирование профиля')
@section('content')
<link rel="stylesheet" href="{{ asset('css/announcements.css') }}">
<link rel="stylesheet" href="{{ asset('css/profile.css') }}">

<div class="form-container">
    <h2>Редактирование профиля</h2>
    <form action="{{ route('users.update', $user) }}" method="POST" enctype="multipart/form-data" class="announcement-form">
        @csrf
        @method('PUT')
        <div class="form-group">
            <label for="name">Имя</label>
            <input type="text" id="name" name="name" value="{{ old('name', $user->name) }}" required>
            @error('name')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>
        <div class="form-group">
            <label for="avatar">Аватар</label>
            <input type="file" id="avatar" name="avatar" accept="image/*">
            @error('avatar')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>
        <div class="form-group">
            <label for="gender">Пол</label>
            <select name="gender" id="gender" required>
                <option value="Мужской" {{ old('gender', $user->gender) === 'Мужской' ? 'selected' : '' }}>Мужской</option>
                <option value="Женский" {{ old('gender', $user->gender) === 'Женский' ? 'selected' : '' }}>Женский</option>
                <option value="Не указано" {{ old('gender', $user->gender) === 'Не указано' ? 'selected' : '' }}>Не указано</option>
            </select>
            @error('gender')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>
        <div class="form-group">
            <label for="language">Языки</label>
            <input type="text" id="language" name="language" value="{{ old('language', $user->language) }}" placeholder="Например: Русский, Английский" required>
            @error('language')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>
        <div class="form-group">
            <label for="timbre">Тембр</label>
            <select name="timbre" id="timbre" required>
                <option value="Тенор" {{ old('timbre', $user->timbre) === 'Тенор' ? 'selected' : '' }}>Тенор</option>
                <option value="Баритон" {{ old('timbre', $user->timbre) === 'Баритон' ? 'selected' : '' }}>Баритон</option>
                <option value="Бас" {{ old('timbre', $user->timbre) === 'Бас' ? 'selected' : '' }}>Бас</option>
                <option value="Сопрано" {{ old('timbre', $user->timbre) === 'Сопрано' ? 'selected' : '' }}>Сопрано</option>
                <option value="Меццо-сопрано" {{ old('timbre', $user->timbre) === 'Меццо-сопрано' ? 'selected' : '' }}>Меццо-сопрано</option>
                <option value="Контральто" {{ old('timbre', $user->timbre) === 'Контральто' ? 'selected' : '' }}>Контральто</option>
                <option value="Не указано" {{ old('timbre', $user->timbre) === 'Не указано' ? 'selected' : '' }}>Не указано</option>
            </select>
            @error('timbre')
                <span class="error">{{ $message }}</span>
            @enderror
        </div>
        <div class="form-actions">
            <button type="submit" class="btn-submit">Сохранить</button>
            <a href="{{ route('users.show', $user) }}" class="btn-cancel">Отмена</a>
        </div>
    </form>
</div>
@endsection
