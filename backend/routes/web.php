<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AnnouncementResponseController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GenreController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PortfolioController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\TwoFactorAuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

// Главная страница с объявлениями
Route::get('/', [AnnouncementController::class, 'index'])->name('announcements.index');

// Аутентификация
Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
Route::post('/register', [AuthController::class, 'register']);
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Восстановление пароля
Route::get('/forgot-password', [AuthController::class, 'showForgotPasswordForm'])->name('password.request');
Route::post('/forgot-password', [AuthController::class, 'sendResetLinkEmail'])->name('password.email');
Route::get('/reset-password/{token}', [AuthController::class, 'showResetForm'])->name('password.reset');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('password.update');

// 2FA маршруты
Route::middleware('auth')->group(function () {
    Route::post('/2fa/enable', [TwoFactorAuthController::class, 'enable'])->name('2fa.enable');
    Route::post('/2fa/disable', [TwoFactorAuthController::class, 'disable'])->name('2fa.disable');
});
// 2FA challenge (доступен без полной аутентификации)
Route::get('/2fa/challenge', [AuthController::class, 'showTwoFactorChallenge'])->name('2fa.challenge');
Route::post('/2fa/verify', [AuthController::class, 'verifyTwoFactor'])->name('2fa.verify');
Route::post('/2fa/resend', [AuthController::class, 'resendTwoFactorCode'])->name('2fa.resend');

// Объявления (требуется аутентификация для создания, редактирования, удаления)
Route::middleware('auth')->group(function () {
    Route::get('/announcements/create', [AnnouncementController::class, 'create'])->name('announcements.create');
    Route::post('/announcements', [AnnouncementController::class, 'store'])->name('announcements.store');
    Route::get('/announcements/{announcement}/edit', [AnnouncementController::class, 'edit'])->name('announcements.edit');
    Route::put('/announcements/{announcement}', [AnnouncementController::class, 'update'])->name('announcements.update');
    Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy'])->name('announcements.destroy');
});

// Просмотр объявления (доступно всем)
Route::get('/announcements/{announcement}', [AnnouncementController::class, 'show'])->name('announcements.show');

// Админ-панель
Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/admin', [AdminController::class, 'index'])->name('admin.index');
    Route::get('/admin/announcements', [AdminController::class, 'announcementsIndex'])->name('admin.announcements.index');
    Route::delete('/admin/announcements/{announcement}', [AdminController::class, 'destroy'])->name('admin.destroy');
    Route::patch('/admin/announcements/{announcement}/status', [AdminController::class, 'updateStatus'])->name('admin.announcements.updateStatus');
    Route::get('/admin/users', [AdminController::class, 'usersIndex'])->name('admin.users.index');
    Route::post('/admin/users/{user}/ban', [AdminController::class, 'banUser'])->name('admin.users.ban');

    // Жанры
    Route::get('/admin/genres', [GenreController::class, 'index'])->name('genres.index');
    Route::post('/admin/genres', [GenreController::class, 'store'])->name('genres.store');
    Route::get('/admin/genres/{genre}/edit', [GenreController::class, 'edit'])->name('genres.edit');
    Route::put('/admin/genres/{genre}', [GenreController::class, 'update'])->name('genres.update');
    Route::delete('/admin/genres/{genre}', [GenreController::class, 'destroy'])->name('genres.destroy');
});

// Отклики на объявления (аудио)
Route::middleware('auth')->group(function () {
    Route::post('/announcements/{announcement}/responses', [AnnouncementResponseController::class, 'store'])
        ->name('announcements.responses.store');
    Route::delete('/announcements/{announcement}/responses/{response}', [AnnouncementResponseController::class, 'destroy'])
        ->name('announcements.responses.destroy');
    Route::patch('/announcements/{announcement}/responses/{response}/status', [AnnouncementResponseController::class, 'updateStatus'])
        ->name('announcements.responses.updateStatus');
});

// Профиль пользователя
Route::get('/profile', function () {
    return redirect()->route('users.show', auth()->user());
})->name('profile')->middleware('auth');
Route::get('/users/{user}', [UserController::class, 'show'])->name('users.show');
Route::middleware('auth')->group(function () {
    Route::get('/users/{user}/edit', [UserController::class, 'edit'])->name('users.edit');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::post('/users/{user}/portfolio', [PortfolioController::class, 'store'])->name('users.portfolio.store');
    Route::delete('/users/{user}/portfolio/{portfolio_item}', [PortfolioController::class, 'destroy'])->name('users.portfolio.destroy');
});
Route::post('/reviews', [ReviewController::class, 'store'])->name('reviews.store')->middleware('auth');
Route::delete('/reviews/{review}', [ReviewController::class, 'destroy'])->name('reviews.destroy')->middleware('auth');

// Уведомления
Route::middleware('auth')->group(function () {
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/go', [NotificationController::class, 'go'])->name('notifications.go');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.readAll');
});
