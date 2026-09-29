const SUPABASE_URL = 'https://hgibtilxeypuvpraziac.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yZ6dortEAFQ5ZwZUwwPhGg_i-OcYDqD';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variable para almacenar el paciente que está actualmente en vista en la ficha
let pacienteActual = null;

// Referencias a Secciones Principales
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const formularioSection = document.getElementById('formularioSection');
const detalleFichaPaciente = document.getElementById('detalleFichaPaciente');

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

// Elementos de la Tabla / Métricas / Chips Generales
const tablaPacientesBody = document.getElementById('tablaPacientesBody');
const totalFichasActivas = document.getElementById('totalFichasActivas');
const contadorResultados = document.getElementById('contadorResultados');
const cantTratamiento = document.getElementById('cantTratamiento');
const cantSeguimiento = document.getElementById('cantSeguimiento');
const cantEgreso = document.getElementById('cantEgreso');

// Elementos de la Ficha Clínica Individual
const fichaDniHeader = document.getElementById('fichaDniHeader');
const fichaNombreHeader = document.getElementById('fichaNombreHeader');
const fichaEstadoBadge = document.getElementById('fichaEstadoBadge');
const cantIngresosFicha = document.getElementById('cantIngresosFicha');
const cantEvolucionesFicha = document.getElementById('cantEvolucionesFicha');
const cantDiasFicha = document.getElementById('cantDiasFicha');
const timelineContenedor = document.getElementById('timelineContenedor');

// Elementos de Formulario de Nueva Entrada / Acciones en Ficha
const btnNuevaEntrada = document.getElementById('btnNuevaEntrada');
const formNuevaEntrada = document.getElementById('formNuevaEntrada');
const btnCancelarEntrada = document.getElementById('btnCancelarEntrada');
const btnGuardarEntrada = document.getElementById('btnGuardarEntrada');
const tipoEntrada = document.getElementById('tipoEntrada');
const motivoEntrada = document.getElementById('motivoEntrada');
const dispositivoEntrada = document.getElementById('dispositivoEntrada');
const profesionalEntrada = document.getElementById('profesionalEntrada');
const cambioEstadoRapido = document.getElementById('cambioEstadoRapido');
const btnExportarExcel = document.getElementById('btnExportarExcel');


// --- INICIALIZACIÓN DE SESIÓN ---
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        mostrarDashboard(session.user);
    }
    
    // Inyectar/Asegurar botón de Editar Ficha al lado de + NUEVA ENTRADA si no existe en el HTML
    asegurarBotonEditarFicha();
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
    
    limpiarVistaInicial();
    cargarMetricasGlobales(); // Cargar siempre el conteo global total al entrar al dashboard
}

btnNuevaFicha.addEventListener('click', () => {
    pacienteActual = null; // Modo Creación Nueva Ficha
    dashboardSection.classList.add('hidden');
    formularioSection.classList.remove('hidden');
    clinicalStatus.classList.add('hidden');
    clinicalForm.reset();
});

btnVolverDashboard.addEventListener('click', () => {
    formularioSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    limpiarVistaInicial();
    cargarMetricasGlobales();
});

// --- VISTA INICIAL VACÍA ---
function limpiarVistaInicial() {
    tablaPacientesBody.innerHTML = `
        <tr>
            <td colSpan="5" class="px-6 py-8 text-center text-xs text-slate-400">
                Ingrese un DNI o Nombre en el buscador y presione "Buscar" para ver resultados.
            </td>
        </tr>`;
    contadorResultados.textContent = '0 fichas mostradas';
    detalleFichaPaciente.classList.add('hidden');
}

