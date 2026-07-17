const storageKey = 'gtech-tarefas-obras-v2';
const oldStorageKey = 'gtech-tarefas-obras-v1';
const inventoryStorageKey = 'gtech-inventario-v1';
const dbName = 'gtech-tarefas-obras-arquivos';
const dbStore = 'midias';
const appVersion = '35-instalacao-online';
const sessionKey = 'gtech-sessao-v1';
const cloudTasksTable = 'tarefas_obras';
const cloudUsersTable = 'usuarios_app';
const cloudInventoryTable = 'inventario_obras';
const usersStorageKey = 'gtech-usuarios-v1';

const stages = [
  { key: 'inicio', label: 'Inicio' },
  { key: 'fim', label: 'Fim' }
];

const responsibleName = 'Adriano';
const responsibleWhatsApp = '5519997418514';
const responsiblePhoneLabel = '19 99741-8514';
const allEmployeesValue = 'Todos os funcionarios';
const defaultUsers = {
  Fabio: { pin: '4017', role: 'responsavel', label: 'Fabio - Diretor' },
  Adriano: { pin: '8514', role: 'responsavel', label: 'Adriano - T-I' },
  Allan: { pin: '0271', role: 'funcionario', label: 'Allan' },
  Tito: { pin: '6755', role: 'funcionario', label: 'Tito' },
  Mateus: { pin: '1872', role: 'funcionario', label: 'Mateus' }
};
let users = loadUsers();
const supabaseConfig = window.GTECH_SUPABASE || {};
const supabaseClient = supabaseConfig.url && supabaseConfig.anonKey && window.supabase
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;
const supabaseBucket = supabaseConfig.bucket || 'evidencias-obras';
const maxCloudFileSize = 45 * 1024 * 1024;

const sampleTasks = [
  {
    id: crypto.randomUUID(),
    title: 'Conferir pontos de energia no pavimento terreo',
    employee: 'Carlos',
    site: 'Obra Centro',
    location: 'Terreo - sala comercial',
    dueDate: new Date().toISOString().slice(0, 10),
    priority: 'Alta',
    notes: 'Verificar tomadas, disjuntores e fotografar o quadro antes de fechar.',
    status: 'Pendente',
    evidence: createEmptyEvidence(),
    extraEvidence: [],
    createdAt: new Date().toISOString()
  }
];

let tasks = loadTasks();
let inventoryItems = loadInventory();
let activeFilter = 'Todas';
let mediaUrls = [];
let currentUser = loadSession();
let knownAssignedTaskIds = new Set();
let syncTimer = null;
let instructionRecorder = null;
let instructionAudioChunks = [];
let recordedInstructionAudioFile = null;

const loginScreen = document.querySelector('#loginScreen');
const loginForm = document.querySelector('#loginForm');
const loginUser = document.querySelector('#loginUser');
const loginPin = document.querySelector('#loginPin');
const form = document.querySelector('#taskForm');
const taskId = document.querySelector('#taskId');
const title = document.querySelector('#title');
const employee = document.querySelector('#employee');
const allEmployeesToggle = document.querySelector('#allEmployeesToggle');
const site = document.querySelector('#site');
const locationInput = document.querySelector('#location');
const dueDate = document.querySelector('#dueDate');
const priority = document.querySelector('#priority');
const notes = document.querySelector('#notes');
const taskInstructionAudio = document.querySelector('#taskInstructionAudio');
const taskInstructionVideo = document.querySelector('#taskInstructionVideo');
const recordInstructionAudioBtn = document.querySelector('#recordInstructionAudioBtn');
const stopInstructionAudioBtn = document.querySelector('#stopInstructionAudioBtn');
const instructionRecordingStatus = document.querySelector('#instructionRecordingStatus');
const taskList = document.querySelector('#taskList');
const statsGrid = document.querySelector('#statsGrid');
const searchInput = document.querySelector('#searchInput');
const clearBtn = document.querySelector('#clearBtn');
const saveBtn = document.querySelector('#saveBtn');
const refreshBtn = document.querySelector('#refreshBtn');
const template = document.querySelector('#taskTemplate');
const employeeList = document.querySelector('#employeeList');
const siteList = document.querySelector('#siteList');
const sessionLabel = document.querySelector('#sessionLabel');
const logoutBtn = document.querySelector('#logoutBtn');
const userAdminPanel = document.querySelector('#userAdminPanel');
const userForm = document.querySelector('#userForm');
const newUserName = document.querySelector('#newUserName');
const newUserPin = document.querySelector('#newUserPin');
const newUserRole = document.querySelector('#newUserRole');
const userList = document.querySelector('#userList');
const inventoryForm = document.querySelector('#inventoryForm');
const inventoryId = document.querySelector('#inventoryId');
const inventoryName = document.querySelector('#inventoryName');
const inventoryCode = document.querySelector('#inventoryCode');
const inventoryQuantity = document.querySelector('#inventoryQuantity');
const inventoryUnit = document.querySelector('#inventoryUnit');
const inventoryMinimum = document.querySelector('#inventoryMinimum');
const inventoryEmployee = document.querySelector('#inventoryEmployee');
const inventoryCategory = document.querySelector('#inventoryCategory');
const inventoryStatus = document.querySelector('#inventoryStatus');
const inventoryLocation = document.querySelector('#inventoryLocation');
const inventoryNotes = document.querySelector('#inventoryNotes');
const clearInventoryBtn = document.querySelector('#clearInventoryBtn');
const saveInventoryBtn = document.querySelector('#saveInventoryBtn');
const inventorySearchInput = document.querySelector('#inventorySearchInput');
const inventoryLocationFilter = document.querySelector('#inventoryLocationFilter');
const inventoryEmployeeFilter = document.querySelector('#inventoryEmployeeFilter');
const inventoryCategoryFilter = document.querySelector('#inventoryCategoryFilter');
const inventoryLowStockFilter = document.querySelector('#inventoryLowStockFilter');
const clearInventoryFiltersBtn = document.querySelector('#clearInventoryFiltersBtn');
const inventoryList = document.querySelector('#inventoryList');
const newInventoryBtn = document.querySelector('#newInventoryBtn');
const refreshInventoryBtn = document.querySelector('#refreshInventoryBtn');
const categoryList = document.querySelector('#categoryList');
const inventoryLocationList = document.querySelector('#inventoryLocationList');

loginForm.addEventListener('submit', login);
form.addEventListener('submit', saveTask);
userForm.addEventListener('submit', saveUser);
inventoryForm.addEventListener('submit', saveInventoryItem);
clearBtn.addEventListener('click', clearForm);
allEmployeesToggle.addEventListener('change', updateAllEmployeesToggle);
recordInstructionAudioBtn.addEventListener('click', startInstructionAudioRecording);
stopInstructionAudioBtn.addEventListener('click', stopInstructionAudioRecording);
taskInstructionAudio.addEventListener('change', updateInstructionFileStatus);
taskInstructionVideo.addEventListener('change', updateInstructionFileStatus);
clearInventoryBtn.addEventListener('click', clearInventoryForm);
searchInput.addEventListener('input', render);
inventorySearchInput.addEventListener('input', renderInventory);
inventoryLocationFilter.addEventListener('change', renderInventory);
inventoryEmployeeFilter.addEventListener('change', renderInventory);
inventoryCategoryFilter.addEventListener('change', renderInventory);
inventoryLowStockFilter.addEventListener('change', renderInventory);
clearInventoryFiltersBtn.addEventListener('click', clearInventoryFilters);
newInventoryBtn.addEventListener('click', focusInventoryForm);
refreshBtn.addEventListener('click', refreshTasks);
refreshInventoryBtn.addEventListener('click', refreshInventory);
document.querySelector('#printBtn').addEventListener('click', () => window.print());
document.querySelector('#exportBtn').addEventListener('click', exportBackup);
document.querySelector('#importFile').addEventListener('change', importBackup);
logoutBtn.addEventListener('click', logout);
document.addEventListener('click', (event) => {
  if (event.target?.matches?.('[data-close-media], #mediaModalClose')) {
    closeMediaModal();
  }
});

document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('.filter').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    render();
  });
});

populateUserOptions();
applySession();
render();
renderInventory();
syncUsersFromCloud().then(() => {
  populateUserOptions();
  renderUsers();
});
if (currentUser) {
  syncFromCloud(false);
  syncInventoryFromCloud();
}

function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(sessionKey));
    return saved?.name && users[saved.name] ? saved : null;
  } catch {
    return null;
  }
}

function loadUsers() {
  try {
    const saved = JSON.parse(localStorage.getItem(usersStorageKey));
    return saved && typeof saved === 'object' ? { ...defaultUsers, ...saved } : { ...defaultUsers };
  } catch {
    return { ...defaultUsers };
  }
}

function persistUsers() {
  localStorage.setItem(usersStorageKey, JSON.stringify(users));
}

function populateUserOptions() {
  const options = Object.entries(users)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, user]) => `<option value="${escapeHtml(name)}">${escapeHtml(user.label)}</option>`)
    .join('');

  loginUser.innerHTML = `<option value="">Selecione</option>${options}`;
}

async function syncUsersFromCloud() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from(cloudUsersTable)
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    const cloudUsers = {};
    (data || []).forEach((row) => {
      cloudUsers[row.name] = {
        pin: row.pin,
        role: row.role,
        label: row.label || `${row.name}${row.role === 'responsavel' ? ' - Responsavel' : ''}`
      };
    });

    users = { ...defaultUsers, ...cloudUsers };
    persistUsers();
  } catch (error) {
    console.warn('Falha ao sincronizar usuarios', error);
  }
}

async function saveUser(event) {
  event.preventDefault();

  if (currentUser?.role !== 'responsavel') {
    alert('Somente Fabio e Adriano podem cadastrar usuarios.');
    return;
  }

  const name = newUserName.value.trim();
  const pin = newUserPin.value.trim();
  const role = newUserRole.value;

  if (!name || !pin) {
    alert('Informe nome e PIN.');
    return;
  }

  const user = {
    pin,
    role,
    label: `${name}${role === 'responsavel' ? ' - Responsavel' : ''}`
  };

  users[name] = user;
  persistUsers();
  populateUserOptions();
  renderLists();
  renderUsers();
  userForm.reset();

  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from(cloudUsersTable)
      .upsert({
        name,
        pin,
        label: user.label,
        role,
        active: true,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  } catch (error) {
    alert(`Usuario salvo neste aparelho, mas nao sincronizou na nuvem.\n\n${error.message || error}`);
  }
}

function renderUsers() {
  if (!userList) return;

  const rows = Object.entries(users)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, user]) => `
      <div class="user-row">
        <strong>${escapeHtml(name)}</strong>
        <span>${user.role === 'responsavel' ? 'Responsavel' : 'Funcionario'} - PIN ${escapeHtml(user.pin)}</span>
      </div>
    `)
    .join('');

  userList.innerHTML = rows || '<div class="empty compact">Nenhum usuario cadastrado.</div>';
}

function login(event) {
  event.preventDefault();
  const name = loginUser.value;
  const pin = loginPin.value.trim();
  const user = users[name];

  if (!user || user.pin !== pin) {
    alert('Usuario ou PIN incorreto.');
    return;
  }

  currentUser = { name, role: user.role };
  localStorage.setItem(sessionKey, JSON.stringify(currentUser));
  loginPin.value = '';
  applySession();
  syncFromCloud(false);
  syncInventoryFromCloud();
}

