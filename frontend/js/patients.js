(function () {
    'use strict';
    const UI = ReabUI;
    const form = document.getElementById('patient-form');
    const search = document.getElementById('patient-search');
    const statusFilter = document.getElementById('patient-filter');
    const list = document.getElementById('patient-list');
    const dialog = document.getElementById('delete-dialog');
    let pendingDeleteId = null;
    let returnFocus = null;

    function resetForm() {
        form.reset();
        form.elements.id.value = '';
        document.getElementById('form-title').textContent = 'Novo paciente';
        document.getElementById('save-patient').textContent =
            'Cadastrar paciente';
        document.getElementById('cancel-edit').hidden = true;
        document.getElementById('patient-form-error').hidden = true;
    }
    function editPatient(patient) {
        for (const key of [
            'id',
            'name',
            'email',
            'phone',
            'condition',
            'status',
        ])
            form.elements[key].value = patient[key];
        document.getElementById('form-title').textContent = 'Editar paciente';
        document.getElementById('save-patient').textContent =
            'Salvar alterações';
        document.getElementById('cancel-edit').hidden = false;
        document.getElementById('patient-form-error').hidden = true;
        form.elements.name.focus();
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    function requestDelete(patient, trigger) {
        try {
            const count = ReabStore.read().sessions.filter(
                (session) => session.patientId === patient.id,
            ).length;
            pendingDeleteId = patient.id;
            returnFocus = trigger;
            document.getElementById('delete-description').textContent =
                `Excluir ${patient.name}? ${count ? `As ${count} sessões vinculadas também serão removidas.` : 'O cadastro será removido.'} Essa ação não pode ser desfeita.`;
            dialog.showModal();
        } catch (exception) {
            UI.error(exception.message);
        }
    }
    function normalize(value) {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }
    function render() {
        const { patients } = ReabStore.read();
        const query = normalize(search.value.trim());
        const filtered = patients
            .filter(
                (patient) =>
                    (!statusFilter.value ||
                        patient.status === statusFilter.value) &&
                    normalize(
                        `${patient.name} ${patient.email} ${patient.condition}`,
                    ).includes(query),
            )
            .sort((first, second) =>
                first.name.localeCompare(second.name, 'pt-BR'),
            );
        document.getElementById('patient-count').textContent =
            `${filtered.length} de ${patients.length} pacientes`;
        list.replaceChildren();
        if (!filtered.length)
            UI.empty(
                list,
                'Nenhum paciente encontrado',
                patients.length
                    ? 'Tente outra pesquisa ou situação.'
                    : 'Cadastre o primeiro paciente no formulário ao lado.',
            );
        for (const patient of filtered) {
            const card = UI.element('article', 'patient-card');
            const heading = UI.element('div', 'card-heading');
            heading.append(
                UI.element('h3', '', patient.name),
                UI.badge(patient.status),
            );
            const details = UI.element('div', 'patient-details');
            details.append(
                UI.element('p', 'patient-condition', patient.condition),
                UI.element('p', '', patient.email),
            );
            if (patient.phone)
                details.append(UI.element('p', '', patient.phone));
            const actions = UI.element('div', 'card-actions');
            const edit = UI.action(
                'Editar',
                'button button-secondary button-small',
                () => editPatient(patient),
            );
            edit.setAttribute('aria-label', `Editar ${patient.name}`);
            const remove = UI.action(
                'Excluir',
                'button button-danger button-small',
                () => requestDelete(patient, remove),
            );
            remove.setAttribute('aria-label', `Excluir ${patient.name}`);
            actions.append(edit, remove);
            if (patient.status === 'ativo') {
                const schedule = UI.element(
                    'a',
                    'button button-link button-small',
                    'Agendar →',
                );
                schedule.href = `agenda.html?patient=${encodeURIComponent(patient.id)}`;
                schedule.setAttribute(
                    'aria-label',
                    `Agendar sessão para ${patient.name}`,
                );
                actions.append(schedule);
            }
            card.append(heading, details, actions);
            list.append(card);
        }
    }
    const refresh = UI.watch(render);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const message = document.getElementById('patient-form-error');
        message.hidden = true;
        if (!form.reportValidity()) return;
        try {
            const editing = Boolean(form.elements.id.value);
            ReabStore.savePatient(Object.fromEntries(new FormData(form)));
            resetForm();
            UI.notify(
                editing
                    ? 'Paciente atualizado com sucesso.'
                    : 'Paciente cadastrado com sucesso.',
            );
        } catch (exception) {
            message.textContent = exception.message;
            message.hidden = false;
        }
    });
    document.getElementById('cancel-edit').addEventListener('click', resetForm);
    document.getElementById('new-patient').addEventListener('click', () => {
        resetForm();
        form.elements.name.focus();
    });
    document
        .getElementById('cancel-delete')
        .addEventListener('click', () => dialog.close());
    document.getElementById('confirm-delete').addEventListener('click', () => {
        try {
            const editingDeleted = form.elements.id.value === pendingDeleteId;
            ReabStore.deletePatient(pendingDeleteId);
            if (editingDeleted) resetForm();
            returnFocus = null;
            dialog.close();
            search.focus();
            UI.notify('Paciente e sessões vinculadas removidos.');
        } catch (exception) {
            dialog.close();
            UI.error(exception.message);
        }
    });
    dialog.addEventListener('close', () => {
        pendingDeleteId = null;
        if (returnFocus?.isConnected) returnFocus.focus();
    });
    search.addEventListener('input', refresh);
    statusFilter.addEventListener('change', refresh);
    refresh();
})();
