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

// GUARDAR HISTORIA CLÍNICA CON TODAS LAS VARIABLES EPIDEMIOLÓGICAS
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
        // Bloque 1: Identificación y Sociodemografía
        paciente_dni: document.getElementById('pacienteDni').value,
        paciente_nombre: document.getElementById('pacienteNombre').value,
        paciente_apellido: document.getElementById('pacienteApellido').value,
        sexo: document.getElementById('sexo').value,
        edad: document.getElementById('edad').value ? parseInt(document.getElementById('edad').value) : null,
        municipio_barrio: document.getElementById('municipioBarrio').value,
        nivel_educativo: document.getElementById('nivelEducativo').value,
        situacion_laboral: document.getElementById('situacionLaboral').value,
        vivienda_situacion: document.getElementById('viviendaSituacion').value,

        // Bloque 2: Patrones y Sustancias
        sustancia_principal: document.getElementById('sustanciaPrincipal').value,
        edad_inicio: document.getElementById('edadInicio').value ? parseInt(document.getElementById('edadInicio').value) : null,
        frecuencia_consumo: document.getElementById('frecuenciaConsumo').value,
        policonsumo: document.getElementById('policonsumo').value,

        // Bloque 3: Contexto y Cuidado
        lugar_consumo: document.getElementById('lugarConsumo').value,
        red_acompanamiento: document.getElementById('redAcompanamiento').value,
        motivos_consumo: document.getElementById('motivosConsumo').value,
        practicas_cuidado: document.getElementById('practicasCuidado').value,

        // Bloque 4: Asistencia y Clínica
        consultas_previas: document.getElementById('consultasPrevias').value,
        demanda_guardia: document.getElementById('demandaGuardia').value,
        vinculacion_red: document.getElementById('vinculacionRed').value,
        motivo_consulta: document.getElementById('motivoConsulta').value,
        diagnostico_cie11: document.getElementById('diagnosticoCie11').value,
        observaciones: document.getElementById('observaciones').value
    };

    const { error } = await supabaseClient
        .from('historias_clinicas')
        .insert([payload]);

    if (error) {
        clinicalStatus.textContent = 'Error al guardar: ' + error.message;
        clinicalStatus.className = 'text-sm mt-3 text-center text-red-500 font-semibold';
    } else {
        clinicalStatus.textContent = '¡Historia clínica y ficha epidemiológica guardadas con éxito!';
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
        resultadoDiv.innerHTML = '<p class="text-sm text-amber-600">No se encontraron registros para ese DNI.</p>';
        return;
    }

    let html = `<p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Registros Encontrados (${data.length}):</p>`;
    data.forEach(item => {
        const fecha = new Date(item.created_at).toLocaleString();
        html += `
            <div class="bg-white p-4 rounded-lg border border-gray-200 mb-3 text-sm space-y-2 shadow-sm">
                <div class="flex justify-between text-xs text-gray-500 border-b pb-1">
                    <span><strong>Fecha:</strong> ${fecha}</span>
                    <span><strong>CIE-11:</strong> ${item.diagnostico_cie11 || 'N/A'}</span>
                </div>
                <p class="font-bold text-gray-800 text-base">${item.paciente_nombre} ${item.paciente_apellido} <span class="text-xs text-gray-500">(DNI: ${item.paciente_dni})</span></p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded border">
                    <p><strong>Edad / Sexo:</strong> ${item.edad || 'N/R'} años / ${item.sexo || 'N/R'}</p>
                    <p><strong>Barrio / Mpio:</strong> ${item.municipio_barrio || 'N/R'}</p>
                    <p><strong>Sustancia Principal:</strong> ${item.sustancia_principal || 'N/R'} (Inicio: ${item.edad_inicio || 'N/R'} años)</p>
                    <p><strong>Policonsumo:</strong> ${item.policonsumo || 'No'}</p>
                </div>

                <p><span class="font-semibold text-gray-700">Motivo Consulta:</span> ${item.motivo_consulta}</p>
                <p><span class="font-semibold text-gray-700">Observaciones:</span> ${item.observaciones || 'Sin observaciones'}</p>
            </div>
        `;
    });

    resultadoDiv.innerHTML = html;
});
