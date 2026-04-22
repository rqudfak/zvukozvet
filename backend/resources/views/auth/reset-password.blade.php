@extends('layouts.app')
@section('title','Сброс пароля')
@section('content')
<link rel="stylesheet" href="{{ asset('css/auth.css') }}">
<div class="auth-block">
    <h2>Сброс пароля</h2>

    <form method="post" action="{{ route('password.update') }}" class="auth-form">
        @csrf

        <input type="hidden" name="token" value="{{ $token }}">

        <div class="form-input">
            <input type="email" name="email" id="email" value="{{ old('email', request('email')) }}" required placeholder=" ">
            <label for="email">E-mail:</label>
            @error('email')
                <span>{{ $message }}</span>
            @enderror
        </div>

        <div class="form-input">
            <input type="password" name="password" id="password" required placeholder=" ">
            <label for="password">Новый пароль:</label>
            @error('password')
                <span>{{ $message }}</span>
            @enderror
        </div>

        <div class="form-input">
            <input type="password" name="password_confirmation" id="password_confirmation" required placeholder=" ">
            <label for="password_confirmation">Подтвердите пароль:</label>
        </div>

        <div class="form-buttons">
            <button type="submit" class="btn-submit">Сохранить новый пароль</button>
            <a class="btn-switch" href="{{ route('login') }}">Вернуться ко входу</a>
        </div>
    </form>
</div>
<script src="{{ asset('js/auth.js') }}"></script>
@endsection

