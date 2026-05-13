<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->json('timbres')->nullable()->after('gender');
        });

        $default = json_encode(['Не указано'], JSON_UNESCAPED_UNICODE);
        DB::table('announcements')->update(['timbres' => $default]);
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropColumn('timbres');
        });
    }
};