// --- CARGAR MÉTRICAS GLOBALES REALES DESDE SUPABASE ---
async function cargarMetricasGlobales() {
    const { data, error } = await supabaseClient.from('historias_clinicas').select('paciente_dni, estado_paciente');

    if (error || !data) {
        console.error('Error al obtener métricas globales:', error);
        return;
    }

    // Filtrar para considerar DNI únicos
    const dnisVistos = new Set();
    const pacientesUnicos = data.filter(item => {
        if (!item.paciente_dni) return true;
        if (dnisVistos.has(item.paciente_dni)) return false;
        dnisVistos.add(item.paciente_dni);
        return true;
    });

    totalFichasActivas.textContent = pacientesUnicos.length;

    let enTratamiento = 0;
    let enSeguimiento = 0;
    let egreso = 0;

    pacientesUnicos.forEach(item => {
        if (item.estado_paciente === 'en_seguimiento') {
            enSeguimiento++;
        } else if (item.estado_paciente === 'egreso') {
            egreso++;
        } else {
            enTratamiento++;
        }
    });

    cantTratamiento.textContent = enTratamiento;
    cantSeguimiento.textContent = enSeguimiento;
    cantEgreso.textContent = egreso;
}

// --- BUSCADOR POR DNI EXACTO O NOMBRE (SOLO AL PRESIONAR BUSCAR) ---
btnBuscar.addEventListener('click', async () => {
    const query = document.getElementById('buscarDNI').value.trim();

    if (!query) {
        limpiarVistaInicial();
        cargarMetricasGlobales();
        return;
    }

    tablaPacientesBody.innerHTML = `
        <tr>
            <td colSpan="5" class="px-6 py-8 text-center text-xs text-slate-400">
                Buscando registros...
            </td>
        </tr>`;

    let consulta = supabaseClient.from('historias_clinicas').select('*');

    if (!isNaN(query)) {
        consulta = consulta.eq('paciente_dni', query);
    } else {
        consulta = consulta.or(`paciente_nombre.ilike.%${query}%,paciente_apellido.ilike.%${query}%`);
    }

    const { data, error } = await consulta.order('created_at', { ascending: false });

    if (error) {
        tablaPacientesBody.innerHTML = `
            <tr>
                <td colSpan="5" class="px-6 py-4 text-center text-xs text-red-500">
                    Error al buscar: ${error.message}
                </td>
            </tr>`;
        return;
    }

    const dnisVistos = new Set();
    const pacientesUnicos = data.filter(paciente => {
        if (!paciente.paciente_dni) return true;
        if (dnisVistos.has(paciente.paciente_dni)) {
            return false;
        }
        dnisVistos.add(paciente.paciente_dni);
        return true;
    });

    contadorResultados.textContent = `${pacientesUnicos.length} resultados`;
    renderTabla(pacientesUnicos);
});


// --- RENDERIZAR TABLA CON "Ver Historial" ---
function renderTabla(registros) {
    if (registros.length === 0) {
        tablaPacientesBody.innerHTML = `
            <tr>
                <td colSpan="5" class="px-6 py-8 text-center text-xs text-amber-600">
                    No se encontraron fichas clínicas asociadas a la búsqueda.
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
                <td class="px-6 py-4 font-mono text-xs text-slate-500">${fecha}</td>
                <td class="px-6 py-4">${estadoBadge}</td>
                <td class="px-6 py-4 text-right">
                    <button onclick="verFichaPaciente('${item.id}')" class="text-xs bg-sky-50 text-sky-700 font-bold px-3 py-1.5 rounded-lg border border-sky-200 hover:bg-sky-100 transition">
                        Ver Historial
                    </button>
                </td>
            </tr>
        `;
    });

    tablaPacientesBody.innerHTML = html;
}