function logout() {
  localStorage.removeItem(sessionKey);
  currentUser = null;
  knownAssignedTaskIds = new Set();
  if (syncTimer) clearInterval(syncTimer);
  applySession();
  render();
  renderInventory();
}

function applySession() {
  const logged = Boolean(currentUser);
  document.body.classList.toggle('is-logged-out', !logged);
  loginScreen.hidden = logged;

  if (!logged) {
    sessionLabel.textContent = '';
    employee.removeAttribute('readonly');
    userAdminPanel.hidden = true;
    newInventoryBtn.hidden = true;
    document.body.classList.remove('is-funcionario', 'is-responsavel');
    renderInventory();
    return;
  }

  document.body.classList.toggle('is-funcionario', currentUser.role === 'funcionario');
  document.body.classList.toggle('is-responsavel', currentUser.role === 'responsavel');
  sessionLabel.textContent = users[currentUser.name].label;
  userAdminPanel.hidden = currentUser.role !== 'responsavel';
  newInventoryBtn.hidden = currentUser.role !== 'responsavel';
  renderUsers();
  if (currentUser.role === 'funcionario') {
    employee.value = currentUser.name;
    employee.setAttribute('readonly', 'readonly');
  } else {
    employee.removeAttribute('readonly');
  }

  knownAssignedTaskIds = new Set(getVisibleTasks().map((task) => task.id));
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    syncFromCloud(true);
    syncInventoryFromCloud();
  }, 30000);
  requestNotificationPermission();
  renderInventory();
}

function loadTasks() {
  const saved = localStorage.getItem(storageKey) || localStorage.getItem(oldStorageKey);
  if (!saved) {
    localStorage.setItem(storageKey, JSON.stringify(sampleTasks));
    return sampleTasks;
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(normalizeTask) : sampleTasks;
  } catch {
    return sampleTasks;
  }
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(tasks));
}

function loadInventory() {
  try {
    const saved = JSON.parse(localStorage.getItem(inventoryStorageKey));
    return Array.isArray(saved) ? saved.map(normalizeInventoryItem) : [];
  } catch {
    return [];
  }
}

function persistInventory() {
  localStorage.setItem(inventoryStorageKey, JSON.stringify(inventoryItems));
}

function normalizeInventoryItem(item) {
  return {
    id: item.id || crypto.randomUUID(),
    name: item.name || 'Item sem nome',
    code: item.code || '',
    employee: item.employee || item.responsible || 'Estoque',
    quantity: Number(item.quantity) || 0,
    unit: item.unit || 'un',
    minimum: Number(item.minimum) || 0,
    category: item.category || 'Ferramenta',
    status: normalizeInventoryStatus(item.status),
    location: item.location || '',
    notes: item.notes || '',
    lastMoveFrom: item.lastMoveFrom || '',
    lastMoveTo: item.lastMoveTo || '',
    lastMoveBy: item.lastMoveBy || '',
    lastMoveAt: item.lastMoveAt || '',
    lastMoveNote: item.lastMoveNote || '',
    checkedBy: item.checkedBy || '',
    checkedAt: item.checkedAt || '',
    history: Array.isArray(item.history) ? item.history : [],
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString()
  };
}

function normalizeInventoryStatus(status) {
  return ['Bom', 'Com defeito', 'Em manutencao', 'Perdido'].includes(status) ? status : 'Bom';
}

