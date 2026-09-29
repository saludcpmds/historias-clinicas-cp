// --- CONFIGURACIÓN E INICIALIZACIÓN ---
const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'https://hgibtilxeypuvpraziac.supabase.co';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || 'sb_publishable_yZ6dortEAFQ5ZwZUwwPhGg_i-OcYDqD';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Encapsulamiento del Estado de la Aplicación
const state = {
    pacienteActual: null,
    currentUser: null
};

// --- INICIALIZACIÓN PRINCIPAL ---
window.addEventListener('DOMContentLoaded', async () => {
    inicializarEventos();

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        if (session?.user) {
            state.currentUser = session.user;
            mostrarDashboard(session.user);
        } else {
            mostrarLogin();
        }
    } catch (err) {
        console.error("[AuthError] Error al obtener la sesión de usuario:", err);
        mostrarLogin();
    }

    asegurarBotonEditarFicha();
});

// --- VINCULACIÓN SEGURA DE EVENTOS ---
function inicializarEventos() {
    // Iniciar Sesión
    const loginForm = document.getElementById('loginForm');
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginError = document.getElementById('loginError');
        if (loginError) loginError.classList.add('hidden');

        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;

        if (!email || !password) return;

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;

            if (data?.user) {
                state.currentUser = data.user;
                mostrarDashboard(data.user);
            }
        } catch (error) {
            if (loginError) {
                loginError.textContent = 'Error de autenticación: ' + error.message;
                loginError.classList.remove('hidden');
            }
        }
    });

    // Cerrar Sesión
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await supabaseClient.auth.signOut();
        } catch (err) {
            console.error("[AuthError] Error al cerrar sesión:", err);
        } finally {
            state.pacienteActual = null;
            state.currentUser = null;
            mostrarLogin();
            location.reload();
        }
    });

    // Botón "+ Nueva Ficha"
    document.getElementById('btnNuevaFicha')?.addEventListener('click', () => {
        state.pacienteActual = null;
        toggleVisibilidadSecciones({ dashboard: false, formulario: true });
        
        const clinicalForm = document.getElementById('clinicalForm');
        clinicalForm?.reset();
        
        const clinicalStatus = document.getElementById('clinicalStatus');
        if (clinicalStatus) clinicalStatus.classList.add('hidden');
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Volver al Dashboard
    document.getElementById('btnVolverDashboard')?.addEventListener('click', () => {
        toggleVisibilidadSecciones({ dashboard: true, formulario: false });
        limpiarVistaInicial();
        cargarMetricasGlobales();
    });

    // Buscar Paciente
    document.getElementById('btnBuscar')?.addEventListener('click', ejecutarBusqueda);

    // Desplegar Formulario Nueva Entrada en Timeline
    document.getElementById('btnNuevaEntrada')?.addEventListener('click', async () => {
        const formNuevaEntrada = document.getElementById('formNuevaEntrada');
        const profesionalEntrada = document.getElementById('profesionalEntrada');
        formNuevaEntrada?.classList.remove('hidden');

        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user && profesionalEntrada) {
                profesionalEntrada.value = obtenerNombreProfesional(user);
            }
        } catch (err) {
            console.error("[UserError] Error obteniendo datos del profesional:", err);
        }
    });

    // Cancelar Entrada
    document.getElementById('btnCancelarEntrada')?.addEventListener('click', () => {
        document.getElementById('formNuevaEntrada')?.classList.add('hidden');
        resetInput('motivoEntrada');
        resetInput('dispositivoEntrada');
        resetInput('profesionalEntrada');
    });

    // Guardar Entrada
    document.getElementById('btnGuardarEntrada')?.addEventListener('click', guardarNuevaEntrada);

    // Cambio de Estado Rápido
    document.getElementById('cambioEstadoRapido')?.addEventListener('change', actualizarEstadoRapido);

    // Exportar Ficha a Excel
    document.getElementById('btnExportarExcel')?.addEventListener('click', exportarFichaExcel);

    // Guardar Formulario Clínico
    document.getElementById('clinicalForm')?.addEventListener('submit', guardarHistoriaClinica);
}

// --- MANEJO DE VISTAS Y ESTADO ---
function toggleVisibilidadSecciones({ dashboard, formulario }) {
    const dashboardSection = document.getElementById('dashboardSection');
    const formularioSection = document.getElementById('formularioSection');

    if (dashboardSection) {
        dashboardSection.classList.toggle('hidden', !dashboard);
    }
    if (formularioSection) {
        formularioSection.classList.toggle('hidden', !formulario);
    }
}

