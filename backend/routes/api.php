<?php

use App\Http\Controllers\Api\MainApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/
Route::post('/register', [MainApiController::class, 'register']);
Route::post('/login', [MainApiController::class, 'login']);
Route::post('/login/2fa/verify', [MainApiController::class, 'verifyLoginTwoFactor']);
Route::post('/login/2fa/resend', [MainApiController::class, 'resendLoginTwoFactor']);
Route::post('/forgot-password', [MainApiController::class, 'forgotPassword']);
Route::post('/reset-password', [MainApiController::class, 'resetPassword']);

Route::get('/announcements', [MainApiController::class, 'announcements']);
Route::get('/announcements/{announcement}', [MainApiController::class, 'announcement']);
Route::get('/genres', [MainApiController::class, 'genres']);
Route::get('/users/{user}', [MainApiController::class, 'userProfile']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [MainApiController::class, 'me']);
    Route::post('/profile/update', [MainApiController::class, 'updateMyProfile']);
    Route::put('/users/{user}', [MainApiController::class, 'updateUser']);
    Route::post('/users/{user}', [MainApiController::class, 'updateUser']);
    Route::post('/announcements', [MainApiController::class, 'createAnnouncement']);
    Route::put('/announcements/{announcement}', [MainApiController::class, 'updateAnnouncement']);
    Route::delete('/announcements/{announcement}', [MainApiController::class, 'deleteAnnouncement']);
    Route::post('/announcements/{announcement}/responses', [MainApiController::class, 'storeResponse']);
    Route::delete('/announcements/{announcement}/responses/{response}', [MainApiController::class, 'deleteResponse']);
    Route::patch('/announcements/{announcement}/responses/{response}/status', [MainApiController::class, 'updateResponseStatus']);
    Route::post('/reviews', [MainApiController::class, 'storeReview']);
    Route::delete('/reviews/{review}', [MainApiController::class, 'deleteReview']);
    Route::get('/notifications', [MainApiController::class, 'notifications']);
    Route::post('/notifications/{id}/go', [MainApiController::class, 'notificationGo']);
    Route::post('/notifications/read-all', [MainApiController::class, 'notificationsReadAll']);
    Route::post('/2fa/enable', [MainApiController::class, 'enableTwoFactor']);
    Route::post('/2fa/disable', [MainApiController::class, 'disableTwoFactor']);
    Route::post('/users/{user}/portfolio', [MainApiController::class, 'storePortfolio']);
    Route::delete('/users/{user}/portfolio/{portfolio_item}', [MainApiController::class, 'deletePortfolio']);
    Route::post('/users/{user}/follow', [MainApiController::class, 'followUser']);
    Route::delete('/users/{user}/follow', [MainApiController::class, 'unfollowUser']);
});

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/admin/statistics', [MainApiController::class, 'adminStatistics']);
    Route::get('/admin/announcements', [MainApiController::class, 'adminAnnouncements']);
    Route::patch('/admin/announcements/{announcement}/status', [MainApiController::class, 'adminUpdateAnnouncementStatus']);
    Route::delete('/admin/announcements/{announcement}', [MainApiController::class, 'adminDeleteAnnouncement']);
    Route::get('/admin/users', [MainApiController::class, 'adminUsers']);
    Route::post('/admin/users/{user}/ban', [MainApiController::class, 'adminBanUser']);
    Route::get('/admin/genres', [MainApiController::class, 'adminGenres']);
    Route::post('/admin/genres', [MainApiController::class, 'adminCreateGenre']);
    Route::post('/admin/genres/{genre}', [MainApiController::class, 'adminUpdateGenre']);
    Route::delete('/admin/genres/{genre}', [MainApiController::class, 'adminDeleteGenre']);
});
