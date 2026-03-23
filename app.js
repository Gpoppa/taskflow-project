/**
 * TaskFlow Gym - Aplicación de gestión de entrenamientos
 * Estructura de tarea: { id, title, completed, createdAt, category }
 */

// ============================================
// ESTADO Y CONFIGURACIÓN
// ============================================

const STORAGE_KEY = 'taskflow_workouts';
const WEEKLY_GOAL = 12;

// Categorías disponibles con sus configuraciones
const CATEGORIES = {
    push: { emoji: '💪', label: 'Push', muscle: 'Pecho/Hombros' },
    pull: { emoji: '🔥', label: 'Pull', muscle: 'Espalda' },
    legs: { emoji: '🦵', label: 'Legs', muscle: 'Piernas' }
};

// Estado de la aplicación
let workouts = [];
let activeFilter = null;

// ============================================
// UTILIDADES - FUNCIONES REUTILIZABLES
// ============================================

/**
 * Genera un ID único para cada tarea
 * @returns {string} ID único basado en timestamp
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
    if (/press|pecho|push|flexion|hombro|tricep/i.test(titleLower)) {
        return 'push';
    }
    // Ejercicios de Pull
    if (/dominada|remo|pull|espalda|bicep|jalon/i.test(titleLower)) {
        return 'pull';
    }
    // Ejercicios de Legs
    if (/sentadilla|pierna|cuadricep|femoral|gluteo|zancada|leg/i.test(titleLower)) {
        return 'legs';
    }

    // Categoría aleatoria si no se detecta
    const categories = Object.keys(CATEGORIES);
    return categories[Math.floor(Math.random() * categories.length)];
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
function createWorkout(title) {
    const category = detectCategory(title);

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
function addWorkout(title) {
    if (!title || !title.trim()) return;

    const workout = createWorkout(title);
    workouts.unshift(workout); // Añadir al principio
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

/**
 * Filtra entrenamientos por categoría
 * @param {string|null} category - Categoría a filtrar o null para todos
 */
function filterByCategory(category) {
    activeFilter = activeFilter === category ? null : category;
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
    const percentage = total > 0 ? Math.round((completed / WEEKLY_GOAL) * 100) : 0;

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
                <span class="workout-item__name">${escapeHTML(workout.title)}</span>
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
    let filteredWorkouts = activeFilter
        ? workouts.filter(w => w.category === activeFilter)
        : workouts;

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
    if (detailEl) detailEl.textContent = `${stats.completed} de ${WEEKLY_GOAL} completados`;

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
    render();

    console.log('✅ TaskFlow Gym inicializado correctamente');
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
