/**
 * TaskFlow Gym - Aplicación de gestión de entrenamientos
 * Estructura de tarea: { id, title, completed, createdAt, category }
 */

// ============================================
// ESTADO Y CONFIGURACIÓN
// ============================================

const STORAGE_KEY = 'taskflow_workouts';
const WEEKLY_GOAL = 12;
const CATEGORIES_KEY = 'taskflow_categories';
// Categorías disponibles con sus configuraciones
const DEFAULT_CATEGORIES = {
    push: { emoji: '💪', label: 'Push', muscle: 'Pecho/Hombros' },
    pull: { emoji: '🔥', label: 'Pull', muscle: 'Espalda' },
    legs: { emoji: '🦵', label: 'Legs', muscle: 'Piernas' }
};

let CATEGORIES = loadCategories();

function loadCategories() {
    try {
        const data = localStorage.getItem(CATEGORIES_KEY);
        return data ? JSON.parse(data) : { ...DEFAULT_CATEGORIES };
    } catch {
        return { ...DEFAULT_CATEGORIES };
    }
}

function saveCategories() {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(CATEGORIES));
}

// Estado de la aplicación
let workouts = [];
let activeFilter = null;
let searchText = '';
let statusFilter = 'all'; // 'all', 'completed', 'pending'

// ============================================
// UTILIDADES - FUNCIONES REUTILIZABLES
// ============================================

/**
 * Genera un ID único para cada tarea
 * @returns {string} ID único basado en timestamp
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Formatea una fecha para mostrar
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Detecta la categoría basándose en el título del entrenamiento
 * @param {string} title - Título del entrenamiento
 * @returns {string} Categoría detectada
 */
function detectCategory(title) {
    const titleLower = title.toLowerCase();

    // Ejercicios de Push
    if (/press|pecho|push|flexion|flexión|hombro|deltoid|tricep|trícep|dips|fondos|aperturas|fly|cruces|militar|arnold|elevacion|elevación|lateral|frontal|inclinado|declinado|paralelas|banca|bench|overhead|ohp|chest|shoulder|triceps/i.test(titleLower)) {
        return 'push';
    }
    // Ejercicios de Pull
    if (/dominada|remo|pull|espalda|bicep|bícep|jalon|jalón|polea|face.?pull|curl|martillo|hammer|chin.?up|pulldown|pullover|trapecio|lumbar|hiperextension|hiperextensión|deadlift|peso.?muerto|back|row|lat|rhomboid|romboide|encogimiento|shrug/i.test(titleLower)) {
        return 'pull';
    }
    // Ejercicios de Legs
    if (/sentadilla|squat|pierna|cuadricep|cuádricep|femoral|isquio|gluteo|glúteo|zancada|lunge|leg|pantorrilla|gemelo|calf|prensa|hack|rumana|sumo|búlgara|bulgara|hip.?thrust|abductor|aductor|extensi[oó]n|curl.?femoral|step.?up|cajón|cajon|abdomen|abdominal|plancha|plank|crunch|oblicuo|core|abs/i.test(titleLower)) {
        return 'legs';
    }

    return null;
}

// ============================================
// LOCALSTORAGE - PERSISTENCIA DE DATOS
// ============================================

/**
 * Guarda los entrenamientos en LocalStorage
 */
function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
    } catch (error) {
        console.error('Error al guardar en LocalStorage:', error);
    }
}

/**
 * Carga los entrenamientos desde LocalStorage
 * @returns {Array} Array de entrenamientos
 */
function loadFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error al cargar desde LocalStorage:', error);
        return [];
    }
}

// ============================================
// CRUD - OPERACIONES CON TAREAS
// ============================================

/**
 * Crea una nueva tarea/entrenamiento
 * @param {string} title - Título del entrenamiento
 * @returns {Object} Nueva tarea creada
 */

/**
 * Mostra un modal per chiedere la categoria all'utente
 * @param {string} title - Titolo dell'allenamento
 * @returns {Promise<string>} Categoria scelta
 */
