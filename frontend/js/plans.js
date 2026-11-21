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
            const assigned = state.assignments.find(item => item.patientId === patient.id)?.exerciseIds || [];
            const exercises = state.exercises.filter(item => assigned.includes(item.id));
            const items = UI.element('ul', 'plan-exercises');
            for (const exercise of exercises) items.append(UI.element('li', '', exercise.name));
            if (exercises.length) card.append(items);
            else card.append(UI.element('p', 'form-help', 'Nenhum exercício atribuído.'));
            const evolution = UI.element('a', 'button button-link button-small', 'Ver evolução →');
            evolution.href = `evolucao.html?patient=${encodeURIComponent(patient.id)}`;
            card.append(evolution);
            list.append(card);
        }
    })();
})();
