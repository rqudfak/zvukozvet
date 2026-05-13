<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();
        if ($driver !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE users MODIFY COLUMN timbre ENUM(
            'Тенор','Баритон','Бас','Дискант','Альт','Сопрано','Меццо-сопрано','Контральто','Не указано'
        ) NOT NULL DEFAULT 'Не указано'");
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver !== 'mysql') {
            return;
        }

        DB::statement("UPDATE users SET timbre = 'Не указано' WHERE timbre IN ('Дискант','Альт')");

        DB::statement("ALTER TABLE users MODIFY COLUMN timbre ENUM(
            'Тенор','Баритон','Бас','Сопрано','Меццо-сопрано','Контральто','Не указано'
        ) NOT NULL DEFAULT 'Не указано'");
    }
};
