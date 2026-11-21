(function () {
    'use strict';
    if (document.body.hidden) return;
    const UI = ReabUI;
    const page = document.body.dataset.patientPage;
    const patientId = ReabAuth.requireRole('patient').patientId;
    let observedWidth = 0;

    function records(state) {
        return state.measurements
            .filter(
                (item) =>
                    item.patientId === patientId && item.source === 'patient',
            )
            .sort(
                (a, b) =>
                    a.date.localeCompare(b.date) || a.createdAt - b.createdAt,
            );
    }
    function assignedExercises(state) {
        const ids =
            state.assignments.find((item) => item.patientId === patientId)
                ?.exerciseIds || [];
        return state.exercises.filter((item) => ids.includes(item.id));
    }
    function renderExercises(state) {
        const list = document.getElementById('patient-exercises');
        list.replaceChildren();
        const exercises = assignedExercises(state);
        if (!exercises.length)
            UI.empty(
                list,
                'Seu plano está sendo preparado',
                'Assim que o fisioterapeuta atribuir exercícios, eles aparecerão aqui.',
            );
        for (const exercise of exercises) {
            const card = UI.element('article', 'exercise-card');
            const content = UI.element('div', 'exercise-card-content');
            const link = UI.element(
                'a',
                'button button-secondary',
                'Enviar registro',
            );
            link.href = `paciente-registro.html?exercise=${encodeURIComponent(exercise.id)}`;
            content.append(
                UI.element('h3', '', exercise.name),
                UI.element('p', 'patient-details', exercise.benefit),
                link,
            );
            card.append(UI.exerciseMedia(exercise), content);
            list.append(card);
        }
    }
    function renderRecord(state) {
        const select = document.getElementById('record-exercise');
        const selected = select.value;
        select.replaceChildren(new Option('Selecione um exercício', ''));
        const exercises = assignedExercises(state);
        for (const exercise of exercises)
            select.add(new Option(exercise.name, exercise.id));
        select.value = selected;
        document.getElementById('send-record').disabled = !exercises.length;
        document.getElementById('record-hint').textContent = exercises.length
            ? 'Selecione um exercício do seu plano para registrar a sessão.'
            : 'Aguarde a atribuição de exercícios pelo fisioterapeuta para enviar um registro.';
        document.getElementById('record-date').max = ReabStore.today();
    }
    function renderAgenda(state) {
        let professional = 'Fisioterapeuta responsável';
        try {
            professional =
                JSON.parse(localStorage.getItem('reabsys.profile.v1'))?.name ||
                professional;
        } catch {}
        const now = new Date();
        const sessions = state.sessions
            .filter((item) => item.patientId === patientId)
            .sort(
                (a, b) => ReabStore.sessionDate(a) - ReabStore.sessionDate(b),
            );
        for (const [key, predicate] of [
            [
                'upcoming',
                (item) =>
                    item.status === 'agendada' &&
                    ReabStore.sessionDate(item) >= now,
            ],
            [
                'past',
                (item) =>
                    item.status !== 'cancelada' &&
                    (item.status === 'concluida' ||
                        ReabStore.sessionDate(item) < now),
            ],
            ['cancelled', (item) => item.status === 'cancelada'],
        ]) {
            const list = document.getElementById(`${key}-sessions`);
            list.replaceChildren();
            const filtered = sessions.filter(predicate);
            if (!filtered.length)
                UI.empty(
                    list,
                    'Nenhuma consulta nesta lista',
                    key === 'upcoming'
                        ? 'As próximas consultas agendadas aparecerão aqui.'
                        : 'As consultas serão organizadas nesta seção.',
                );
            for (const session of filtered) {
                const card = UI.element('article', 'patient-card');
                card.append(
                    UI.element(
                        'h3',
                        '',
                        `${UI.dateLabel(session.date, { dateStyle: 'long' })} às ${session.time}`,
                    ),
                    UI.element(
                        'p',
                        'patient-details',
                        `${session.type} · ${session.duration} minutos · ${session.professional || professional}`,
                    ),
                    UI.element(
                        'p',
                        'form-help',
                        session.location ||
                            session.note ||
                            'Local e orientações: confirme com seu fisioterapeuta.',
                    ),
                    UI.badge(session.status),
                );
                list.append(card);
            }
        }
    }
    function renderEvolution(state) {
        const history = records(state);
        const filter = document.getElementById('patient-history-filter');
        const previous = filter.value;
        const exercises = state.exercises.filter((exercise) =>
            history.some((record) => record.exerciseId === exercise.id),
        );
        filter.replaceChildren(new Option('Todos os exercícios', ''));
        for (const exercise of exercises)
            filter.add(new Option(exercise.name, exercise.id));
        filter.value = previous;
        if (filter.selectedIndex < 0) filter.value = '';
        const charts = document.getElementById('patient-charts');
        const summary = document.getElementById('patient-summary');
        charts.replaceChildren();
        summary.replaceChildren();
        if (!history.length)
            UI.empty(
                charts,
                'Seu acompanhamento começa com o primeiro registro',
                'Envie um registro após realizar um exercício para acompanhar sua dor ao longo do tempo.',
            );
        for (const exercise of exercises.filter(
            (item) => !filter.value || item.id === filter.value,
        )) {
            const items = history.filter(
                (item) => item.exerciseId === exercise.id,
            );
            const difference = items[0].pain - items.at(-1).pain;
            const box = UI.element('article', 'evolution-summary');
            const message =
                items.length < 2
                    ? 'Envie mais um registro para comparar sua evolução.'
                    : difference > 0
                      ? `Sua dor diminuiu ${difference} ponto${difference === 1 ? '' : 's'}.`
                      : difference < 0
                        ? `Sua dor aumentou ${Math.abs(difference)} ponto${difference === -1 ? '' : 's'}. Converse com seu fisioterapeuta.`
                        : 'Sua dor permaneceu no mesmo nível entre o primeiro e o último registro.';
            box.append(
                UI.element('h3', '', exercise.name),
                UI.element('p', '', message),
                UI.element(
                    'p',
                    'form-help',
                    `Primeiro: ${items[0].pain}/10 em ${UI.dateLabel(items[0].date)} · Último: ${items.at(-1).pain}/10 em ${UI.dateLabel(items.at(-1).date)}`,
                ),
            );
            summary.append(box);
            ReabCharts.drawChart(charts, exercise, items);
        }
        const container = document.getElementById('patient-history');
        container.replaceChildren();
        const selectedRecords = history.filter(
            (item) => !filter.value || item.exerciseId === filter.value,
        );
        if (!selectedRecords.length) {
            UI.empty(
                container,
                'Nenhum registro ainda',
                'Seu histórico aparecerá aqui após o envio.',
            );
            return;
        }
        const table = UI.element('table', 'history-table');
        table.append(
            UI.element(
                'caption',
                'sr-only',
                'Histórico de dor do paciente conectado',
            ),
        );
        const head = UI.element('thead');
        const heading = UI.element('tr');
        for (const label of [
            'Data',
            'Exercício',
            'Dor (0–10)',
            'Observação',
            'Arquivos informados',
        ]) {
            const cell = UI.element('th', '', label);
            cell.scope = 'col';
            heading.append(cell);
        }
        head.append(heading);
        table.append(head);
        const body = UI.element('tbody');
        for (const record of [...selectedRecords].reverse()) {
            const row = UI.element('tr');
            for (const text of [
                UI.dateLabel(record.date, { dateStyle: 'short' }),
                state.exercises.find((item) => item.id === record.exerciseId)
                    .name,
                `${record.pain} / 10`,
                record.note || '—',
                (record.attachments || [])
                    .map((file) => file.name)
                    .join(', ') || '—',
            ])
                row.append(UI.element('td', '', text));
            body.append(row);
        }
        table.append(body);
        container.append(table);
    }
    const refresh = UI.watch(() => {
        const state = ReabStore.read();
        const patient = state.patients.find((item) => item.id === patientId);
        if (!patient) return;
        document.getElementById('patient-greeting').textContent =
            `Área do paciente · ${patient.name}`;
        if (page === 'exercicios') renderExercises(state);
        if (page === 'registro') renderRecord(state);
        if (page === 'agenda') renderAgenda(state);
        if (page === 'evolucao') renderEvolution(state);
        if (page === 'perfil') {
            document.getElementById('patient-profile-name').textContent =
                patient.name;
            document.getElementById('patient-profile-email').textContent =
                patient.email;
            document.getElementById('patient-profile-condition').textContent =
                patient.condition;
        }
    });
    if (page === 'registro') {
        const form = document.getElementById('patient-record-form');
        form.elements.date.value = ReabStore.today();
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            const error = document.getElementById('record-error');
            try {
                ReabStore.addMeasurement({
                    patientId,
                    exerciseId: form.elements.exerciseId.value,
                    date: form.elements.date.value,
                    pain: form.elements.pain.value,
                    note: form.elements.note.value,
                    attachments: [...form.elements.files.files],
                });
                form.reset();
                form.elements.date.value = ReabStore.today();
                error.hidden = true;
                refresh();
                UI.notify(
                    'Registro enviado ao acompanhamento do fisioterapeuta. Apenas os dados e os nomes dos anexos foram salvos.',
                );
            } catch (exception) {
                error.textContent = exception.message;
                error.hidden = false;
            }
        });
    }
    if (page === 'perfil')
        document
            .getElementById('logout')
            .addEventListener('click', ReabAuth.logout);
    if (page === 'evolucao') {
        document
            .getElementById('patient-history-filter')
            .addEventListener('change', refresh);
        new ResizeObserver((entries) => {
            const width = Math.floor(entries[0].contentRect.width);
            if (width !== observedWidth) {
                observedWidth = width;
                refresh();
            }
        }).observe(document.getElementById('patient-charts'));
    }
    refresh();
    if (page === 'registro') {
        const requested = new URLSearchParams(location.search).get('exercise');
        if (requested)
            document.getElementById('record-exercise').value = requested;
    }
})();