function askCategory(title) {
    return new Promise((resolve) => {
        // Crea overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.5);
            display: flex; align-items: center; justify-content: center;
            z-index: 1000;
        `;

        const isDark = document.documentElement.classList.contains('dark');
        const bgColor = isDark ? '#1e293b' : '#ffffff';
        const textColor = isDark ? '#f9fafb' : '#1f2937';
        const mutedColor = isDark ? '#94a3b8' : '#6b7280';

        overlay.innerHTML = `
            <div style="
                background: ${bgColor}; color: ${textColor};
                padding: 2rem; border-radius: 1rem;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                max-width: 360px; width: 90%; text-align: center;
            ">
                <p style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">
                    ¿Qué categoría es?
                </p>
                <p style="font-size: 0.875rem; color: ${mutedColor}; margin-bottom: 1.5rem;">
                    No reconocí "<strong>${escapeHTML(title)}</strong>"
                </p>
                <div id="cat-buttons" style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${Object.entries(CATEGORIES).map(([key, cat]) => `
                        <button data-cat="${key}" style="
                            padding: 0.75rem; border-radius: 9999px; border: 2px solid ${cat.color || '#6b7280'};
                            background: ${cat.colorLight || '#f3f4f6'}; color: ${cat.colorDark || '#374151'};
                            font-weight: 600; cursor: pointer; font-size: 1rem;
                        ">${cat.emoji} ${cat.label} — ${cat.muscle}</button>
                    `).join('')}
                    <button id="btn-new-cat" style="
                        padding: 0.75rem; border-radius: 9999px; border: 2px dashed #94a3b8;
                        background: transparent; color: ${mutedColor};
                        font-weight: 600; cursor: pointer; font-size: 1rem;
                    ">➕ Nueva categoría</button>
                </div>
            </div>
        `;

        overlay.querySelectorAll('[data-cat]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(btn.dataset.cat);
            });
        });

        const btnNewCat = overlay.querySelector('#btn-new-cat');
        if (btnNewCat) {
            btnNewCat.addEventListener('click', async () => {
                document.body.removeChild(overlay);
                const newKey = await showNewCategoryForm();
                if (newKey) resolve(newKey);
                else resolve(Object.keys(CATEGORIES)[0]);
            });
        }

        document.body.appendChild(overlay);
    });
}

/**
 * Mostra un form per creare una nuova categoria
 * @returns {Promise<string|null>} Key della nuova categoria o null se annullato
 */
function showNewCategoryForm() {
    return new Promise((resolve) => {
        const isDark = document.documentElement.classList.contains('dark');
        const bgColor = isDark ? '#1e293b' : '#ffffff';
        const textColor = isDark ? '#f9fafb' : '#1f2937';
        const inputBg = isDark ? '#374151' : '#f9fafb';
        const borderColor = isDark ? '#4b5563' : '#e5e7eb';

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.5);
            display: flex; align-items: center; justify-content: center;
            z-index: 1000;
        `;

        overlay.innerHTML = `
            <div style="
                background: ${bgColor}; color: ${textColor};
                padding: 2rem; border-radius: 1rem;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                max-width: 380px; width: 90%;
            ">
                <p style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; text-align:center;">
                    ➕ Nueva Categoría
                </p>

                <div style="display:flex; flex-direction:column; gap: 0.75rem; margin-bottom: 1.25rem;">

                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <label style="width:80px; font-size:0.875rem; font-weight:600;">Emoji</label>
                        <input id="new-cat-emoji" maxlength="2" placeholder="🏋️" style="
                            width: 60px; padding: 0.5rem; border-radius: 0.5rem; text-align:center;
                            border: 2px solid ${borderColor}; background: ${inputBg}; color: ${textColor};
                            font-size: 1.25rem;
                        ">
                    </div>

                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <label style="width:80px; font-size:0.875rem; font-weight:600;">Nombre</label>
                        <input id="new-cat-label" placeholder="Ej: Cardio" style="
                            flex:1; padding: 0.5rem 0.75rem; border-radius: 0.5rem;
                            border: 2px solid ${borderColor}; background: ${inputBg}; color: ${textColor};
                            font-size: 1rem;
                        ">
                    </div>

                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <label style="width:80px; font-size:0.875rem; font-weight:600;">Músculo</label>
                        <input id="new-cat-muscle" placeholder="Ej: Corazón / Pulmones" style="
                            flex:1; padding: 0.5rem 0.75rem; border-radius: 0.5rem;
                            border: 2px solid ${borderColor}; background: ${inputBg}; color: ${textColor};
                            font-size: 1rem;
                        ">
                    </div>

                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <label style="width:80px; font-size:0.875rem; font-weight:600;">Color</label>
                        <input id="new-cat-color" type="color" value="#8b5cf6" style="
                            width: 48px; height: 36px; border-radius: 0.5rem;
                            border: 2px solid ${borderColor}; cursor: pointer; padding: 2px;
                        ">
                    </div>

                </div>

                <div style="display:flex; gap:0.75rem;">
                    <button id="btn-cancel-cat" style="
                        flex:1; padding: 0.75rem; border-radius: 9999px;
                        border: 2px solid ${borderColor}; background: transparent;
                        color: ${textColor}; font-weight: 600; cursor: pointer;
                    ">Cancelar</button>
                    <button id="btn-save-cat" style="
                        flex:1; padding: 0.75rem; border-radius: 9999px;
                        border: none; background: #8b5cf6;
                        color: white; font-weight: 600; cursor: pointer;
                    ">Guardar</button>
                </div>

                <p id="new-cat-error" style="
                    color: #ef4444; font-size: 0.8rem;
                    text-align: center; margin-top: 0.75rem; display: none;
                ">Por favor completa todos los campos.</p>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#btn-cancel-cat').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(null);
        });

        overlay.querySelector('#btn-save-cat').addEventListener('click', () => {
            const emoji  = overlay.querySelector('#new-cat-emoji').value.trim() || '🏋️';
            const label  = overlay.querySelector('#new-cat-label').value.trim();
            const muscle = overlay.querySelector('#new-cat-muscle').value.trim();
            const color  = overlay.querySelector('#new-cat-color').value;

            if (!label || !muscle) {
                overlay.querySelector('#new-cat-error').style.display = 'block';
                return;
            }

            // Genera una key dal label (minuscolo, senza spazi)
            const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

            // Calcola colori chiari/scuri dal colore scelto
            CATEGORIES[key] = {
                emoji,
                label,
                muscle,
                color,
                colorLight: color + '33',   // 20% opacità
                colorDark: color
            };

            saveCategories();
            renderCategoryButtons();
            document.body.removeChild(overlay);
            resolve(key);
        });
    });
}

/**
 * Aggiorna dinamicamente i bottoni categoria nella sezione filtri
 */
function renderCategoryButtons() {
    const container = document.querySelector('.categories[role="group"]');
    if (!container) return;

    container.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => `
        <button
            type="button"
            class="category-button category-button--${key}"
            data-category="${key}"
            style="border-color: ${cat.color || ''};"
        >
            ${cat.emoji} ${cat.label} (<span class="category-button__count">0</span>)
        </button>
    `).join('');

    // Ri-attacca i listener
    container.querySelectorAll('.category-button').forEach(button => {
        button.addEventListener('click', () => {
            filterByCategory(button.dataset.category);
        });
    });

    render();
}

async function createWorkout(title) {
    let category = detectCategory(title);
    if (category === null) {
        category = await askCategory(title);
    }

    return {
        id: generateId(),
        title: title.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        category: category
    };
}

/**
 * Añade un nuevo entrenamiento a la lista
 * @param {string} title - Título del entrenamiento
 */
async function addWorkout(title) {
    if (!title || !title.trim()) return;

    const workout = await createWorkout(title);
    workouts.unshift(workout);
    saveToStorage();
    render();
}

/**
 * Marca/desmarca un entrenamiento como completado
 * @param {string} id - ID del entrenamiento
 */
function toggleWorkout(id) {
    const workout = workouts.find(w => w.id === id);
    if (workout) {
        workout.completed = !workout.completed;
        saveToStorage();
        render();
    }
}

/**
 * Elimina un entrenamiento
 * @param {string} id - ID del entrenamiento
 */
function deleteWorkout(id) {
    workouts = workouts.filter(w => w.id !== id);
    saveToStorage();
    render();
}

function toggleCompleteAll() {
    const allCompleted = workouts.every(w => w.completed);
    workouts.forEach(w => w.completed = !allCompleted);
    saveToStorage();
    render();
}

function deleteCompleted() {
    workouts = workouts.filter(w => !w.completed);
    saveToStorage();
    render();
}

function editWorkout(id) {
    const workout = workouts.find(w => w.id === id);
    if (!workout) return;

    const span = document.querySelector(`[data-id="${id}"] .workout-item__name`);
    if (!span) return;

    const isDark = document.documentElement.classList.contains('dark');

    const input = document.createElement('input');
    input.value = workout.title;
    input.className = 'form__input';
    input.style.padding = '2px 8px';
    input.style.backgroundColor = isDark ? '#374151' : '#ffffff';
    input.style.color = isDark ? '#f9fafb' : '#1f2937';
    input.style.borderColor = isDark ? '#4b5563' : '#e5e7eb';
    span.replaceWith(input);
    input.focus();

    let saved = false;

    function save() {
        if (saved) return;
        saved = true;
        if (input.value.trim()) {
            workout.title = input.value.trim();
            saveToStorage();
        }
        render();
    }

    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') { saved = true; render(); }
    });
}
/**
 * Filtra entrenamientos por categoría
 * @param {string|null} category - Categoría a filtrar o null para todos
 */
function filterByCategory(category) {
    activeFilter = activeFilter === category ? null : category;
    render();
}

function setFilter(filter) {
    statusFilter = filter;
    render();
}

// ============================================
// ESTADÍSTICAS
// ============================================

/**
 * Calcula las estadísticas de los entrenamientos
 * @returns {Object} Objeto con todas las estadísticas
 */
function calculateStats() {
    const total = workouts.length;
    const completed = workouts.filter(w => w.completed).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Conteo por categorías
    const byCategory = {
        push: workouts.filter(w => w.category === 'push').length,
        pull: workouts.filter(w => w.category === 'pull').length,
        legs: workouts.filter(w => w.category === 'legs').length
    };

    return {
        total,
        completed,
        pending,
        percentage: Math.min(percentage, 100),
        byCategory
    };
}

// ============================================
// RENDERIZADO DEL DOM
// ============================================

/**
 * Crea el HTML para un elemento de entrenamiento
 * @param {Object} workout - Objeto de entrenamiento
 * @returns {string} HTML del elemento
 */
function createWorkoutHTML(workout) {
    const category = CATEGORIES[workout.category];
    const completedClass = workout.completed ? 'workout-item--completed' : '';
    const checkedAttr = workout.completed ? 'checked' : '';

    return `
        <li class="workout-item workout-item--${workout.category} ${completedClass}" data-id="${workout.id}">
            <label class="workout-item__checkbox-label">
                <input
                    type="checkbox"
                    class="workout-item__checkbox"
                    ${checkedAttr}
                    onchange="toggleWorkout('${workout.id}')"
                >
                <span class="workout-item__checkmark"></span>
            </label>

            <div class="workout-item__content">
                <span 
                    class="workout-item__name"
                    onclick="editWorkout('${workout.id}')"

                >
                    ${escapeHTML(workout.title)}
                </span>
                <div class="workout-item__meta">
                    <span class="badge badge--${workout.category}">${category.emoji} ${category.label.toUpperCase()}</span>
                    <span class="workout-item__muscle">${category.muscle}</span>
                </div>
            </div>

            <button
                type="button"
                class="workout-item__delete"
                aria-label="Eliminar entrenamiento"
                onclick="deleteWorkout('${workout.id}')"
            >
                🗑️
            </button>
        </li>
    `;
}

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado
 */
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Renderiza la lista de entrenamientos
 */
function renderWorkouts() {
    const listElement = document.getElementById('workout-list');
    if (!listElement) return;

    // Filtrar si hay categoría activa
    let filteredWorkouts = [...workouts];

    // filtro categoria
    if (activeFilter) {
        filteredWorkouts = filteredWorkouts.filter(w => w.category === activeFilter);
    }

    // filtro stato
    if (statusFilter === "completed") {
        filteredWorkouts = filteredWorkouts.filter(w => w.completed);
    } else if (statusFilter === "pending") {
        filteredWorkouts = filteredWorkouts.filter(w => !w.completed);
    }

    // filtro search
    if (searchText) {
        filteredWorkouts = filteredWorkouts.filter(w =>
            w.title.toLowerCase().includes(searchText)
        );
    }

    if (filteredWorkouts.length === 0) {
        listElement.innerHTML = `
            <li class="workout-item" style="justify-content: center; opacity: 0.6;">
                <span>${activeFilter ? 'No hay entrenamientos en esta categoría' : 'No hay entrenamientos. ¡Añade uno!'}</span>
            </li>
        `;
        return;
    }

    listElement.innerHTML = filteredWorkouts.map(createWorkoutHTML).join('');
}

/**
 * Renderiza las estadísticas
 */
function renderStats() {
    const stats = calculateStats();

    // Total entrenamientos
    const totalEl = document.querySelector('.stat-card--orange .stat-card__number');
    if (totalEl) totalEl.textContent = stats.total;

    // Completados
    const completedEl = document.querySelector('.stat-card--green .stat-card__number');
    if (completedEl) completedEl.textContent = stats.completed;

    // Pendientes
    const pendingEl = document.querySelector('.stat-card--blue .stat-card__number');
    if (pendingEl) pendingEl.textContent = stats.pending;

    // Estadísticas por categoría
    const categoryItems = document.querySelectorAll('.stat-card__list-item');
    categoryItems.forEach(item => {
        const badge = item.querySelector('.badge');
        const count = item.querySelector('.stat-card__count');
        if (badge && count) {
            if (badge.classList.contains('badge--push')) {
                count.textContent = stats.byCategory.push;
            } else if (badge.classList.contains('badge--pull')) {
                count.textContent = stats.byCategory.pull;
            } else if (badge.classList.contains('badge--legs')) {
                count.textContent = stats.byCategory.legs;
            }
        }
    });

    // Barra de progreso
    const percentageEl = document.querySelector('.stat-card__percentage');
    const progressFill = document.querySelector('.progress-bar__fill');
    const detailEl = document.querySelector('.stat-card__detail');

    if (percentageEl) percentageEl.textContent = `${stats.percentage}%`;
    if (progressFill) progressFill.style.width = `${stats.percentage}%`;
    if (detailEl) detailEl.textContent = `${stats.completed} de ${stats.total} completados`;

    // Actualizar contadores en botones de categoría
    updateCategoryButtons(stats.byCategory);
}

/**
 * Actualiza los contadores en los botones de categoría
 * @param {Object} byCategory - Conteo por categoría
 */
function updateCategoryButtons(byCategory) {
    document.querySelectorAll('.category-button').forEach(button => {
        const category = button.dataset.category;
        const countEl = button.querySelector('.category-button__count');
        if (countEl && category && byCategory[category] !== undefined) {
            countEl.textContent = byCategory[category];
        }

        // Actualizar estado activo
        button.classList.toggle('category-button--active', activeFilter === category);
    });
}

/**
 * Actualiza la fecha en el header
 */
function updateHeaderDate() {
    const dateEl = document.querySelector('.header__date');
    if (!dateEl) return;

    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = now.toLocaleDateString('es-ES', options);
    const weekNumber = getWeekNumber(now);

    dateEl.innerHTML = `
        <span class="header__date-icon">📅</span>
        ${capitalize(dateStr)} | semana ${weekNumber}/52
    `;
}

/**
 * Obtiene el número de semana del año
 * @param {Date} date - Fecha
 * @returns {number} Número de semana
 */
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Capitaliza la primera letra
 * @param {string} str - Cadena a capitalizar
 * @returns {string} Cadena capitalizada
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Función principal de renderizado
 */
function render() {
    renderWorkouts();
    renderStats();
    updateFilterButtons();
}

function updateFilterButtons() {
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.classList.toggle('category-button--active', btn.dataset.filter === statusFilter);
    });

    const btnComplete = document.getElementById('btn-complete-all');
    if (btnComplete && workouts.length > 0) {
        const allCompleted = workouts.every(w => w.completed);
        btnComplete.textContent = allCompleted ? '↩️ Deseleccionar todo' : '✅ Completar todo';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Inicializa los event listeners
 */
function initEventListeners() {
    // Formulario de nuevo entrenamiento
    const form = document.getElementById('workout-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('workout-input');
            if (input && input.value.trim()) {
                addWorkout(input.value);
                input.value = '';
                input.focus();
            }
        });
    }

    // Botones de categoría
    document.querySelectorAll('.category-button').forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;
            filterByCategory(category);
        });
    });
    // Buscador
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            searchText = e.target.value.toLowerCase();
            render();
        });
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

/**
 * Inicializa la aplicación
 */
function init() {
    // Cargar datos guardados
    workouts = loadFromStorage();

    // Actualizar fecha del header
    updateHeaderDate();

    // Inicializar listeners
    initEventListeners();

    // Renderizar inicial
    renderCategoryButtons();
    render();
    loadDarkMode();
    console.log('✅ TaskFlow Gym inicializado correctamente');
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);

// ==============================
// DARK MODE
// ==============================

const DARK_MODE_KEY = "taskflow_dark_mode";

function toggleDarkMode() {
    const html = document.documentElement;
    const button = document.getElementById("dark-toggle");
    if (!button) return;
    const isDark = html.classList.toggle("dark");

    // Salva in LocalStorage
    localStorage.setItem("taskflow_dark_mode", isDark);

    // Cambia testo bottone
    if (isDark) {
        button.textContent = "☀️ Light Mode";
    } else {
        button.textContent = "🌙 Dark Mode";
    }
}

function loadDarkMode() {
    const html = document.documentElement;
    const button = document.getElementById("dark-toggle");
    if (!button) return;
    const isDark = localStorage.getItem("taskflow_dark_mode") === "true";

    if (isDark) {
        html.classList.add("dark");
        button.textContent = "☀️ Light Mode";
    } else {
        html.classList.remove("dark");
        button.textContent = "🌙 Dark Mode";
    }
}