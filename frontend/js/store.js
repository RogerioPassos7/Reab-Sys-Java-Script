/* Regras de negócio e persistência da demonstração. Não armazene dados reais. */
(function () {
    'use strict';

    const STORAGE_KEY = 'reabsys.demo.v1';
    const PATIENT_STATUS = ['ativo', 'inativo'];
    const SESSION_STATUS = ['agendada', 'concluida', 'cancelada'];
    const SESSION_TYPES = ['Avaliação', 'Fisioterapia', 'Retorno'];

    function today(date = new Date()) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function isDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(`${value}T12:00:00`);
        return Number.isFinite(date.getTime()) && today(date) === value;
    }

    function sessionDate(session) {
        return new Date(`${session.date}T${session.time}:00`);
    }

    function seed() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return {
            version: 1,
            patients: [
                {
                    id: 'demo-maria',
                    name: 'Maria Silva',
                    email: 'maria@example.com',
                    phone: '(11) 99999-0001',
                    condition: 'Reabilitação do joelho',
                    status: 'ativo',
                },
                {
                    id: 'demo-joao',
                    name: 'João Pedro',
                    email: 'joao@example.com',
                    phone: '(11) 99999-0002',
                    condition: 'Mobilidade do ombro',
                    status: 'ativo',
                },
                {
                    id: 'demo-isabelly',
                    name: 'Isabelly Souza',
                    email: 'isabelly@example.com',
                    phone: '',
                    condition: 'Fortalecimento muscular',
                    status: 'ativo',
                },
                {
                    id: 'demo-carlos',
                    name: 'Carlos Eduardo',
                    email: 'carlos@example.com',
                    phone: '',
                    condition: 'Reabilitação lombar',
                    status: 'inativo',
                },
            ],
            sessions: [
                {
                    id: 'demo-sessao-1',
                    patientId: 'demo-maria',
                    date: today(),
                    time: '15:00',
                    duration: 50,
                    type: 'Fisioterapia',
                    status: 'agendada',
                },
                {
                    id: 'demo-sessao-2',
                    patientId: 'demo-joao',
                    date: today(tomorrow),
                    time: '10:00',
                    duration: 50,
                    type: 'Retorno',
                    status: 'agendada',
                },
                {
                    id: 'demo-sessao-3',
                    patientId: 'demo-isabelly',
                    date: today(yesterday),
                    time: '09:00',
                    duration: 50,
                    type: 'Avaliação',
                    status: 'concluida',
                },
            ],
        };
    }

    function validState(state) {
        if (
            !state ||
            state.version !== 1 ||
            !Array.isArray(state.patients) ||
            !Array.isArray(state.sessions)
        )
            return false;
        const patientIds = new Set();
        for (const patient of state.patients) {
            if (
                !patient ||
                typeof patient.id !== 'string' ||
                patientIds.has(patient.id) ||
                !['name', 'email', 'phone', 'condition'].every(
                    (key) => typeof patient[key] === 'string',
                ) ||
                !PATIENT_STATUS.includes(patient.status)
            )
                return false;
            patientIds.add(patient.id);
        }
        const sessionIds = new Set();
        for (const session of state.sessions) {
            if (
                !session ||
                typeof session.id !== 'string' ||
                sessionIds.has(session.id) ||
                !patientIds.has(session.patientId) ||
                !isDate(session.date) ||
                !/^([01]\d|2[0-3]):[0-5]\d$/.test(session.time) ||
                !Number.isInteger(session.duration) ||
                session.duration < 15 ||
                session.duration > 120 ||
                !SESSION_TYPES.includes(session.type) ||
                !SESSION_STATUS.includes(session.status)
            )
                return false;
            sessionIds.add(session.id);
        }
        return true;
    }

    function write(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
            throw new Error(
                'Não foi possível salvar. Verifique se o armazenamento do navegador está disponível ou cheio.',
            );
        }
        window.dispatchEvent(new Event('reabsys:change'));
    }

    function read() {
        let raw;
        try {
            raw = localStorage.getItem(STORAGE_KEY);
        } catch {
            throw new Error(
                'O armazenamento local está bloqueado. Permita o armazenamento para utilizar a demonstração.',
            );
        }
        if (raw === null) {
            const state = seed();
            initializeExercises(state);
            // A inicialização não emite evento para evitar leituras recursivas.
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch {
                throw new Error(
                    'Não foi possível iniciar o armazenamento da demonstração.',
                );
            }
            return state;
        }
        let state;
        try {
            state = JSON.parse(raw);
        } catch {
            /* Reporta sem apagar os registros existentes. */
        }
        if (!validState(state))
            throw new Error(
                'Os dados locais estão incompatíveis ou corrompidos. Nada foi sobrescrito.',
            );
        const migrated = initializeExercises(state);
        if (!validExerciseState(state)) throw new Error('Os dados de exercícios estão inválidos. Nada foi sobrescrito.');
        if (migrated) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
            catch { throw new Error('Não foi possível atualizar os dados locais.'); }
        }
        return state;
    }

    function text(value, max) {
        return String(value ?? '')
            .trim()
            .slice(0, max);
    }
    function id() {
        return crypto.randomUUID();
    }

    function savePatient(input) {
        const state = read();
        const patient = {
            id: input.id || id(),
            name: text(input.name, 100),
            email: text(input.email, 120).toLowerCase(),
            phone: text(input.phone, 25),
            condition: text(input.condition, 160),
            status: input.status,
        };
        if (patient.name.length < 3)
            throw new Error('Informe um nome com pelo menos 3 caracteres.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient.email))
            throw new Error('Informe um e-mail válido.');
        if (
            patient.phone &&
            !/^(?:\+?55\s*)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}$/.test(
                patient.phone,
            )
        )
            throw new Error(
                'Informe um telefone com DDD ou deixe o campo vazio.',
            );
        if (patient.condition.length < 3)
            throw new Error(
                'Descreva o acompanhamento com pelo menos 3 caracteres.',
            );
        if (!PATIENT_STATUS.includes(patient.status))
            throw new Error('Selecione uma situação válida.');
        if (
            state.patients.some(
                (item) =>
                    item.email === patient.email && item.id !== patient.id,
            )
        )
            throw new Error('Já existe um paciente com esse e-mail.');
        const index = state.patients.findIndex(
            (item) => item.id === patient.id,
        );
        if (input.id && index < 0)
            throw new Error('Esse paciente não existe mais. Atualize a lista.');
        if (index < 0) state.patients.push(patient);
        else state.patients[index] = patient;
        write(state);
        return patient;
    }

    function deletePatient(patientId) {
        const state = read();
        if (!state.patients.some((item) => item.id === patientId))
            throw new Error('Esse paciente não existe mais.');
        state.patients = state.patients.filter((item) => item.id !== patientId);
        // A exclusão é confirmada na interface e remove também as sessões vinculadas.
        state.sessions = state.sessions.filter(
            (item) => item.patientId !== patientId,
        );
        state.assignments = state.assignments.filter(item => item.patientId !== patientId);
        write(state);
    }

    function addSession(input) {
        const state = read();
        const patient = state.patients.find(
            (item) => item.id === input.patientId,
        );
        if (!patient || patient.status !== 'ativo')
            throw new Error('Selecione um paciente ativo.');
        const session = {
            id: id(),
            patientId: patient.id,
            date: input.date,
            time: input.time,
            duration: Number(input.duration),
            type: input.type,
            status: 'agendada',
        };
        if (
            !isDate(session.date) ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(session.time)
        )
            throw new Error('Informe uma data e um horário válidos.');
        if (sessionDate(session) < new Date())
            throw new Error('Escolha uma data e um horário futuros.');
        if (
            !Number.isInteger(session.duration) ||
            session.duration < 15 ||
            session.duration > 120 ||
            session.duration % 5 !== 0
        )
            throw new Error(
                'A duração deve ser de 15 a 120 minutos, em intervalos de 5.',
            );
        if (!SESSION_TYPES.includes(session.type))
            throw new Error('Selecione um tipo de sessão válido.');
        const start = sessionDate(session).getTime();
        const end = start + session.duration * 60000;
        if (
            state.sessions.some((item) => {
                if (item.status === 'cancelada') return false;
                const otherStart = sessionDate(item).getTime();
                return (
                    start < otherStart + item.duration * 60000 &&
                    end > otherStart
                );
            })
        )
            throw new Error(
                'Já existe uma sessão nesse intervalo. Escolha outro horário.',
            );
        state.sessions.push(session);
        write(state);
        return session;
    }

    function changeSessionStatus(sessionId, status) {
        if (!['cancelada', 'concluida'].includes(status))
            throw new Error('Ação inválida.');
        const state = read();
        const session = state.sessions.find((item) => item.id === sessionId);
        if (!session || session.status !== 'agendada')
            throw new Error('Essa sessão já foi alterada ou removida.');
        session.status = status;
        write(state);
    }

    function initializeExercises(state) {
        let changed = false;
        if (!Object.hasOwn(state, 'exercises')) {
            const examples = [
                ['joelho', 'Mobilidade do joelho', 'Ajuda a melhorar a amplitude de movimento do joelho.'],
                ['lombar', 'Ponte de quadril', 'Auxilia no fortalecimento dos glúteos e na estabilidade lombar.'],
                ['ombro', 'Mobilidade do ombro', 'Ajuda a recuperar a amplitude e o controle dos movimentos do ombro.'],
                ['panturrilha', 'Elevação de calcanhares', 'Auxilia no fortalecimento da panturrilha e na estabilidade do tornozelo.'],
                ['equilibrio', 'Equilíbrio unipodal', 'Trabalha equilíbrio, coordenação e estabilidade dos membros inferiores.'],
                ['coluna', 'Mobilidade da coluna', 'Ajuda a melhorar a mobilidade e a consciência corporal.'],
                ['quadriceps', 'Extensão de joelho', 'Auxilia no fortalecimento do quadríceps e no controle do joelho.'],
                ['alongamento', 'Alongamento posterior', 'Trabalha a flexibilidade da cadeia posterior e o conforto nos movimentos.'],
            ];
            state.exercises = examples.map(([key, name, benefit], index) => ({
                id: `ex-${key}`, name, benefit,
                image: `../assets/images/exercicios/${index % 2 ? 'analise_de_movimento' : 'exercicio1'}.png`,
            }));
            changed = true;
        }
        if (!Object.hasOwn(state, 'assignments')) { state.assignments = []; changed = true; }
        return changed;
    }

    function validExerciseState(state) {
        if (!Array.isArray(state.exercises) || !Array.isArray(state.assignments)) return false;
        const exerciseIds = new Set();
        for (const item of state.exercises) {
            if (!item || typeof item.id !== 'string' || exerciseIds.has(item.id) ||
                !['name', 'benefit', 'image'].every(key => typeof item[key] === 'string') || !validImage(item.image)) return false;
            exerciseIds.add(item.id);
        }
        const patientIds = new Set(state.patients.map(item => item.id));
        const assignedPatients = new Set();
        return state.assignments.every(item => {
            if (!item || !patientIds.has(item.patientId) || assignedPatients.has(item.patientId) || !Array.isArray(item.exerciseIds) ||
                new Set(item.exerciseIds).size !== item.exerciseIds.length || !item.exerciseIds.every(id => exerciseIds.has(id))) return false;
            assignedPatients.add(item.patientId);
            return true;
        });
    }

    function validImage(value) {
        if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) return true;
        try { return ['https:', 'http:'].includes(new URL(value, location.href).protocol); }
        catch { return false; }
    }

    function saveExercise(input) {
        const state = read();
        const exercise = { id: input.id || id(), name: text(input.name, 100), benefit: text(input.benefit, 400), image: String(input.image || '').trim() };
        if (exercise.name.length < 3 || exercise.benefit.length < 3) throw new Error('Preencha o nome e o benefício com pelo menos 3 caracteres.');
        if (!validImage(exercise.image)) throw new Error('Selecione uma imagem ou informe uma URL HTTP ou HTTPS válida.');
        if (exercise.image.length > 1200000) throw new Error('A imagem é muito grande para o armazenamento local. Escolha uma menor.');
        const index = state.exercises.findIndex(item => item.id === exercise.id);
        if (input.id && index < 0) throw new Error('Esse exercício foi removido. Atualize a lista.');
        if (index < 0) state.exercises.push(exercise); else state.exercises[index] = exercise;
        write(state);
        return exercise;
    }

    function deleteExercise(exerciseId) {
        const state = read();
        if (!state.exercises.some(item => item.id === exerciseId)) throw new Error('O exercício não existe mais.');
        state.exercises = state.exercises.filter(item => item.id !== exerciseId);
        for (const assignment of state.assignments) assignment.exerciseIds = assignment.exerciseIds.filter(id => id !== exerciseId);
        write(state);
    }

    function assignExercises(patientId, exerciseIds) {
        const state = read();
        if (!state.patients.some(item => item.id === patientId)) throw new Error('Selecione um paciente válido.');
        if (!Array.isArray(exerciseIds) || !exerciseIds.every(id => state.exercises.some(item => item.id === id))) throw new Error('A lista de exercícios mudou. Confira a seleção.');
        const assignment = { patientId, exerciseIds: [...new Set(exerciseIds)] };
        const index = state.assignments.findIndex(item => item.patientId === patientId);
        if (index < 0) state.assignments.push(assignment); else state.assignments[index] = assignment;
        write(state);
    }

    window.ReabStore = Object.freeze({
        STORAGE_KEY,
        read,
        today,
        isDate,
        sessionDate,
        savePatient,
        deletePatient,
        addSession,
        changeSessionStatus,
        saveExercise,
        deleteExercise,
        assignExercises,
    });
})();
