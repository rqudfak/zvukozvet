<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE announcements MODIFY gender ENUM('Мужской', 'Женский', 'Детский') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("UPDATE announcements SET gender = 'Мужской' WHERE gender = 'Детский'");
        DB::statement("ALTER TABLE announcements MODIFY gender ENUM('Мужской', 'Женский') NOT NULL");
    }
};
