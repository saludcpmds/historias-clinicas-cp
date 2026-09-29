const SUPABASE_URL = 'https://hgibtilxeypuvpraziac.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yZ6dortEAFQ5ZwZUwwPhGg_i-OcYDqD';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variable global para almacenar la ficha activa
let pacienteActual = null;

// --- INICIALIZACIÓN PRINCIPAL Y EVENTOS ---
window.addEventListener('DOMContentLoaded', async () => {
    // 1. Vincular eventos de forma segura una vez que el DOM esté disponible
    inicializarEventos();

    // 2. Verificar la sesión activa en Supabase
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            mostrarDashboard(session.user);
        } else {
            mostrarLogin();
        }
    } catch (err) {
        console.error("Error al obtener la sesión de usuario:", err);
        mostrarLogin();
    }

    // 3. Crear el botón extra "Ver / Editar Ficha" si corresponde
    asegurarBotonEditarFicha();
});

// --- VINCULACIÓN SEGURA DE EVENTOS DE INTERFAZ ---
function inicializarEventos() {
    // Iniciar Sesión
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const loginError = document.getElementById('loginError');
            if (loginError) loginError.classList.add('hidden');

            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

            if (error) {
                if (loginError) {
                    loginError.textContent = 'Error: ' + error.message;
                    loginError.classList.remove('hidden');
                }
            } else if (data?.user) {
                mostrarDashboard(data.user);
            }
        });
    }

    // Cerrar Sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await supabaseClient.auth.signOut();
            } catch (err) {
                console.error("Error al cerrar sesión:", err);
            } finally {
                mostrarLogin();
                location.reload();
            }
        });
    }

    // Botón "+ Nueva Ficha"
    const btnNuevaFicha = document.getElementById('btnNuevaFicha');
    if (btnNuevaFicha) {
        btnNuevaFicha.addEventListener('click', () => {
            pacienteActual = null;
            const dashboardSection = document.getElementById('dashboardSection');
            const formularioSection = document.getElementById('formularioSection');
            const clinicalForm = document.getElementById('clinicalForm');
            const clinicalStatus = document.getElementById('clinicalStatus');

            if (dashboardSection) dashboardSection.classList.add('hidden');
            if (formularioSection) formularioSection.classList.remove('hidden');
            if (clinicalStatus) clinicalStatus.classList.add('hidden');
            if (clinicalForm) clinicalForm.reset();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Volver al Dashboard
    const btnVolverDashboard = document.getElementById('btnVolverDashboard');
    if (btnVolverDashboard) {
        btnVolverDashboard.addEventListener('click', () => {
            const dashboardSection = document.getElementById('dashboardSection');
            const formularioSection = document.getElementById('formularioSection');

            if (formularioSection) formularioSection.classList.add('hidden');
            if (dashboardSection) dashboardSection.classList.remove('hidden');
            limpiarVistaInicial();
            cargarMetricasGlobales();
        });
    }

    // Buscar Paciente por DNI / Nombre
    const btnBuscar = document.getElementById('btnBuscar');
    if (btnBuscar) {
        btnBuscar.addEventListener('click', ejecutarBusqueda);
    }

    // Desplegar Nueva Entrada en Timeline
    const btnNuevaEntrada = document.getElementById('btnNuevaEntrada');
    if (btnNuevaEntrada) {
        btnNuevaEntrada.addEventListener('click', async () => {
            const formNuevaEntrada = document.getElementById('formNuevaEntrada');
            const profesionalEntrada = document.getElementById('profesionalEntrada');
            if (formNuevaEntrada) formNuevaEntrada.classList.remove('hidden');

            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user && profesionalEntrada) {
                profesionalEntrada.value = obtenerNombreProfesional(user);
            }
        });
    }

    // Cancelar Entrada
    const btnCancelarEntrada = document.getElementById('btnCancelarEntrada');
    if (btnCancelarEntrada) {
        btnCancelarEntrada.addEventListener('click', () => {
            const formNuevaEntrada = document.getElementById('formNuevaEntrada');
            const motivoEntrada = document.getElementById('motivoEntrada');
            const dispositivoEntrada = document.getElementById('dispositivoEntrada');
            const profesionalEntrada = document.getElementById('profesionalEntrada');

            if (formNuevaEntrada) formNuevaEntrada.classList.add('hidden');
            if (motivoEntrada) motivoEntrada.value = '';
            if (dispositivoEntrada) dispositivoEntrada.value = '';
            if (profesionalEntrada) profesionalEntrada.value = '';
        });
    }

    // Guardar Entrada
    const btnGuardarEntrada = document.getElementById('btnGuardarEntrada');
    if (btnGuardarEntrada) {
        btnGuardarEntrada.addEventListener('click', guardarNuevaEntrada);
    }

    // Cambio de Estado Rápido
    const cambioEstadoRapido = document.getElementById('cambioEstadoRapido');
    if (cambioEstadoRapido) {
        cambioEstadoRapido.addEventListener('change', actualizarEstadoRapido);
    }

    // Exportar Ficha a Excel
    const btnExportarExcel = document.getElementById('btnExportarExcel');
    if (btnExportarExcel) {
        btnExportarExcel.addEventListener('click', exportarFichaExcel);
    }

    // Guardar Formulario Clínico
    const clinicalForm = document.getElementById('clinicalForm');
    if (clinicalForm) {
        clinicalForm.addEventListener('submit', guardarHistoriaClinica);
    }
}

// --- VISIBILIDAD DE VISTAS ---
function mostrarLogin() {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const formularioSection = document.getElementById('formularioSection');
    const detalleFicha = document.getElementById('detalleFichaPaciente');

    if (loginSection) loginSection.classList.remove('hidden');
    if (dashboardSection) dashboardSection.classList.add('hidden');
    if (formularioSection) formularioSection.classList.add('hidden');
    if (detalleFicha) detalleFicha.classList.add('hidden');
}

function mostrarDashboard(user) {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const formularioSection = document.getElementById('formularioSection');
    const userEmailText = document.getElementById('userEmail');

    if (loginSection) loginSection.classList.add('hidden');
    if (formularioSection) formularioSection.classList.add('hidden');
    if (dashboardSection) dashboardSection.classList.remove('hidden');

    if (userEmailText) {
        userEmailText.textContent = obtenerNombreProfesional(user);
    }

    limpiarVistaInicial();
    cargarMetricasGlobales();
}

function obtenerNombreProfesional(user) {
    if (!user) return 'No especificado';
    const meta = user.user_metadata;
    if (meta && meta.apellido && meta.nombre) return `${meta.apellido}, ${meta.nombre}`;
    if (meta && meta.nombre) return meta.nombre;
    return user.email || 'No especificado';
}

function limpiarVistaInicial() {
    const tablaPacientesBody = document.getElementById('tablaPacientesBody');
    const contadorResultados = document.getElementById('contadorResultados');
    const detalleFichaPaciente = document.getElementById('detalleFichaPaciente');

    if (tablaPacientesBody) {
        tablaPacientesBody.innerHTML = `
            <tr>
                <td colSpan="5" class="px-6 py-8 text-center text-xs text-slate-400">
                    Ingrese un DNI o Nombre en el buscador y presione "Buscar" para ver resultados.
                </td>
            </tr>`;
    }
    if (contadorResultados) contadorResultados.textContent = '0 fichas mostradas';
    if (detalleFichaPaciente) detalleFichaPaciente.classList.add('hidden');
}

// --- MÉTRICAS Y CONSULTAS ---
async function cargarMetricasGlobales() {
    try {
        const totalFichasActivas = document.getElementById('totalFichasActivas');
        const cantTratamiento = document.getElementById('cantTratamiento');
        const cantSeguimiento = document.getElementById('cantSeguimiento');
        const cantEgreso = document.getElementById('cantEgreso');

        const { count: total } = await supabaseClient.from('historias_clinicas').select('*', { count: 'exact', head: true });
        if (totalFichasActivas) totalFichasActivas.textContent = total || 0;

        const { count: countTratamiento } = await supabaseClient.from('historias_clinicas').select('*', { count: 'exact', head: true }).or('estado_paciente.eq.en_tratamiento,estado_paciente.is.null');
        if (cantTratamiento) cantTratamiento.textContent = countTratamiento || 0;

        const { count: countSeguimiento } = await supabaseClient.from('historias_clinicas').select('*', { count: 'exact', head: true }).eq('estado_paciente', 'en_seguimiento');
        if (cantSeguimiento) cantSeguimiento.textContent = countSeguimiento || 0;

        const { count: countEgreso } = await supabaseClient.from('historias_clinicas').select('*', { count: 'exact', head: true }).eq('estado_paciente', 'egreso');
        if (cantEgreso) cantEgreso.textContent = countEgreso || 0;

    } catch (err) {
        console.error('Error al cargar métricas globales:', err);
    }
}

async function ejecutarBusqueda() {
    const inputBuscar = document.getElementById('buscarDNI');
    const tablaPacientesBody = document.getElementById('tablaPacientesBody');
    const contadorResultados = document.getElementById('contadorResultados');
    const query = inputBuscar ? inputBuscar.value.trim() : '';

    if (!query) {
        limpiarVistaInicial();
        cargarMetricasGlobales();
        return;
    }

    if (tablaPacientesBody) {
        tablaPacientesBody.innerHTML = `
            <tr>
                <td colSpan="5" class="px-6 py-8 text-center text-xs text-slate-400">
                    Buscando registros...
                </td>
            </tr>`;
    }

    let consulta = supabaseClient.from('historias_clinicas').select('*');

    if (!isNaN(query)) {
        consulta = consulta.eq('paciente_dni', query);
    } else {
        consulta = consulta.or(`paciente_nombre.ilike.%${query}%,paciente_apellido.ilike.%${query}%`);
    }

    const { data, error } = await consulta.order('created_at', { ascending: false });

    if (error) {
        if (tablaPacientesBody) {
            tablaPacientesBody.innerHTML = `<tr><td colSpan="5" class="px-6 py-4 text-center text-xs text-red-500">Error: ${error.message}</td></tr>`;
        }
        return;
    }

    const dnisVistos = new Set();
    const pacientesUnicos = (data || []).filter(paciente => {
        if (!paciente.paciente_dni) return true;
        if (dnisVistos.has(paciente.paciente_dni)) return false;
        dnisVistos.add(paciente.paciente_dni);
        return true;
    });

    if (contadorResultados) contadorResultados.textContent = `${pacientesUnicos.length} resultados`;
    renderTabla(pacientesUnicos);
}

function renderTabla(registros) {
    const tablaPacientesBody = document.getElementById('tablaPacientesBody');
    if (!tablaPacientesBody) return;

    if (!registros || registros.length === 0) {
        tablaPacientesBody.innerHTML = `<tr><td colSpan="5" class="px-6 py-8 text-center text-xs text-amber-600">No se encontraron fichas clínicas asociadas.</td></tr>`;
        return;
    }

    let html = '';
    registros.forEach(item => {
        const fecha = new Date(item.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

async function verFichaPaciente(id) {
    const { data, error } = await supabaseClient.from('historias_clinicas').select('*').eq('id', id).single();
    if (error || !data) {
        alert('No se pudo cargar la ficha del paciente.');
        return;
    }

    pacienteActual = data;

    const fichaDniHeader = document.getElementById('fichaDniHeader');
    const fichaNombreHeader = document.getElementById('fichaNombreHeader');
    const fichaEstadoBadge = document.getElementById('fichaEstadoBadge');
    const cambioEstadoRapido = document.getElementById('cambioEstadoRapido');
    const cantDiasFicha = document.getElementById('cantDiasFicha');
    const detalleFichaPaciente = document.getElementById('detalleFichaPaciente');

    if (fichaDniHeader) fichaDniHeader.textContent = `FICHA - DNI ${data.paciente_dni || 'N/R'}`;
    if (fichaNombreHeader) fichaNombreHeader.textContent = `${data.paciente_nombre || ''} ${data.paciente_apellido || ''}`;

    if (fichaEstadoBadge) {
        if (data.estado_paciente === 'en_seguimiento') {
            fichaEstadoBadge.innerHTML = '<span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-300"><span class="h-2 w-2 rounded-full bg-slate-400"></span>En seguimiento</span>';
        } else if (data.estado_paciente === 'egreso') {
            fichaEstadoBadge.innerHTML = '<span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200"><span class="h-2 w-2 rounded-full bg-amber-500"></span>Egreso</span>';
        } else {
            fichaEstadoBadge.innerHTML = '<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200"><span class="h-2 w-2 rounded-full bg-emerald-500"></span>En tratamiento</span>';
        }
    }

    if (cambioEstadoRapido) cambioEstadoRapido.value = data.estado_paciente || 'en_tratamiento';

    const fechaInicio = new Date(data.created_at);
    const hoy = new Date();
    const diferenciaDias = Math.floor((hoy - fechaInicio) / (1000 * 60 * 60 * 24));
    if (cantDiasFicha) cantDiasFicha.textContent = diferenciaDias >= 0 ? diferenciaDias : 0;

    cargarEvolucionesTimeline(data);

    if (detalleFichaPaciente) {
        detalleFichaPaciente.classList.remove('hidden');
        detalleFichaPaciente.scrollIntoView({ behavior: 'smooth' });
    }
}

function asegurarBotonEditarFicha() {
    const btnNuevaEntrada = document.getElementById('btnNuevaEntrada');
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

function cargarFichaParaEditar() {
    if (!pacienteActual) {
        alert('No hay un paciente seleccionado.');
        return;
    }

    const dashboardSection = document.getElementById('dashboardSection');
    const formularioSection = document.getElementById('formularioSection');
    const clinicalStatus = document.getElementById('clinicalStatus');

    if (dashboardSection) dashboardSection.classList.add('hidden');
    if (formularioSection) formularioSection.classList.remove('hidden');
    if (clinicalStatus) clinicalStatus.classList.add('hidden');

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('pacienteDni', pacienteActual.paciente_dni);
    setVal('pacienteNombre', pacienteActual.paciente_nombre);
    setVal('pacienteApellido', pacienteActual.paciente_apellido);
    setVal('estadoPaciente', pacienteActual.estado_paciente || 'en_tratamiento');
    setVal('sexo', pacienteActual.sexo);
    setVal('fechaNacimiento', pacienteActual.fecha_nacimiento);
    setVal('edad', pacienteActual.edad);
    setVal('grupoEtario', pacienteActual.grupo_etario);
    setVal('localidad', pacienteActual.localidad);
    setVal('barrioResidencia', pacienteActual.barrio_residencia);
    setVal('nivelEducativo', pacienteActual.nivel_educativo);
    setVal('situacionLaboral', pacienteActual.situacion_laboral);
    setVal('tipoVivienda', pacienteActual.tipo_vivienda);
    setVal('situacionHabitacional', pacienteActual.situacion_habitacional);
    setVal('habitacionesDormir', pacienteActual.habitaciones_dormir);
    setVal('personasVivienda', pacienteActual.personas_vivienda);
    setVal('servicioAgua', pacienteActual.servicio_agua);
    setVal('eliminacionExcretas', pacienteActual.eliminacion_excretas);

    setVal('sustanciaConsumida', pacienteActual.sustancia_consumida);
    setVal('edadInicio', pacienteActual.edad_inicio);
    setVal('frecuenciaUso', pacienteActual.frecuencia_uso);
    setVal('policonsumo', pacienteActual.policonsumo);

    setVal('lugarConsumo', pacienteActual.lugar_consumo);
    setVal('redAcompanamiento', pacienteActual.red_acompanamiento);
    setVal('motivos', pacienteActual.motivos);
    setVal('pautasAutocuidado', pacienteActual.pautas_autocuidado);

    setVal('consultasPrevias', pacienteActual.consultas_previas);
    setVal('atencionGuardia', pacienteActual.atencion_guardia);
    setVal('atencionSaludMental', pacienteActual.atencion_salud_mental);
    setVal('internaciones', pacienteActual.internaciones);
    setVal('vinculacionRed', pacienteActual.vinculacion_red);
    setVal('motivoConsulta', pacienteActual.motivo_consulta);
    setVal('observaciones', pacienteActual.observaciones);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

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

    const cantIngresosFicha = document.getElementById('cantIngresosFicha');
    const cantEvolucionesFicha = document.getElementById('cantEvolucionesFicha');
    const timelineContenedor = document.getElementById('timelineContenedor');

    if (cantIngresosFicha) cantIngresosFicha.textContent = totalIngresos;
    if (cantEvolucionesFicha) cantEvolucionesFicha.textContent = totalEvoluciones;
    if (timelineContenedor) timelineContenedor.innerHTML = timelineHTML;
}

async function guardarNuevaEntrada() {
    const motivoEntrada = document.getElementById('motivoEntrada');
    const tipoEntrada = document.getElementById('tipoEntrada');
    const dispositivoEntrada = document.getElementById('dispositivoEntrada');
    const profesionalEntrada = document.getElementById('profesionalEntrada');
    const formNuevaEntrada = document.getElementById('formNuevaEntrada');

    const motivo = motivoEntrada ? motivoEntrada.value.trim() : '';
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
        tipo: tipoEntrada ? tipoEntrada.value : 'Evolución',
        fecha: new Date().toISOString(),
        motivo: motivo,
        dispositivo: dispositivoEntrada ? dispositivoEntrada.value.trim() || 'No especificado' : 'No especificado',
        profesional: profesionalEntrada ? profesionalEntrada.value.trim() || 'No especificado' : 'No especificado'
    };

    evolucionesPrevias.push(nuevaEntradaObj);

    const { error } = await supabaseClient.from('historias_clinicas').update({ evoluciones_json: evolucionesPrevias }).eq('id', pacienteActual.id);

    if (error) {
        alert('Error al guardar entrada: ' + error.message);
    } else {
        pacienteActual.evoluciones_json = evolucionesPrevias;
        cargarEvolucionesTimeline(pacienteActual);
        if (motivoEntrada) motivoEntrada.value = '';
        if (dispositivoEntrada) dispositivoEntrada.value = '';
        if (profesionalEntrada) profesionalEntrada.value = '';
        if (formNuevaEntrada) formNuevaEntrada.classList.add('hidden');
    }
}

async function actualizarEstadoRapido(e) {
    if (!pacienteActual) return;

    const nuevoEstado = e.target.value;
    const { error } = await supabaseClient.from('historias_clinicas').update({ estado_paciente: nuevoEstado }).eq('id', pacienteActual.id);

    if (error) {
        alert('Error al actualizar el estado: ' + error.message);
    } else {
        pacienteActual.estado_paciente = nuevoEstado;
        verFichaPaciente(pacienteActual.id);
        cargarMetricasGlobales();
    }
}

function exportarFichaExcel() {
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
}

async function guardarHistoriaClinica(e) {
    e.preventDefault();
    const clinicalStatus = document.getElementById('clinicalStatus');
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert('Sesión expirada. Por favor inicie sesión nuevamente.');
        mostrarLogin();
        return;
    }

    const getVal = (id) => document.getElementById(id)?.value || null;

    const payload = {
        medico_id: user.id,

        paciente_dni: getVal('pacienteDni'),
        paciente_nombre: getVal('pacienteNombre'),
        paciente_apellido: getVal('pacienteApellido'),
        estado_paciente: getVal('estadoPaciente') || 'en_tratamiento',
        sexo: getVal('sexo'),
        fecha_nacimiento: getVal('fechaNacimiento'),
        edad: getVal('edad') ? parseInt(getVal('edad')) : null,
        grupo_etario: getVal('grupoEtario'),
        localidad: getVal('localidad'),
        barrio_residencia: getVal('barrioResidencia'),
        nivel_educativo: getVal('nivelEducativo'),
        situacion_laboral: getVal('situacionLaboral'),
        tipo_vivienda: getVal('tipoVivienda'),
        situacion_habitacional: getVal('situacionHabitacional'),
        habitaciones_dormir: getVal('habitacionesDormir') ? parseInt(getVal('habitacionesDormir')) : null,
        personas_vivienda: getVal('personasVivienda') ? parseInt(getVal('personasVivienda')) : null,
        servicio_agua: getVal('servicioAgua'),
        eliminacion_excretas: getVal('eliminacionExcretas'),

        sustancia_consumida: getVal('sustanciaConsumida'),
        edad_inicio: getVal('edadInicio') ? parseInt(getVal('edadInicio')) : null,
        frecuencia_uso: getVal('frecuenciaUso'),
        policonsumo: getVal('policonsumo'),

        lugar_consumo: getVal('lugarConsumo'),
        red_acompanamiento: getVal('redAcompanamiento'),
        motivos: getVal('motivos'),
        pautas_autocuidado: getVal('pautasAutocuidado'),

        consultas_previas: getVal('consultasPrevias'),
        atencion_guardia: getVal('atencionGuardia'),
        atencion_salud_mental: getVal('atencionSaludMental'),
        internaciones: getVal('internaciones'),
        vinculacion_red: getVal('vinculacionRed'),
        motivo_consulta: getVal('motivoConsulta'),
        observaciones: getVal('observaciones')
    };

    let respuesta;

    if (pacienteActual && pacienteActual.id) {
        respuesta = await supabaseClient.from('historias_clinicas').update(payload).eq('id', pacienteActual.id);
    } else {
        respuesta = await supabaseClient.from('historias_clinicas').insert([payload]);
    }

    if (respuesta.error) {
        if (clinicalStatus) {
            clinicalStatus.textContent = 'Error al guardar: ' + respuesta.error.message;
            clinicalStatus.className = 'text-sm mt-3 text-center text-red-500 font-semibold block';
            clinicalStatus.classList.remove('hidden');
        }
    } else {
        if (clinicalStatus) {
            clinicalStatus.textContent = pacienteActual ? '¡Ficha actualizada con éxito!' : '¡Historia clínica guardada con éxito!';
            clinicalStatus.className = 'text-sm mt-3 text-center text-emerald-600 font-bold block';
            clinicalStatus.classList.remove('hidden');
        }

        const clinicalForm = document.getElementById('clinicalForm');
        if (clinicalForm) clinicalForm.reset();

        setTimeout(() => {
            const formularioSection = document.getElementById('formularioSection');
            const dashboardSection = document.getElementById('dashboardSection');
            if (formularioSection) formularioSection.classList.add('hidden');
            if (dashboardSection) dashboardSection.classList.remove('hidden');
            limpiarVistaInicial();
            cargarMetricasGlobales();
        }, 1500);
    }
}
