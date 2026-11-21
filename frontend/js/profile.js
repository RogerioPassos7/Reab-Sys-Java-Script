(function () {
    'use strict';
    document
        .getElementById('logout')
        .addEventListener('click', ReabAuth.logout);
    const key = 'reabsys.profile.v1';
    const form = document.getElementById('profile-form');
    try {
        const saved = JSON.parse(localStorage.getItem(key) || '{}');
        for (const name of ['name', 'email', 'registration']) {
            if (typeof saved[name] === 'string')
                form.elements[name].value = saved[name];
        }
    } catch {
        ReabUI.error('Não foi possível carregar o perfil salvo.');
    }
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        try {
            const data = Object.fromEntries(new FormData(form));
            data.name = data.name.trim();
            if (data.name.length < 3)
                throw new Error('Informe um nome com pelo menos 3 caracteres.');
            localStorage.setItem(key, JSON.stringify(data));
            ReabUI.clearError();
            ReabUI.notify('Perfil atualizado.');
        } catch (error) {
            ReabUI.error(error.message || 'Não foi possível salvar o perfil.');
        }
    });
})();