// --- MOSTRAR HISTORIAL DEL PACIENTE ---
async function verFichaPaciente(id) {
    const { data, error } = await supabaseClient
        .from('historias_clinicas')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        alert('No se pudo cargar la ficha del paciente.');
        return;
    }

    pacienteActual = data;

    fichaDniHeader.textContent = `FICHA - DNI ${data.paciente_dni || 'N/R'}`;
    fichaNombreHeader.textContent = `${data.paciente_nombre || ''} ${data.paciente_apellido || ''}`;
    
    if (data.estado_paciente === 'en_seguimiento') {
        fichaEstadoBadge.innerHTML = '<span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-300"><span class="h-2 w-2 rounded-full bg-slate-400"></span>En seguimiento</span>';
    } else if (data.estado_paciente === 'egreso') {
        fichaEstadoBadge.innerHTML = '<span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200"><span class="h-2 w-2 rounded-full bg-amber-500"></span>Egreso</span>';
    } else {
        fichaEstadoBadge.innerHTML = '<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200"><span class="h-2 w-2 rounded-full bg-emerald-500"></span>En tratamiento</span>';
    }

    cambioEstadoRapido.value = data.estado_paciente || 'en_tratamiento';

    const fechaInicio = new Date(data.created_at);
    const hoy = new Date();
    const diferenciaDias = Math.floor((hoy - fechaInicio) / (1000 * 60 * 60 * 24));
    cantDiasFicha.textContent = diferenciaDias >= 0 ? diferenciaDias : 0;

    cargarEvolucionesTimeline(data);

    detalleFichaPaciente.classList.remove('hidden');
    detalleFichaPaciente.scrollIntoView({ behavior: 'smooth' });
}


// --- CREACIÓN DINÁMICA DEL BOTÓN "VER / EDITAR FICHA" JUNTO A "+ NUEVA ENTRADA" ---
function asegurarBotonEditarFicha() {
    if (!btnNuevaEntrada) return;
    
    let btnVerFicha = document.getElementById('btnVerFichaCompleta');
    if (!btnVerFicha) {
        btnVerFicha = document.createElement('button');
        btnVerFicha.id = 'btnVerFichaCompleta';
        btnVerFicha.className = 'text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition mr-2';
        btnVerFicha.textContent = 'Ver / Editar Ficha';
        
        btnNuevaEntrada.parentNode.insertBefore(btnVerFicha, btnNuevaEntrada);

        btnVerFicha.addEventListener('click', cargarFichaParaEditar);
    }
}


// --- ABRIR Y PRECARGAR FORMULARIO COMPLETO DEL PACIENTE ---
function cargarFichaParaEditar() {
    if (!pacienteActual) {
        alert('No hay un paciente seleccionado.');
        return;
    }

    dashboardSection.classList.add('hidden');
    formularioSection.classList.remove('hidden');
    clinicalStatus.classList.add('hidden');

    // Cargar todos los valores existentes en los campos del formulario
    document.getElementById('pacienteDni').value = pacienteActual.paciente_dni || '';
    document.getElementById('pacienteNombre').value = pacienteActual.paciente_nombre || '';
    document.getElementById('pacienteApellido').value = pacienteActual.paciente_apellido || '';
    document.getElementById('estadoPaciente').value = pacienteActual.estado_paciente || 'en_tratamiento';
    document.getElementById('sexo').value = pacienteActual.sexo || '';
    document.getElementById('fechaNacimiento').value = pacienteActual.fecha_nacimiento || '';
    document.getElementById('edad').value = pacienteActual.edad || '';
    document.getElementById('grupoEtario').value = pacienteActual.grupo_etario || '';
    document.getElementById('localidad').value = pacienteActual.localidad || '';
    document.getElementById('barrioResidencia').value = pacienteActual.barrio_residencia || '';
    document.getElementById('nivelEducativo').value = pacienteActual.nivel_educativo || '';
    document.getElementById('situacionLaboral').value = pacienteActual.situacion_laboral || '';
    document.getElementById('tipoVivienda').value = pacienteActual.tipo_vivienda || '';
    document.getElementById('situacionHabitacional').value = pacienteActual.situacion_habitacional || '';
    document.getElementById('habitacionesDormir').value = pacienteActual.habitaciones_dormir || '';
    document.getElementById('personasVivienda').value = pacienteActual.personas_vivienda || '';
    document.getElementById('servicioAgua').value = pacienteActual.servicio_agua || '';
    document.getElementById('eliminacionExcretas').value = pacienteActual.eliminacion_excretas || '';

    document.getElementById('sustanciaConsumida').value = pacienteActual.sustancia_consumida || '';
    document.getElementById('edadInicio').value = pacienteActual.edad_inicio || '';
    document.getElementById('frecuenciaUso').value = pacienteActual.frecuencia_uso || '';
    document.getElementById('policonsumo').value = pacienteActual.policonsumo || '';

    document.getElementById('lugarConsumo').value = pacienteActual.lugar_consumo || '';
    document.getElementById('redAcompanamiento').value = pacienteActual.red_acompanamiento || '';
    document.getElementById('motivos').value = pacienteActual.motivos || '';
    document.getElementById('pautasAutocuidado').value = pacienteActual.pautas_autocuidado || '';

    document.getElementById('consultasPrevias').value = pacienteActual.consultas_previas || '';
    document.getElementById('atencionGuardia').value = pacienteActual.atencion_guardia || '';
    document.getElementById('atencionSaludMental').value = pacienteActual.atencion_salud_mental || '';
    document.getElementById('internaciones').value = pacienteActual.internaciones || '';
    document.getElementById('vinculacionRed').value = pacienteActual.vinculacion_red || '';
    document.getElementById('motivoConsulta').value = pacienteActual.motivo_consulta || '';
    document.getElementById('observaciones').value = pacienteActual.observaciones || '';
}


