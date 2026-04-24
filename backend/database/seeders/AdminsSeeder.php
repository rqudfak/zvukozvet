<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminsSeeder extends Seeder
{
    public function run(): void
    {
        $admins = [
            [
                'name' => 'Анастасия',
                'login' => 'admin1',
                'email' => 'nastya.davydova.2006@mail.ru',
                'password' => Hash::make('123456'),
                'role' => 'admin',
                'gender' => 'Женский',
                'language' => 'Русский',
                'timbre' => 'Сопрано',
                'avatar' => null,
                'achievements_progress' => 0,
                'achievements_count' => 0,
                'banned_until' => null,
                'ban_reason' => null,
                'login_attempts' => 0,
                'locked_until' => null,
                'email_verified_at' => now(),
            ]
        ];
        foreach ($admins as $admin) {
            User::updateOrCreate(
                ['login' => $admin['login']],
                $admin 
            );
        }
    }
}