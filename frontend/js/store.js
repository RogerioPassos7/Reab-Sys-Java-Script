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
                'O armazenamento local está bloqueado. Permita o armazenamento para utilizar o aplicativo.',
            );
        }
        if (raw === null) {
            const state = seed();
            initializeExercises(state);
            initializeMeasurements(state);
            // A inicialização não emite evento para evitar leituras recursivas.
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch {
                throw new Error(
                    'Não foi possível iniciar o armazenamento do aplicativo.',
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
        let migrated = initializeExercises(state);
        migrated = initializeMeasurements(state) || migrated;
        if (!validExerciseState(state) || !validMeasurementState(state))
            throw new Error(
                'Os dados de exercícios ou evolução estão inválidos. Nada foi sobrescrito.',
            );
        if (migrated) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch {
                throw new Error('Não foi possível atualizar os dados locais.');
            }
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
        ReabAuth.requireRole('therapist');
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
        ReabAuth.requireRole('therapist');
        const state = read();
        if (!state.patients.some((item) => item.id === patientId))
            throw new Error('Esse paciente não existe mais.');
        state.patients = state.patients.filter((item) => item.id !== patientId);
        // A exclusão é confirmada na interface e remove também as sessões vinculadas.
        state.sessions = state.sessions.filter(
            (item) => item.patientId !== patientId,
        );
        state.assignments = state.assignments.filter(
            (item) => item.patientId !== patientId,
        );
        state.measurements = state.measurements.filter(
            (item) => item.patientId !== patientId,
        );
        write(state);
    }

    function addSession(input) {
        ReabAuth.requireRole('therapist');
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
        ReabAuth.requireRole('therapist');
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
        if (state.exerciseCatalogVersion !== 2) {
            const catalog = [
                ['ponte', 'Ponte glútea (bridge)', 'Auxilia no fortalecimento dos glúteos e na estabilidade do quadril e do tronco.', 'ponte.png'],
                ['parede', 'Agachamento na parede (wall sit)', 'Trabalha a resistência dos quadríceps em uma posição sustentada com apoio na parede.', 'parede.jpg'],
                ['perna', 'Elevação de perna estendida', 'Auxilia no fortalecimento dos flexores do quadril e no controle do quadríceps, mantendo o joelho estendido.', 'perna-estendida.jpg'],
                ['isquiotibiais', 'Alongamento de isquiotibiais', 'Trabalha a flexibilidade dos músculos posteriores da coxa.', 'isquiotibiais.jpg'],
                ['prancha', 'Prancha abdominal', 'Trabalha a resistência da musculatura do tronco e o controle da estabilidade corporal.', 'prancha.jpg'],
                ['pendulo', 'Exercício do pêndulo (Codman)', 'Favorece movimentos suaves do ombro com o braço relaxado, conforme orientação profissional.', ''],
            ].map(([key, name, benefit, image]) => ({ id: `ex-${key}`, name, benefit, image: image ? `../assets/exercicios/${image}` : '', builtin: true }));
            const legacyIds = new Set(['ex-joelho', 'ex-lombar', 'ex-ombro', 'ex-panturrilha', 'ex-equilibrio', 'ex-coluna', 'ex-quadriceps', 'ex-alongamento']);
            const linked = new Set([...(state.assignments || []).flatMap(item => item.exerciseIds), ...(state.measurements || []).map(item => item.exerciseId)]);
            const preserved = (state.exercises || []).filter(item => !catalog.some(example => example.id === item.id) && (!legacyIds.has(item.id) || linked.has(item.id))).map(item => ({ ...item, builtin: legacyIds.has(item.id), image: item.image?.includes('/images/exercicios/') ? '' : item.image }));
            state.exercises = [...catalog, ...preserved];
            state.exerciseCatalogVersion = 2;
            changed = true;
        }
        if (!Object.hasOwn(state, 'assignments')) { state.assignments = []; changed = true; }
        return changed;
    }

    function validExerciseState(state) {
        if (
            !Array.isArray(state.exercises) ||
            !Array.isArray(state.assignments)
        )
            return false;
        const exerciseIds = new Set();
        for (const item of state.exercises) {
            if (
                !item ||
                typeof item.id !== 'string' ||
                exerciseIds.has(item.id) ||
                !['name', 'benefit', 'image'].every(
                    (key) => typeof item[key] === 'string',
                ) ||
                !(item.builtin && item.image === '') && !validImage(item.image)
            )
                return false;
            exerciseIds.add(item.id);
        }
        const patientIds = new Set(state.patients.map((item) => item.id));
        const assignedPatients = new Set();
        return state.assignments.every((item) => {
            if (
                !item ||
                !patientIds.has(item.patientId) ||
                assignedPatients.has(item.patientId) ||
                !Array.isArray(item.exerciseIds) ||
                new Set(item.exerciseIds).size !== item.exerciseIds.length ||
                !item.exerciseIds.every((id) => exerciseIds.has(id))
            )
                return false;
            assignedPatients.add(item.patientId);
            return true;
        });
    }

    function validImage(value) {
        if (!value) return false;
        if (
            /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(
                value,
            )
        )
            return true;
        try {
            return ['https:', 'http:'].includes(
                new URL(value, location.href).protocol,
            );
        } catch {
            return false;
        }
    }

    function saveExercise(input) {
        ReabAuth.requireRole('therapist');
        const state = read();
        const exercise = {
            id: input.id || id(),
            name: text(input.name, 100),
            benefit: text(input.benefit, 400),
            image: String(input.image || '').trim(),
            builtin: false,
        };
        if (exercise.name.length < 3 || exercise.benefit.length < 3)
            throw new Error(
                'Preencha o nome e o benefício com pelo menos 3 caracteres.',
            );
        if (!validImage(exercise.image))
            throw new Error(
                'Selecione uma imagem ou informe uma URL HTTP ou HTTPS válida.',
            );
        if (exercise.image.length > 1200000)
            throw new Error(
                'A imagem é muito grande para o armazenamento local. Escolha uma menor.',
            );
        const index = state.exercises.findIndex(
            (item) => item.id === exercise.id,
        );
        if (input.id && index < 0)
            throw new Error('Esse exercício foi removido. Atualize a lista.');
        if (index >= 0 && state.exercises[index].builtin) throw new Error('Somente exercícios criados por você podem ser editados.');
        if (index < 0) state.exercises.push(exercise);
        else state.exercises[index] = exercise;
        write(state);
        return exercise;
    }

    function deleteExercise(exerciseId) {
        ReabAuth.requireRole('therapist');
        const state = read();
        if (state.exercises.find(item => item.id === exerciseId)?.builtin) throw new Error('Somente exercícios criados por você podem ser removidos.');
        if (!state.exercises.some((item) => item.id === exerciseId))
            throw new Error('O exercício não existe mais.');
        state.exercises = state.exercises.filter(
            (item) => item.id !== exerciseId,
        );
        state.measurements = state.measurements.filter(
            (item) => item.exerciseId !== exerciseId,
        );
        for (const assignment of state.assignments)
            assignment.exerciseIds = assignment.exerciseIds.filter(
                (id) => id !== exerciseId,
            );
        write(state);
    }

    function assignExercises(patientId, exerciseIds) {
        ReabAuth.requireRole('therapist');
        const state = read();
        if (!state.patients.some((item) => item.id === patientId))
            throw new Error('Selecione um paciente válido.');
        if (
            !Array.isArray(exerciseIds) ||
            !exerciseIds.every((id) =>
                state.exercises.some((item) => item.id === id),
            )
        )
            throw new Error('A lista de exercícios mudou. Confira a seleção.');
        const assignment = {
            patientId,
            exerciseIds: [...new Set(exerciseIds)],
        };
        const index = state.assignments.findIndex(
            (item) => item.patientId === patientId,
        );
        if (index < 0) state.assignments.push(assignment);
        else state.assignments[index] = assignment;
        write(state);
    }

    function initializeMeasurements(state) {
        if (Object.hasOwn(state, 'measurements')) return false;
        state.measurements = [];
        return true;
    }

    function validMeasurementState(state) {
        if (!Array.isArray(state.measurements)) return false;
        const ids = new Set();
        return state.measurements.every((item) => {
            if (
                !item ||
                typeof item.id !== 'string' ||
                ids.has(item.id) ||
                !state.patients.some(
                    (patient) => patient.id === item.patientId,
                ) ||
                !state.exercises.some(
                    (exercise) => exercise.id === item.exerciseId,
                ) ||
                !isDate(item.date) ||
                !Number.isInteger(item.pain) ||
                item.pain < 0 ||
                item.pain > 10 ||
                !Number.isFinite(item.createdAt)
            )
                return false;
            ids.add(item.id);
            return true;
        });
    }

    function addMeasurement(input) {
        const session = ReabAuth.requireRole('patient');
        if (session.patientId !== input.patientId) throw new Error('O registro deve pertencer ao paciente conectado.');
        const state = read();
        const assigned =
            state.assignments.find((item) => item.patientId === input.patientId)
                ?.exerciseIds || [];
        if (!state.patients.some((item) => item.id === input.patientId))
            throw new Error('Selecione um paciente válido.');
        if (!assigned.includes(input.exerciseId))
            throw new Error(
                'Selecione um exercício atribuído a esse paciente.',
            );
        if (!isDate(input.date) || input.date > today())
            throw new Error('Informe uma data válida, até hoje.');
        const pain = Number(input.pain);
        if (
            input.pain === '' ||
            input.pain == null ||
            !Number.isInteger(pain) ||
            pain < 0 ||
            pain > 10
        )
            throw new Error('Informe um nível de dor inteiro entre 0 e 10.');
        const measurement = {
            id: id(),
            patientId: input.patientId,
            exerciseId: input.exerciseId,
            date: input.date,
            pain,
            createdAt: Date.now(),
            source: 'patient',
            note: text(input.note, 1000),
            attachments: attachmentMetadata(input.attachments),
        };
        state.measurements.push(measurement);
        write(state);
        return measurement;
    }

    function attachmentMetadata(files) {
        if (!Array.isArray(files) || files.length < 1 || files.length > 5) throw new Error('Anexe de 1 a 5 imagens ou vídeos.');
        let total = 0;
        const metadata = files.map(file => {
            const image = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
            const video = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type);
            if (!image && !video) throw new Error('Use imagens JPG, PNG, WebP ou GIF e vídeos MP4, WebM ou MOV.');
            const limit = (image ? 5 : 25) * 1024 * 1024;
            if (!Number.isInteger(file.size) || file.size <= 0 || file.size > limit) throw new Error('Cada imagem deve ter até 5 MB e cada vídeo até 25 MB.');
            total += file.size;
            return { name: text(file.name, 200), type: file.type, size: file.size };
        });
        if (total > 50 * 1024 * 1024) throw new Error('O conjunto de arquivos deve ter até 50 MB.');
        return metadata;
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
        addMeasurement,
    });
})();
