/**
 * TaskFlow Gym - Aplicación de gestión de entrenamientos
 * Estructura de tarea: { id, title, completed, createdAt, category }
 */

// ============================================
// ESTADO Y CONFIGURACIÓN
// ============================================

const CLAVE_ALMACENAMIENTO = 'taskflow_workouts';
const META_SEMANAL = 12;
const CLAVE_CATEGORIAS = 'taskflow_categories';
// Categorías disponibles con sus configuraciones
const CATEGORIAS_POR_DEFECTO = {
    push: { emoji: '💪', label: 'Push', muscle: 'Pecho/Hombros' },
    pull: { emoji: '🔥', label: 'Pull', muscle: 'Espalda' },
    legs: { emoji: '🦵', label: 'Legs', muscle: 'Piernas' }
};
const CLAVES_CATEGORIAS_POR_DEFECTO = Object.keys(CATEGORIAS_POR_DEFECTO);
const EMOJIS_CATEGORIA = [
    '🏋️', '💪', '🔥', '🦵', '🏃', '🚴', '🧘', '🤸', '🤾', '🏊',
    '🥊', '🥋', '⚽', '🏀', '🏐', '🎾', '🏓', '⛹️', '🤺', '🪂',
    '🧠', '❤️', '🎯', '⚡', '🌟', '🏔️', '🏆', '⏱️', '📈', '🔋'
];

let categorias = cargarCategorias();

function cargarCategorias() {
    try {
        const data = localStorage.getItem(CLAVE_CATEGORIAS);
        return data ? JSON.parse(data) : { ...CATEGORIAS_POR_DEFECTO };
    } catch {
        return { ...CATEGORIAS_POR_DEFECTO };
    }
}

function guardarCategorias() {
    localStorage.setItem(CLAVE_CATEGORIAS, JSON.stringify(categorias));
}

function hexToRgb(hex) {
    const normalized = hex.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
    return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16)
    };
}

function rgbToHex({ r, g, b }) {
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return `#${[clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function mixHex(hexA, hexB, ratio = 0.5) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    if (!a || !b) return hexA;
    const t = Math.max(0, Math.min(1, ratio));
    return rgbToHex({
        r: a.r * (1 - t) + b.r * t,
        g: a.g * (1 - t) + b.g * t,
        b: a.b * (1 - t) + b.b * t
    });
}

function getCategoryTones(baseColor) {
    return {
        color: baseColor,
        colorLight: mixHex(baseColor, '#ffffff', 0.82),
        colorLighter: mixHex(baseColor, '#ffffff', 0.9),
        colorBorder: mixHex(baseColor, '#000000', 0.2),
        colorText: mixHex(baseColor, '#000000', 0.32),
        colorActiveStart: mixHex(baseColor, '#000000', 0.08),
        colorActiveEnd: mixHex(baseColor, '#000000', 0.16),
        colorDarkText: mixHex(baseColor, '#ffffff', 0.92)
    };
}

// Estado de la aplicación
let entrenamientos = [];
let filtroCategoriaActivo = null;
let textoBusqueda = '';
let filtroEstado = 'all'; // 'all', 'completed', 'pending'

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
        localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(entrenamientos));
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
        const data = localStorage.getItem(CLAVE_ALMACENAMIENTO);
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
 * Muestra un modal para pedir la categoría al usuario
 * @param {string} title - Título del entrenamiento
 * @returns {Promise<string|null>} Categoría elegida o null si se cancela
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
                    ${Object.entries(categorias).map(([key, cat]) => `
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
                    <button id="btn-cancel-category" style="
                        padding: 0.75rem; border-radius: 9999px; border: 2px solid ${mutedColor};
                        background: transparent; color: ${textColor};
                        font-weight: 600; cursor: pointer; font-size: 1rem;
                    ">Cancelar</button>
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
                resolve(newKey);
            });
        }

        const btnCancelCategory = overlay.querySelector('#btn-cancel-category');
        if (btnCancelCategory) {
            btnCancelCategory.addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(null);
            });
        }

        document.body.appendChild(overlay);
    });
}