// --- TIMELINE Y ENTRADAS DEL PACIENTE ---
function cargarEvolucionesTimeline(paciente) {
    let entradas = paciente.evoluciones_json;

    if (!entradas || !Array.isArray(entradas) || entradas.length === 0) {
        entradas = [{
            tipo: 'Ingreso',
            fecha: paciente.created_at,
            motivo: paciente.motivo_consulta || 'Ingreso inicial registrado en el sistema.',
            dispositivo: 'N/I',
            profesional: 'N/I'
        }];
    }

    let totalIngresos = 0;
    let totalEvoluciones = 0;
    let timelineHTML = '';

    entradas.forEach(item => {
        if (item.tipo === 'Ingreso') totalIngresos++;
        if (item.tipo === 'Evolución') totalEvoluciones++;

        const fechaFormateada = new Date(item.fecha).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const dispositivoTxt = item.dispositivo ? ` | <span class="font-semibold text-slate-600">Disp:</span> ${item.dispositivo}` : '';
        const profesionalTxt = item.profesional ? ` | <span class="font-semibold text-slate-600">Prof:</span> ${item.profesional}` : '';

        timelineHTML += `
            <div class="relative pl-2">
                <span class="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-sky-500 ring-4 ring-white"></span>
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-bold text-xs uppercase tracking-wider text-sky-800">${item.tipo || 'Entrada'}</span>
                    <span class="font-mono text-xs text-slate-400">• ${fechaFormateada}</span>
                    <span class="text-xs text-slate-500 font-mono">${dispositivoTxt}${profesionalTxt}</span>
                </div>
                <p class="text-sm text-slate-700 mt-1 font-medium">${item.motivo || 'Sin detalles'}</p>
            </div>
        `;
    });

    cantIngresosFicha.textContent = totalIngresos;
    cantEvolucionesFicha.textContent = totalEvoluciones;
    timelineContenedor.innerHTML = timelineHTML;
}


// --- AGREGAR NUEVA ENTRADA A LA FICHA (HISTORIAL) ---
btnNuevaEntrada.addEventListener('click', () => {
    formNuevaEntrada.classList.remove('hidden');
});

btnCancelarEntrada.addEventListener('click', () => {
    formNuevaEntrada.classList.add('hidden');
    motivoEntrada.value = '';
    dispositivoEntrada.value = '';
    profesionalEntrada.value = '';
});

