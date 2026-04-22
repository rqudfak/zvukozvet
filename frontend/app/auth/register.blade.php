@extends('layouts.app')
@section('title','Регистрация')
@section('content')
<link rel="stylesheet" href="{{ asset('css/auth.css') }}">
<div class="auth-block">
<h2>Создайте аккаунт</h2>
<form method="post" action="{{ route('register') }}" class="auth-form">
    @csrf

    <div>
        <label for="name">Имя:</label>
        <input type="text" name="name" value="{{ old('name') }}">
        @error('name')
            <span>{{ $message }}</span>
        @enderror
    </div>
    <div>
        <label for="login">Логин:</label>
        <input type="text" name="login" value="{{ old('login') }}">
        @error('login')
            <span>{{ $message }}</span>
        @enderror
    </div>
    <div>
        <label for="email">Почта:</label>
        <input type="email" name="email" value="{{ old('email') }}">
        @error('email')
            <span>{{ $message }}</span>
        @enderror
    </div>

    <div>
        <label for="password">Пароль:</label>
        <input type="password" name="password">
        @error('password')
            <span>{{ $message }}</span>
        @enderror
    </div>

    <div>
        <label for="password_confirmation">Повтор пароля:</label>
        <input type="password" name="password_confirmation">
    </div>

    <button type="submit" class="btn-submit">Создать аккаунт</button>
    <a href="/login">У меня уже есть аккаунт</a>
</form>
</div>
@endsection