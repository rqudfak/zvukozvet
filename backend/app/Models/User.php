<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Notifications\ResetPasswordNotification;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'login',
        'email',
        'password',
        'avatar',
        'role',
        'gender',
        'language',
        'timbre',
        'achievements_progress',
        'achievements_count',
        'banned_until',
        'ban_reason',
        'login_attempts',
        'locked_until',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'banned_until' => 'datetime',
        'locked_until' => 'datetime',
        'two_factor_expires_at' => 'datetime',
        'two_factor_enabled' => 'boolean',
    ];


    //отправка письма для сброса пароля
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    // Генерация 2FA кода
    public function generateTwoFactorCode()
    {
        $this->timestamps = false;
        $this->two_factor_code = rand(100000, 999999); // 6-значный код
        $this->two_factor_expires_at = now()->addMinutes(10); // код действителен 10 минут
        $this->save();
    }

    // Сброс 2FA кода
    public function resetTwoFactorCode()
    {
        $this->timestamps = false;
        $this->two_factor_code = null;
        $this->two_factor_expires_at = null;
        $this->save();
    }

    // Проверка 2FA кода
    public function validateTwoFactorCode($code)
    {
        return $this->two_factor_code === $code 
            && $this->two_factor_expires_at 
            && $this->two_factor_expires_at->isFuture();
    }

    
    const MAX_LOGIN_ATTEMPTS = 5;   //Максимальное количество попыток входа до блокировки
    const LOCKOUT_TIME = 15;    //Время блокировки в минутах

    //Проверка, заблокирован ли аккаунт
    public function isLocked(): bool
    {
        return $this->locked_until && $this->locked_until->isFuture();
    }

    //Получить время разблокировки
    public function getLockoutRemainingMinutes(): int
    {
        if (!$this->isLocked()) {
            return 0;
        }
        return now()->diffInMinutes($this->locked_until, false) ?: 0;
    }

    //Увеличить счетчик неудачных попыток
    public function incrementLoginAttempts(): void
    {
        $this->increment('login_attempts');
        
        // Если превышен лимит, блокируем аккаунт
        if ($this->login_attempts >= self::MAX_LOGIN_ATTEMPTS) {
            $this->locked_until = now()->addMinutes(self::LOCKOUT_TIME);
            $this->login_attempts = 0; // Сбрасываем счетчик после блокировки
        }
        $this->save();
    }

    //Сбросить счетчик неудачных попыток
    public function resetLoginAttempts(): void
    {
        $this->login_attempts = 0;
        $this->locked_until = null;
        $this->save();
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isBanned(): bool
    {
        return $this->banned_until && $this->banned_until->isFuture();
    }

    public function announcements()
    {
        return $this->hasMany(Announcement::class);
    }

    public function responses()
    {
        return $this->hasMany(AnnouncementResponse::class);
    }

    public function portfolioItems()
    {
        return $this->hasMany(PortfolioItem::class);
    }

    public function reviewsReceived()
    {
        return $this->hasMany(Review::class, 'reviewed_user_id');
    }

    public function reviewsGiven()
    {
        return $this->hasMany(Review::class, 'reviewer_id');
    }

    public function achievements()
    {
        return $this->belongsToMany(Achievement::class, 'user_achievements')
            ->withPivot('awarded_at')
            ->withTimestamps();
    }
}
