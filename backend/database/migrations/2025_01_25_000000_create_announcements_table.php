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
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->enum('type', ['Книга', 'Видеоигра'])->default('Книга');
            $table->string('genre');
            $table->string('genre_icon')->nullable();
            $table->string('color')->default('#F1642E');
            $table->string('languages');
            $table->enum('gender', ['Мужской', 'Женский']);
            $table->enum('duration', ['Кратковременная роль', 'Долгосрочная роль']);
            $table->text('description');
            $table->text('fragment');
            $table->enum('status', ['Новое', 'Одобрено', 'Отклонено'])->default('Новое');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