/**
 * Muestra un formulario para crear una nueva categoría
 * @returns {Promise<string|null>} Clave de la nueva categoría o null si se cancela
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
                        <select id="new-cat-emoji" size="6" style="
                            width: 110px; padding: 0.5rem; border-radius: 0.5rem;
                            border: 2px solid ${borderColor}; background: ${inputBg}; color: ${textColor};
                            font-size: 1rem; cursor: pointer;
                            height: 120px; overflow-y: auto;
                        ">
                            ${EMOJIS_CATEGORIA.map((emoji, index) => `
                                <option value="${emoji}" ${index === 0 ? 'selected' : ''}>${emoji}</option>
                            `).join('')}
                        </select>
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
            const emoji  = overlay.querySelector('#new-cat-emoji').value || '🏋️';
            const label  = overlay.querySelector('#new-cat-label').value.trim();
            const muscle = overlay.querySelector('#new-cat-muscle').value.trim();
            const color  = overlay.querySelector('#new-cat-color').value;

            if (!label || !muscle) {
                overlay.querySelector('#new-cat-error').style.display = 'block';
                return;
            }

            // Genera una clave desde el nombre (minúsculas y sin espacios)
            const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

            // Calcula tonos claros/oscuros desde el color seleccionado
            const tones = getCategoryTones(color);
            categorias[key] = {
                emoji,
                label,
                muscle,
                color,
                colorLight: tones.colorLight,
                colorLighter: tones.colorLighter,
                colorDark: tones.colorDarkText,
                colorBorder: tones.colorBorder,
                colorText: tones.colorText,
                colorActiveStart: tones.colorActiveStart,
                colorActiveEnd: tones.colorActiveEnd
            };

            guardarCategorias();
            renderCategoryButtons();
            document.body.removeChild(overlay);
            resolve(key);
        });
    });
}

/**
 * Actualiza dinámicamente los botones de categoría en la sección de filtros
 */
function renderCategoryButtons() {
    const container = document.querySelector('.categories[role="group"]');
    if (!container) return;

    container.innerHTML = Object.entries(categorias).map(([key, cat]) => {
        const isCustom = !CLAVES_CATEGORIAS_POR_DEFECTO.includes(key);
        const tones = cat.color
            ? {
                colorLighter: cat.colorLighter || mixHex(cat.color, '#ffffff', 0.9),
                colorLight: cat.colorLight || mixHex(cat.color, '#ffffff', 0.82),
                colorBorder: cat.colorBorder || mixHex(cat.color, '#000000', 0.2),
                colorText: cat.colorText || mixHex(cat.color, '#000000', 0.32),
                colorActiveStart: cat.colorActiveStart || mixHex(cat.color, '#000000', 0.08),
                colorActiveEnd: cat.colorActiveEnd || mixHex(cat.color, '#000000', 0.16)
            }
            : null;
        const customStyle = isCustom && tones ? `
            --cat-bg-start: ${tones.colorLighter};
            --cat-bg-end: ${tones.colorLight};
            --cat-border: ${tones.colorBorder};
            --cat-text: ${tones.colorText};
            --cat-active-start: ${tones.colorActiveStart};
            --cat-active-end: ${tones.colorActiveEnd};
        ` : '';
        return `
            <div class="category-pill">
                <button
                    type="button"
                    class="category-button category-button--${key} ${isCustom ? 'category-button--custom' : ''}"
                    data-category="${key}"
                    style="${customStyle}"
                >
                    ${cat.emoji} ${cat.label} (<span class="category-button__count">0</span>)
                </button>
            </div>
        `;
    }).join('');
    // Eliminati listener duplicati qui: usiamo una sola delegazione in initEventListeners().

    render();
}

function deleteCategories(categoryKeys) {
    const validKeys = categoryKeys.filter(key => categorias[key] && !CLAVES_CATEGORIAS_POR_DEFECTO.includes(key));
    if (validKeys.length === 0) return;

    const fallbackKey = CLAVES_CATEGORIAS_POR_DEFECTO.find(key => categorias[key]);
    if (!fallbackKey) {
        alert('No hay categorías por defecto disponibles para reasignar entrenamientos.');
        return;
    }

    const entrenamientosAMover = entrenamientos.filter(w => validKeys.includes(w.category)).length;
    const etiquetaCategoriaDestino = categorias[fallbackKey].label;
    const confirmMessage = entrenamientosAMover > 0
        ? `Eliminar ${validKeys.length} categorías? ${entrenamientosAMover} entrenamientos se moverán a "${etiquetaCategoriaDestino}".`
        : `Eliminar ${validKeys.length} categorías seleccionadas?`;

    if (!confirm(confirmMessage)) return;

    entrenamientos = entrenamientos.map(workout =>
        validKeys.includes(workout.category)
            ? { ...workout, category: fallbackKey }
            : workout
    );

    validKeys.forEach(key => {
        delete categorias[key];
        if (filtroCategoriaActivo === key) filtroCategoriaActivo = null;
    });

    guardarCategorias();
    saveToStorage();
    renderCategoryButtons();
    render();
}

