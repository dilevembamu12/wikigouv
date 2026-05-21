require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const app = express();
const PORT = process.env.PORT || 7890;

// ==============================
// CONFIG
// ==============================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Expose /public à la racine
app.use(express.static(path.join(__dirname, 'public')));

// ==============================
// PATHS
// ==============================
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'assets', 'data');

const CATALOGUE_PATH = path.join(DATA_DIR, 'catalogue.json');
const EMPLOYEES_PATH = path.join(DATA_DIR, 'employees.json');
const PARTICIPANTS_PATH = path.join(DATA_DIR, 'participants.json');

// ==============================
// HELPERS
// ==============================
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeSlug(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ==============================
// CATALOGUE HELPERS
// ==============================
function ensureCatalogueFile() {
  ensureDir(path.dirname(CATALOGUE_PATH));

  if (!fs.existsSync(CATALOGUE_PATH)) {
    const initialData = {
      meta: {
        title: 'Catalogue de formation FinTraX - Déploiement ARTF',
        version: '1.0.0',
        language: 'fr',
        organization: 'ARTF',
        description:
          'Catalogue structuré par métier, rôle, objectifs, compétences et modules pour le déploiement de FinTraX.'
      },
      themes_reference: [],
      fiches: []
    };

    fs.writeFileSync(CATALOGUE_PATH, JSON.stringify(initialData, null, 2), 'utf8');
    console.log(`🆕 catalogue.json créé: ${CATALOGUE_PATH}`);
  }
}

async function readCatalogue() {
  ensureCatalogueFile();
  const raw = await fsp.readFile(CATALOGUE_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{}');

  if (!parsed.fiches || !Array.isArray(parsed.fiches)) parsed.fiches = [];
  if (!parsed.meta || typeof parsed.meta !== 'object') parsed.meta = {};
  if (!parsed.themes_reference || !Array.isArray(parsed.themes_reference)) parsed.themes_reference = [];

  return parsed;
}

async function writeCatalogue(data) {
  ensureCatalogueFile();
  await fsp.writeFile(CATALOGUE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function normalizeFiche(input = {}) {
  return {
    id: String(input.id || '').trim() || `fiche_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    familleMetier: String(input.familleMetier || '').trim(),
    type: String(input.type || 'metier').trim(),
    roleTitle: String(input.roleTitle || '').trim(),
    directions: String(input.directions || '').trim(),
    descriptionPoste: String(input.descriptionPoste || '').trim(),
    objectifs: Array.isArray(input.objectifs) ? input.objectifs.map(v => String(v).trim()).filter(Boolean) : [],
    competences: Array.isArray(input.competences) ? input.competences.map(v => String(v).trim()).filter(Boolean) : [],
    modules: Array.isArray(input.modules)
      ? input.modules.map(m => ({
          theme: String(m?.theme || '').trim(),
          titre: String(m?.titre || '').trim(),
          reference: String(m?.reference || '').trim()
        }))
      : [],
    prerequis: String(input.prerequis || '').trim(),
    duree: String(input.duree || '').trim(),
    modeFormation: String(input.modeFormation || '').trim(),
    livrables: String(input.livrables || '').trim(),
    validation: String(input.validation || '').trim()
  };
}

function isValidFiche(fiche) {
  return fiche && fiche.roleTitle && fiche.roleTitle.length > 0;
}

// ==============================
// EMPLOYEES HELPERS
// ==============================
function inferDirection(emp = {}) {
  const pages = Array.isArray(emp.source_pages) ? emp.source_pages : [];
  if (!pages.length) return 'Administration générale';

  const first = Math.min(...pages);
  if (first <= 4) return 'Direction Réglementation';
  if (first <= 8) return 'Direction Contrôle';
  if (first <= 12) return 'Direction Opérations';
  if (first <= 16) return 'Direction Support';
  return 'Direction Générale';
}

function inferGroup(emp = {}) {
  const occ = Number(emp.occurrences || 0);
  if (occ >= 10) return 'Groupe A';
  if (occ >= 7) return 'Groupe B';
  if (occ >= 4) return 'Groupe C';
  return 'Groupe D';
}

function inferCategory(emp = {}) {
  const occ = Number(emp.occurrences || 0);
  if (occ >= 8) return 'metier';
  if (occ >= 4) return 'technique';
  return 'ouvert';
}

function inferTheme(emp = {}) {
  const occ = Number(emp.occurrences || 0);
  if (occ >= 10) return 'Knowledge transfer';
  if (occ >= 7) return 'Conformité';
  if (occ >= 4) return 'Transition numérique';
  return 'Intégration';
}

function inferModule(emp = {}) {
  const occ = Number(emp.occurrences || 0);
  if (occ >= 10) return 'Module expert';
  if (occ >= 7) return 'Module avancé';
  if (occ >= 4) return 'Module intermédiaire';
  return 'Module de base';
}

function inferRole(emp = {}) {
  const category = inferCategory(emp);
  if (category === 'metier') return 'Agent métier';
  if (category === 'technique') return 'Agent technique';
  return 'Parcours ouvert';
}

function ensureEmployeesFile() {
  ensureDir(path.dirname(EMPLOYEES_PATH));

  if (!fs.existsSync(EMPLOYEES_PATH)) {
    const initialData = {
      source_file: 'employees.json',
      source_type: 'manual_or_generated',
      note: 'Répertoire des employés WikiGouv',
      employee_count: 0,
      employees: []
    };

    fs.writeFileSync(EMPLOYEES_PATH, JSON.stringify(initialData, null, 2), 'utf8');
    console.log(`🆕 employees.json créé: ${EMPLOYEES_PATH}`);
  }
}

function normalizeEmployee(input = {}, index = 0) {
  const fullName =
    String(input.full_name || input.name || '').trim() ||
    `Employé ${index + 1}`;

  const occurrences = Number(input.occurrences || 1);
  const sourcePages = Array.isArray(input.source_pages)
    ? input.source_pages.map(v => Number(v)).filter(v => Number.isFinite(v))
    : [];

  const generatedId =
    String(input.id || '').trim() ||
    `emp_${safeSlug(fullName || String(index + 1))}` ||
    uid('emp');

  return {
    id: generatedId,
    code: String(input.code || '').trim() || `ARTF-${String(index + 1).padStart(4, '0')}`,
    full_name: fullName,
    direction: String(input.direction || '').trim() || inferDirection({ source_pages: sourcePages, occurrences }),
    group: String(input.group || '').trim() || inferGroup({ occurrences }),
    category: String(input.category || '').trim() || inferCategory({ occurrences }),
    theme: String(input.theme || '').trim() || inferTheme({ occurrences }),
    module: String(input.module || '').trim() || inferModule({ occurrences }),
    role: String(input.role || '').trim() || inferRole({ occurrences }),
    email: String(input.email || '').trim(),
    phone: String(input.phone || '').trim(),
    status: String(input.status || '').trim() || 'Actif',
    notes: String(input.notes || '').trim(),
    jobDescription: String(input.jobDescription || input.job_description || '').trim(),
    source_pages: sourcePages,
    occurrences,
    source_full_name: String(input.source_full_name || fullName).trim()
  };
}

function validateEmployee(emp) {
  return emp && emp.full_name && emp.full_name.length > 0;
}

async function readEmployees() {
  ensureEmployeesFile();
  const raw = await fsp.readFile(EMPLOYEES_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{}');

  if (!Array.isArray(parsed.employees)) parsed.employees = [];
  if (!parsed.source_file) parsed.source_file = path.basename(EMPLOYEES_PATH);
  if (!parsed.source_type) parsed.source_type = 'manual_or_generated';
  if (typeof parsed.note !== 'string') parsed.note = '';

  parsed.employees = parsed.employees.map((emp, idx) => normalizeEmployee(emp, idx));
  parsed.employee_count = parsed.employees.length;

  return parsed;
}

async function writeEmployees(data) {
  ensureEmployeesFile();

  const payload = {
    source_file: String(data?.source_file || path.basename(EMPLOYEES_PATH)),
    source_type: String(data?.source_type || 'manual_or_generated'),
    note: String(data?.note || ''),
    employee_count: Array.isArray(data?.employees) ? data.employees.length : 0,
    employees: Array.isArray(data?.employees)
      ? data.employees.map((emp, idx) => normalizeEmployee(emp, idx))
      : []
  };

  await fsp.writeFile(EMPLOYEES_PATH, JSON.stringify(payload, null, 2), 'utf8');
}

// ==============================
// PARTICIPANTS HELPERS
// ==============================
function ensureParticipantsFile() {
  ensureDir(path.dirname(PARTICIPANTS_PATH));

  if (!fs.existsSync(PARTICIPANTS_PATH)) {
    const initialData = {
      source_file: 'participants.json',
      source_type: 'registration_form',
      note: 'Liste des participants inscrits sur la plateforme WikiGouv.',
      participant_count: 0,
      participants: []
    };

    fs.writeFileSync(PARTICIPANTS_PATH, JSON.stringify(initialData, null, 2), 'utf8');
    console.log(`participants.json created: ${PARTICIPANTS_PATH}`);
  }
}

function normalizeParticipant(input = {}, index = 0) {
  const fullName =
    String(input.full_name || input.fullName || '').trim() ||
    `Participant ${index + 1}`;

  const email = String(input.email || '').trim().toLowerCase();
  const phone = String(input.phone || '').trim();

  return {
    id: String(input.id || '').trim() || uid('part'),
    full_name: fullName,
    niu_number: String(input.niu_number || input.niuNumber || '').trim(),
    email,
    phone,
    gender: String(input.gender || '').trim(),
    birth_date: String(input.birth_date || input.birthDate || '').trim(),
    organization: String(input.organization || '').trim(),
    direction: String(input.direction || '').trim(),
    role: String(input.role || '').trim(),
    years_experience: String(input.years_experience || input.yearsExperience || '').trim(),
    learning_goals: String(input.learning_goals || input.learningGoals || '').trim(),
    preferred_mode: String(input.preferred_mode || input.preferredMode || '').trim(),
    availability: String(input.availability || '').trim(),
    city: String(input.city || '').trim(),
    consent_data: Boolean(input.consent_data),
    consent_contact: Boolean(input.consent_contact),
    created_at: String(input.created_at || '').trim() || new Date().toISOString()
  };
}

function isEmailValid(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function validateParticipant(participant) {
  const missing = [];

  if (!participant.full_name) missing.push('full_name');
  if (!participant.email) missing.push('email');
  if (!participant.phone) missing.push('phone');
  if (!participant.organization) missing.push('organization');
  if (!participant.role) missing.push('role');
  if (!participant.learning_goals) missing.push('learning_goals');
  if (!participant.consent_data) missing.push('consent_data');
  if (participant.email && !isEmailValid(participant.email)) missing.push('email_invalid');

  return {
    ok: missing.length === 0,
    missing
  };
}

async function readParticipants() {
  ensureParticipantsFile();
  const raw = await fsp.readFile(PARTICIPANTS_PATH, 'utf8');
  const parsed = JSON.parse(raw || '{}');

  if (!Array.isArray(parsed.participants)) parsed.participants = [];
  if (!parsed.source_file) parsed.source_file = path.basename(PARTICIPANTS_PATH);
  if (!parsed.source_type) parsed.source_type = 'registration_form';
  if (typeof parsed.note !== 'string') parsed.note = '';

  parsed.participants = parsed.participants.map((participant, idx) => normalizeParticipant(participant, idx));
  parsed.participant_count = parsed.participants.length;

  return parsed;
}

async function writeParticipants(data) {
  ensureParticipantsFile();

  const payload = {
    source_file: String(data?.source_file || path.basename(PARTICIPANTS_PATH)),
    source_type: String(data?.source_type || 'registration_form'),
    note: String(data?.note || ''),
    participant_count: Array.isArray(data?.participants) ? data.participants.length : 0,
    participants: Array.isArray(data?.participants)
      ? data.participants.map((participant, idx) => normalizeParticipant(participant, idx))
      : []
  };

  await fsp.writeFile(PARTICIPANTS_PATH, JSON.stringify(payload, null, 2), 'utf8');
}

// ==============================
// GLOBAL VARIABLES (EJS)
// ==============================
app.use((req, res, next) => {
  res.locals.appName = process.env.APP_NAME || 'WikiGouv';
  res.locals.brand = {
    name: process.env.BRAND_NAME || 'WikiGouv',
    subtitle: process.env.BRAND_SUBTITLE || '',
    orgs: [
      process.env.BRAND_ORG_1,
      process.env.BRAND_ORG_2,
      process.env.BRAND_ORG_3
    ].filter(Boolean)
  };

  res.locals.env = {
    API_KEY:
      process.env.API_KEY ||
      process.env.WP_APPKEY ||
      process.env.WAPPLETS_APPKEY ||
      process.env.X_API_KEY ||
      'regoil',
    OLLAMA_BASE:
      process.env.OLLAMA_BASE ||
      process.env.OLLAMA_URL ||
      'http://192.168.12.75:11434',
    OLLAMA_PATH: process.env.OLLAMA_PATH || '/api/chat',
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3.1:8b'
  };

  res.locals.isAuthenticated = false;
  next();
});

// ==============================
// DEFAULT ROUTE
// ==============================
app.get('/', (req, res) => {
  return res.redirect('/landing');
});

// ==============================
// API: HEALTH
// ==============================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    app: process.env.APP_NAME || 'WikiGouv',
    port: PORT,
    cataloguePath: CATALOGUE_PATH,
    employeesPath: EMPLOYEES_PATH,
    participantsPath: PARTICIPANTS_PATH
  });
});

// ==============================
// API: CATALOGUE
// ==============================
app.get('/api/catalogue', async (req, res) => {
  try {
    const data = await readCatalogue();
    res.json(data);
  } catch (err) {
    console.error('❌ GET /api/catalogue:', err);
    res.status(500).json({ error: 'Unable to read catalogue' });
  }
});

app.put('/api/catalogue', async (req, res) => {
  try {
    const body = req.body || {};
    const payload = {
      meta: body.meta && typeof body.meta === 'object' ? body.meta : {},
      themes_reference: Array.isArray(body.themes_reference) ? body.themes_reference : [],
      fiches: Array.isArray(body.fiches) ? body.fiches.map(normalizeFiche) : []
    };

    await writeCatalogue(payload);
    res.json({ ok: true, message: 'Catalogue saved', count: payload.fiches.length });
  } catch (err) {
    console.error('❌ PUT /api/catalogue:', err);
    res.status(500).json({ error: 'Unable to save catalogue' });
  }
});

app.post('/api/catalogue/fiches', async (req, res) => {
  try {
    const data = await readCatalogue();
    const fiche = normalizeFiche(req.body);

    if (!isValidFiche(fiche)) {
      return res.status(400).json({ error: 'roleTitle is required' });
    }

    const exists = data.fiches.some(f => f.id === fiche.id);
    if (exists) {
      return res.status(409).json({ error: 'A fiche with this id already exists' });
    }

    data.fiches.push(fiche);
    await writeCatalogue(data);

    res.status(201).json({ ok: true, fiche });
  } catch (err) {
    console.error('❌ POST /api/catalogue/fiches:', err);
    res.status(500).json({ error: 'Unable to create fiche' });
  }
});

app.put('/api/catalogue/fiches/:id', async (req, res) => {
  try {
    const data = await readCatalogue();
    const { id } = req.params;

    const idx = data.fiches.findIndex(f => f.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Fiche not found' });
    }

    const fiche = normalizeFiche({ ...req.body, id });

    if (!isValidFiche(fiche)) {
      return res.status(400).json({ error: 'roleTitle is required' });
    }

    data.fiches[idx] = fiche;
    await writeCatalogue(data);

    res.json({ ok: true, fiche });
  } catch (err) {
    console.error(`❌ PUT /api/catalogue/fiches/${req.params.id}:`, err);
    res.status(500).json({ error: 'Unable to update fiche' });
  }
});

app.delete('/api/catalogue/fiches/:id', async (req, res) => {
  try {
    const data = await readCatalogue();
    const { id } = req.params;

    const before = data.fiches.length;
    data.fiches = data.fiches.filter(f => f.id !== id);

    if (data.fiches.length === before) {
      return res.status(404).json({ error: 'Fiche not found' });
    }

    await writeCatalogue(data);
    res.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error(`❌ DELETE /api/catalogue/fiches/${req.params.id}:`, err);
    res.status(500).json({ error: 'Unable to delete fiche' });
  }
});

// ==============================
// API: EMPLOYEES
// ==============================

// Lire tout employees.json
app.get('/api/employees', async (req, res) => {
  try {
    const data = await readEmployees();
    res.json(data);
  } catch (err) {
    console.error('❌ GET /api/employees:', err);
    res.status(500).json({ error: 'Unable to read employees' });
  }
});

// Réécrire tout employees.json
app.put('/api/employees', async (req, res) => {
  try {
    const body = req.body || {};
    const payload = {
      source_file: body.source_file || path.basename(EMPLOYEES_PATH),
      source_type: body.source_type || 'manual_or_generated',
      note: body.note || '',
      employees: Array.isArray(body.employees)
        ? body.employees.map((emp, idx) => normalizeEmployee(emp, idx))
        : []
    };

    await writeEmployees(payload);

    res.json({
      ok: true,
      message: 'Employees saved',
      count: payload.employees.length
    });
  } catch (err) {
    console.error('❌ PUT /api/employees:', err);
    res.status(500).json({ error: 'Unable to save employees' });
  }
});

// Ajouter un employé
app.post('/api/employees/items', async (req, res) => {
  try {
    const data = await readEmployees();
    const employee = normalizeEmployee(req.body, data.employees.length);

    if (!validateEmployee(employee)) {
      return res.status(400).json({ error: 'full_name is required' });
    }

    const exists = data.employees.some(e => e.id === employee.id);
    if (exists) {
      return res.status(409).json({ error: 'An employee with this id already exists' });
    }

    data.employees.push(employee);
    data.employee_count = data.employees.length;

    await writeEmployees(data);
    res.status(201).json({ ok: true, employee });
  } catch (err) {
    console.error('❌ POST /api/employees/items:', err);
    res.status(500).json({ error: 'Unable to create employee' });
  }
});

// Modifier un employé
app.put('/api/employees/items/:id', async (req, res) => {
  try {
    const data = await readEmployees();
    const { id } = req.params;

    const idx = data.employees.findIndex(e => e.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const existing = data.employees[idx];
    const employee = normalizeEmployee(
      {
        ...existing,
        ...req.body,
        id
      },
      idx
    );

    if (!validateEmployee(employee)) {
      return res.status(400).json({ error: 'full_name is required' });
    }

    data.employees[idx] = employee;
    data.employee_count = data.employees.length;

    await writeEmployees(data);
    res.json({ ok: true, employee });
  } catch (err) {
    console.error(`❌ PUT /api/employees/items/${req.params.id}:`, err);
    res.status(500).json({ error: 'Unable to update employee' });
  }
});

// Supprimer un employé
app.delete('/api/employees/items/:id', async (req, res) => {
  try {
    const data = await readEmployees();
    const { id } = req.params;

    const before = data.employees.length;
    data.employees = data.employees.filter(e => e.id !== id);

    if (data.employees.length === before) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    data.employee_count = data.employees.length;

    await writeEmployees(data);
    res.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error(`❌ DELETE /api/employees/items/${req.params.id}:`, err);
    res.status(500).json({ error: 'Unable to delete employee' });
  }
});

// ==============================
// API: PARTICIPANTS REGISTRATION
// ==============================
app.get('/api/participants', async (req, res) => {
  try {
    const data = await readParticipants();
    res.json(data);
  } catch (err) {
    console.error('GET /api/participants:', err);
    res.status(500).json({ error: 'Unable to read participants' });
  }
});

app.post('/api/participants/register', async (req, res) => {
  try {
    const data = await readParticipants();
    const participant = normalizeParticipant(req.body, data.participants.length);
    const validation = validateParticipant(participant);

    if (!validation.ok) {
      return res.status(400).json({
        error: 'Invalid registration payload',
        missing: validation.missing
      });
    }

    const duplicateEmail = data.participants.some(
      p => String(p.email || '').trim().toLowerCase() === participant.email
    );

    if (duplicateEmail) {
      return res.status(409).json({
        error: 'This email is already registered'
      });
    }

    data.participants.push(participant);
    data.participant_count = data.participants.length;
    await writeParticipants(data);

    res.status(201).json({
      ok: true,
      message: 'Registration saved',
      participant
    });
  } catch (err) {
    console.error('POST /api/participants/register:', err);
    res.status(500).json({ error: 'Unable to register participant' });
  }
});

// ==============================
// API: OLLAMA PROXY
// ==============================
app.post('/api/ollama/chat', async (req, res) => {
  try {
    const base =
      process.env.OLLAMA_BASE ||
      process.env.OLLAMA_URL ||
      'http://192.168.12.75:11434';

    const ollamaPath = process.env.OLLAMA_PATH || '/api/chat';
    const targetUrl =
      `${base.replace(/\/$/, '')}${ollamaPath.startsWith('/') ? '' : '/'}${ollamaPath}`;

    const payload = {
      model: req.body?.model || process.env.OLLAMA_MODEL || 'llama3.1:8b',
      messages: Array.isArray(req.body?.messages) ? req.body.messages : [],
      stream: false,
      temperature: typeof req.body?.temperature === 'number' ? req.body.temperature : 0.4
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Ollama request failed',
        status: response.status,
        details: data || text
      });
    }

    return res.json({
      ok: true,
      reply:
        data?.message?.content ||
        data?.response ||
        data?.text ||
        text,
      raw: data || text
    });
  } catch (err) {
    console.error('❌ POST /api/ollama/chat:', err);
    res.status(500).json({
      error: 'Ollama proxy error',
      details: err.message
    });
  }
});

// ==============================
// DYNAMIC EJS ROUTE LOADER
// ==============================
function loadRoutes(dir, baseRoute = '') {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadRoutes(fullPath, baseRoute + '/' + file);
      return;
    }

    if (!file.endsWith('.ejs')) return;

    const name = file.replace('.ejs', '');
    let routePath = (baseRoute + '/' + name).replace(/\/+/g, '/');

    if (name === 'index') {
      routePath = baseRoute || '/';
    }

    if (name === 'landing') {
      routePath = '/landing';
    }

    const viewPath = path
      .relative(app.get('views'), fullPath)
      .replace(/\\/g, '/')
      .replace('.ejs', '');

    console.log(`✅ Route loaded: ${routePath} → ${viewPath}`);

    app.get(routePath, (req, res) => {
      try {
        res.render(viewPath);
      } catch (err) {
        console.error(`❌ Render error on ${routePath}:`, err.message);
        res.status(500).send('View rendering error');
      }
    });
  });
}

// ==============================
// INIT
// ==============================
ensureCatalogueFile();
ensureEmployeesFile();
ensureParticipantsFile();
loadRoutes(app.get('views'));

// ==============================
// START SERVER
// ==============================
app.listen(PORT, () => {
  console.log(`🚀 WikiGouv running on http://localhost:${PORT}`);
  console.log(`📘 Catalogue path: ${CATALOGUE_PATH}`);
  console.log(`👥 Employees path: ${EMPLOYEES_PATH}`);
});
