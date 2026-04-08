Atajos de teclado mas usados:

Ctrl + K
Abrir el prompt de IA sobre el código seleccionado.

Ctrl + L
Abrir el chat lateral de Cursor.

Ctrl + Shift + L
Aplicar sugerencias de la IA directamente en el código.

Ctrl + P
Buscar archivos rápidamente.

Ctrl + Shift + P
Abrir la paleta de comandos.

Ejemplos mejoras de Cursor:

1. Inicialmente, gestionaba los eventos directamente en el HTML usando atributos como onclick

<input
    type="checkbox"
    onchange="toggleWorkout('${workout.id}')"
>

<span onclick="editWorkout('${workout.id}')"></span>

<button onclick="deleteWorkout('${workout.id}')"></button>

Con ayuda de Cursor, refactoricé el sistema usando event delegation y data-* attributes

<input
    type="checkbox"
    class="workout-item__checkbox"
    data-id="${workout.id}"
>

<span 
    class="workout-item__name"
    data-id="${workout.id}"
></span>

<button
    class="workout-item__delete"
    data-id="${workout.id}"
></button>

Y gestiono todos los eventos desde un único listener:

const listaEntrenamientos = document.getElementById('workout-list');

listaEntrenamientos.addEventListener('change', (e) => {
    const casilla = e.target.closest('.workout-item__checkbox');
    if (!casilla) return;
    toggleWorkout(casilla.dataset.id);
});

listaEntrenamientos.addEventListener('click', (e) => {
    const elementoEditar = e.target.closest('.workout-item__name');
    if (elementoEditar) {
        editWorkout(elementoEditar.dataset.id);
        return;
    }

    const botonEliminar = e.target.closest('.workout-item__delete');
    if (botonEliminar) {
        deleteWorkout(botonEliminar.dataset.id);
    }
});

2. Sistema de categorías dinámicas con UI y persistencia. Antes, las categorías eran estáticas:

const CATEGORIAS_POR_DEFECTO = {
    push: { ... },
    pull: { ... },
    legs: { ... }
};

Con ayuda de Cursor, implementé un sistema completo para:

Crear nuevas categorías desde la UI
Guardarlas en LocalStorage
Generar estilos dinámicos (colores, tonos)
Re-renderizar automáticamente la interfaz

const key = label.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

const tonos = getCategoryTones(color);

categorias[key] = {
    emoji,
    label,
    muscle,
    color,
    colorLight: tonos.colorLight,
    colorLighter: tonos.colorLighter,
    colorDark: tonos.colorDarkText
};

Y luego se renderiza dinámicamente:

container.innerHTML = Object.entries(categorias).map(([key, cat]) => {
    return `
        <button data-category="${key}">
            ${cat.emoji} ${cat.label}
        </button>
    `;
}).join('');