const SUPABASE_URL = 'https://hgibtilxeypuvpraziac.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yZ6dortEAFQ5ZwZUwwPhGg_i-OcYDqD';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginSection = document.getElementById('loginSection');
const clinicalSection = document.getElementById('clinicalSection');
const loginForm = document.getElementById('loginForm');
const clinicalForm = document.getElementById('clinicalForm');
const loginError = document.getElementById('loginError');
const clinicalStatus = document.getElementById('clinicalStatus');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailText = document.getElementById('userEmail');

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
        mostrarPantallaClinica(data.user);
    }
});

function mostrarPantallaClinica(user) {
    loginSection.classList.add('hidden');
    clinicalSection.classList.remove('hidden');
    userEmailText.textContent = `Profesional: ${user.email}`;
}

logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    location.reload();
});

// GUARDAR HISTORIA CLÍNICA COMPLETA
clinicalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clinicalStatus.classList.add('hidden');

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert('Sesión expirada.');
        location.reload();
        return;
    }

    const payload = {
        medico_id: user.id,

        // BLOQUE 1: IDENTIFICACIÓN Y SOCIODEMOGRAFÍA
        paciente_dni: document.getElementById('pacienteDni').value,
        paciente_nombre: document.getElementById('pacienteNombre').value,
        paciente_apellido: document.getElementById('pacienteApellido').value,
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
        clinicalStatus.className = 'text-sm mt-3 text-center text-red-500 font-semibold';
    } else {
        clinicalStatus.textContent = '¡Historia clínica guardada con éxito!';
        clinicalStatus.className = 'text-sm mt-3 text-center text-emerald-600 font-bold';
        clinicalForm.reset();
    }
    clinicalStatus.classList.remove('hidden');
});

// BUSCADOR POR DNI EN SUPABASE
document.getElementById('btnBuscar').addEventListener('click', async () => {
    const dni = document.getElementById('buscarDNI').value.trim();
    const resultadoDiv = document.getElementById('resultadoBusqueda');

    if (!dni) {
        resultadoDiv.innerHTML = '<p class="text-sm text-red-500">Por favor, ingrese un número de DNI.</p>';
        return;
    }

    resultadoDiv.innerHTML = '<p class="text-sm text-gray-500">Buscando en la base de datos...</p>';

    const { data, error } = await supabaseClient
        .from('historias_clinicas')
        .select('*')
        .eq('paciente_dni', dni)
        .order('created_at', { ascending: false });

    if (error) {
        resultadoDiv.innerHTML = `<p class="text-sm text-red-500">Error al buscar: ${error.message}</p>`;
        return;
    }

    if (data.length === 0) {
        resultadoDiv.innerHTML = '<p class="text-sm text-amber-600">No se encontraron historias clínicas para ese DNI.</p>';
        return;
    }

    let html = `<p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Registros Encontrados (${data.length}):</p>`;
    data.forEach(item => {
        const fecha = new Date(item.created_at).toLocaleString();
        html += `
            <div class="bg-white p-4 rounded-lg border border-gray-200 mb-3 text-sm space-y-2 shadow-sm">
                <div class="flex justify-between text-xs text-gray-500 border-b pb-1">
                    <span><strong>Fecha:</strong> ${fecha}</span>
                    <span><strong>Localidad:</strong> ${item.localidad || 'N/R'}</span>
                </div>
                <p class="font-bold text-gray-800 text-base">${item.paciente_nombre} ${item.paciente_apellido} <span class="text-xs text-gray-500">(DNI: ${item.paciente_dni})</span></p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded border">
                    <p><strong>Edad / Sexo:</strong> ${item.edad || 'N/R'} años / ${item.sexo || 'N/R'}</p>
                    <p><strong>Grupo Etario:</strong> ${item.grupo_etario || 'N/R'}</p>
                    <p><strong>Sustancia Consumida:</strong> ${item.sustancia_consumida || 'N/R'} (Inicio: ${item.edad_inicio || 'N/R'} años)</p>
                    <p><strong>Frecuencia:</strong> ${item.frecuencia_uso || 'N/R'}</p>
                </div>

                <p><span class="font-semibold text-gray-700">Motivo Consulta:</span> ${item.motivo_consulta}</p>
                <p><span class="font-semibold text-gray-700">Observaciones:</span> ${item.observaciones || 'Sin observaciones'}</p>
            </div>
        `;
    });

    resultadoDiv.innerHTML = html;
});
