const SUPABASE_URL = 'https://hgibtilxeypuvpraziac.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yZ6dortEAFQ5ZwZUwwPhGg_i-OcYDqD';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Referencias a Secciones Principales
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const formularioSection = document.getElementById('formularioSection');

// Referencias a Formularios y Elementos de UI
const loginForm = document.getElementById('loginForm');
const clinicalForm = document.getElementById('clinicalForm');
const loginError = document.getElementById('loginError');
const clinicalStatus = document.getElementById('clinicalStatus');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailText = document.getElementById('userEmail');

// Botones de Navegación del Dashboard / Formulario
const btnNuevaFicha = document.getElementById('btnNuevaFicha');
const btnVolverDashboard = document.getElementById('btnVolverDashboard');
const btnBuscar = document.getElementById('btnBuscar');

// Elementos de la Tabla / Métricas / Chips
const tablaPacientesBody = document.getElementById('tablaPacientesBody');
const totalFichasActivas = document.getElementById('totalFichasActivas');
const contadorResultados = document.getElementById('contadorResultados');
const cantTratamiento = document.getElementById('cantTratamiento');
const cantSeguimiento = document.getElementById('cantSeguimiento');
const cantEgreso = document.getElementById('cantEgreso');

// --- INICIALIZACIÓN DE SESIÓN ---
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        mostrarDashboard(session.user);
    }
});

// --- INICIO DE SESIÓN ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        loginError.textContent = 'Error: ' + error.message;
        loginError.classList.remove('hidden');
    } else {
        mostrarDashboard(data.user);
    }
});

// --- CERRAR SESIÓN ---
logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    location.reload();
});

// --- NAVEGACIÓN Y VISTAS ---
function mostrarDashboard(user) {
    loginSection.classList.add('hidden');
    formularioSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    userEmailText.textContent = `${user.email}`;
    
    // Cargar pacientes recientes y métricas por estado
    cargarPacientesRecientes();
}

btnNuevaFicha.addEventListener('click', () => {
    dashboardSection.classList.add('hidden');
    formularioSection.classList.remove('hidden');
    clinicalStatus.classList.add('hidden');
    clinicalForm.reset();
});

btnVolverDashboard.addEventListener('click', () => {
    formularioSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    cargarPacientesRecientes();
});

// --- CARGAR HISTORIAS CLÍNICAS RECIENTES Y CONTEO POR ESTADOS ---
async function cargarPacientesRecientes() {
    tablaPacientesBody.innerHTML = `
        <tr>
            <td colSpan="6" class="px-6 py-8 text-center text-xs text-slate-400">
                Cargando registros recientes...
            </td>
        </tr>`;

    // Carga de la lista principal
    const { data, error, count } = await supabaseClient
        .from('historias_clinicas')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        tablaPacientesBody.innerHTML = `
            <tr>
                <td colSpan="6" class="px-6 py-4 text-center text-xs text-red-500">
                    Error al obtener datos: ${error.message}
                </td>
            </tr>`;
        return;
    }

    // Actualizar Métrica General y Contador de Resultados
    totalFichasActivas.textContent = count || data.length;
    contadorResultados.textContent = `${data.length} fichas mostradas`;

    renderTabla(data);

    // Calcular/Actualizar los chips contadores de estado
    cargarContadoresEstado();
}

// --- ACTUALIZAR MÉTRICAS / CHIPS POR ESTADO ---
async function cargarContadoresEstado() {
    const { data, error } = await supabaseClient
        .from('historias_clinicas')
        .select('estado_paciente');

    if (error || !data) {
        cantTratamiento.textContent = '0';
        cantSeguimiento.textContent = '0';
        cantEgreso.textContent = '0';
        return;
    }

    let enTratamiento = 0;
    let enSeguimiento = 0;
    let egreso = 0;

    data.forEach(item => {
        if (item.estado_paciente === 'en_seguimiento') {
            enSeguimiento++;
        } else if (item.estado_paciente === 'egreso') {
            egreso++;
        } else {
            // Valor por defecto / 'en_tratamiento'
            enTratamiento++;
        }
    });

    cantTratamiento.textContent = enTratamiento;
    cantSeguimiento.textContent = enSeguimiento;
    cantEgreso.textContent = egreso;
}

// --- BUSCADOR POR DNI O NOMBRE ---
btnBuscar.addEventListener('click', async () => {
    const query = document.getElementById('buscarDNI').value.trim();

    if (!query) {
        cargarPacientesRecientes();
        return;
    }

    tablaPacientesBody.innerHTML = `
        <tr>
            <td colSpan="6" class="px-6 py-8 text-center text-xs text-slate-400">
                Buscando registros...
            </td>
        </tr>`;

    // Consulta que busca coincidencia exacta en DNI o parcial en Nombre/Apellido
    const { data, error } = await supabaseClient
        .from('historias_clinicas')
        .select('*')
        .or(`paciente_dni.ilike.%${query}%,paciente_nombre.ilike.%${query}%,paciente_apellido.ilike.%${query}%`)
        .order('created_at', { ascending: false });

    if (error) {
        tablaPacientesBody.innerHTML = `
            <tr>
                <td colSpan="6" class="px-6 py-4 text-center text-xs text-red-500">
                    Error al buscar: ${error.message}
                </td>
            </tr>`;
        return;
    }

    contadorResultados.textContent = `${data.length} resultados`;
    renderTabla(data);
});

