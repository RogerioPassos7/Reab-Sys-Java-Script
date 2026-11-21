(function () {
    'use strict';
    const UI = ReabUI;
    const patientSelect = document.getElementById('evolution-patient');
    const filter = document.getElementById('history-exercise');
    const charts = document.getElementById('pain-charts');
    let currentPatient = null;
    let observedWidth = 0;

    function render() {
        const state = ReabStore.read();
        const selectedPatient = patientSelect.value;
        patientSelect.replaceChildren(new Option('Selecione um paciente', ''));
        for (const patient of state.patients)
            patientSelect.add(new Option(patient.name, patient.id));
        patientSelect.value = selectedPatient;
        const changed = currentPatient !== patientSelect.value;
        currentPatient = patientSelect.value;
        const assigned =
            state.assignments.find((item) => item.patientId === currentPatient)
                ?.exerciseIds || [];
        const records = state.measurements
            .filter((item) => item.patientId === currentPatient && item.source === 'patient')
            .sort(
                (a, b) =>
                    a.date.localeCompare(b.date) || a.createdAt - b.createdAt,
            );
        document.getElementById('manage-assignments').href = currentPatient
            ? `exercicios.html?patient=${encodeURIComponent(currentPatient)}`
            : 'exercicios.html';
        const previousFilter = changed ? '' : filter.value;
        const visibleExercises = state.exercises.filter(
            (item) =>
                assigned.includes(item.id) ||
                records.some((record) => record.exerciseId === item.id),
        );
        filter.replaceChildren(new Option('Todos os exercícios', ''));
        for (const exercise of visibleExercises)
            filter.add(
                new Option(
                    exercise.name +
                        (assigned.includes(exercise.id)
                            ? ''
                            : ' (não atribuído)'),
                    exercise.id,
                ),
            );
        filter.value = previousFilter;
        if (filter.selectedIndex < 0) filter.value = '';
        filter.disabled = !currentPatient;
        const visibleRecords = records.filter(
            (item) => !filter.value || item.exerciseId === filter.value,
        );
        charts.replaceChildren();
        if (!currentPatient)
            UI.empty(
                charts,
                'Selecione um paciente',
                'Os gráficos e o histórico serão exibidos aqui.',
            );
        else if (!visibleExercises.length)
            UI.empty(
                charts,
                'Nenhum exercício atribuído',
                'Use Gerenciar exercícios para montar o plano do paciente.',
            );
        else
            for (const exercise of visibleExercises.filter(
                (item) => !filter.value || item.id === filter.value,
            )) {
                ReabCharts.drawChart(
                    charts, exercise,
                    visibleRecords.filter(
                        (item) => item.exerciseId === exercise.id,
                    ),
                );
            }
        const table = document.getElementById('measurement-history');
        table.replaceChildren();
        for (const record of [...visibleRecords].reverse()) {
            const row = UI.element('tr');
            const exercise = state.exercises.find(
                (item) => item.id === record.exerciseId,
            );
            row.append(
                UI.element(
                    'td',
                    '',
                    UI.dateLabel(record.date, { dateStyle: 'short' }),
                ),
                UI.element('td', '', exercise.name),
                UI.element('td', '', `${record.pain} / 10`),
                UI.element('td', '', record.note || '—'),
                UI.element('td', '', (record.attachments || []).map(file => file.name).join(', ') || '—'),
            );
            table.append(row);
        }
        document.getElementById('measurement-count').textContent =
            `${visibleRecords.length} registros`;
        document.getElementById('history-table-wrap').hidden =
            !visibleRecords.length;
        document.getElementById('history-empty').hidden = Boolean(
            visibleRecords.length,
        );
        document.getElementById('history-empty').textContent = currentPatient
            ? 'Nenhuma medição para a seleção atual.'
            : 'Selecione um paciente para consultar os registros.';
    }

    const refresh = UI.watch(render);
    patientSelect.addEventListener('change', refresh);
    filter.addEventListener('change', refresh);
    new ResizeObserver((entries) => {
        const width = Math.floor(entries[0].contentRect.width);
        if (width !== observedWidth) {
            observedWidth = width;
            refresh();
        }
    }).observe(charts);
    refresh();
    const requestedPatient = new URLSearchParams(location.search).get(
        'patient',
    );
    if (requestedPatient) {
        patientSelect.value = requestedPatient;
        refresh();
    }
})();
