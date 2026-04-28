document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-confirm]').forEach(function (el) {
        el.addEventListener('click', function (event) {
            if (!window.confirm(el.getAttribute('data-confirm') || 'Подтвердить действие?')) {
                event.preventDefault();
            }
        });
    });

    document.querySelectorAll('[data-auto-submit], #filters-form .filter-radio-group input[type="radio"]').forEach(function (el) {
        el.addEventListener('change', function () {
            var form = el.closest('form');
            if (form) {
                form.submit();
            }
        });
    });

    document.querySelectorAll('[data-submit-on-enter]').forEach(function (el) {
        el.addEventListener('keyup', function (event) {
            if (event.key === 'Enter') {
                var form = el.closest('form');
                if (form) {
                    form.submit();
                }
            }
        });
    });

    document.querySelectorAll('img[data-fallback-src]').forEach(function (img) {
        img.addEventListener('error', function () {
            var fallback = img.getAttribute('data-fallback-src');
            if (fallback && img.src !== fallback) {
                img.src = fallback;
            }
        });
    });

    document.querySelectorAll('img[data-hide-on-error]').forEach(function (img) {
        img.addEventListener('error', function () {
            img.style.display = 'none';
        });
    });
});