function openDeleteCategoriesModal() {
    const customEntries = Object.entries(categorias).filter(([key]) => !CLAVES_CATEGORIAS_POR_DEFECTO.includes(key));
    if (customEntries.length === 0) {
        alert('No hay categorías personalizadas para eliminar.');
        return;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? '#1e293b' : '#ffffff';
    const textColor = isDark ? '#f9fafb' : '#1f2937';
    const mutedColor = isDark ? '#94a3b8' : '#6b7280';
    const borderColor = isDark ? '#475569' : '#e2e8f0';

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
        z-index: 1000;
    `;

    overlay.innerHTML = `
        <div style="
            background: ${bgColor}; color: ${textColor};
            padding: 1.5rem; border-radius: 1rem;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            max-width: 420px; width: 92%;
        ">
            <p style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">
                Eliminar categorías
            </p>
            <p style="font-size: 0.875rem; color: ${mutedColor}; margin-bottom: 1rem;">
                Selecciona las categorías personalizadas que quieres eliminar.
            </p>
            <div style="display:flex; flex-direction:column; gap: 0.5rem; max-height: 220px; overflow:auto; margin-bottom: 1rem;">
                ${customEntries.map(([key, cat]) => `
                    <label style="
                        display:flex; align-items:center; gap:0.5rem; padding:0.6rem 0.75rem;
                        border:1px solid ${borderColor}; border-radius:0.75rem;
                    ">
                        <input type="checkbox" data-del-cat="${key}">
                        <span>${cat.emoji} ${escapeHTML(cat.label)}</span>
                    </label>
                `).join('')}
            </div>
            <div style="display:flex; gap:0.75rem;">
                <button id="btn-cancel-del-cats" style="
                    flex:1; padding:0.7rem; border-radius:9999px; border:1px solid ${borderColor};
                    background: transparent; color:${textColor}; font-weight:600; cursor:pointer;
                ">Cancelar</button>
                <button id="btn-confirm-del-cats" style="
                    flex:1; padding:0.7rem; border-radius:9999px; border:none;
                    background: #dc2626; color:white; font-weight:700; cursor:pointer;
                ">Eliminar seleccionadas</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-cancel-del-cats').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    overlay.querySelector('#btn-confirm-del-cats').addEventListener('click', () => {
        const selected = Array.from(overlay.querySelectorAll('[data-del-cat]:checked'))
            .map(el => el.dataset.delCat);

        if (selected.length === 0) {
            alert('Selecciona al menos una categoría.');
            return;
        }

        document.body.removeChild(overlay);
        deleteCategories(selected);
    });
}

