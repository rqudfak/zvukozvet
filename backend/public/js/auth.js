document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('.auth-form input:not([type="checkbox"])');
    const policyCheckbox = document.getElementById('policy');
    const submitBtn = document.getElementById('submit-btn');
    
    // активации/деактивации кнопки по checkbox
    function toggleSubmitButton() {
        if (policyCheckbox.checked) {
            submitBtn.disabled = false;
            submitBtn.removeAttribute('title');
        } else {
            submitBtn.disabled = true;
            submitBtn.setAttribute('title', 'Сначала ознакомьтесь с политикой');
        }
    }
    
    // checkbox при загрузке страницы
    toggleSubmitButton();
    
    // изменения checkbox
    policyCheckbox.addEventListener('change', toggleSubmitButton);
    
    inputs.forEach(input => {
        // проверка при загрузке страницы
        if (input.value) {
            input.classList.add('has-value');
        }
        
        // проверка при вводе
        input.addEventListener('input', function() {
            if (this.value) {
                this.classList.add('has-value');
            } else {
                this.classList.remove('has-value');
            }
        });
        
        // Проверяем при потере фокуса
        input.addEventListener('blur', function() {
            if (this.value) {
                this.classList.add('has-value');
            } else {
                this.classList.remove('has-value');
            }
        });
    });
});
