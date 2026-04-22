@extends('layouts.app')
@section('title','Восстановление пароля')
@section('content')
<link rel="stylesheet" href="{{ asset('css/auth.css') }}">
<div class="auth-block">
    <h2>Восстановление пароля</h2>

    @if (session('status'))
        <div class="alert alert-success">
            {{ session('status') }}
        </div>
    @endif

    <form method="post" action="{{ route('password.email') }}" class="auth-form">
        @csrf

        <div class="form-input">
            <input type="email" name="email" id="email" value="{{ old('email') }}" required placeholder=" ">
            <label for="email">E-mail:</label>
            @error('email')
                <span>{{ $message }}</span>
            @enderror
        </div>

        <div class="form-buttons">
            <button type="submit" class="btn-submit">Отправить ссылку для сброса</button>
            <a class="btn-switch" href="{{ route('login') }}">Вернуться ко входу</a>
        </div>
    </form>
</div>
<script src="{{ asset('js/auth.js') }}"></script>
@endsection

