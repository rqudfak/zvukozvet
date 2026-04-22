(function () {
        var btn = document.getElementById('notifBtn');
        var dd = document.getElementById('notifDropdown');
        if (!btn || !dd) return;

        function close() {  //закрытие меню
            dd.classList.remove('open');
            dd.setAttribute('aria-hidden', 'true');
        }

        function toggle() {  //переключает открытие/закрытие
            var isOpen = dd.classList.contains('open');
            if (isOpen) close();
            else {
                dd.classList.add('open');
                dd.setAttribute('aria-hidden', 'false');
            }
        }

        btn.addEventListener('click', function (e) {
            e.preventDefault();   // отменяет стандартное действие браузера
            e.stopPropagation();  // останавливает действие события дальше к родительским элементам
            toggle();
        });

        dd.addEventListener('click', function (e) {
            // клики по ссылкам внутри должны работать
            e.stopPropagation();
        });

        document.addEventListener('click', function () { 
            close();
        });

        document.addEventListener('keydown', function (e) { //закрытие по esc
            if (e.key === 'Escape') close();
        });
    })();