function mostrarLogin() {
    document.getElementById('loginSection')?.classList.remove('hidden');
    document.getElementById('dashboardSection')?.classList.add('hidden');
    document.getElementById('formularioSection')?.classList.add('hidden');
    document.getElementById('detalleFichaPaciente')?.classList.add('hidden');
}

function mostrarDashboard(user) {
    document.getElementById('loginSection')?.classList.add('hidden');
    document.getElementById('formularioSection')?.classList.add('hidden');
    document.getElementById('dashboardSection')?.classList.remove('hidden');

    const userEmailText = document.getElementById('userEmail');
    if (userEmailText) {
        userEmailText.textContent = obtenerNombreProfesional(user);
    }

    limpiarVistaInicial();
    cargarMetricasGlobales();
}

function obtenerNombreProfesional(user) {
    if (!user) return 'No especificado';
    const meta = user.user_metadata;
    if (meta?.apellido && meta?.nombre) return `${meta.apellido}, ${meta.nombre}`;
    if (meta?.nombre) return meta.nombre;
    return user.email || 'No especificado';
}

function limpiarVistaInicial() {
    const tablaPacientesBody = document.getElementById('tablaPacientesBody');
    const contadorResultados = document.getElementById('contadorResultados');
    const detalleFichaPaciente = document.getElementById('detalleFichaPaciente');

    if (tablaPacientesBody) {
        tablaPacientesBody.innerHTML = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.className = "px-6 py-8 text-center text-xs text-slate-400";
        td.textContent = 'Ingrese un DNI o Nombre en el buscador y presione "Buscar" para ver resultados.';
        tr.appendChild(td);
        tablaPacientesBody.appendChild(tr);
    }

    if (contadorResultados) contadorResultados.textContent = '0 fichas mostradas';
    if (detalleFichaPaciente) detalleFichaPaciente.classList.add('hidden');
}

// --- MÉTRICAS Y CONSULTAS PARALELIZADAS ---
async function cargarMetricasGlobales() {
    try {
        const [resTotal, resTratamiento, resSeguimiento, resEgreso] = await Promise.all([
            supabaseClient.from('historias_clinicas').select('*', { count: 'exact', head: true }),
            supabaseClient.from('historias_clinicas').select('*', { count: 'exact', head: true }).or('estado_paciente.eq.en_tratamiento,estado_paciente.is.null'),
            supabaseClient.from('historias_clinicas').select('*', { count: 'exact', head: true }).eq('estado_paciente', 'en_seguimiento'),
            supabaseClient.from('historias_clinicas').select('*', { count: 'exact', head: true }).eq('estado_paciente', 'egreso')
        ]);

        actualizarTexto('totalFichasActivas', resTotal.count || 0);
        actualizarTexto('cantTratamiento', resTratamiento.count || 0);
        actualizarTexto('cantSeguimiento', resSeguimiento.count || 0);
        actualizarTexto('cantEgreso', resEgreso.count || 0);

    } catch (err) {
        console.error('[MetricasError] Error al cargar métricas globales:', err);
    }
}