async function syncInventoryFromCloud() {
  if (!supabaseClient || !currentUser) return;

  try {
    const { data, error } = await supabaseClient
      .from(cloudInventoryTable)
      .select('*')
      .order('employee', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    inventoryItems = (data || []).map(rowToInventoryItem);
    persistInventory();
    renderInventory();
    renderLists();
  } catch (error) {
    console.warn('Falha ao sincronizar inventario', error);
  }
}

async function refreshInventory() {
  if (!supabaseClient) {
    alert('A nuvem ainda nao esta configurada neste app.');
    return;
  }

  refreshInventoryBtn.disabled = true;
  refreshInventoryBtn.textContent = 'Atualizando...';
  await syncInventoryFromCloud();
  refreshInventoryBtn.textContent = 'Atualizar estoque';
  refreshInventoryBtn.disabled = false;
}

async function saveInventoryToCloud(item) {
  if (!supabaseClient) return;
  const { error } = await supabaseClient
    .from(cloudInventoryTable)
    .upsert(inventoryItemToRow(item));

  if (error) throw error;
}

async function deleteInventoryFromCloud(id) {
  if (!supabaseClient) return;
  const { error } = await supabaseClient
    .from(cloudInventoryTable)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

function inventoryItemToRow(item) {
  return {
    id: item.id,
    name: item.name,
    code: item.code,
    employee: item.employee,
    quantity: item.quantity,
    unit: item.unit,
    minimum: item.minimum,
    category: item.category,
    status: item.status,
    location: item.location,
    notes: item.notes,
    last_move_from: item.lastMoveFrom,
    last_move_to: item.lastMoveTo,
    last_move_by: item.lastMoveBy,
    last_move_at: item.lastMoveAt,
    last_move_note: item.lastMoveNote,
    checked_by: item.checkedBy,
    checked_at: item.checkedAt,
    history: item.history || [],
    created_at: item.createdAt,
    updated_at: new Date().toISOString()
  };
}

function rowToInventoryItem(row) {
  return normalizeInventoryItem({
    id: row.id,
    name: row.name,
    code: row.code,
    employee: row.employee,
    quantity: row.quantity,
    unit: row.unit,
    minimum: row.minimum,
    category: row.category,
    status: row.status,
    location: row.location,
    notes: row.notes,
    lastMoveFrom: row.last_move_from,
    lastMoveTo: row.last_move_to,
    lastMoveBy: row.last_move_by,
    lastMoveAt: row.last_move_at,
    lastMoveNote: row.last_move_note,
    checkedBy: row.checked_by,
    checkedAt: row.checked_at,
    history: row.history,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

async function syncFromCloud(shouldNotify = false) {
  if (!supabaseClient || !currentUser) return;

  try {
    const { data, error } = await supabaseClient
      .from(cloudTasksTable)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const previousVisibleIds = new Set(getVisibleTasks().map((task) => task.id));
    tasks = (data || []).map(rowToTask);
    persist();
    render();

    if (shouldNotify && currentUser.role === 'funcionario') {
      const newTasks = getVisibleTasks().filter((task) => !previousVisibleIds.has(task.id) && !knownAssignedTaskIds.has(task.id));
      notifyNewTasks(newTasks);
    }

    knownAssignedTaskIds = new Set(getVisibleTasks().map((task) => task.id));
  } catch (error) {
    console.warn('Falha ao sincronizar tarefas', error);
  }
}

async function refreshTasks() {
  if (!supabaseClient) {
    alert('A nuvem ainda nao esta configurada neste app.');
    return;
  }

  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Atualizando...';
  await syncFromCloud(false);
  refreshBtn.textContent = 'Atualizar tarefas';
  refreshBtn.disabled = false;
}

async function saveTaskToCloud(task) {
  if (!supabaseClient) return;
  const { error } = await supabaseClient
    .from(cloudTasksTable)
    .upsert(taskToRow(task));

  if (error) throw error;
}

async function deleteTaskFromCloud(id) {
  if (!supabaseClient) return;
  const { error } = await supabaseClient
    .from(cloudTasksTable)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

function taskToRow(task) {
  return {
    id: task.id,
    title: task.title,
    employee: task.employee,
    site: task.site,
    location: task.location,
    due_date: task.dueDate,
    priority: task.priority,
    notes: task.notes,
    status: task.status,
    evidence: {
      ...task.evidence,
      _extras: task.extraEvidence || [],
      _executionDescription: task.executionDescription || '',
      _instructionMedia: task.instructionMedia || createEmptyInstructionMedia()
    },
    reviewed: task.reviewed,
    reviewed_by: task.reviewedBy,
    reviewed_at: task.reviewedAt,
    created_at: task.createdAt,
    updated_at: new Date().toISOString()
  };
}

function rowToTask(row) {
  return normalizeTask({
    id: row.id,
    title: row.title,
    employee: row.employee,
    site: row.site,
    location: row.location,
    dueDate: row.due_date,
    priority: row.priority,
    notes: row.notes,
    status: row.status,
    evidence: row.evidence,
    extraEvidence: row.extra_evidence || row.evidence?._extras || [],
    executionDescription: row.evidence?._executionDescription || '',
    instructionMedia: row.evidence?._instructionMedia || {},
    reviewed: row.reviewed,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at
  });
}

function getVisibleTasks() {
  if (!currentUser) return [];
  return currentUser.role === 'funcionario'
    ? tasks.filter((task) => task.employee === currentUser.name || isAllEmployeesTask(task))
    : tasks;
}

function isAllEmployeesTask(task) {
  return task?.employee === allEmployeesValue || task?.employee === 'Todos';
}

function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function notifyNewTasks(newTasks) {
  if (!newTasks.length) return;
  const message = newTasks.length === 1
    ? `Nova tarefa: ${newTasks[0].title}`
    : `${newTasks.length} novas tarefas para executar`;

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Getch Servicos', { body: message });
  } else {
    alert(message);
  }
}

function createEmptyEvidence() {
  return stages.reduce((result, stage) => {
    result[stage.key] = {
      photoId: '',
      photoName: '',
      videoId: '',
      videoName: ''
    };
    return result;
  }, {});
}

function createEmptyInstructionMedia() {
  return {
    audioId: '',
    audioName: '',
    audioCloudPath: '',
    audioCloudType: '',
    videoId: '',
    videoName: '',
    videoCloudPath: '',
    videoCloudType: ''
  };
}

function normalizeTask(task) {
  const evidence = createEmptyEvidence();
  stages.forEach((stage) => {
    evidence[stage.key] = {
      ...evidence[stage.key],
      ...(task.evidence?.[stage.key] || {})
    };
  });

  return {
    id: task.id || crypto.randomUUID(),
    title: task.title || 'Tarefa sem titulo',
    employee: task.employee || '',
    site: task.site || '',
    location: task.location || '',
    dueDate: task.dueDate || '',
    priority: ['Normal', 'Alta', 'Urgente'].includes(task.priority) ? task.priority : 'Normal',
    notes: task.notes || '',
    status: ['Pendente', 'Em andamento', 'Concluida', 'Concluída'].includes(task.status)
      ? task.status.replace('Concluída', 'Concluida')
      : 'Pendente',
    evidence,
    extraEvidence: Array.isArray(task.extraEvidence) ? task.extraEvidence : [],
    executionDescription: task.executionDescription || '',
    instructionMedia: {
      ...createEmptyInstructionMedia(),
      ...(task.instructionMedia || {})
    },
    reviewed: Boolean(task.reviewed),
    reviewedBy: task.reviewedBy || '',
    reviewedAt: task.reviewedAt || '',
    status: normalizeStatus(task.status),
    createdAt: task.createdAt || new Date().toISOString()
  };
}

function normalizeStatus(status) {
  const cleaned = String(status || '')
    .replace('Concluída', 'Concluida')
    .replace('ConcluÃ­da', 'Concluida')
    .replace('ConcluÃƒÂ­da', 'Concluida');
  return ['Pendente', 'Em andamento', 'Precisa ajuste', 'Concluida'].includes(cleaned)
    ? cleaned
    : 'Pendente';
}

async function saveTask(event) {
  event.preventDefault();

  if (currentUser?.role !== 'responsavel') {
    alert('Somente Fabio e Adriano podem criar ou editar tarefas.');
    return;
  }

  if (instructionRecorder && instructionRecorder.state === 'recording') {
    alert('Toque em Parar antes de salvar a tarefa com audio.');
    return;
  }

  const existing = taskId.value ? getExistingTask(taskId.value) : null;
  const payload = {
    id: taskId.value || crypto.randomUUID(),
    title: title.value.trim(),
    employee: currentUser?.role === 'funcionario'
      ? currentUser.name
      : allEmployeesToggle.checked ? allEmployeesValue : employee.value.trim(),
    site: site.value.trim(),
    location: locationInput.value.trim(),
    dueDate: dueDate.value,
    priority: priority.value,
    notes: notes.value.trim(),
    status: existing ? existing.status : 'Pendente',
    evidence: existing ? existing.evidence : createEmptyEvidence(),
    extraEvidence: existing ? existing.extraEvidence || [] : [],
    executionDescription: existing ? existing.executionDescription || '' : '',
    instructionMedia: existing ? existing.instructionMedia || createEmptyInstructionMedia() : createEmptyInstructionMedia(),
    reviewed: existing ? existing.reviewed : false,
    reviewedBy: existing ? existing.reviewedBy : '',
    reviewedAt: existing ? existing.reviewedAt : '',
    createdAt: existing ? existing.createdAt : new Date().toISOString()
  };

  try {
    const audioFile = recordedInstructionAudioFile || taskInstructionAudio.files?.[0];
    if (audioFile) {
      payload.instructionMedia = await saveInstructionMediaFile(payload, audioFile, 'audio');
    }

    if (taskInstructionVideo.files?.[0]) {
      payload.instructionMedia = await saveInstructionMediaFile(payload, taskInstructionVideo.files[0], 'video');
    }
  } catch (error) {
    alert(`Nao foi possivel enviar a instrucao para o funcionario.\n\n${error.message || error}\n\nTente de novo com a internet ligada.`);
    return;
  }

  if (taskId.value) {
    tasks = tasks.map((task) => task.id === taskId.value ? payload : task);
  } else {
    tasks.unshift(payload);
  }

  persist();
  try {
    await saveTaskToCloud(payload);
    clearForm();
    await syncFromCloud(false);
  } catch (error) {
    const message = String(error.message || error);
    if (message.includes('tarefas_obras')) {
      alert('Falta criar a tabela tarefas_obras no Supabase. Execute o SQL atualizado antes de testar novas tarefas.');
    } else {
      alert(`Tarefa salva neste aparelho, mas nao sincronizou na nuvem.\n\n${message}`);
    }
    clearForm();
    render();
  }
}

function getExistingTask(id) {
  return tasks.find((task) => task.id === id);
}

function getExistingInventoryItem(id) {
  return inventoryItems.find((item) => item.id === id);
}

async function saveInventoryItem(event) {
  event.preventDefault();

  if (currentUser?.role !== 'responsavel') {
    alert('Somente Fabio e Adriano podem cadastrar ou alterar o estoque.');
    return;
  }

  const existing = inventoryId.value ? getExistingInventoryItem(inventoryId.value) : null;
  const payload = normalizeInventoryItem({
    id: inventoryId.value || crypto.randomUUID(),
    name: inventoryName.value.trim(),
    code: inventoryCode.value.trim(),
    employee: existing ? existing.employee : currentUser.name,
    quantity: inventoryQuantity.value,
    unit: inventoryUnit.value.trim() || 'un',
    minimum: inventoryMinimum.value,
    category: inventoryCategory.value.trim() || 'Ferramenta',
    status: inventoryStatus.value,
    location: inventoryLocation.value.trim(),
    notes: inventoryNotes.value.trim(),
    checkedBy: existing ? existing.checkedBy : '',
    checkedAt: existing ? existing.checkedAt : '',
    history: existing
      ? addInventoryHistory(existing, 'Edicao', `Item editado por ${currentUser.name}`)
      : [createInventoryHistory('Cadastro', `Item cadastrado por ${currentUser.name}`)],
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  if (!payload.name) {
    alert('Informe o nome do item.');
    return;
  }

  if (inventoryId.value) {
    inventoryItems = inventoryItems.map((item) => item.id === inventoryId.value ? payload : item);
  } else {
    inventoryItems.unshift(payload);
  }

  persistInventory();
  try {
    await saveInventoryToCloud(payload);
    clearInventoryForm();
    await syncInventoryFromCloud();
  } catch (error) {
    const message = String(error.message || error);
    if (message.includes('inventario_obras')) {
      alert('Item salvo neste aparelho. Para sincronizar na nuvem, crie a tabela inventario_obras no Supabase usando o SQL atualizado.');
    } else {
      alert(`Item salvo neste aparelho, mas nao sincronizou na nuvem.\n\n${message}`);
    }
    clearInventoryForm();
    renderInventory();
    renderLists();
  }
}

function clearForm() {
  form.reset();
  taskId.value = '';
  allEmployeesToggle.checked = false;
  updateAllEmployeesToggle();
  taskInstructionAudio.value = '';
  taskInstructionVideo.value = '';
  recordedInstructionAudioFile = null;
  instructionRecordingStatus.textContent = 'Nenhum audio gravado.';
  saveBtn.textContent = 'Salvar tarefa';
  if (currentUser?.role === 'funcionario') {
    employee.value = currentUser.name;
  }
  title.focus();
}

function updateAllEmployeesToggle() {
  if (allEmployeesToggle.checked) {
    employee.value = allEmployeesValue;
    employee.setAttribute('readonly', 'readonly');
    return;
  }

  if (employee.value === allEmployeesValue) {
    employee.value = '';
  }

  if (currentUser?.role === 'funcionario') {
    employee.value = currentUser.name;
    employee.setAttribute('readonly', 'readonly');
  } else {
    employee.removeAttribute('readonly');
  }
}

function updateInstructionFileStatus() {
  const hasAudio = Boolean(taskInstructionAudio.files?.length);
  const hasVideo = Boolean(taskInstructionVideo.files?.length);

  if (hasAudio && hasVideo) {
    instructionRecordingStatus.textContent = 'Audio e video selecionados. Salve a tarefa para enviar ao funcionario.';
  } else if (hasAudio) {
    instructionRecordingStatus.textContent = 'Audio selecionado. Salve a tarefa para enviar ao funcionario.';
  } else if (hasVideo) {
    instructionRecordingStatus.textContent = 'Video selecionado. Salve a tarefa para enviar ao funcionario.';
  } else if (!recordedInstructionAudioFile) {
    instructionRecordingStatus.textContent = 'Nenhum audio gravado.';
  }
}

async function startInstructionAudioRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    alert('Este celular nao permite gravar audio direto pelo navegador. Use a opcao "Escolher audio".');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    instructionAudioChunks = [];
    instructionRecorder = new MediaRecorder(stream);

    instructionRecorder.addEventListener('dataavailable', (event) => {
      if (event.data?.size) instructionAudioChunks.push(event.data);
    });

    instructionRecorder.addEventListener('stop', () => {
      const type = instructionRecorder.mimeType || 'audio/webm';
      const blob = new Blob(instructionAudioChunks, { type });
      const extension = type.includes('mp4') || type.includes('aac') ? 'm4a' : 'webm';
      recordedInstructionAudioFile = new File([blob], `instrucao-audio-${Date.now()}.${extension}`, { type });
      stream.getTracks().forEach((track) => track.stop());
      instructionRecordingStatus.textContent = 'Audio gravado. Salve a tarefa para enviar ao funcionario.';
      recordInstructionAudioBtn.disabled = false;
      stopInstructionAudioBtn.disabled = true;
    });

    instructionRecorder.start();
    recordedInstructionAudioFile = null;
    instructionRecordingStatus.textContent = 'Gravando audio... toque em Parar ao terminar.';
    recordInstructionAudioBtn.disabled = true;
    stopInstructionAudioBtn.disabled = false;
  } catch (error) {
    alert('Nao foi possivel acessar o microfone. Verifique a permissao do navegador.');
    console.warn('Falha ao gravar audio', error);
  }
}

function stopInstructionAudioRecording() {
  if (instructionRecorder && instructionRecorder.state !== 'inactive') {
    instructionRecorder.stop();
  }
}

function clearInventoryForm() {
  inventoryForm.reset();
  inventoryId.value = '';
  inventoryCode.value = '';
  inventoryEmployee.value = currentUser?.name || '';
  inventoryUnit.value = 'un';
  inventoryStatus.value = 'Bom';
  saveInventoryBtn.textContent = 'Salvar item';
}

function focusInventoryForm() {
  if (currentUser?.role !== 'responsavel') {
    alert('Somente Fabio e Adriano podem incluir itens no estoque.');
    return;
  }

  clearInventoryForm();
  scrollToInventoryForm();
  setTimeout(() => inventoryName.focus(), 250);
}

function scrollToInventoryForm() {
  const panel = document.querySelector('.task-form-panel');
  const inventoryPanel = document.querySelector('.inventory-form-panel');

  if (panel && inventoryPanel) {
    panel.scrollTo({
      top: inventoryPanel.offsetTop - 12,
      behavior: 'smooth'
    });
  }

  inventoryPanel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function render() {
  revokeMediaUrls();
  renderStats();
  renderLists();

  if (!currentUser) {
    taskList.innerHTML = '<div class="empty">Entre com seu usuario para ver as tarefas.</div>';
    return;
  }

  const term = searchInput.value.trim().toLowerCase();
  const filtered = tasks.filter((task) => {
    const matchesFilter = activeFilter === 'Todas' || task.status === activeFilter;
    const matchesUser = currentUser.role === 'responsavel' || task.employee === currentUser.name || isAllEmployeesTask(task);
    const searchable = [
      task.title,
      task.employee,
      task.site,
      task.location,
      task.priority,
      task.notes,
      task.instructionMedia?.audioName,
      task.instructionMedia?.videoName,
      task.status
    ].join(' ').toLowerCase();

    return matchesFilter && matchesUser && searchable.includes(term);
  });

  taskList.innerHTML = '';

  if (!filtered.length) {
    taskList.innerHTML = '<div class="empty">Nenhuma tarefa encontrada.</div>';
    return;
  }

  for (const task of filtered) {
    const card = template.content.firstElementChild.cloneNode(true);
    card.classList.toggle('status-concluida', task.status === 'Concluida');
    card.classList.toggle('status-ajuste', task.status === 'Precisa ajuste');
    card.classList.toggle('status-conferida', task.reviewed);
    card.classList.toggle('priority-urgente', task.priority === 'Urgente');
    card.classList.toggle('priority-alta', task.priority === 'Alta');
    card.querySelector('h3').textContent = task.title;
    card.querySelector('.task-meta').textContent = `${task.employee} - ${task.site}`;
    card.querySelector('.task-notes').textContent = task.notes || 'Sem observacoes adicionais.';
    card.querySelector('.task-info').textContent = buildInfoLine(task);
    card.querySelector('.task-instructions').replaceWith(await createInstructionBox(task));
    const summary = card.querySelector('.evidence-summary');
    const missing = missingEvidenceItems(task);
    summary.textContent = evidenceSummary(task);
    summary.classList.toggle('complete', !missing.length);
    summary.classList.toggle('incomplete', Boolean(missing.length));
    if (missing.length) {
      const missingBox = document.createElement('div');
      missingBox.className = 'missing-list';
      missingBox.textContent = `Falta: ${missing.join(', ')}`;
      summary.after(missingBox);
    }
    card.querySelector('.cloud-btn').disabled = !hasAnyEvidence(task) && !hasInstructionMedia(task);

    const badge = card.querySelector('.priority-badge');
    badge.textContent = task.priority;
    badge.classList.toggle('urgent', task.priority === 'Urgente');
    badge.classList.toggle('high', task.priority === 'Alta');

    const evidenceGrid = card.querySelector('.evidence-grid');
    for (const stage of stages) {
      evidenceGrid.appendChild(await createEvidenceBox(task, stage));
    }

    card.querySelector('.extra-evidence').replaceWith(await createExtraEvidenceBox(task));
    const executionDescription = card.querySelector('.execution-description');
    executionDescription.value = task.executionDescription || '';
    executionDescription.addEventListener('input', () => updateExecutionDescriptionLocal(task.id, executionDescription.value));
    executionDescription.addEventListener('change', () => updateExecutionDescription(task.id, executionDescription.value));

    const statusSelect = card.querySelector('.status-select');
    statusSelect.value = task.status;
    statusSelect.addEventListener('change', () => updateStatus(task.id, statusSelect.value));
    const reviewToggle = card.querySelector('.review-toggle');
    const reviewCheckbox = card.querySelector('.review-checkbox');
    reviewToggle.hidden = currentUser.role !== 'responsavel';
    reviewCheckbox.checked = task.reviewed;
    reviewCheckbox.addEventListener('change', () => updateReview(task.id, reviewCheckbox.checked));

    card.querySelector('.cloud-btn').addEventListener('click', () => uploadEvidenceToCloud(task.id));
    const cloudBtn = card.querySelector('.cloud-btn');
    if (currentUser.role === 'funcionario') {
      cloudBtn.textContent = 'Salvar e enviar';
      cloudBtn.title = 'Salvar evidencias e enviar ao responsavel';
      cloudBtn.setAttribute('aria-label', 'Salvar evidencias e enviar ao responsavel');
      statusSelect.hidden = true;
    }
    const editBtn = card.querySelector('.edit-btn');
    const deleteBtn = card.querySelector('.delete-btn');
    editBtn.addEventListener('click', () => editTask(task.id));
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    editBtn.hidden = currentUser.role !== 'responsavel';
    deleteBtn.hidden = currentUser.role !== 'responsavel';

    taskList.appendChild(card);
  }
}

function renderInventory() {
  if (!inventoryList) return;

  renderInventoryLists();

  if (!currentUser) {
    inventoryList.innerHTML = '<div class="empty">Entre com seu usuario para ver o estoque.</div>';
    return;
  }

  const term = inventorySearchInput.value.trim().toLowerCase();
  const locationFilter = inventoryLocationFilter.value;
  const employeeFilter = inventoryEmployeeFilter.value;
  const categoryFilter = inventoryCategoryFilter.value;
  const lowStockOnly = inventoryLowStockFilter.checked;

  if (!term && !locationFilter && !employeeFilter && !categoryFilter && !lowStockOnly) {
    inventoryList.innerHTML = '<div class="empty">Digite um item na busca ou escolha um filtro para ver o estoque.</div>';
    return;
  }

  const visibleItems = getVisibleInventoryItems().filter((item) => {
    const searchable = [
      item.name,
      item.code,
      item.employee,
      item.category,
      item.status,
      item.location,
      item.notes
    ].join(' ').toLowerCase();

    const matchesText = searchable.includes(term);
    const matchesLocation = !locationFilter || (item.location || 'Sem obra/local informado') === locationFilter;
    const matchesEmployee = !employeeFilter || (item.employee || 'Estoque') === employeeFilter;
    const matchesCategory = !categoryFilter || (item.category || 'Sem categoria') === categoryFilter;
    const matchesLowStock = !lowStockOnly || (item.minimum > 0 && item.quantity <= item.minimum);

    return matchesText && matchesLocation && matchesEmployee && matchesCategory && matchesLowStock;
  });

  if (!visibleItems.length) {
    inventoryList.innerHTML = '<div class="empty">Nenhum item encontrado no estoque.</div>';
    return;
  }

  const grouped = visibleItems.reduce((result, item) => {
    const key = item.location || 'Sem obra/local informado';
    result[key] = result[key] || [];
    result[key].push(item);
    return result;
  }, {});

  inventoryList.innerHTML = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([employeeName, items]) => renderInventoryGroup(employeeName, items))
    .join('');

  inventoryList.insertAdjacentHTML('afterbegin', `<div class="inventory-result-count">${visibleItems.length} item(ns) encontrado(s)</div>`);
  if (term) {
    inventoryList.insertAdjacentHTML('afterbegin', renderInventorySearchSummary(visibleItems, inventorySearchInput.value.trim()));
  }

  inventoryList.querySelectorAll('[data-inventory-edit]').forEach((button) => {
    button.addEventListener('click', () => editInventoryItem(button.dataset.inventoryEdit));
  });
  inventoryList.querySelectorAll('[data-inventory-delete]').forEach((button) => {
    button.addEventListener('click', () => deleteInventoryItem(button.dataset.inventoryDelete));
  });
  inventoryList.querySelectorAll('[data-inventory-entry]').forEach((button) => {
    button.addEventListener('click', () => adjustInventoryQuantity(button.dataset.inventoryEntry, 'entrada'));
  });
  inventoryList.querySelectorAll('[data-inventory-output]').forEach((button) => {
    button.addEventListener('click', () => adjustInventoryQuantity(button.dataset.inventoryOutput, 'baixa'));
  });
  inventoryList.querySelectorAll('[data-inventory-move]').forEach((button) => {
    button.addEventListener('click', () => moveInventoryItem(button.dataset.inventoryMove));
  });
  inventoryList.querySelectorAll('[data-inventory-alert]').forEach((button) => {
    button.addEventListener('click', () => alertInventoryMove(button.dataset.inventoryAlert));
  });
  inventoryList.querySelectorAll('[data-inventory-history]').forEach((button) => {
    button.addEventListener('click', () => showInventoryHistory(button.dataset.inventoryHistory));
  });
  inventoryList.querySelectorAll('[data-inventory-check]').forEach((button) => {
    button.addEventListener('click', () => checkInventoryItem(button.dataset.inventoryCheck));
  });
}

function renderInventorySearchSummary(items, term) {
  const summary = items.reduce((result, item) => {
    const place = item.location || 'Sem obra/local informado';
    const unit = item.unit || 'un';
    result[place] = result[place] || {};
    result[place][unit] = (result[place][unit] || 0) + item.quantity;
    return result;
  }, {});

  const rows = Object.entries(summary)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([place, units]) => {
      const total = Object.entries(units)
        .map(([unit, quantity]) => `${formatNumber(quantity)} ${escapeHtml(unit)}`)
        .join(' + ');
      return `
        <div class="inventory-summary-row">
          <span>${escapeHtml(place)}</span>
          <strong>${total}</strong>
        </div>
      `;
    })
    .join('');

  return `
    <section class="inventory-search-summary">
      <div class="inventory-summary-heading">
        <span>Resumo da busca</span>
        <strong>${escapeHtml(term)}</strong>
      </div>
      ${rows}
    </section>
  `;
}

function createInventoryHistory(type, description) {
  return {
    id: crypto.randomUUID(),
    type,
    description,
    user: currentUser?.name || '',
    at: new Date().toISOString()
  };
}

function addInventoryHistory(item, type, description) {
  return [
    createInventoryHistory(type, description),
    ...(item.history || [])
  ].slice(0, 30);
}

function getVisibleInventoryItems() {
  if (!currentUser) return [];
  if (currentUser.role === 'responsavel') return inventoryItems;
  return inventoryItems.filter((item) => item.employee === currentUser.name);
}

function renderInventoryGroup(placeName, items) {
  const lowStock = items.filter((item) => item.minimum > 0 && item.quantity <= item.minimum).length;
  const total = items.length;
  const label = placeName === 'Estoque' ? 'Estoque geral' : placeName;

  return `
    <section class="inventory-group">
      <div class="inventory-group-heading">
        <div>
          <h3>${escapeHtml(label)}</h3>
          <span>${total} item(ns)${lowStock ? ` - ${lowStock} em alerta` : ''}</span>
        </div>
      </div>
      <div class="inventory-items">
        ${items.map(renderInventoryCard).join('')}
      </div>
    </section>
  `;
}

function renderInventoryCard(item) {
  const canManage = currentUser?.role === 'responsavel';
  const lowStock = item.minimum > 0 && item.quantity <= item.minimum;
  const stateClass = item.status === 'Bom' ? 'good' : 'attention';
  const quantity = formatNumber(item.quantity);
  const minimum = formatNumber(item.minimum);
  const currentPlace = item.location || 'Sem obra/local informado';
  const lastMove = item.lastMoveAt
    ? `Ultima mudanca: ${escapeHtml(item.lastMoveFrom || 'origem nao informada')} -> ${escapeHtml(item.lastMoveTo || currentPlace)} por ${escapeHtml(item.lastMoveBy || 'responsavel')} em ${formatDateTime(item.lastMoveAt)}`
    : '';
  const checkedLine = item.checkedAt
    ? `Conferido por ${escapeHtml(item.checkedBy || 'responsavel')} em ${formatDateTime(item.checkedAt)}`
    : '';

  return `
    <article class="inventory-card ${lowStock ? 'low-stock' : ''}">
      <div class="inventory-card-main">
        <div>
          <div class="task-meta">${escapeHtml(item.category)} - ${escapeHtml(item.employee || 'Estoque')}</div>
          <h4>${escapeHtml(item.name)}</h4>
        </div>
        <span class="inventory-status ${stateClass}">${escapeHtml(item.status)}</span>
      </div>
      <div class="inventory-quantity">
        <strong>${quantity}</strong>
        <span>${escapeHtml(item.unit || 'un')}</span>
      </div>
      <div class="inventory-details">
        ${item.code ? `<span>Codigo: ${escapeHtml(item.code)}</span>` : ''}
        <span>Responsavel: ${escapeHtml(item.employee || 'Estoque')}</span>
        <span>Obra/local: ${escapeHtml(currentPlace)}</span>
        <span>Minimo: ${minimum} ${escapeHtml(item.unit || 'un')}</span>
      </div>
      ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
      ${checkedLine ? `<div class="inventory-check-note">${checkedLine}</div>` : ''}
      ${lastMove ? `<div class="inventory-move-note">${lastMove}${item.lastMoveNote ? ` - ${escapeHtml(item.lastMoveNote)}` : ''}</div>` : ''}
      ${lowStock ? '<div class="inventory-alert">Estoque baixo ou precisa conferir.</div>' : ''}
      <div class="inventory-actions">
        <button class="text-action" type="button" data-inventory-alert="${escapeHtml(item.id)}">Avisar mudanca</button>
        ${canManage ? `
          <button class="text-action" type="button" data-inventory-entry="${escapeHtml(item.id)}">Entrada</button>
          <button class="text-action" type="button" data-inventory-output="${escapeHtml(item.id)}">Baixa</button>
          <button class="text-action" type="button" data-inventory-move="${escapeHtml(item.id)}">Transferir</button>
          <button class="text-action" type="button" data-inventory-check="${escapeHtml(item.id)}">Conferir</button>
          <button class="text-action" type="button" data-inventory-history="${escapeHtml(item.id)}">Historico</button>
          <button class="text-action edit-btn" type="button" data-inventory-edit="${escapeHtml(item.id)}">Editar</button>
          <button class="text-action delete-btn" type="button" data-inventory-delete="${escapeHtml(item.id)}" title="Excluir item" aria-label="Excluir item">Excluir item</button>
        ` : ''}
      </div>
    </article>
  `;
}

async function createInstructionBox(task) {
  const box = document.createElement('section');
  box.className = 'task-instructions';

  const media = task.instructionMedia || createEmptyInstructionMedia();
  if (!media.audioId && !media.audioCloudPath && !media.videoId && !media.videoCloudPath) {
    box.hidden = true;
    return box;
  }

  const heading = document.createElement('div');
  heading.className = 'extra-heading';
  heading.innerHTML = '<div><strong>Instrucao do responsavel</strong><span>Audio ou video para entender a tarefa</span></div>';
  box.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'instruction-media-grid';

  if (media.audioId || media.audioCloudPath) {
    grid.appendChild(await createInstructionPreview(media.audioId, 'audio', media.audioName, media.audioCloudPath, media.audioCloudType));
  }

  if (media.videoId || media.videoCloudPath) {
    grid.appendChild(await createInstructionPreview(media.videoId, 'video', media.videoName, media.videoCloudPath, media.videoCloudType));
  }

  box.appendChild(grid);
  return box;
}

async function createInstructionPreview(mediaId, kind, name, cloudPath, cloudType) {
  return createMediaPreview(mediaId, kind, name, cloudPath, cloudType);
}

async function createEvidenceBox(task, stage) {
  const data = task.evidence[stage.key] || {};
  const box = document.createElement('section');
  box.className = 'evidence-box';

  const heading = document.createElement('div');
  heading.className = 'evidence-heading';
  heading.innerHTML = `<strong>${stage.label}</strong><span>${stageStatus(data)}</span>`;
  box.appendChild(heading);

  const previews = document.createElement('div');
  previews.className = 'media-preview-grid';
  previews.appendChild(await createMediaPreview(data.photoId, 'photo', data.photoName, data.photoCloudPath));
  previews.appendChild(await createMediaPreview(data.videoId, 'video', data.videoName, data.videoCloudPath));
  box.appendChild(previews);

  const uploadRow = document.createElement('div');
  uploadRow.className = 'upload-row';
  uploadRow.appendChild(createUploadLabel('Tirar foto', 'image/*', 'environment', (file) => saveEvidenceFile(task.id, stage.key, 'photo', file)));
  uploadRow.appendChild(createUploadLabel('Gravar video', 'video/*', 'environment', (file) => saveEvidenceFile(task.id, stage.key, 'video', file)));
  box.appendChild(uploadRow);

  return box;
}

async function createExtraEvidenceBox(task) {
  const box = document.createElement('section');
  box.className = 'extra-evidence';

  const heading = document.createElement('div');
  heading.className = 'extra-heading';
  heading.innerHTML = `<div><strong>Extras</strong><span>Fotos, videos ou arquivos adicionais</span></div><em>${task.extraEvidence?.length || 0} arquivo(s)</em>`;
  box.appendChild(heading);

  const previews = document.createElement('div');
  previews.className = 'extra-preview-grid';

  for (const item of task.extraEvidence || []) {
    previews.appendChild(await createExtraPreview(task.id, item));
  }

  if (!task.extraEvidence?.length) {
    const empty = document.createElement('div');
    empty.className = 'extra-empty';
    empty.textContent = 'Nenhum extra enviado.';
    previews.appendChild(empty);
  }

  box.appendChild(previews);

  const uploadRow = document.createElement('div');
  uploadRow.className = 'upload-row extra-upload-row';
  uploadRow.appendChild(createUploadLabel('Foto extra', 'image/*', 'environment', (file) => saveExtraEvidenceFile(task.id, file, 'foto-extra')));
  uploadRow.appendChild(createUploadLabel('Video extra', 'video/*', 'environment', (file) => saveExtraEvidenceFile(task.id, file, 'video-extra')));
  uploadRow.appendChild(createUploadLabel('Galeria', 'image/*,video/*', '', (files) => saveExtraEvidenceFiles(task.id, files, 'galeria-extra'), true));
  uploadRow.appendChild(createUploadLabel('Anexar arquivo', 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx', '', (file) => saveExtraEvidenceFile(task.id, file, 'arquivo-extra')));
  box.appendChild(uploadRow);

  return box;
}

async function createExtraPreview(taskIdValue, item) {
  const wrap = document.createElement('div');
  wrap.className = 'extra-preview';

  const record = await getMedia(item.id);
  if (!record?.blob) {
    const cloudUrl = await getCloudMediaUrl(item.cloudPath);
    if (cloudUrl) {
      appendMediaElement(wrap, cloudUrl, item.type, item.name || 'Arquivo extra');
      appendMediaActions(wrap, cloudUrl, item.name || 'arquivo-extra');
    } else {
      wrap.innerHTML = '<span>Arquivo nao encontrado</span>';
    }
    return wrap;
  }

  const url = URL.createObjectURL(record.blob);
  mediaUrls.push(url);

  appendMediaElement(wrap, url, record.type, item.name || 'Arquivo extra');
  appendMediaActions(wrap, url, item.name || 'arquivo-extra');

  const caption = document.createElement('small');
  caption.textContent = item.name || 'Arquivo extra';
  wrap.appendChild(caption);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'remove-extra';
  remove.textContent = 'Remover';
  remove.addEventListener('click', () => removeExtraEvidence(taskIdValue, item.id));
  wrap.appendChild(remove);

  return wrap;
}

async function createMediaPreview(mediaId, type, name, cloudPath = '', cloudType = '') {
  const wrap = document.createElement('div');
  wrap.className = 'media-preview';

  if (!mediaId && !cloudPath) {
    wrap.innerHTML = `<span>${type === 'photo' ? 'Foto pendente' : 'Video pendente'}</span>`;
    return wrap;
  }

  const record = mediaId ? await getMedia(mediaId) : null;
  if (!record?.blob) {
    const cloudUrl = await getCloudMediaUrl(cloudPath);
    if (cloudUrl) {
      appendMediaElement(wrap, cloudUrl, cloudType || mediaKindToMime(type), name || 'Arquivo anexado');
      appendMediaActions(wrap, cloudUrl, name || 'evidencia');
    } else {
      wrap.innerHTML = `<span>Arquivo nao encontrado</span>`;
    }
    return wrap;
  }

  const url = URL.createObjectURL(record.blob);
  mediaUrls.push(url);

  appendMediaElement(wrap, url, record.type || mediaKindToMime(type), name || 'Arquivo anexado');
  appendMediaActions(wrap, url, name || 'evidencia');

  const caption = document.createElement('small');
  caption.textContent = name || 'Arquivo anexado';
  wrap.appendChild(caption);
  return wrap;
}

function appendMediaElement(wrap, url, mimeType, name) {
  if (mimeType?.startsWith('image/') || mimeType === 'image/*') {
    const image = document.createElement('img');
    image.src = url;
    image.alt = name || 'Imagem';
    wrap.appendChild(image);
    return;
  }

  if (mimeType?.startsWith('video/') || mimeType === 'video/*') {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.preload = 'metadata';
    wrap.appendChild(video);
    return;
  }

  if (mimeType?.startsWith('audio/') || mimeType === 'audio/*') {
    const audio = document.createElement('audio');
    audio.src = url;
    audio.controls = true;
    audio.preload = 'metadata';
    wrap.appendChild(audio);
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = name || 'arquivo';
  link.textContent = 'Abrir arquivo';
  link.target = '_blank';
  link.rel = 'noopener';
  wrap.appendChild(link);
}

function mediaKindToMime(type) {
  if (type === 'photo') return 'image/*';
  if (type === 'video') return 'video/*';
  if (type === 'audio') return 'audio/*';
  return '';
}

function appendMediaActions(wrap, url, name) {
  const actions = document.createElement('div');
  actions.className = 'media-actions';

  const expand = document.createElement('button');
  expand.type = 'button';
  expand.className = 'media-action-link';
  expand.textContent = 'Ampliar';
  expand.addEventListener('click', () => openMediaModal(url, name, wrap));
  actions.appendChild(expand);

  const open = document.createElement('a');
  open.href = url;
  open.target = '_blank';
  open.rel = 'noopener';
  open.className = 'media-action-link';
  open.textContent = 'Abrir';
  actions.appendChild(open);

  const download = document.createElement('button');
  download.type = 'button';
  download.className = 'media-action-link';
  download.textContent = 'Baixar';
  download.addEventListener('click', () => downloadMediaUrl(url, name || 'evidencia'));
  actions.appendChild(download);

  const share = document.createElement('button');
  share.type = 'button';
  share.className = 'media-action-link';
  share.textContent = 'Compartilhar';
  share.addEventListener('click', async () => {
    const title = name || 'evidencia';

    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      alert('Link copiado. Abra no navegador para salvar o arquivo.');
    } catch {
      prompt('Copie este link para abrir ou salvar:', url);
    }
  });
  actions.appendChild(share);

  wrap.appendChild(actions);
}

function openMediaModal(url, name, sourceWrap) {
  const modal = document.querySelector('#mediaModal');
  const body = document.querySelector('#mediaModalBody');
  const open = document.querySelector('#mediaModalOpen');
  const download = document.querySelector('#mediaModalDownload');
  if (!modal || !body || !open || !download) {
    window.open(url, '_blank', 'noopener');
    return;
  }

  body.innerHTML = '';
  const media = sourceWrap.querySelector('img, video, audio');
  const type = media?.tagName?.toLowerCase();

  if (type === 'img') {
    const image = document.createElement('img');
    image.src = url;
    image.alt = name || 'Evidencia';
    body.appendChild(image);
  } else if (type === 'video') {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.autoplay = false;
    body.appendChild(video);
  } else if (type === 'audio') {
    const audio = document.createElement('audio');
    audio.src = url;
    audio.controls = true;
    body.appendChild(audio);
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.textContent = 'Abrir arquivo';
    link.target = '_blank';
    link.rel = 'noopener';
    body.appendChild(link);
  }

  open.href = url;
  download.onclick = () => downloadMediaUrl(url, name || 'evidencia');
  modal.hidden = false;
}

function closeMediaModal() {
  const modal = document.querySelector('#mediaModal');
  const body = document.querySelector('#mediaModalBody');
  if (body) body.innerHTML = '';
  if (modal) modal.hidden = true;
}

async function downloadMediaUrl(url, name) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao baixar arquivo.');

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = name || 'evidencia';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (error) {
    alert('Nao foi possivel baixar direto. Toque em Abrir e salve pelo navegador do celular.');
    console.warn('Falha no download direto', error);
  }
}

function createUploadLabel(text, accept, capture, onFile, multiple = false) {
  const label = document.createElement('label');
  label.className = 'upload-button';
  label.textContent = text;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = multiple;
  if (capture) input.capture = capture;
  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);
    if (files.length) onFile(multiple ? files : files[0]);
    input.value = '';
  });

  label.appendChild(input);
  return label;
}

async function saveEvidenceFile(taskIdValue, stageKey, kind, file) {
  const id = crypto.randomUUID();
  const task = getExistingTask(taskIdValue);
  const stage = stages.find((item) => item.key === stageKey);
  const cloud = task ? await uploadEvidenceFileToCloud(task, file, stage?.label || stageKey, kind, id) : {};

  await putMedia({
    id,
    blob: file,
    name: file.name,
    type: file.type,
    savedAt: new Date().toISOString()
  });

  tasks = tasks.map((task) => {
    if (task.id !== taskIdValue) return task;
    const evidence = {
      ...task.evidence,
      [stageKey]: {
        ...task.evidence[stageKey],
        [`${kind}Id`]: id,
        [`${kind}Name`]: file.name,
        [`${kind}CloudPath`]: cloud.path || '',
        [`${kind}CloudName`]: cloud.name || file.name,
        [`${kind}CloudType`]: cloud.type || file.type
      }
    };
    return { ...task, evidence };
  });

  persist();
  const updatedTask = getExistingTask(taskIdValue);
  if (updatedTask) {
    try {
      await saveTaskToCloud(updatedTask);
    } catch (error) {
      console.warn('Falha ao sincronizar evidencia', error);
    }
  }
  render();
}

async function saveInstructionMediaFile(task, file, kind) {
  const id = crypto.randomUUID();
  const cloud = await uploadEvidenceFileToCloud(task, file, 'instrucao', kind, id);
  if (supabaseClient && !cloud.path) {
    throw new Error('O arquivo foi gravado no aparelho, mas nao subiu para a nuvem.');
  }

  await putMedia({
    id,
    blob: file,
    name: file.name,
    type: file.type,
    savedAt: new Date().toISOString()
  });

  return {
    ...task.instructionMedia,
    [`${kind}Id`]: id,
    [`${kind}Name`]: file.name,
    [`${kind}CloudPath`]: cloud.path || '',
    [`${kind}CloudType`]: cloud.type || file.type
  };
}

async function saveExtraEvidenceFile(taskIdValue, file, kind) {
  const id = crypto.randomUUID();
  const task = getExistingTask(taskIdValue);
  const cloud = task ? await uploadEvidenceFileToCloud(task, file, 'extra', kind, id) : {};

  await putMedia({
    id,
    blob: file,
    name: file.name,
    type: file.type,
    savedAt: new Date().toISOString()
  });

  tasks = tasks.map((task) => {
    if (task.id !== taskIdValue) return task;

    const extraEvidence = [
      ...(task.extraEvidence || []),
      {
        id,
        name: file.name,
        type: file.type,
        kind,
        cloudPath: cloud.path || '',
        cloudName: cloud.name || file.name,
        cloudType: cloud.type || file.type,
        savedAt: new Date().toISOString()
      }
    ];

    return { ...task, extraEvidence };
  });

  persist();
  const updatedTask = getExistingTask(taskIdValue);
  if (updatedTask) {
    try {
      await saveTaskToCloud(updatedTask);
    } catch (error) {
      console.warn('Falha ao sincronizar extra', error);
    }
  }
  render();
}

async function saveExtraEvidenceFiles(taskIdValue, files, kind) {
  const entries = [];

  for (const file of files) {
    const id = crypto.randomUUID();
    const savedAt = new Date().toISOString();
    const task = getExistingTask(taskIdValue);
    const cloud = task ? await uploadEvidenceFileToCloud(task, file, 'extra', kind, id) : {};

    await putMedia({
      id,
      blob: file,
      name: file.name,
      type: file.type,
      savedAt
    });

    entries.push({
      id,
      name: file.name,
      type: file.type,
      kind,
      cloudPath: cloud.path || '',
      cloudName: cloud.name || file.name,
      cloudType: cloud.type || file.type,
      savedAt
    });
  }

  tasks = tasks.map((task) => {
    if (task.id !== taskIdValue) return task;
    return {
      ...task,
      extraEvidence: [
        ...(task.extraEvidence || []),
        ...entries
      ]
    };
  });

  persist();
  const updatedTask = getExistingTask(taskIdValue);
  if (updatedTask) {
    try {
      await saveTaskToCloud(updatedTask);
    } catch (error) {
      console.warn('Falha ao sincronizar extras da galeria', error);
    }
  }
  render();
}

async function uploadEvidenceFileToCloud(task, file, stageLabel, kind, id) {
  if (!supabaseClient) return {};

  if (file.size > maxCloudFileSize) {
    alert(`O arquivo "${file.name}" foi salvo neste aparelho, mas esta muito grande para sincronizar na nuvem.`);
    return {};
  }

  try {
    const fileName = `${id}-${buildFileName(task, stageLabel, kind, file.name)}`;
    const path = buildCloudPath(task, fileName);
    const { error } = await supabaseClient.storage
      .from(supabaseBucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || undefined
      });

    if (error) throw error;

    return {
      path,
      name: fileName,
      type: file.type || ''
    };
  } catch (error) {
    alert(`Arquivo salvo neste aparelho, mas nao sincronizou para outros celulares.\n\n${error.message || error}`);
    return {};
  }
}

async function getCloudMediaUrl(path) {
  if (!path || !supabaseClient) return '';

  try {
    const { data, error } = await supabaseClient.storage
      .from(supabaseBucket)
      .createSignedUrl(path, 60 * 60);

    if (error) throw error;
    return data?.signedUrl || '';
  } catch (error) {
    console.warn('Falha ao gerar link da evidencia', error);
    return '';
  }
}

async function removeExtraEvidence(taskIdValue, mediaId) {
  const confirmed = confirm('Remover este arquivo extra da tarefa?');
  if (!confirmed) return;

  tasks = tasks.map((task) => {
    if (task.id !== taskIdValue) return task;
    return {
      ...task,
      extraEvidence: (task.extraEvidence || []).filter((item) => item.id !== mediaId)
    };
  });

  persist();
  const updatedTask = getExistingTask(taskIdValue);
  if (updatedTask) {
    try {
      await saveTaskToCloud(updatedTask);
    } catch (error) {
      console.warn('Falha ao sincronizar remocao de extra', error);
    }
  }
  render();
}

async function updateExecutionDescription(taskIdValue, description) {
  updateExecutionDescriptionLocal(taskIdValue, description);
  persist();

  const updatedTask = getExistingTask(taskIdValue);
  if (updatedTask) {
    try {
      await saveTaskToCloud(updatedTask);
    } catch (error) {
      console.warn('Falha ao sincronizar descricao do servico', error);
    }
  }
}

function updateExecutionDescriptionLocal(taskIdValue, description) {
  tasks = tasks.map((task) => task.id === taskIdValue
    ? { ...task, executionDescription: description.trim() }
    : task);
}

function requireExecutionDescription(task) {
  if (!hasAnyEvidence(task)) return true;
  if (task.executionDescription?.trim()) return true;

  alert('Antes de enviar, escreva no campo "Descricao do servico executado" o que foi feito nessa tarefa.');
  return false;
}

async function shareEvidence(id) {
  const task = getExistingTask(id);
  if (!task) return;

  const files = await buildEvidenceFiles(task);
  const message = [
    `ENVIAR PARA: ${responsibleName} - ${responsiblePhoneLabel}`,
    ``,
    `Gtech Servicos - evidencias da tarefa`,
    `Tarefa: ${task.title}`,
    `Funcionario: ${task.employee}`,
    `Obra: ${task.site}`,
    task.location ? `Local: ${task.location}` : '',
    `Status: ${task.status}`,
    `Descricao do servico: ${task.executionDescription || 'Nao informada'}`,
    evidenceSummary(task)
  ].filter(Boolean).join('\n');

  if (!files.length) {
    alert('Ainda nao existem fotos ou videos nesta tarefa.');
    return;
  }

  if (!requireExecutionDescription(task)) return;

  const confirmed = confirm(`Agora escolha o WhatsApp e envie para:\n\n${responsibleName}\n${responsiblePhoneLabel}\n\nO celular nao permite escolher o contato automaticamente quando tem foto e video anexados.`);
  if (!confirmed) return;

  if (navigator.canShare?.({ files }) && navigator.share) {
    try {
      await navigator.share({
        title: `Evidencias - ${task.title}`,
        text: message,
        files
      });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }

  downloadEvidenceFiles(files);
  openResponsibleWhatsApp(message);
  alert('O celular nao permitiu anexar os arquivos direto pelo navegador. Baixei as evidencias; agora envie esses arquivos para o responsavel pelo WhatsApp.');
}

async function uploadEvidenceToCloud(id) {
  const task = getExistingTask(id);
  if (!task) return;

  if (!supabaseClient) {
    alert('Supabase ainda nao foi configurado. Preencha o arquivo supabase-config.js com a URL e a chave publica.');
    return;
  }

  if (!hasAnyEvidence(task) && !hasInstructionMedia(task)) {
    alert('Ainda nao existem fotos, videos ou instrucao nesta tarefa.');
    return;
  }

  if (!requireExecutionDescription(task)) return;

  const confirmed = confirm('Sincronizar as evidencias desta tarefa para o responsavel ver e baixar pelo app?');
  if (!confirmed) return;

  try {
    let updatedTask = task;

    for (const kind of ['audio', 'video']) {
      const instruction = updatedTask.instructionMedia || createEmptyInstructionMedia();
      const mediaId = instruction[`${kind}Id`];
      const cloudPath = instruction[`${kind}CloudPath`];
      if (!mediaId || cloudPath) continue;

      const record = await getMedia(mediaId);
      if (!record?.blob) {
        throw new Error('Nao encontrei o arquivo da instrucao neste aparelho. Grave ou escolha o audio novamente e salve a tarefa.');
      }

      const file = new File([record.blob], record.name || `instrucao-${kind}`, { type: record.type || record.blob.type });
      const cloud = await uploadEvidenceFileToCloud(updatedTask, file, 'instrucao', kind, mediaId);
      if (!cloud.path) {
        throw new Error('A instrucao nao subiu para a nuvem. Verifique a internet e tente sincronizar de novo.');
      }
      updatedTask = {
        ...updatedTask,
        instructionMedia: {
          ...instruction,
          [`${kind}CloudPath`]: cloud.path || '',
          [`${kind}CloudType`]: cloud.type || record.type || ''
        }
      };
    }

    for (const stage of stages) {
      for (const kind of ['photo', 'video']) {
        const evidenceItem = updatedTask.evidence[stage.key] || {};
        const mediaId = evidenceItem[`${kind}Id`];
        const cloudPath = evidenceItem[`${kind}CloudPath`];
        if (!mediaId || cloudPath) continue;

        const record = await getMedia(mediaId);
        if (!record?.blob) continue;

        const file = new File([record.blob], record.name || `${kind}-${stage.key}`, { type: record.type || record.blob.type });
        const cloud = await uploadEvidenceFileToCloud(updatedTask, file, stage.label, kind, mediaId);
        updatedTask = {
          ...updatedTask,
          evidence: {
            ...updatedTask.evidence,
            [stage.key]: {
              ...evidenceItem,
              [`${kind}CloudPath`]: cloud.path || '',
              [`${kind}CloudName`]: cloud.name || record.name || '',
              [`${kind}CloudType`]: cloud.type || record.type || ''
            }
          }
        };
      }
    }

    const extraEvidence = [];
    for (const item of updatedTask.extraEvidence || []) {
      if (item.cloudPath) {
        extraEvidence.push(item);
        continue;
      }

      const record = await getMedia(item.id);
      if (!record?.blob) {
        extraEvidence.push(item);
        continue;
      }

      const file = new File([record.blob], record.name || item.name || 'extra', { type: record.type || record.blob.type });
      const cloud = await uploadEvidenceFileToCloud(updatedTask, file, 'extra', item.kind || 'arquivo-extra', item.id);
      extraEvidence.push({
        ...item,
        cloudPath: cloud.path || '',
        cloudName: cloud.name || item.name || '',
        cloudType: cloud.type || item.type || ''
      });
    }

    updatedTask = { ...updatedTask, extraEvidence };
    tasks = tasks.map((current) => current.id === id ? updatedTask : current);
    persist();
    await saveTaskToCloud(updatedTask);
    render();
    alert('Evidencias sincronizadas. O responsavel ja pode ver e baixar pelo app.');
  } catch (error) {
    const failedToFetch = String(error.message || error).toLowerCase().includes('failed to fetch');
    const details = [
      error.message,
      error.error_description,
      error.details,
      error.hint,
      error.statusCode ? `Codigo: ${error.statusCode}` : ''
    ].filter(Boolean).join('\n');

    if (failedToFetch) {
      alert(`Nao foi possivel enviar para a nuvem.\n\nFalha de conexao com o Supabase.\nVersao do app: ${appVersion}\n\nFeche o app, abra de novo pelo link do Netlify e teste primeiro com uma foto pequena.`);
      return;
    }

    alert(`Nao foi possivel enviar para a nuvem.\nVersao do app: ${appVersion}\n\n${details || 'Sem detalhe do erro.'}`);
  }
}

function openResponsibleWhatsApp(message) {
  const url = `https://wa.me/${responsibleWhatsApp}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
}

async function buildEvidenceFiles(task) {
  const files = [];

  for (const stage of stages) {
    const item = task.evidence[stage.key];
    if (item.photoId) {
      const record = await getMedia(item.photoId);
      if (record?.blob) {
        files.push(new File([record.blob], buildFileName(task, stage.label, 'foto', record.name), { type: record.type || record.blob.type }));
      }
    }

    if (item.videoId) {
      const record = await getMedia(item.videoId);
      if (record?.blob) {
        files.push(new File([record.blob], buildFileName(task, stage.label, 'video', record.name), { type: record.type || record.blob.type }));
      }
    }
  }

  for (const item of task.extraEvidence || []) {
    const record = await getMedia(item.id);
    if (record?.blob) {
      files.push(new File([record.blob], buildFileName(task, 'extra', item.kind || 'arquivo', record.name), { type: record.type || record.blob.type }));
    }
  }

  return files;
}

function buildFileName(task, stageLabel, kind, originalName) {
  const extension = originalName?.includes('.') ? originalName.split('.').pop() : kind === 'foto' ? 'jpg' : 'mp4';
  const base = [
    task.site,
    task.employee,
    stageLabel,
    kind
  ].map(slug).filter(Boolean).join('-');

  return `${base || 'evidencia'}.${extension}`;
}

function downloadEvidenceFiles(files) {
  files.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    setTimeout(() => {
      link.click();
      URL.revokeObjectURL(url);
    }, index * 350);
  });
}

function buildCloudPath(task, fileName) {
  const date = new Date().toISOString().slice(0, 10);
  return [
    date,
    slug(task.site) || 'obra',
    slug(task.employee) || 'funcionario',
    slug(task.title) || 'tarefa',
    fileName
  ].join('/');
}

function evidenceSummary(task) {
  const total = stages.length * 2;
  const extras = task.extraEvidence?.length || 0;
  const completed = stages.reduce((count, stage) => {
    const item = task.evidence[stage.key];
    return count + (item.photoId ? 1 : 0) + (item.videoId ? 1 : 0);
  }, 0);

  return `Evidencias: ${completed}/${total} anexadas${extras ? ` + ${extras} extra(s)` : ''}${completed === total ? ' - pronto para enviar' : ' - incompleto'}`;
}

function missingEvidenceItems(task) {
  return stages.flatMap((stage) => {
    const item = task.evidence[stage.key] || {};
    const missing = [];

    if (!item.photoId) missing.push(`foto do ${stage.label.toLowerCase()}`);
    if (!item.videoId) missing.push(`video do ${stage.label.toLowerCase()}`);

    return missing;
  });
}

function isEvidenceComplete(task) {
  return stages.every((stage) => {
    const item = task.evidence[stage.key];
    return item?.photoId && item?.videoId;
  });
}

function hasAnyEvidence(task) {
  return stages.some((stage) => {
    const item = task.evidence[stage.key];
    return item?.photoId || item?.videoId;
  }) || Boolean(task.extraEvidence?.length);
}

function hasInstructionMedia(task) {
  const media = task.instructionMedia || {};
  return Boolean(media.audioId || media.audioCloudPath || media.videoId || media.videoCloudPath);
}

function stageStatus(data) {
  if (data.photoId && data.videoId) return 'Completo';
  if (data.photoId || data.videoId) return 'Parcial';
  return 'Pendente';
}

function buildInfoLine(task) {
  const pieces = [];
  if (task.location) pieces.push(task.location);
  if (task.dueDate) pieces.push(`Prazo: ${formatDate(task.dueDate)}`);
  pieces.push(`Status: ${task.status}`);
  if (task.reviewed) pieces.push(`Conferido por ${task.reviewedBy || 'responsavel'}`);
  return pieces.join(' - ');
}

function renderStats() {
  const visibleTasks = currentUser?.role === 'funcionario'
    ? tasks.filter((task) => task.employee === currentUser.name || isAllEmployeesTask(task))
    : tasks;
  const total = visibleTasks.length;
  const pending = visibleTasks.filter((task) => task.status === 'Pendente').length;
  const progress = visibleTasks.filter((task) => task.status === 'Em andamento').length;
  const done = visibleTasks.filter((task) => task.status === 'Concluida').length;
  const incomplete = visibleTasks.filter((task) => !isEvidenceComplete(task)).length;
  const ready = visibleTasks.filter((task) => isEvidenceComplete(task) && !task.reviewed).length;
  const reviewed = visibleTasks.filter((task) => task.reviewed).length;
  const late = visibleTasks.filter((task) => isLate(task)).length;

  const stats = currentUser?.role === 'responsavel'
    ? [
      ['Total', total],
      ['Incompletas', incomplete],
      ['Prontas p/ conferir', ready],
      ['Atrasadas', late],
      ['Conferidas', reviewed]
    ]
    : [
      ['Total', total],
      ['Pendentes', pending],
      ['Em andamento', progress],
      ['Concluidas', done]
    ];

  statsGrid.innerHTML = stats.map(([label, value]) => (
    `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`
  )).join('');
}

function renderLists() {
  const employees = currentUser?.role === 'funcionario'
    ? [currentUser.name]
    : [...new Set([
      ...Object.entries(users).filter(([, user]) => user.role === 'funcionario').map(([name]) => name),
      ...tasks.map((task) => task.employee).filter(Boolean),
      ...inventoryItems.map((item) => item.employee).filter(Boolean),
      'Estoque'
    ])].sort();
  const sites = [...new Set(tasks.map((task) => task.site).filter(Boolean))].sort();

  employeeList.innerHTML = employees.map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');
  siteList.innerHTML = sites.map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');
}

function renderInventoryLists() {
  const categories = [...new Set(inventoryItems.map((item) => item.category).filter(Boolean))].sort();
  const locations = [...new Set(inventoryItems.map((item) => item.location).filter(Boolean))].sort();
  const employees = [...new Set(inventoryItems.map((item) => item.employee).filter(Boolean))].sort();

  categoryList.innerHTML = categories.map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');
  inventoryLocationList.innerHTML = locations.map((item) => `<option value="${escapeHtml(item)}"></option>`).join('');
  renderSelectOptions(inventoryLocationFilter, locations, 'Todos');
  renderSelectOptions(inventoryEmployeeFilter, employees, 'Todos');
  renderSelectOptions(inventoryCategoryFilter, categories, 'Todas');
}

function renderSelectOptions(select, values, emptyLabel) {
  if (!select) return;

  const selected = select.value;
  select.innerHTML = [
    `<option value="">${emptyLabel}</option>`,
    ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
  ].join('');
  select.value = values.includes(selected) ? selected : '';
}

function clearInventoryFilters() {
  inventorySearchInput.value = '';
  inventoryLocationFilter.value = '';
  inventoryEmployeeFilter.value = '';
  inventoryCategoryFilter.value = '';
  inventoryLowStockFilter.checked = false;
  renderInventory();
}

function editInventoryItem(id) {
  if (currentUser?.role !== 'responsavel') {
    alert('Somente Fabio e Adriano podem editar o estoque.');
    return;
  }

  const item = getExistingInventoryItem(id);
  if (!item) return;

  inventoryId.value = item.id;
  inventoryName.value = item.name;
  inventoryCode.value = item.code;
  inventoryEmployee.value = item.employee;
  inventoryQuantity.value = item.quantity;
  inventoryUnit.value = item.unit;
  inventoryMinimum.value = item.minimum;
  inventoryCategory.value = item.category;
  inventoryStatus.value = item.status;
  inventoryLocation.value = item.location;
  inventoryNotes.value = item.notes;
  saveInventoryBtn.textContent = 'Atualizar item';
  scrollToInventoryForm();
  setTimeout(() => inventoryQuantity.focus(), 250);
}

async function adjustInventoryQuantity(id, type) {
  if (currentUser?.role !== 'responsavel') {
    alert('Somente Fabio e Adriano podem atualizar quantidade.');
    return;
  }

  const item = getExistingInventoryItem(id);
  if (!item) return;

  const label = type === 'entrada' ? 'entrada' : 'baixa';
  const rawAmount = prompt(`Quantidade de ${label} para "${item.name}":`, '1');
  if (rawAmount === null) return;

  const amount = Number(rawAmount.replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) {
    alert('Informe uma quantidade maior que zero.');
    return;
  }

  const nextQuantity = type === 'entrada'
    ? item.quantity + amount
    : item.quantity - amount;

  if (nextQuantity < 0) {
    alert('A baixa e maior que a quantidade atual em estoque.');
    return;
  }

  const reason = chooseInventoryReason(type);
  if (!reason) return;

  const note = prompt('Observacao, se tiver:', reason);
  if (note === null) return;

  const now = new Date().toISOString();
  const updated = {
    ...item,
    quantity: nextQuantity,
    lastMoveFrom: type === 'entrada' ? `Entrada: +${formatNumber(amount)} ${item.unit || 'un'}` : `Baixa: -${formatNumber(amount)} ${item.unit || 'un'}`,
    lastMoveTo: item.location || 'Estoque',
    lastMoveBy: currentUser.name,
    lastMoveAt: now,
    lastMoveNote: note.trim() || reason,
    history: addInventoryHistory(
      item,
      type === 'entrada' ? 'Entrada' : 'Baixa',
      `${type === 'entrada' ? '+' : '-'}${formatNumber(amount)} ${item.unit || 'un'} - ${note.trim() || reason}`
    ),
    updatedAt: now
  };

  inventoryItems = inventoryItems.map((current) => current.id === id ? updated : current);
  persistInventory();
  renderInventory();
  renderLists();

  try {
    await saveInventoryToCloud(updated);
    alert(type === 'entrada' ? 'Entrada registrada com sucesso.' : 'Baixa registrada com sucesso.');
  } catch (error) {
    alert(`Quantidade atualizada neste aparelho, mas nao sincronizou na nuvem.\n\n${error.message || error}`);
  }
}

function chooseInventoryReason(type) {
  const options = type === 'entrada'
    ? [
      ['1', 'Compra'],
      ['2', 'Devolucao ao estoque'],
      ['3', 'Ajuste de contagem'],
      ['4', 'Outro']
    ]
    : [
      ['1', 'Quebrou'],
      ['2', 'Perdido'],
      ['3', 'Descarte'],
      ['4', 'Consumido na obra'],
      ['5', 'Ajuste de contagem'],
      ['6', 'Outro']
    ];

  const message = [
    `Motivo da ${type === 'entrada' ? 'entrada' : 'baixa'}:`,
    ...options.map(([key, label]) => `${key} - ${label}`)
  ].join('\n');

  const selected = prompt(message, '1');
  if (selected === null) return '';

  const found = options.find(([key]) => key === selected.trim());
  if (!found) {
    alert('Escolha um motivo valido.');
    return '';
  }

  if (found[1] !== 'Outro') return found[1];

  const custom = prompt('Informe o motivo:', '');
  if (custom === null) return '';

  const cleaned = custom.trim();
  if (!cleaned) {
    alert('Informe o motivo.');
    return '';
  }

  return cleaned;
}

async function moveInventoryItem(id) {
  if (currentUser?.role !== 'responsavel') {
    alert('Somente Fabio e Adriano podem transferir itens.');
    return;
  }

  const item = getExistingInventoryItem(id);
  if (!item) return;

  const nextEmployee = prompt('Quem ficara responsavel pelo item? Use "Estoque" se voltou para o estoque.', item.employee || 'Estoque');
  if (nextEmployee === null) return;

  const nextLocation = prompt('Qual obra ou local atual da ferramenta?', item.location || '');
  if (nextLocation === null) return;

  const note = prompt('Observacao da transferencia, se tiver:', '');
  if (note === null) return;

  const cleaned = nextEmployee.trim() || 'Estoque';
  const cleanedLocation = nextLocation.trim() || 'Sem obra/local informado';
  const now = new Date().toISOString();
  const updated = {
    ...item,
    employee: cleaned,
    location: cleanedLocation,
    lastMoveFrom: item.location || item.employee || 'Origem nao informada',
    lastMoveTo: cleanedLocation,
    lastMoveBy: currentUser.name,
    lastMoveAt: now,
    lastMoveNote: note.trim(),
    history: addInventoryHistory(
      item,
      'Transferencia',
      `${item.location || item.employee || 'Origem nao informada'} -> ${cleanedLocation}. Responsavel: ${cleaned}`
    ),
    updatedAt: now
  };

  inventoryItems = inventoryItems.map((current) => current.id === id ? updated : current);
  persistInventory();
  try {
    await saveInventoryToCloud(updated);
    alert('Transferencia registrada com sucesso.');
  } catch (error) {
    alert(`Transferencia salva neste aparelho, mas nao sincronizou na nuvem.\n\n${error.message || error}`);
  }
  renderInventory();
  renderLists();
}

function alertInventoryMove(id) {
  const item = getExistingInventoryItem(id);
  if (!item) return;

  const nextLocation = prompt('Para qual obra/local esta ferramenta foi levada?', item.location || '');
  if (nextLocation === null) return;

  const note = prompt('Alguma observacao para o responsavel?', '');
  if (note === null) return;

  const message = [
    'Getch Servicos - aviso de mudanca de ferramenta',
    `Item: ${item.name}`,
    `Quantidade: ${formatNumber(item.quantity)} ${item.unit || 'un'}`,
    `Responsavel atual: ${item.employee || 'Estoque'}`,
    `Local anterior: ${item.location || 'Nao informado'}`,
    `Novo local: ${nextLocation.trim() || 'Nao informado'}`,
    `Avisado por: ${currentUser?.name || 'Usuario do app'}`,
    note.trim() ? `Observacao: ${note.trim()}` : ''
  ].filter(Boolean).join('\n');

  openResponsibleWhatsApp(message);
}

function showInventoryHistory(id) {
  const item = getExistingInventoryItem(id);
  if (!item) return;

  const rows = (item.history || []).slice(0, 15).map((entry) => (
    `${formatDateTime(entry.at)} - ${entry.type}: ${entry.description}${entry.user ? ` (${entry.user})` : ''}`
  ));

  alert([
    `Historico - ${item.name}`,
    item.code ? `Codigo: ${item.code}` : '',
    '',
    rows.length ? rows.join('\n') : 'Ainda nao existe historico para este item.'
  ].filter(Boolean).join('\n'));
}

async function checkInventoryItem(id) {
  if (currentUser?.role !== 'responsavel') {
    alert('Somente Fabio e Adriano podem conferir itens.');
    return;
  }

  const item = getExistingInventoryItem(id);
  if (!item) return;

  const note = prompt(`Observacao da conferencia de "${item.name}", se tiver:`, 'Conferido');
  if (note === null) return;

  const now = new Date().toISOString();
  const updated = {
    ...item,
    checkedBy: currentUser.name,
    checkedAt: now,
    history: addInventoryHistory(item, 'Conferencia', note.trim() || 'Conferido'),
    updatedAt: now
  };

  inventoryItems = inventoryItems.map((current) => current.id === id ? updated : current);
  persistInventory();
  renderInventory();

  try {
    await saveInventoryToCloud(updated);
    alert('Item conferido com sucesso.');
  } catch (error) {
    alert(`Conferencia salva neste aparelho, mas nao sincronizou na nuvem.\n\n${error.message || error}`);
  }
}

async function deleteInventoryItem(id) {
  if (currentUser?.role !== 'responsavel') {
    alert('Somente Fabio e Adriano podem excluir itens.');
    return;
  }

  const item = getExistingInventoryItem(id);
  if (!item) return;

  const confirmed = confirm(`Excluir "${item.name}" do estoque?`);
  if (!confirmed) return;

  inventoryItems = inventoryItems.filter((current) => current.id !== id);
  persistInventory();
  try {
    await deleteInventoryFromCloud(id);
  } catch (error) {
    alert(`Item excluido deste aparelho, mas nao foi excluido da nuvem.\n\n${error.message || error}`);
  }
  renderInventory();
  renderLists();
}

async function updateStatus(id, status) {
  tasks = tasks.map((task) => task.id === id ? { ...task, status } : task);
  persist();
  const updatedTask = getExistingTask(id);
  if (updatedTask) {
    try {
      await saveTaskToCloud(updatedTask);
    } catch (error) {
      alert(`Status alterado neste aparelho, mas nao sincronizou na nuvem.\n\n${error.message || error}`);
    }
  }
  render();
}

async function updateReview(id, reviewed) {
  if (currentUser?.role !== 'responsavel') {
    alert('Somente Fabio e Adriano podem conferir tarefas.');
    return;
  }

  tasks = tasks.map((task) => task.id === id
    ? {
      ...task,
      reviewed,
      reviewedBy: reviewed ? currentUser.name : '',
      reviewedAt: reviewed ? new Date().toISOString() : ''
    }
    : task);
  persist();

  const updatedTask = getExistingTask(id);
  if (updatedTask) {
    try {
      await saveTaskToCloud(updatedTask);
    } catch (error) {
      alert(`Conferencia alterada neste aparelho, mas nao sincronizou na nuvem.\n\n${error.message || error}`);
    }
  }

  render();
}

function isLate(task) {
  if (!task.dueDate || task.status === 'Concluida' || task.reviewed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${task.dueDate}T00:00:00`);
  return due < today;
}

function editTask(id) {
  if (currentUser?.role !== 'responsavel') {
    alert('Somente Fabio e Adriano podem editar tarefas.');
    return;
  }

  const task = getExistingTask(id);
  if (!task) return;

  taskId.value = task.id;
  title.value = task.title;
  employee.value = task.employee;
  allEmployeesToggle.checked = isAllEmployeesTask(task);
  updateAllEmployeesToggle();
  site.value = task.site;
  locationInput.value = task.location;
  dueDate.value = task.dueDate;
  priority.value = task.priority;
  notes.value = task.notes;
  saveBtn.textContent = 'Atualizar tarefa';
  title.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteTask(id) {
  if (currentUser?.role !== 'responsavel') {
    alert('Somente Fabio e Adriano podem excluir tarefas.');
    return;
  }

  const task = getExistingTask(id);
  if (!task) return;

  const confirmed = confirm(`Excluir a tarefa "${task.title}"?`);
  if (!confirmed) return;

  tasks = tasks.filter((item) => item.id !== id);
  persist();
  try {
    await deleteTaskFromCloud(id);
  } catch (error) {
    alert(`Tarefa excluida deste aparelho, mas nao foi excluida da nuvem.\n\n${error.message || error}`);
  }
  render();
}

function exportBackup() {
  const backup = {
    version: appVersion,
    exportedAt: new Date().toISOString(),
    tasks,
    inventoryItems
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `backup-getch-obras-${today}.json`;
  link.click();
  URL.revokeObjectURL(url);
  alert('Backup das tarefas e do estoque exportado. As fotos e videos ficam salvos neste navegador.');
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      const importedTasks = Array.isArray(imported) ? imported : imported.tasks;
      const importedInventory = Array.isArray(imported.inventoryItems) ? imported.inventoryItems : [];

      if (!Array.isArray(importedTasks)) throw new Error('Formato invalido');
      tasks = importedTasks.map(normalizeTask);
      inventoryItems = importedInventory.map(normalizeInventoryItem);
      persist();
      persistInventory();
      render();
      renderInventory();
      clearForm();
      clearInventoryForm();
      alert('Backup importado com sucesso.');
    } catch {
      alert('Nao foi possivel importar este arquivo.');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function openMediaDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(dbStore, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putMedia(record) {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(dbStore, 'readwrite');
    transaction.objectStore(dbStore).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getMedia(id) {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(dbStore, 'readonly');
    const request = transaction.objectStore(dbStore).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function revokeMediaUrls() {
  mediaUrls.forEach((url) => URL.revokeObjectURL(url));
  mediaUrls = [];
}

function formatDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    maximumFractionDigits: 2
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function slug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
