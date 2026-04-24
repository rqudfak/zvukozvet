function updateGenres() {
    const type = document.getElementById('type').value;
    const bookGenres = document.getElementById('book-genres');
    const gameGenres = document.getElementById('game-genres');
    const genreSelect = document.getElementById('genre');
    
    if (type === 'Книга') {
        bookGenres.style.display = 'block';
        gameGenres.style.display = 'none';
    } else {
        bookGenres.style.display = 'none';
        gameGenres.style.display = 'block';
    }
    
    // если выбранный жанр не принадлежит текущему типу, сбрасываем выбор
    const currentOption = genreSelect.options[genreSelect.selectedIndex];
    if (currentOption && currentOption.parentElement && currentOption.parentElement.id) {
        const groupId = currentOption.parentElement.id;
        if ((type === 'Книга' && groupId !== 'book-genres') ||
            (type === 'Видеоигра' && groupId !== 'game-genres')) {
            genreSelect.value = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const typeSelect = document.getElementById('type');
    if (typeSelect) {
        typeSelect.addEventListener('change', updateGenres);
    }
    updateGenres();
});