// --- BÚSQUEDA Y RENDERIZADO SEGURO (PREVENCIÓN DE XSS) ---
async function ejecutarBusqueda() {
    const inputBuscar = document.getElementById('buscarDNI');
    const tablaPacientesBody = document.getElementById('tablaPacientesBody');
    const contadorResultados = document.getElementById('contadorResultados');
    
    // Sanitización básica del término de búsqueda (remover caracteres especiales de SQL wildcard si aplica)
    const rawQuery = inputBuscar ? inputBuscar.value.trim() : '';
    const query = rawQuery.replace(/[%_]/g, ''); 

    if (!query) {
        limpiarVistaInicial();
        cargarMetricasGlobales();
        return;
    }

    if (tablaPacientesBody) {
        tablaPacientesBody.innerHTML = '';
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.className = "px-6 py-8 text-center text-xs text-slate-400";
        td.textContent = 'Buscando registros...';
        tr.appendChild(td);
        tablaPacientesBody.appendChild(tr);
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
            tablaPacientesBody.innerHTML = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.className = "px-6 py-4 text-center text-xs text-red-500";
            td.textContent = `Error al consultar: ${error.message}`;
            tr.appendChild(td);
            tablaPacientesBody.appendChild(tr);
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
    renderTablaSegura(pacientesUnicos);
}

function renderTablaSegura(registros) {
    const tablaPacientesBody = document.getElementById('tablaPacientesBody');
    if (!tablaPacientesBody) return;

    tablaPacientesBody.innerHTML = '';

    if (!registros || registros.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.className = "px-6 py-8 text-center text-xs text-amber-600";
        td.textContent = 'No se encontraron fichas clínicas asociadas.';
        tr.appendChild(td);
        tablaPacientesBody.appendChild(tr);
        return;
    }

    const fragment = document.createDocumentFragment();

    registros.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';

        const fecha = item.created_at 
            ? new Date(item.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : 'N/I';

        // Celda DNI
        const tdDni = document.createElement('td');
        tdDni.className = 'px-6 py-4 font-mono font-bold text-slate-900';
        tdDni.textContent = item.paciente_dni || 'N/R';

        // Celda Nombre Completo
        const tdNombre = document.createElement('td');
        tdNombre.className = 'px-6 py-4 font-semibold text-slate-800';
        tdNombre.textContent = `${item.paciente_nombre || ''} ${item.paciente_apellido || ''}`.trim();

        // Celda Fecha
        const tdFecha = document.createElement('td');
        tdFecha.className = 'px-6 py-4 font-mono text-xs text-slate-500';
        tdFecha.textContent = fecha;

        // Celda Estado Badge
        const tdEstado = document.createElement('td');
        tdEstado.className = 'px-6 py-4';
        tdEstado.appendChild(crearBadgeEstado(item.estado_paciente));

        // Celda Acción
        const tdAccion = document.createElement('td');
        tdAccion.className = 'px-6 py-4 text-right';

        const btnVer = document.createElement('button');
        btnVer.className = 'text-xs bg-sky-50 text-sky-700 font-bold px-3 py-1.5 rounded-lg border border-sky-200 hover:bg-sky-100 transition';
        btnVer.textContent = 'Ver Historial';
        btnVer.addEventListener('click', () => verFichaPaciente(item.id));

        tdAccion.appendChild(btnVer);

        tr.append(tdDni, tdNombre, tdFecha, tdEstado, tdAccion);
        fragment.appendChild(tr);
    });

    tablaPacientesBody.appendChild(fragment);
}

function crearBadgeEstado(estado) {
    const span = document.createElement('span');
    span.className = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border';
    
    const dot = document.createElement('span');
    dot.className = 'h-1.5 w-1.5 rounded-full';

    if (estado === 'en_seguimiento') {
        span.classList.add('bg-slate-100', 'text-slate-700', 'border-slate-300');
        dot.classList.add('bg-slate-400');
        span.append(dot, document.createTextNode('En seguimiento'));
    } else if (estado === 'egreso') {
        span.classList.add('bg-amber-50', 'text-amber-700', 'border-amber-200');
        dot.classList.add('bg-amber-500');
        span.append(dot, document.createTextNode('Egreso'));
    } else {
        span.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
        dot.classList.add('bg-emerald-500');
        span.append(dot, document.createTextNode('En tratamiento'));
    }

    return span;
}