// --- RENDERIZAR TABLA ---
function renderTabla(registros) {
    if (registros.length === 0) {
        tablaPacientesBody.innerHTML = `
            <tr>
                <td colSpan="6" class="px-6 py-8 text-center text-xs text-amber-600">
                    No se encontraron fichas clínicas asociadas.
                </td>
            </tr>`;
        return;
    }

    let html = '';
    registros.forEach(item => {
        const fecha = new Date(item.created_at).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Formato visual Badge según el estado del paciente
        let estadoBadge = '<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>En tratamiento</span>';
        
        if (item.estado_paciente === 'en_seguimiento') {
            estadoBadge = '<span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 border border-slate-300"><span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span>En seguimiento</span>';
        } else if (item.estado_paciente === 'egreso') {
            estadoBadge = '<span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200"><span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>Egreso</span>';
        }

        html += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="px-6 py-4 font-mono font-bold text-slate-900">${item.paciente_dni || 'N/R'}</td>
                <td class="px-6 py-4 font-semibold text-slate-800">${item.paciente_nombre || ''} ${item.paciente_apellido || ''}</td>
                <td class="px-6 py-4">${estadoBadge}</td>
                <td class="px-6 py-4 text-slate-600">${item.localidad || 'N/R'}</td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 border border-sky-200">
                        ${item.sustancia_consumida || 'Sin especificar'}
                    </span>
                </td>
                <td class="px-6 py-4 font-mono text-xs text-slate-500">${fecha}</td>
            </tr>
        `;
    });

    tablaPacientesBody.innerHTML = html;
}

// --- GUARDAR HISTORIA CLÍNICA COMPLETA ---
clinicalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clinicalStatus.classList.add('hidden');

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert('Sesión expirada. Por favor inicie sesión nuevamente.');
        location.reload();
        return;
    }

    const payload = {
        medico_id: user.id,

        // BLOQUE 1: IDENTIFICACIÓN Y SOCIODEMOGRAFÍA
        paciente_dni: document.getElementById('pacienteDni').value,
        paciente_nombre: document.getElementById('pacienteNombre').value,
        paciente_apellido: document.getElementById('pacienteApellido').value,
        estado_paciente: document.getElementById('estadoPaciente').value,
        sexo: document.getElementById('sexo').value,
        fecha_nacimiento: document.getElementById('fechaNacimiento').value || null,
        edad: document.getElementById('edad').value ? parseInt(document.getElementById('edad').value) : null,
        grupo_etario: document.getElementById('grupoEtario').value,
        localidad: document.getElementById('localidad').value,
        barrio_residencia: document.getElementById('barrioResidencia').value,
        nivel_educativo: document.getElementById('nivelEducativo').value,
        situacion_laboral: document.getElementById('situacionLaboral').value,
        tipo_vivienda: document.getElementById('tipoVivienda').value,
        situacion_habitacional: document.getElementById('situacionHabitacional').value,
        habitaciones_dormir: document.getElementById('habitacionesDormir').value ? parseInt(document.getElementById('habitacionesDormir').value) : null,
        personas_vivienda: document.getElementById('personasVivienda').value ? parseInt(document.getElementById('personasVivienda').value) : null,
        servicio_agua: document.getElementById('servicioAgua').value,
        eliminacion_excretas: document.getElementById('eliminacionExcretas').value,

        // BLOQUE 2: PATRONES DE CONSUMO
        sustancia_consumida: document.getElementById('sustanciaConsumida').value,
        edad_inicio: document.getElementById('edadInicio').value ? parseInt(document.getElementById('edadInicio').value) : null,
        frecuencia_uso: document.getElementById('frecuenciaUso').value,
        policonsumo: document.getElementById('policonsumo').value,

        // BLOQUE 3: CONTEXTO Y CUIDADO
        lugar_consumo: document.getElementById('lugarConsumo').value,
        red_acompanamiento: document.getElementById('redAcompanamiento').value,
        motivos: document.getElementById('motivos').value,
        pautas_autocuidado: document.getElementById('pautasAutocuidado').value,

        // BLOQUE 4: ASISTENCIA Y OBSERVACIONES
        consultas_previas: document.getElementById('consultasPrevias').value,
        atencion_guardia: document.getElementById('atencionGuardia').value,
        atencion_salud_mental: document.getElementById('atencionSaludMental').value,
        internaciones: document.getElementById('internaciones').value,
        vinculacion_red: document.getElementById('vinculacionRed').value,
        motivo_consulta: document.getElementById('motivoConsulta').value,
        observaciones: document.getElementById('observaciones').value
    };

    const { error } = await supabaseClient
        .from('historias_clinicas')
        .insert([payload]);

    if (error) {
        clinicalStatus.textContent = 'Error al guardar: ' + error.message;
        clinicalStatus.className = 'text-sm mt-3 text-center text-red-500 font-semibold block';
    } else {
        clinicalStatus.textContent = '¡Historia clínica guardada con éxito!';
        clinicalStatus.className = 'text-sm mt-3 text-center text-emerald-600 font-bold block';
        clinicalForm.reset();

        // Redirigir al panel tras 1.5 segundos
        setTimeout(() => {
            formularioSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            cargarPacientesRecientes();
        }, 1500);
    }
});
