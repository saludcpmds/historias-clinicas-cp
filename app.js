const SUPABASE_URL = 'https://hgibtilxeypuvpraziac.supabase.co';
// Reemplaza esta clave con la Publishable key completa que copiaste de Supabase
const SUPABASE_ANON_KEY = 'sb_publishable_yZ6dortEAFQ5ZwZUwwPhGg_i-0cY...';

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
        paciente_dni: document.getElementById('pacienteDni').value,
        paciente_nombre: document.getElementById('pacienteNombre').value,
        paciente_apellido: document.getElementById('pacienteApellido').value,
        motivo_consulta: document.getElementById('motivoConsulta').value,
        diagnostico_cie11: document.getElementById('diagnosticoCie11').value,
        observaciones: document.getElementById('observaciones').value
    };

    const { error } = await supabaseClient
        .from('historias_clinicas')
        .insert([payload]);

    if (error) {
        clinicalStatus.textContent = 'Error al guardar: ' + error.message;
        clinicalStatus.className = 'text-sm mt-3 text-center text-red-500';
    } else {
        clinicalStatus.textContent = '¡Historia clínica guardada con éxito!';
        clinicalStatus.className = 'text-sm mt-3 text-center text-emerald-600 font-bold';
        clinicalForm.reset();
    }
    clinicalStatus.classList.remove('hidden');
});