// --- DETALLE Y EVOLUCIONES ---
async function verFichaPaciente(id) {
    try {
        const { data, error } = await supabaseClient.from('historias_clinicas').select('*').eq('id', id).single();
        if (error || !data) throw new Error('No se pudo cargar la ficha del paciente.');

        state.pacienteActual = data;

        actualizarTexto('fichaDniHeader', `FICHA - DNI ${data.paciente_dni || 'N/R'}`);
        actualizarTexto('fichaNombreHeader', `${data.paciente_nombre || ''} ${data.paciente_apellido || ''}`.trim());

        const fichaEstadoBadge = document.getElementById('fichaEstadoBadge');
        if (fichaEstadoBadge) {
            fichaEstadoBadge.innerHTML = '';
            fichaEstadoBadge.appendChild(crearBadgeEstado(data.estado_paciente));
        }

        const cambioEstadoRapido = document.getElementById('cambioEstadoRapido');
        if (cambioEstadoRapido) cambioEstadoRapido.value = data.estado_paciente || 'en_tratamiento';

        const fechaInicio = new Date(data.created_at);
        const hoy = new Date();
        const diferenciaDias = Math.floor((hoy - fechaInicio) / (1000 * 60 * 60 * 24));
        actualizarTexto('cantDiasFicha', diferenciaDias >= 0 ? diferenciaDias : 0);

        cargarEvolucionesTimeline(data);

        const detalleFichaPaciente = document.getElementById('detalleFichaPaciente');
        if (detalleFichaPaciente) {
            detalleFichaPaciente.classList.remove('hidden');
            detalleFichaPaciente.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (err) {
        alert(err.message);
    }
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

    const timelineContenedor = document.getElementById('timelineContenedor');
    if (!timelineContenedor) return;
    
    timelineContenedor.innerHTML = '';
    const fragment = document.createDocumentFragment();

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

        const entryDiv = document.createElement('div');
        entryDiv.className = 'relative pl-2';

        const dot = document.createElement('span');
        dot.className = 'absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-sky-500 ring-4 ring-white';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex items-center gap-2 flex-wrap';

        const tipoSpan = document.createElement('span');
        tipoSpan.className = 'font-bold text-xs uppercase tracking-wider text-sky-800';
        tipoSpan.textContent = item.tipo || 'Entrada';

        const fechaSpan = document.createElement('span');
        fechaSpan.className = 'font-mono text-xs text-slate-400';
        fechaSpan.textContent = `• ${fechaFormateada}`;

        const metaSpan = document.createElement('span');
        metaSpan.className = 'text-xs text-slate-500 font-mono';
        
        const dispText = item.dispositivo ? ` | Disp: ${item.dispositivo}` : '';
        const profText = item.profesional ? ` | Prof: ${item.profesional}` : '';
        metaSpan.textContent = `${dispText}${profText}`;

        headerDiv.append(tipoSpan, fechaSpan, metaSpan);

        const descP = document.createElement('p');
        descP.className = 'text-sm text-slate-700 mt-1 font-medium';
        descP.textContent = item.motivo || 'Sin detalles';

        entryDiv.append(dot, headerDiv, descP);
        fragment.appendChild(entryDiv);
    });

    actualizarTexto('cantIngresosFicha', totalIngresos);
    actualizarTexto('cantEvolucionesFicha', totalEvoluciones);
    timelineContenedor.appendChild(fragment);
}

// --- ACTUALIZACIÓN ATÓMICA DE EVOLUCIONES (RPC) ---
async function guardarNuevaEntrada() {
    const motivoEntrada = document.getElementById('motivoEntrada');
    const tipoEntrada = document.getElementById('tipoEntrada');
    const dispositivoEntrada = document.getElementById('dispositivoEntrada');
    const profesionalEntrada = document.getElementById('profesionalEntrada');

    const motivo = motivoEntrada ? motivoEntrada.value.trim() : '';
    if (!motivo) {
        alert('Por favor complete la descripción de la entrada.');
        return;
    }

    if (!state.pacienteActual) return;

    const nuevaEntradaObj = {
        tipo: tipoEntrada ? tipoEntrada.value : 'Evolución',
        fecha: new Date().toISOString(),
        motivo: motivo,
        dispositivo: dispositivoEntrada ? dispositivoEntrada.value.trim() || 'No especificado' : 'No especificado',
        profesional: profesionalEntrada ? profesionalEntrada.value.trim() || 'No especificado' : 'No especificado'
    };

    try {
        // Intentar ejecución mediante función RPC atómica en PostgreSQL
        const { error: rpcError } = await supabaseClient.rpc('agregar_evolucion', {
            p_historia_id: state.pacienteActual.id,
            p_nueva_entrada: nuevaEntradaObj
        });

        // Fallback a UPDATE tradicional si la RPC no existe aún
        if (rpcError) {
            console.warn('[RPC Warning] Ejecutando fallback UPDATE:', rpcError.message);
            const evolucionesPrevias = state.pacienteActual.evoluciones_json || [];
            evolucionesPrevias.push(nuevaEntradaObj);

            const { error: updateError } = await supabaseClient
                .from('historias_clinicas')
                .update({ evoluciones_json: evolucionesPrevias })
                .eq('id', state.pacienteActual.id);

            if (updateError) throw updateError;
            state.pacienteActual.evoluciones_json = evolucionesPrevias;
        } else {
            if (!state.pacienteActual.evoluciones_json) state.pacienteActual.evoluciones_json = [];
            state.pacienteActual.evoluciones_json.push(nuevaEntradaObj);
        }

        cargarEvolucionesTimeline(state.pacienteActual);
        resetInput('motivoEntrada');
        resetInput('dispositivoEntrada');
        resetInput('profesionalEntrada');
        document.getElementById('formNuevaEntrada')?.classList.add('hidden');

    } catch (err) {
        alert('Error al guardar la nueva entrada: ' + err.message);
    }
}

