(function () {
    'use strict';
    const SESSION_KEY = 'reabsys.session.v1';
    const logins = { therapist: 'login.html', patient: 'login-paciente.html' };
    function session() {
        try {
            const value = JSON.parse(localStorage.getItem(SESSION_KEY));
            if (
                !value ||
                !Object.hasOwn(logins, value.role) ||
                !Number.isFinite(value.createdAt)
            )
                return null;
            if (
                value.role === 'patient' &&
                !ReabStore.read().patients.some(
                    (patient) => patient.id === value.patientId,
                )
            )
                return null;
            return value;
        } catch {
            return null;
        }
    }
    function login(role, username, password, patientId) {
        if (
            !Object.hasOwn(logins, role) ||
            username.trim() !== 'admin' ||
            password !== '1234'
        )
            throw new Error(
                'Usuário ou senha incorretos. Confira os dados e tente novamente.',
            );
        if (
            role === 'patient' &&
            !ReabStore.read().patients.some(
                (patient) => patient.id === patientId,
            )
        )
            throw new Error('Selecione seu nome na lista de pacientes.');
        localStorage.setItem(
            SESSION_KEY,
            JSON.stringify({
                role,
                patientId: role === 'patient' ? patientId : null,
                createdAt: Date.now(),
            }),
        );
        location.assign(
            role === 'therapist'
                ? 'fisiomenu.html'
                : 'paciente-exercicios.html',
        );
    }
    function logout() {
        const role = session()?.role || document.body.dataset.role;
        localStorage.removeItem(SESSION_KEY);
        location.replace(logins[role] || logins.therapist);
    }
    function requireRole(role) {
        const current = session();
        if (current?.role !== role)
            throw new Error(
                'Entre no perfil correspondente para realizar esta ação.',
            );
        return current;
    }
    function guard() {
        const role = document.body.dataset.role;
        if (!role) return;
        if (session()?.role !== role) {
            document.body.hidden = true;
            location.replace(logins[role]);
        }
    }
    window.ReabAuth = Object.freeze({
        SESSION_KEY,
        session,
        login,
        logout,
        requireRole,
    });
    guard();
    window.addEventListener('storage', (event) => {
        if (
            event.key === SESSION_KEY ||
            event.key === ReabStore.STORAGE_KEY ||
            event.key === null
        )
            guard();
    });
    window.addEventListener('pageshow', guard);
    window.addEventListener('reabsys:change', guard);
})();
