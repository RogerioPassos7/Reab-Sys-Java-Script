(function () {
    'use strict';
    const UI = ReabUI;
    let calendarDate = new Date();
    calendarDate.setDate(1);

    function renderCalendar(sessions) {
        const grid = document.getElementById('calendar-days');
        grid.replaceChildren();
        document.getElementById('calendar-month').textContent =
            new Intl.DateTimeFormat('pt-BR', {
                month: 'long',
                year: 'numeric',
            }).format(calendarDate);
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const offset = (new Date(year, month, 1).getDay() + 6) % 7;
        for (let index = 0; index < offset; index++)
            grid.append(UI.element('span', 'calendar-blank'));
        const days = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= days; day++) {
            const value = ReabStore.today(new Date(year, month, day));
            const count = sessions.filter(
                (session) =>
                    session.date === value && session.status === 'agendada',
            ).length;
            const link = UI.element(
                'a',
                `calendar-day${count ? ' has-session' : ''}`,
                String(day),
            );
            link.href = `agenda.html?date=${value}`;
            link.setAttribute(
                'aria-label',
                `${UI.dateLabel(value, { dateStyle: 'full' })}, ${count} sessões agendadas`,
            );
            if (value === ReabStore.today())
                link.setAttribute('aria-current', 'date');
            grid.append(link);
        }
    }
    function render() {
        const { patients, sessions } = ReabStore.read();
        const today = ReabStore.today();
        document.getElementById('dashboard-date').textContent = UI.dateLabel(
            today,
            { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
        );
        const scheduled = sessions.filter(
            (session) => session.status === 'agendada',
        );
        const completed = sessions.filter(
            (session) => session.status === 'concluida',
        );
        document.getElementById('active-patients').textContent =
            patients.filter((patient) => patient.status === 'ativo').length;
        document.getElementById('today-sessions').textContent = sessions.filter(
            (session) =>
                session.date === today && session.status !== 'cancelada',
        ).length;
        document.getElementById('completed-sessions').textContent =
            completed.length;
        const validSessions = sessions.filter(
            (session) => session.status !== 'cancelada',
        );
        const rate = validSessions.length
            ? Math.round((completed.length / validSessions.length) * 100)
            : 0;
        document.getElementById('completion-rate').textContent = `${rate}%`;
        document
            .getElementById('completion-ring')
            .style.setProperty('--completion', `${rate}%`);
        document.getElementById('scheduled-count').textContent =
            scheduled.length;
        document.getElementById('finished-count').textContent =
            completed.length;
        document.getElementById('cancelled-count').textContent =
            sessions.filter((session) => session.status === 'cancelada').length;
        const withoutSession = patients.filter(
            (patient) =>
                patient.status === 'ativo' &&
                !scheduled.some(
                    (session) =>
                        session.patientId === patient.id &&
                        ReabStore.sessionDate(session) >= new Date(),
                ),
        );
        const attention = document.getElementById('attention-list');
        attention.replaceChildren();
        if (!withoutSession.length)
            UI.empty(
                attention,
                'Tudo organizado por aqui',
                'Todos os pacientes ativos têm uma próxima sessão.',
            );
        for (const patient of withoutSession) {
            const link = UI.element('a', 'attention-item');
            link.href = `agenda.html?patient=${encodeURIComponent(patient.id)}`;
            const text = UI.element('div');
            text.append(
                UI.element('strong', '', patient.name),
                UI.element('span', '', 'Sem próxima sessão agendada'),
            );
            link.append(
                UI.icon('clock'),
                text,
                UI.element('span', 'attention-arrow', '→'),
            );
            attention.append(link);
        }
        const upcoming = scheduled
            .filter((session) => ReabStore.sessionDate(session) >= new Date())
            .sort((a, b) => ReabStore.sessionDate(a) - ReabStore.sessionDate(b))
            .slice(0, 4);
        const list = document.getElementById('upcoming-list');
        list.replaceChildren();
        if (!upcoming.length)
            UI.empty(
                list,
                'Sua agenda está livre',
                'Agende uma sessão para começar o acompanhamento.',
            );
        for (const session of upcoming) {
            const patient = patients.find(
                (item) => item.id === session.patientId,
            );
            const link = UI.element('a', 'upcoming-item');
            link.href = `agenda.html?date=${session.date}`;
            const avatar = UI.element(
                'span',
                'patient-avatar',
                patient.name
                    .split(' ')
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join(''),
            );
            const info = UI.element('div', 'upcoming-info');
            info.append(
                UI.element('strong', '', patient.name),
                UI.element('span', '', session.type),
            );
            const date = UI.element('div', 'upcoming-time');
            date.append(
                UI.element('strong', '', session.time),
                UI.element('span', '', UI.dateLabel(session.date)),
            );
            link.append(avatar, info, date);
            list.append(link);
        }
        renderCalendar(sessions);
    }
    const refresh = UI.watch(render);
    document.getElementById('previous-month').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        refresh();
    });
    document.getElementById('next-month').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        refresh();
    });
    // Atualiza horários e indicadores quando a página permanece aberta.
    setInterval(refresh, 60000);
    refresh();
})();
