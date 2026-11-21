(function () {
    'use strict';
    const UI = ReabUI;
    const list = document.getElementById('plans-list');
    UI.watch(() => {
        const state = ReabStore.read();
        list.replaceChildren();
        if (!state.patients.length) UI.empty(list, 'Nenhum paciente cadastrado', 'Cadastre um paciente para organizar um plano.');
        for (const patient of state.patients) {
            const card = UI.element('article', 'patient-card');
            const link = UI.element('a', 'button button-secondary button-small', 'Organizar exercícios');
            link.href = `exercicios.html?patient=${encodeURIComponent(patient.id)}`;
            card.append(UI.element('h3', '', patient.name), UI.element('p', 'patient-details', patient.condition), link);
            list.append(card);
        }
    })();
})();
