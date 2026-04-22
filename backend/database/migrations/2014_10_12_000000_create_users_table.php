<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('login')->unique();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('role',['user','admin'])->default('user');
            $table->rememberToken();
            $table->timestamps();

            $table->enum('gender',['Мужской','Женский','Не указано'])->default('Не указано');
            $table->string('language')->default('Русский');
            $table->enum('timbre',['Тенор','Баритон','Бас','Сопрано','Меццо-сопрано','Контральто','Не указано'])->default('Не указано');
            $table->unsignedTinyInteger('achievements_progress')->default(0);
            $table->unsignedInteger('achievements_count')->default(0);

            $table->timestamp('banned_until')->nullable();
            $table->text('ban_reason')->nullable();

            $table->string('two_factor_code')->nullable();
            $table->timestamp('two_factor_expires_at')->nullable();
            $table->boolean('two_factor_enabled')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
