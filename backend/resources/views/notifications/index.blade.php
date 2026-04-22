@extends('layouts.app')
@section('title', 'Уведомления')
@section('content')
<link rel="stylesheet" href="{{ asset('css/layouts.css') }}">

<h2 class="page-title">Уведомления</h2>

<div style="margin-bottom: 12px;">
    <form method="POST" action="{{ route('notifications.readAll') }}" style="display:inline;">
        @csrf
        <button type="submit" class="btn-submit">Отметить все прочитанными</button>
    </form>
</div>

<div class="profile-card">
    @forelse($notifications as $n)
        @php
            $isUnread = $n->read_at === null;
            $message = data_get($n->data, 'message', 'Уведомление');
        @endphp
        <div style="padding: 12px; border-bottom: 1px solid #eee; {{ $isUnread ? 'background:#fff7e6;' : '' }}">
            <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
                <form method="POST" action="{{ route('notifications.go', $n->id) }}">
                    @csrf
                    <button type="submit" style="color:#333; text-decoration:none; font-weight: {{ $isUnread ? 700 : 500 }}; background:none; border:none; padding:0; cursor:pointer; text-align:left;">
                        {{ $message }}
                    </button>
                </form>
                <span style="font-size:12px; color:#777; white-space:nowrap;">
                    {{ $n->created_at->format('d.m.Y H:i') }}
                </span>
            </div>
        </div>
    @empty
        <p class="profile-empty">Уведомлений пока нет.</p>
    @endforelse
</div>

@if($notifications->hasPages())
    <div class="pagination pagination-bottom">
        {{ $notifications->links('pagination::numbers') }}
    </div>
@endif
@endsection