async function actualizarEstadoRapido(e) {
    if (!state.pacienteActual) return;

    const nuevoEstado = e.target.value;
    const { error } = await supabaseClient.from('historias_clinicas').update({ estado_paciente: nuevoEstado }).eq('id', state.pacienteActual.id);

    if (error) {
        alert('Error al actualizar el estado: ' + error.message);
    } else {
        state.pacienteActual.estado_paciente = nuevoEstado;
        verFichaPaciente(state.pacienteActual.id);
        cargarMetricasGlobales();
    }
}

// --- SANITIZACIÓN PARA EXPORTACIÓN EN EXCEL (PREVENCIÓN FORMULA INJECTION) ---
function sanitizarValorExcel(valor) {
    if (typeof valor !== 'string') return valor || '';
    // Escapar formulas que inicien con =, +, -, @ para prevenir Execution Vulnerabilities en MS Excel
    if (['=', '+', '-', '@'].includes(valor.charAt(0))) {
        return `'${valor}`;
    }
    return valor;
}

function exportarFichaExcel() {
    if (!state.pacienteActual) {
        alert('No hay ninguna ficha activa para exportar.');
        return;
    }

    const p = state.pacienteActual;
    const datosExcel = [
        { "Campo": "DNI", "Valor": sanitizarValorExcel(p.paciente_dni) },
        { "Campo": "Nombre", "Valor": sanitizarValorExcel(p.paciente_nombre) },
        { "Campo": "Apellido", "Valor": sanitizarValorExcel(p.paciente_apellido) },
        { "Campo": "Estado", "Valor": sanitizarValorExcel(p.estado_paciente) },
        { "Campo": "Sexo", "Valor": sanitizarValorExcel(p.sexo) },
        { "Campo": "Edad", "Valor": p.edad || '' },
        { "Campo": "Grupo Etario", "Valor": sanitizarValorExcel(p.grupo_etario) },
        { "Campo": "Localidad", "Valor": sanitizarValorExcel(p.localidad) },
        { "Campo": "Barrio", "Valor": sanitizarValorExcel(p.barrio_residencia) },
        { "Campo": "Nivel Educativo", "Valor": sanitizarValorExcel(p.nivel_educativo) },
        { "Campo": "Situación Laboral", "Valor": sanitizarValorExcel(p.situacion_laboral) },
        { "Campo": "Sustancia Consumida", "Valor": sanitizarValorExcel(p.sustancia_consumida) },
        { "Campo": "Motivo de Consulta", "Valor": sanitizarValorExcel(p.motivo_consulta) },
        { "Campo": "Observaciones", "Valor": sanitizarValorExcel(p.observaciones) },
        { "Campo": "Fecha de Registro", "Valor": p.created_at ? new Date(p.created_at).toLocaleString('es-AR') : '' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ficha Clínica");

    XLSX.writeFile(workbook, `Ficha_${p.paciente_dni || 'Paciente'}.xlsx`);
}

// --- EDICIÓN Y GUARDADO COMPLETO ---
function asegurarBotonEditarFicha() {
    const btnNuevaEntrada = document.getElementById('btnNuevaEntrada');
    if (!btnNuevaEntrada || document.getElementById('btnVerFichaCompleta')) return;

    const btnVerFicha = document.createElement('button');
    btnVerFicha.id = 'btnVerFichaCompleta';
    btnVerFicha.className = 'text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition mr-2';
    btnVerFicha.textContent = 'Ver / Editar Ficha';

    btnNuevaEntrada.parentNode?.insertBefore(btnVerFicha, btnNuevaEntrada);
    btnVerFicha.addEventListener('click', cargarFichaParaEditar);
}

function cargarFichaParaEditar() {
    if (!state.pacienteActual) {
        alert('No hay un paciente seleccionado.');
        return;
    }

    toggleVisibilidadSecciones({ dashboard: false, formulario: true });
    
    const clinicalStatus = document.getElementById('clinicalStatus');
    if (clinicalStatus) clinicalStatus.classList.add('hidden');

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
    };

    const p = state.pacienteActual;
    setVal('pacienteDni', p.paciente_dni);
    setVal('pacienteNombre', p.paciente_nombre);
    setVal('pacienteApellido', p.paciente_apellido);
    setVal('estadoPaciente', p.estado_paciente || 'en_tratamiento');
    setVal('sexo', p.sexo);
    setVal('fechaNacimiento', p.fecha_nacimiento);
    setVal('edad', p.edad);
    setVal('grupoEtario', p.grupo_etario);
    setVal('localidad', p.localidad);
    setVal('barrioResidencia', p.barrio_residencia);
    setVal('nivelEducativo', p.nivel_educativo);
    setVal('situacionLaboral', p.situacion_laboral);
    setVal('tipoVivienda', p.tipo_vivienda);
    setVal('situacionHabitacional', p.situacion_habitacional);
    setVal('habitacionesDormir', p.habitaciones_dormir);
    setVal('personasVivienda', p.personas_vivienda);
    setVal('servicioAgua', p.servicio_agua);
    setVal('eliminacionExcretas', p.eliminacion_excretas);

    setVal('sustanciaConsumida', p.sustancia_consumida);
    setVal('edadInicio', p.edad_inicio);
    setVal('frecuenciaUso', p.frecuencia_uso);
    setVal('policonsumo', p.policonsumo);

    setVal('lugarConsumo', p.lugar_consumo);
    setVal('redAcompanamiento', p.red_acompanamiento);
    setVal('motivos', p.motivos);
    setVal('pautasAutocuidado', p.pautas_autocuidado);

    setVal('consultasPrevias', p.consultas_previas);
    setVal('atencionGuardia', p.atencion_guardia);
    setVal('atencionSaludMental', p.atencion_salud_mental);
    setVal('internaciones', p.internaciones);
    setVal('vinculacionRed', p.vinculacion_red);
    setVal('motivoConsulta', p.motivo_consulta);
    setVal('observaciones', p.observaciones);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function guardarHistoriaClinica(e) {
    e.preventDefault();
    const clinicalStatus = document.getElementById('clinicalStatus');

    if (!state.currentUser) {
        alert('Sesión expirada. Por favor inicie sesión nuevamente.');
        mostrarLogin();
        return;
    }

    const getVal = (id) => {
        const val = document.getElementById(id)?.value?.trim();
        return val === '' ? null : val;
    };

    const payload = {
        medico_id: state.currentUser.id,
        paciente_dni: getVal('pacienteDni'),
        paciente_nombre: getVal('pacienteNombre'),
        paciente_apellido: getVal('pacienteApellido'),
        estado_paciente: getVal('estadoPaciente') || 'en_tratamiento',
        sexo: getVal('sexo'),
        fecha_nacimiento: getVal('fechaNacimiento'),
        edad: getVal('edad') ? parseInt(getVal('edad'), 10) : null,
        grupo_etario: getVal('grupoEtario'),
        localidad: getVal('localidad'),
        barrio_residencia: getVal('barrioResidencia'),
        nivel_educativo: getVal('nivelEducativo'),
        situacion_laboral: getVal('situacionLaboral'),
        tipo_vivienda: getVal('tipoVivienda'),
        situacion_habitacional: getVal('situacionHabitacional'),
        habitaciones_dormir: getVal('habitacionesDormir') ? parseInt(getVal('habitacionesDormir'), 10) : null,
        personas_vivienda: getVal('personasVivienda') ? parseInt(getVal('personasVivienda'), 10) : null,
        servicio_agua: getVal('servicioAgua'),
        eliminacion_excretas: getVal('eliminacionExcretas'),
        sustancia_consumida: getVal('sustanciaConsumida'),
        edad_inicio: getVal('edadInicio') ? parseInt(getVal('edadInicio'), 10) : null,
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
    if (state.pacienteActual?.id) {
        respuesta = await supabaseClient.from('historias_clinicas').update(payload).eq('id', state.pacienteActual.id);
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
            clinicalStatus.textContent = state.pacienteActual ? '¡Ficha actualizada con éxito!' : '¡Historia clínica guardada con éxito!';
            clinicalStatus.className = 'text-sm mt-3 text-center text-emerald-600 font-bold block';
            clinicalStatus.classList.remove('hidden');
        }

        document.getElementById('clinicalForm')?.reset();

        setTimeout(() => {
            toggleVisibilidadSecciones({ dashboard: true, formulario: false });
            limpiarVistaInicial();
            cargarMetricasGlobales();
        }, 1500);
    }
}

// --- UTILIDADES ---
function actualizarTexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
}

function resetInput(id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
}
