(function () {
    'use strict';
    const UI = ReabUI;
    const patientSelect = document.getElementById('evolution-patient');
    const form = document.getElementById('measurement-form');
    const exerciseSelect = document.getElementById('measurement-exercise');
    const filter = document.getElementById('history-exercise');
    const charts = document.getElementById('pain-charts');
    let currentPatient = null;
    let observedWidth = 0;
    form.elements.date.value = ReabStore.today();

    function svgElement(tag, attributes, text) {
        const node = document.createElementNS(
            'http://www.w3.org/2000/svg',
            tag,
        );
        for (const [key, value] of Object.entries(attributes))
            node.setAttribute(key, value);
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function drawChart(exercise, measurements) {
        const section = UI.element('section', 'pain-chart');
        section.append(UI.element('h3', '', exercise.name));
        charts.append(section);
        if (!measurements.length) {
            UI.empty(
                section,
                'Sem medições para este exercício',
                'Registre o nível de dor no formulário para iniciar o gráfico.',
            );
            return;
        }
        const width = Math.max(220, Math.floor(section.clientWidth));
        const height = 245;
        const left = 35,
            right = width - 22,
            top = 24,
            bottom = height - 40;
        const svg = svgElement('svg', {
            viewBox: `0 0 ${width} ${height}`,
            width: '100%',
            height,
            role: 'img',
            'aria-label': `Dor em ${exercise.name}. ${measurements.length} medições por data, escala de 0 a 10. Valores completos na tabela do histórico.`,
        });
        svg.append(svgElement('title', {}, `Nível de dor — ${exercise.name}`));
        for (let value = 0; value <= 10; value += 2) {
            const y = bottom - (value / 10) * (bottom - top);
            svg.append(
                svgElement('line', {
                    x1: left,
                    x2: right,
                    y1: y,
                    y2: y,
                    class: 'chart-grid-line',
                }),
            );
            svg.append(
                svgElement(
                    'text',
                    {
                        x: left - 10,
                        y: y + 4,
                        'text-anchor': 'end',
                        class: 'chart-label',
                    },
                    String(value),
                ),
            );
        }
        const timestamps = measurements.map((item) =>
            new Date(`${item.date}T12:00:00`).getTime(),
        );
        const min = timestamps[0],
            max = timestamps[timestamps.length - 1];
        const points = measurements.map((item, index) => ({
            x:
                max === min
                    ? (left + right) / 2
                    : left +
                      ((timestamps[index] - min) / (max - min)) *
                          (right - left),
            y: bottom - (item.pain / 10) * (bottom - top),
            item,
        }));
        if (points.length > 1)
            svg.append(
                svgElement('polyline', {
                    points: points
                        .map((point) => `${point.x},${point.y}`)
                        .join(' '),
                    class: 'pain-line',
                }),
            );
        for (const { x, y, item } of points) {
            const point = svgElement('circle', {
                cx: x,
                cy: y,
                r: 5,
                class: 'pain-point',
            });
            point.append(
                svgElement(
                    'title',
                    {},
                    `${UI.dateLabel(item.date, { dateStyle: 'short' })}: dor ${item.pain} de 10`,
                ),
            );
            svg.append(point);
        }
        const dates = [
            ...new Map(
                points.map((point) => [point.item.date, point]),
            ).values(),
        ];
        const count = Math.max(1, Math.min(4, Math.floor((right - left) / 85)));
        const indexes = new Set(
            Array.from({ length: count }, (_, index) =>
                count === 1
                    ? 0
                    : Math.round((index * (dates.length - 1)) / (count - 1)),
            ),
        );
        for (const index of indexes) {
            const point = dates[index];
            svg.append(
                svgElement(
                    'text',
                    {
                        x: point.x,
                        y: bottom + 24,
                        'text-anchor': 'middle',
                        class: 'chart-label',
                    },
                    UI.dateLabel(point.item.date, {
                        day: '2-digit',
                        month: '2-digit',
                    }),
                ),
            );
        }
        section.append(
            svg,
            UI.element(
                'p',
                'form-help',
                `${measurements.length} medições · 0 = sem dor · 10 = maior dor percebida`,
            ),
        );
    }

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
            .filter((item) => item.patientId === currentPatient)
            .sort(
                (a, b) =>
                    a.date.localeCompare(b.date) || a.createdAt - b.createdAt,
            );
        const previouslySelected = changed ? '' : exerciseSelect.value;
        exerciseSelect.replaceChildren(
            new Option('Selecione um exercício', ''),
        );
        for (const exercise of state.exercises.filter((item) =>
            assigned.includes(item.id),
        ))
            exerciseSelect.add(new Option(exercise.name, exercise.id));
        exerciseSelect.value = previouslySelected;
        exerciseSelect.disabled = !currentPatient || !assigned.length;
        document.getElementById('save-measurement').disabled =
            exerciseSelect.disabled;
        document.getElementById('measurement-hint').textContent =
            !currentPatient
                ? 'Selecione um paciente acima.'
                : !assigned.length
                  ? 'Atribua exercícios ao paciente antes de registrar a dor.'
                  : 'Você pode registrar mais de uma sessão no mesmo dia.';
        document.getElementById('manage-assignments').href = currentPatient
            ? `exercicios.html?patient=${encodeURIComponent(currentPatient)}`
            : 'exercicios.html';
        form.elements.date.max = ReabStore.today();
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
        if (changed) document.getElementById('measurement-error').hidden = true;
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
                drawChart(
                    exercise,
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
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        try {
            ReabStore.addMeasurement({
                ...Object.fromEntries(new FormData(form)),
                patientId: patientSelect.value,
            });
            form.elements.pain.value = '';
            document.getElementById('measurement-error').hidden = true;
            UI.notify('Medição de dor registrada.');
        } catch (error) {
            const message = document.getElementById('measurement-error');
            message.textContent = error.message;
            message.hidden = false;
        }
    });
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