async function createWorkout(title) {
    let category = detectCategory(title);
    if (category === null) {
        category = await askCategory(title);
        if (category === null) return null;
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
    if (!workout) return;
    entrenamientos.unshift(workout);
    saveToStorage();
    render();
}

/**
 * Marca/desmarca un entrenamiento como completado
 * @param {string} id - ID del entrenamiento
 */
function toggleWorkout(id) {
    const workout = entrenamientos.find(w => w.id === id);
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
    entrenamientos = entrenamientos.filter(w => w.id !== id);
    saveToStorage();
    render();
}

function toggleCompleteAll() {
    const allCompleted = entrenamientos.every(w => w.completed);
    entrenamientos.forEach(w => w.completed = !allCompleted);
    saveToStorage();
    render();
}

function deleteCompleted() {
    entrenamientos = entrenamientos.filter(w => !w.completed);
    saveToStorage();
    render();
}

function editWorkout(id) {
    const workout = entrenamientos.find(w => w.id === id);
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
    filtroCategoriaActivo = filtroCategoriaActivo === category ? null : category;
    render();
}

function setFilter(filter) {
    filtroEstado = filter;
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
    const total = entrenamientos.length;
    const completed = entrenamientos.filter(w => w.completed).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Conteo por categorías
    const byCategory = Object.keys(categorias).reduce((acc, key) => {
        acc[key] = entrenamientos.filter(w => w.category === key).length;
        return acc;
    }, {});

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
    const category = categorias[workout.category];
    const completedClass = workout.completed ? 'workout-item--completed' : '';
    const checkedAttr = workout.completed ? 'checked' : '';
    const isCustom = category && !CLAVES_CATEGORIAS_POR_DEFECTO.includes(workout.category);
    const customItemBorder = isCustom && category.color
        ? `style="border-left-color: ${category.colorBorder || mixHex(category.color, '#000000', 0.2)};"`
        : '';
    const customBadgeStyle = isCustom && category.color
        ? `style="
            background: linear-gradient(135deg, ${category.colorLighter || mixHex(category.color, '#ffffff', 0.9)} 0%, ${category.colorLight || mixHex(category.color, '#ffffff', 0.82)} 100%);
            color: ${category.colorText || mixHex(category.color, '#000000', 0.32)};
            border: 1px solid ${category.colorBorder || mixHex(category.color, '#000000', 0.2)};
        "`
        : '';

    return `
        <li class="workout-item workout-item--${workout.category} ${completedClass}" data-id="${workout.id}" ${customItemBorder}>
            <label class="workout-item__checkbox-label">
                <input
                    type="checkbox"
                    class="workout-item__checkbox"
                    ${checkedAttr}
                    data-action="toggle-workout"
                    data-id="${workout.id}"
                >
                <span class="workout-item__checkmark"></span>
            </label>

            <div class="workout-item__content">
                <span 
                    class="workout-item__name"
                    data-action="edit-workout"
                    data-id="${workout.id}"

                >
                    ${escapeHTML(workout.title)}
                </span>
                <div class="workout-item__meta">
                    <span class="badge badge--${workout.category}" ${customBadgeStyle}>${category.emoji} ${category.label.toUpperCase()}</span>
                    <span class="workout-item__muscle">${category.muscle}</span>
                </div>
            </div>

            <button
                type="button"
                class="workout-item__delete"
                aria-label="Eliminar entrenamiento"
                data-action="delete-workout"
                data-id="${workout.id}"
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
    let filteredWorkouts = [...entrenamientos];

    // filtro por categoría
    if (filtroCategoriaActivo) {
        filteredWorkouts = filteredWorkouts.filter(w => w.category === filtroCategoriaActivo);
    }

    // filtro por estado
    if (filtroEstado === "completed") {
        filteredWorkouts = filteredWorkouts.filter(w => w.completed);
    } else if (filtroEstado === "pending") {
        filteredWorkouts = filteredWorkouts.filter(w => !w.completed);
    }

    // filtro search
    if (textoBusqueda) {
        filteredWorkouts = filteredWorkouts.filter(w =>
            w.title.toLowerCase().includes(textoBusqueda)
        );
    }

    if (filteredWorkouts.length === 0) {
        listElement.innerHTML = `
            <li class="workout-item" style="justify-content: center; opacity: 0.6;">
                <span>${filtroCategoriaActivo ? 'No hay entrenamientos en esta categoría' : 'No hay entrenamientos. ¡Añade uno!'}</span>
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

    // Se eliminó el bloque hardcoded push/pull/legs: ahora soporta categorías dinámicas.
    const categoryList = document.querySelector('.stat-card__list');
    if (categoryList) {
        categoryList.innerHTML = Object.entries(categorias).map(([key, cat]) => {
            const isCustom = !CLAVES_CATEGORIAS_POR_DEFECTO.includes(key);
            const customBadgeStyle = isCustom && cat.color
                ? `style="
                    background: linear-gradient(135deg, ${cat.colorLighter || mixHex(cat.color, '#ffffff', 0.9)} 0%, ${cat.colorLight || mixHex(cat.color, '#ffffff', 0.82)} 100%);
                    color: ${cat.colorText || mixHex(cat.color, '#000000', 0.32)};
                    border: 1px solid ${cat.colorBorder || mixHex(cat.color, '#000000', 0.2)};
                "`
                : '';
            return `
                <li class="stat-card__list-item">
                    <span class="badge badge--${key}" ${customBadgeStyle}>${cat.emoji} ${cat.label}</span>
                    <span class="stat-card__count">${stats.byCategory[key] ?? 0}</span>
                </li>
            `;
        }).join('');
    }

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
        button.classList.toggle('category-button--active', filtroCategoriaActivo === category);
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
        btn.classList.toggle('category-button--active', btn.dataset.filter === filtroEstado);
    });

    const btnComplete = document.getElementById('btn-complete-all');
    if (btnComplete && entrenamientos.length > 0) {
        const allCompleted = entrenamientos.every(w => w.completed);
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

    // Se eliminó el listener genérico de ".category-button": causaba clics ambiguos entre filtros/acciones.
    // Botones de categoría (delegación para soportar categorías dinámicas)
    const categoryContainer = document.querySelector('.categories[role="group"]');
    if (categoryContainer) {
        categoryContainer.addEventListener('click', (e) => {
            const button = e.target.closest('[data-category]');
            if (!button) return;
            filterByCategory(button.dataset.category);
        });
    }

    // Filtros de estado
    document.querySelectorAll('[data-filter]').forEach(button => {
        button.addEventListener('click', () => {
            setFilter(button.dataset.filter);
        });
    });

    // Acciones masivas
    const botonCompletarTodo = document.getElementById('btn-complete-all');
    if (botonCompletarTodo) {
        botonCompletarTodo.addEventListener('click', toggleCompleteAll);
    }

    const botonEliminarCompletados = document.getElementById('btn-delete-completed');
    if (botonEliminarCompletados) {
        botonEliminarCompletados.addEventListener('click', deleteCompleted);
    }

    // Dark mode (eliminato onclick inline in HTML)
    const botonModoOscuro = document.getElementById('dark-toggle');
    if (botonModoOscuro) {
        botonModoOscuro.addEventListener('click', toggleDarkMode);
    }

    const botonGestionCategorias = document.getElementById('btn-manage-categories');
    if (botonGestionCategorias) {
        botonGestionCategorias.addEventListener('click', openDeleteCategoriesModal);
    }

    // Delegación de eventos para entrenamientos (checkbox, editar título, eliminar)
    const listaEntrenamientos = document.getElementById('workout-list');
    if (listaEntrenamientos) {
        listaEntrenamientos.addEventListener('change', (e) => {
            const casilla = e.target.closest('.workout-item__checkbox');
            if (!casilla) return;
            const id = casilla.dataset.id;
            if (id) toggleWorkout(id);
        });

        listaEntrenamientos.addEventListener('click', (e) => {
            const elementoEditar = e.target.closest('.workout-item__name');
            if (elementoEditar && elementoEditar.dataset.id) {
                editWorkout(elementoEditar.dataset.id);
                return;
            }

            const botonEliminar = e.target.closest('.workout-item__delete');
            if (botonEliminar && botonEliminar.dataset.id) {
                deleteWorkout(botonEliminar.dataset.id);
            }
        });
    }
    // Buscador
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            textoBusqueda = e.target.value.toLowerCase();
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
    entrenamientos = loadFromStorage();

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
// MODO OSCURO
// ==============================

const CLAVE_MODO_OSCURO = "taskflow_dark_mode";

function toggleDarkMode() {
    const html = document.documentElement;
    const button = document.getElementById("dark-toggle");
    if (!button) return;
    const modoOscuroActivo = html.classList.toggle("dark");

    // Guarda en LocalStorage
    localStorage.setItem(CLAVE_MODO_OSCURO, modoOscuroActivo);

    // Cambia texto del botón
    if (modoOscuroActivo) {
        button.textContent = "☀️ Modo claro";
    } else {
        button.textContent = "🌙 Modo oscuro";
    }
}

function loadDarkMode() {
    const html = document.documentElement;
    const button = document.getElementById("dark-toggle");
    if (!button) return;
    const modoOscuroActivo = localStorage.getItem(CLAVE_MODO_OSCURO) === "true";

    if (modoOscuroActivo) {
        html.classList.add("dark");
        button.textContent = "☀️ Modo claro";
    } else {
        html.classList.remove("dark");
        button.textContent = "🌙 Modo oscuro";
    }
}