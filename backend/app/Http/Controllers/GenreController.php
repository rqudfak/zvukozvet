<?php

namespace App\Http\Controllers;

use App\Models\Genre;
use App\Models\User;
use App\Notifications\NewGenreAdded;
use Illuminate\Http\Request;

class GenreController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware('admin'); // использует AdminMiddleware
    }

    public function index()
    {
        $bookGenres = Genre::where('type', 'Книга')->orderBy('name')->get();
        $gameGenres = Genre::where('type', 'Видеоигра')->orderBy('name')->get();

        return view('genres.index', compact('bookGenres', 'gameGenres'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'  => 'required|string|max:255|unique:genres,name',
            'type'  => 'required|in:Книга,Видеоигра',
            'color' => 'required|string|max:20',
            'icon'  => 'nullable|image|mimes:png,jpg,jpeg,webp,gif,svg|max:2048',
        ], [
            'name.required' => 'Это поле обязательно для ввода',
            'name.unique'   => 'Жанр с таким названием уже существует',
        ]);

        if ($request->hasFile('icon')) {
            $data['icon'] = Genre::storeUploadedIcon($request->file('icon'));
        }

        $genre = Genre::create($data);

        // Уведомление всем пользователям: добавлен новый жанр
        User::query()->select(['id'])->chunkById(200, function ($users) use ($genre) {
            foreach ($users as $user) {
                $user->notify(new NewGenreAdded($genre));
            }
        });

        return redirect()->route('genres.index')->with('success', 'Жанр успешно добавлен');
    }

    public function edit(Genre $genre)
    {
        return view('genres.edit', compact('genre'));
    }

    public function update(Request $request, Genre $genre)
    {
        $data = $request->validate([
            'name'  => 'required|string|max:255|unique:genres,name,' . $genre->id,
            'type'  => 'required|in:Книга,Видеоигра',
            'color' => 'required|string|max:20',
            'icon'  => 'nullable|image|mimes:png,jpg,jpeg,webp,gif,svg|max:2048',
        ], [
            'name.required' => 'Это поле обязательно для ввода',
            'name.unique'   => 'Жанр с таким названием уже существует',
        ]);

        if ($request->hasFile('icon')) {
            Genre::deleteStoredIcon($genre->icon);
            $data['icon'] = Genre::storeUploadedIcon($request->file('icon'));
        }

        $genre->update($data);

        return redirect()->route('genres.index')->with('success', 'Жанр обновлён');
    }

    public function destroy(Genre $genre)
    {
        Genre::deleteStoredIcon($genre->icon);
        $genre->delete();

        return redirect()->route('genres.index')->with('success', 'Жанр удалён');
    }
}

