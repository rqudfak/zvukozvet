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
        User::updateOrCreate(
            ['login' => 'admin1'],
            [
                'name' => 'Анастасия',
                'login' => 'admin1',
                'email' => 'nastya.davydova.2006@mail.ru',
                'password' => Hash::make('123456'),
                'role' => 'admin',
                'gender' => null,
                'language' => null,
                'timbre' => null,
                'avatar' => null,
                'achievements_progress' => null,
                'achievements_count' => 0,
                'banned_until' => null,
                'ban_reason' => null,
                'login_attempts' => 0,
                'locked_until' => null,
                'email_verified_at' => now(),
            ]
        );
    }
}
