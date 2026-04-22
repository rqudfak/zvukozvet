<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class SendTwoFactorCode extends Notification
{
    use Queueable;

    public $code;

    public function __construct($code)
    {
        $this->code = $code;
    }

    public function via($notifiable)
    {
        return ['mail']; //уведомление отправится только по электронной почте
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('🔐 Код двухфакторной аутентификации')
            ->greeting('Здравствуйте!')
            ->line('Вы запросили код для входа в аккаунт.')
            ->line('Ваш код подтверждения:')
            ->line("**{$this->code}**")
            ->line('Код действителен в течение 10 минут.')
            ->line('Если вы не пытались войти, проигнорируйте это сообщение.')
            ->salutation('С уважением, команда сайта');
    }
}