(function () {
    'use strict';
    for (const button of document.querySelectorAll('[data-plan]')) {
        button.addEventListener('click', () => {
            for (const other of document.querySelectorAll('[data-plan]')) other.setAttribute('aria-pressed', String(other === button));
            const message = document.getElementById('plan-confirmation');
            message.textContent = `Plano ${button.dataset.plan} selecionado. Nenhuma cobrança foi realizada.`;
            message.hidden = false;
            ReabUI.notify(message.textContent);
        });
    }
})();