btnGuardarEntrada.addEventListener('click', async () => {
    const motivo = motivoEntrada.value.trim();
    if (!motivo) {
        alert('Por favor complete la descripción de la entrada.');
        return;
    }

    if (!pacienteActual) return;

    let evolucionesPrevias = pacienteActual.evoluciones_json || [{
        tipo: 'Ingreso',
        fecha: pacienteActual.created_at,
        motivo: pacienteActual.motivo_consulta || 'Ingreso inicial registrado.',
        dispositivo: 'N/I',
        profesional: 'N/I'
    }];

    const nuevaEntradaObj = {
        tipo: tipoEntrada.value,
        fecha: new Date().toISOString(),
        motivo: motivo,
        dispositivo: dispositivoEntrada.value.trim() || 'No especificado',
        profesional: profesionalEntrada.value.trim() || 'No especificado'
    };

    evolucionesPrevias.push(nuevaEntradaObj);

    const { error } = await supabaseClient
        .from('historias_clinicas')
        .update({ evoluciones_json: evolucionesPrevias })
        .eq('id', pacienteActual.id);

    if (error) {
        alert('Error al guardar entrada: ' + error.message);
    } else {
        pacienteActual.evoluciones_json = evolucionesPrevias;
        cargarEvolucionesTimeline(pacienteActual);
        motivoEntrada.value = '';
        dispositivoEntrada.value = '';
        profesionalEntrada.value = '';
        formNuevaEntrada.classList.add('hidden');
    }
});


// --- CAMBIAR ESTADO RÁPIDO DESDE LA FICHA ---
cambioEstadoRapido.addEventListener('change', async (e) => {
    if (!pacienteActual) return;

    const nuevoEstado = e.target.value;

    const { error } = await supabaseClient
        .from('historias_clinicas')
        .update({ estado_paciente: nuevoEstado })
        .eq('id', pacienteActual.id);

    if (error) {
        alert('Error al actualizar el estado: ' + error.message);
    } else {
        pacienteActual.estado_paciente = nuevoEstado;
        verFichaPaciente(pacienteActual.id);
        cargarMetricasGlobales(); // Actualizar el conteo global
    }
});


// --- EXPORTAR FICHA INDIVIDUAL A EXCEL ---
btnExportarExcel.addEventListener('click', () => {
    if (!pacienteActual) {
        alert('No hay ninguna ficha activa para exportar.');
        return;
    }

    const datosExcel = [
        { "Campo": "DNI", "Valor": pacienteActual.paciente_dni || '' },
        { "Campo": "Nombre", "Valor": pacienteActual.paciente_nombre || '' },
        { "Campo": "Apellido", "Valor": pacienteActual.paciente_apellido || '' },
        { "Campo": "Estado", "Valor": pacienteActual.estado_paciente || '' },
        { "Campo": "Sexo", "Valor": pacienteActual.sexo || '' },
        { "Campo": "Edad", "Valor": pacienteActual.edad || '' },
        { "Campo": "Grupo Etario", "Valor": pacienteActual.grupo_etario || '' },
        { "Campo": "Localidad", "Valor": pacienteActual.localidad || '' },
        { "Campo": "Barrio", "Valor": pacienteActual.barrio_residencia || '' },
        { "Campo": "Nivel Educativo", "Valor": pacienteActual.nivel_educativo || '' },
        { "Campo": "Situación Laboral", "Valor": pacienteActual.situacion_laboral || '' },
        { "Campo": "Sustancia Consumida", "Valor": pacienteActual.sustancia_consumida || '' },
        { "Campo": "Motivo de Consulta", "Valor": pacienteActual.motivo_consulta || '' },
        { "Campo": "Observaciones", "Valor": pacienteActual.observaciones || '' },
        { "Campo": "Fecha de Registro", "Valor": new Date(pacienteActual.created_at).toLocaleString('es-AR') }
    ];

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ficha Clínica");

    XLSX.writeFile(workbook, `Ficha_${pacienteActual.paciente_dni || 'Paciente'}.xlsx`);
});


