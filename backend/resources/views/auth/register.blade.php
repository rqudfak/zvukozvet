@extends('layouts.app')
@section('title','Регистрация')
@section('content')
<link rel="stylesheet" href="{{ asset('css/auth.css') }}">
<div class="auth-block">
<h2>Создайте аккаунт</h2>
<form method="post" action="{{ route('register') }}" class="auth-form">
    @csrf

    <div class="form-input">
        <input type="text" name="name" id="name" value="{{ old('name') }}" required placeholder=" ">
        <label for="name">Имя:</label>
        @error('name')
            <span>{{ $message }}</span>
        @enderror
    </div>
    <div class="form-input">
        <input type="text" name="login" id="login" value="{{ old('login') }}" required placeholder=" ">
        <label for="login">Логин:</label>
        @error('login')
            <span>{{ $message }}</span>
        @enderror
    </div>
    <div class="form-input">
        <input type="email" name="email" id="email" value="{{ old('email') }}" required placeholder=" ">
        <label for="email">Почта:</label>
        @error('email')
            <span>{{ $message }}</span>
        @enderror
    </div>

    <div class="form-input">
        <input type="password" name="password" id="password" required placeholder=" ">
        <label for="password">Пароль:</label>
        @error('password')
            <span>{{ $message }}</span>
        @enderror
    </div>

    <div class="form-input">
        <input type="password" name="password_confirmation" id="password_confirmation" required placeholder=" ">
        <label for="password_confirmation">Повтор пароля:</label>
    </div>

    <div class="form-checkbox">
        <input type="checkbox" name="policy" id="policy" value="1">
        <label for="policy">Я принимаю <a href="#" class="policy-link">политику</a></label>
        @error('policy')
            <span>{{ $message }}</span>
        @enderror
    </div>

    <div class="form-buttons">
        <button type="submit" class="btn-submit" id="submit-btn" disabled>Создать аккаунт</button>
        <a class="btn-switch" href="/login">У меня уже есть аккаунт</a>
    </div>
</form>
</div>
<script src="{{ asset('js/auth.js') }}"></script>
@endsection