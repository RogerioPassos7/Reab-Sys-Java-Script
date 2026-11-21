(function () {
    'use strict';
    const UI = ReabUI;
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

    function drawChart(charts, exercise, measurements) {
        const section = UI.element('section', 'pain-chart');
        section.append(UI.element('h3', '', exercise.name));
        charts.append(section);
        if (!measurements.length) {
            UI.empty(
                section,
                'Sem medições para este exercício',
                'O gráfico aparecerá quando o paciente enviar seu primeiro registro.',
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

    window.ReabCharts = Object.freeze({ drawChart });
})();