// --- GUARDAR O ACTUALIZAR HISTORIA CLÍNICA COMPLETA ---
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

        paciente_dni: document.getElementById('pacienteDni').value || null,
        paciente_nombre: document.getElementById('pacienteNombre').value || null,
        paciente_apellido: document.getElementById('pacienteApellido').value || null,
        estado_paciente: document.getElementById('estadoPaciente').value || 'en_tratamiento',
        sexo: document.getElementById('sexo').value || null,
        fecha_nacimiento: document.getElementById('fechaNacimiento').value || null,
        edad: document.getElementById('edad').value ? parseInt(document.getElementById('edad').value) : null,
        grupo_etario: document.getElementById('grupoEtario').value || null,
        localidad: document.getElementById('localidad').value || null,
        barrio_residencia: document.getElementById('barrioResidencia').value || null,
        nivel_educativo: document.getElementById('nivelEducativo').value || null,
        situacion_laboral: document.getElementById('situacionLaboral').value || null,
        tipo_vivienda: document.getElementById('tipoVivienda').value || null,
        situacion_habitacional: document.getElementById('situacionHabitacional').value || null,
        habitaciones_dormir: document.getElementById('habitacionesDormir').value ? parseInt(document.getElementById('habitacionesDormir').value) : null,
        personas_vivienda: document.getElementById('personasVivienda').value ? parseInt(document.getElementById('personasVivienda').value) : null,
        servicio_agua: document.getElementById('servicioAgua').value || null,
        eliminacion_excretas: document.getElementById('eliminacionExcretas').value || null,

        sustancia_consumida: document.getElementById('sustanciaConsumida').value || null,
        edad_inicio: document.getElementById('edadInicio').value ? parseInt(document.getElementById('edadInicio').value) : null,
        frecuencia_uso: document.getElementById('frecuenciaUso').value || null,
        policonsumo: document.getElementById('policonsumo').value || null,

        lugar_consumo: document.getElementById('lugarConsumo').value || null,
        red_acompanamiento: document.getElementById('redAcompanamiento').value || null,
        motivos: document.getElementById('motivos').value || null,
        pautas_autocuidado: document.getElementById('pautasAutocuidado').value || null,

        consultas_previas: document.getElementById('consultasPrevias').value || null,
        atencion_guardia: document.getElementById('atencionGuardia').value || null,
        atencion_salud_mental: document.getElementById('atencionSaludMental').value || null,
        internaciones: document.getElementById('internaciones').value || null,
        vinculacion_red: document.getElementById('vinculacionRed').value || null,
        motivo_consulta: document.getElementById('motivoConsulta').value || null,
        observaciones: document.getElementById('observaciones').value || null
    };

    let respuesta;

    // Si pacienteActual existe, se actualiza el registro; de lo contrario, se crea uno nuevo
    if (pacienteActual && pacienteActual.id) {
        respuesta = await supabaseClient
            .from('historias_clinicas')
            .update(payload)
            .eq('id', pacienteActual.id);
    } else {
        respuesta = await supabaseClient
            .from('historias_clinicas')
            .insert([payload]);
    }

    if (respuesta.error) {
        clinicalStatus.textContent = 'Error al guardar: ' + respuesta.error.message;
        clinicalStatus.className = 'text-sm mt-3 text-center text-red-500 font-semibold block';
    } else {
        clinicalStatus.textContent = pacienteActual ? '¡Ficha actualizada con éxito!' : '¡Historia clínica guardada con éxito!';
        clinicalStatus.className = 'text-sm mt-3 text-center text-emerald-600 font-bold block';
        clinicalForm.reset();

        setTimeout(() => {
            formularioSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            limpiarVistaInicial();
            cargarMetricasGlobales(); // Refrescar métricas globales tras guardar
        }, 1500);
    }
});
