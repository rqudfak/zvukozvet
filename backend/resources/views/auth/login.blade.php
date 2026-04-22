@extends('layouts.app')
@section('title','Вход')
@section('content')
<link rel="stylesheet" href="{{ asset('css/auth.css') }}">
<div class="auth-block">
<h2>Войдите в аккаунт</h2>

@if (session('status'))
    <div class="alert alert-success">
        {{ session('status') }}
    </div>
@endif

@if ($errors->has('login') && str_contains($errors->first('login'), 'заблокирован'))
    <div class="alert alert-danger" style="background: #f8d7da; color: #721c24; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
        {{ $errors->first('login') }}
    </div>
@endif

<form method="post" action="{{ route('login') }}" class="auth-form">
    @csrf

    <div class="form-input">
        <input type="text" name="login" id="login" value="{{ old('login') }}" required placeholder=" ">
        <label for="login">Логин:</label>
        @error('login')
            @if(!str_contains($message, 'заблокирован'))
                <span>{{ $message }}</span>
            @endif
        @enderror
    </div>

    <div class="form-input">
        <input type="password" name="password" id="password" required placeholder=" ">
        <label for="password">Пароль:</label>
        @error('password')
            <span>{{ $message }}</span>
        @enderror
    </div>

    <div class="form-input" style="text-align: right; margin-top: -10px; margin-bottom: 10px;">
        <a href="{{ route('password.request') }}" class="forgot-password-link">Забыли пароль?</a>
    </div>

    <div class="form-buttons">
        <button type="submit" class="btn-submit" id="submit-btn">Войти в аккаунт</button>
        <a class="btn-switch" href="/register">Создать аккаунт</a>
    </div>
</form>
</div>
<script src="{{ asset('js/auth.js') }}"></script>
@endsection