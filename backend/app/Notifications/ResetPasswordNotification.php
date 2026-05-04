<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;
    public string $token;

    public function __construct(string $token)
    {
        $this->token = $token;
    }

    public function via(object $notifiable): array
    {
        return ['mail'];  //уведомление отправится только по электронной почте
    }

    public function toMail(object $notifiable): MailMessage
    {
        $email = $notifiable->getEmailForPasswordReset();
        $base = config('app.frontend_url', 'http://45.9.40.4');
        $url = $base . '/auth/reset-password/' . rawurlencode($this->token)
            . '?email=' . rawurlencode((string) $email);

        $passwordsConfig = config('auth.passwords.' . config('auth.defaults.passwords'));
        $expireMinutes = $passwordsConfig['expire'] ?? 10;

        return (new MailMessage)
        ->subject('Восстановление пароля')
        ->greeting('Здравствуйте!')
        ->line('Вы получили это письмо, потому что был запрошен сброс пароля для вашего аккаунта.')
        ->line('Для восстановления пароля нажмите на кнопку ниже:')
        ->action('Восстановить пароль', $url)
        ->line('Или скопируйте эту ссылку в браузер: ' . $url)
        ->line('Ссылка действительна в течение ' . $expireMinutes . ' минут.')
        ->line('Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.')
        ->line('С уважением,')
        ->line('Команда ' . config('app.name'))
        ->line('Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.')
        ->salutation('© ' . date('Y') . ' ' . config('app.name') . '. Все права защищены.');
    }
}

