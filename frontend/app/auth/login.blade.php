@extends('layouts.app')
@section('title','Вход')
@section('content')
<h2>Войдите в аккаунт</h2>
<form method="post" action="{{ route('login') }}"  class="auth-form">
    @csrf

    <div>
        <label for="login">Логин:</label>
        <input type="text" name="login" value="{{ old('login') }}">
        @error('login')
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

    <button type="submit">Войти</button>
    <a href="/register">Создать аккаунт</a>
</form>
@endsection