(function () {
    'use strict';
    const form = document.getElementById('login-form');
    const error = document.getElementById('login-error');
    const role = document.body.dataset.loginRole;
    if (role === 'patient') {
        try {
            for (const patient of ReabStore.read().patients) form.elements.patientId.add(new Option(patient.name, patient.id));
        } catch (exception) { error.textContent = exception.message; error.hidden = false; }
    }
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        try { ReabAuth.login(role, form.elements.username.value, form.elements.password.value, form.elements.patientId?.value); }
        catch (exception) { error.textContent = exception.message || 'Não foi possível entrar. Permita o armazenamento neste navegador.'; error.hidden = false; }
    });
})();
