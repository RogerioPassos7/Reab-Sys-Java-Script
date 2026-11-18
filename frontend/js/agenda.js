(function () {
    'use strict';
    const UI = ReabUI;
    const form = document.getElementById('session-form');
    const patientSelect = form.elements.patientId;
    const list = document.getElementById('session-list');
    const dateFilter = document.getElementById('session-date-filter');
    const statusFilter = document.getElementById('session-status-filter');
    const search = document.getElementById('session-search');
    const dialog = document.getElementById('cancel-dialog');
    let pendingSessionId = null;
    let returnFocus = null;
    const parameters = new URLSearchParams(location.search);
    const requestedDate = parameters.get('date');
    if (ReabStore.isDate(requestedDate || '')) dateFilter.value = requestedDate;
    form.elements.date.min = ReabStore.today();
    form.elements.date.value = ReabStore.today();

    function syncPatients(patients) {
        const selected = patientSelect.value;
        const active = patients
            .filter((patient) => patient.status === 'ativo')
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        patientSelect.replaceChildren(new Option('Selecione um paciente', ''));
        for (const patient of active)
            patientSelect.add(new Option(patient.name, patient.id));
        if (active.some((patient) => patient.id === selected))
            patientSelect.value = selected;
        document.getElementById('no-patients').hidden = active.length > 0;
        document.getElementById('save-session').disabled = active.length === 0;
    }
    function changeStatus(id, status) {
        try {
            ReabStore.changeSessionStatus(id, status);
            UI.notify(
                status === 'concluida'
                    ? 'Sessão marcada como concluída.'
                    : 'Sessão cancelada. O horário está disponível novamente.',
            );
        } catch (exception) {
            UI.error(exception.message);
        }
    }
    function render() {
        const { patients, sessions } = ReabStore.read();
        form.elements.date.min = ReabStore.today();
        syncPatients(patients);
        const query = search.value
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        const filtered = sessions
            .filter((session) => {
                const patient = patients.find(
                    (item) => item.id === session.patientId,
                );
                return (
                    (!dateFilter.value || session.date === dateFilter.value) &&
                    (!statusFilter.value ||
                        session.status === statusFilter.value) &&
                    patient.name
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase()
                        .includes(query)
                );
            })
            .sort(
                (a, b) => ReabStore.sessionDate(a) - ReabStore.sessionDate(b),
            );
        document.getElementById('session-count').textContent =
            `${filtered.length} de ${sessions.length} sessões`;
        list.replaceChildren();
        if (!filtered.length)
            UI.empty(
                list,
                'Nenhuma sessão encontrada',
                'Ajuste os filtros ou agende uma nova sessão.',
            );
        for (const session of filtered) {
            const patient = patients.find(
                (item) => item.id === session.patientId,
            );
            const card = UI.element('article', 'session-card');
            const date = UI.element('div', 'session-date');
            date.append(
                UI.element(
                    'strong',
                    '',
                    UI.dateLabel(session.date, { day: '2-digit' }),
                ),
                UI.element(
                    'span',
                    '',
                    UI.dateLabel(session.date, {
                        month: 'short',
                        year: 'numeric',
                    }),
                ),
            );
            const content = UI.element('div', 'session-content');
            const heading = UI.element('div', 'card-heading');
            heading.append(
                UI.element('h3', '', patient.name),
                UI.badge(session.status),
            );
            content.append(
                heading,
                UI.element(
                    'p',
                    '',
                    `${session.type} · ${session.time} · ${session.duration} min`,
                ),
            );
            const actions = UI.element('div', 'card-actions');
            if (session.status === 'agendada') {
                const complete = UI.action(
                    'Concluir',
                    'button button-secondary button-small',
                    () => changeStatus(session.id, 'concluida'),
                );
                complete.setAttribute(
                    'aria-label',
                    `Concluir sessão de ${patient.name} em ${UI.dateLabel(session.date)}`,
                );
                const cancel = UI.action(
                    'Cancelar',
                    'button button-danger button-small',
                    () => {
                        pendingSessionId = session.id;
                        returnFocus = cancel;
                        document.getElementById(
                            'cancel-description',
                        ).textContent =
                            `Cancelar a sessão de ${patient.name} em ${UI.dateLabel(session.date, { dateStyle: 'short' })}, às ${session.time}? Ela permanecerá no histórico como cancelada.`;
                        dialog.showModal();
                    },
                );
                cancel.setAttribute(
                    'aria-label',
                    `Cancelar sessão de ${patient.name} em ${UI.dateLabel(session.date)}`,
                );
                actions.append(complete, cancel);
            }
            content.append(actions);
            card.append(date, content);
            list.append(card);
        }
    }
    const refresh = UI.watch(render);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const message = document.getElementById('session-form-error');
        message.hidden = true;
        if (!form.reportValidity()) return;
        try {
            const session = ReabStore.addSession(
                Object.fromEntries(new FormData(form)),
            );
            form.reset();
            form.elements.date.value = ReabStore.today();
            dateFilter.value = session.date;
            statusFilter.value = '';
            search.value = '';
            refresh();
            UI.notify('Sessão agendada com sucesso.');
        } catch (exception) {
            message.textContent = exception.message;
            message.hidden = false;
        }
    });
    document
        .getElementById('keep-session')
        .addEventListener('click', () => dialog.close());
    document.getElementById('confirm-cancel').addEventListener('click', () => {
        changeStatus(pendingSessionId, 'cancelada');
        returnFocus = null;
        dialog.close();
        search.focus();
    });
    dialog.addEventListener('close', () => {
        pendingSessionId = null;
        if (returnFocus?.isConnected) returnFocus.focus();
    });
    document
        .getElementById('clear-session-filters')
        .addEventListener('click', () => {
            dateFilter.value = '';
            statusFilter.value = '';
            search.value = '';
            refresh();
        });
    for (const filter of [dateFilter, statusFilter])
        filter.addEventListener('change', refresh);
    search.addEventListener('input', refresh);
    refresh();
    if (parameters.has('patient'))
        patientSelect.value = parameters.get('patient');
})();
