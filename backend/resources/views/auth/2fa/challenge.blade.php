@extends('layouts.app')
@section('title', 'Подтверждение входа')
@section('content')
<link rel="stylesheet" href="{{ asset('css/auth.css') }}">

<div class="auth-block">
    <h2>🔐 Подтверждение входа</h2>
    
    @if (session('success'))
        <div class="alert alert-success" style="background: #d4edda; color: #155724; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
            {{ session('success') }}
        </div>
    @endif

    <div class="info-message" style="background: #e7f3ff; border: 1px solid #b8daff; color: #004085; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0;">
            <strong>📧 Код отправлен на почту</strong>
        </p>
        <p style="margin: 0; font-size: 14px;">
            Мы отправили 6-значный код на вашу электронную почту. 
            Введите его ниже для завершения входа. Код действителен 10 минут.
        </p>
    </div>

    <form method="POST" action="{{ route('2fa.verify') }}" class="auth-form">
        @csrf
        
        <div class="form-input">
            <input type="text" 
                   name="code" 
                   id="code" 
                   value="{{ old('code') }}" 
                   required 
                   placeholder=" "
                   maxlength="6"
                   pattern="[0-9]{6}"
                   inputmode="numeric"
                   autocomplete="off">
            <label for="code">6-значный код:</label>
            @error('code')
                <span style="color: #dc3545; font-size: 14px;">{{ $message }}</span>
            @enderror
        </div>

        <div class="form-buttons">
            <button type="submit" class="btn-submit">Подтвердить вход</button>
        </div>
    </form>

    <div class="text-center" style="text-align: center; margin-top: 20px;">
        <form method="POST" action="{{ route('2fa.resend') }}" style="display: inline;">
            @csrf
            <button type="submit" style="background: none; border: none; color: #007bff; text-decoration: underline; cursor: pointer;">
                Отправить код повторно
            </button>
        </form>
        <span style="margin: 0 10px;">|</span>
        <a href="{{ route('login') }}" style="color: #6c757d;">Вернуться ко входу</a>
    </div>
</div>

<script nonce="{{ $cspNonce }}">
// автоматический переход между полями
document.getElementById('code').addEventListener('input', function(e) {
    this.value = this.value.replace(/[^0-9]/g, '');
    if (this.value.length === 6) {
    }
});
</script>
@endsection