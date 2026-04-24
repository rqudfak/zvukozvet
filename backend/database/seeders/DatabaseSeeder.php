<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            AdminsSeeder::class,
            AchievementSeeder::class,
            GenreSeeder::class,
            AnnouncementSeeder::class,
        ]);
    }
}
