// Основное состояние приложения (State)
let state = {
    tasks: [],
    notes: [],
    projects: ['Galina Metall', 'Личное', 'Дизайн Studio'],
    currentView: 'inbox', // inbox, today, upcoming, notes, или название проекта
    activeNoteId: null
};

// Загрузка данных из локального хранилища браузера
function loadState() {
    const saved = localStorage.getItem('todoist_premium_state');
    if (saved) {
        try {
            state = JSON.parse(saved);
        } catch (e) {
            console.error("Ошибка чтения сохраненных данных", e);
        }
    }
}

// Сохранение состояния в LocalStorage
function saveState() {
    localStorage.setItem('todoist_premium_state', JSON.stringify(state));
    updateBadges();
}

// Инициализация интерфейсов при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initDOMEvents();
    renderAll();
});

function initDOMEvents() {
    // Переключение вкладок сайдбара
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.project-item').forEach(p => p.classList.remove('active'));
            
            const currentTarget = e.currentTarget;
            currentTarget.classList.add('active');
            state.currentView = currentTarget.getAttribute('data-target');
            renderAll();
        });
    });

    // Показ формы создания задачи
    document.getElementById('placeholderAddTask').addEventListener('click', () => {
        document.getElementById('inlineAddTaskForm').style.display = 'flex';
        document.getElementById('placeholderAddTask').style.display = 'none';
        
        // Автоматически подставляем дату "Сегодня", если мы на вкладке Сегодня
        if(state.currentView === 'today') {
            document.getElementById('taskDateInput').value = new Date().toISOString().split('T')[0];
        } else {
            document.getElementById('taskDateInput').value = '';
        }
    });

    document.getElementById('fastAddTaskBtn').addEventListener('click', () => {
        state.currentView = 'inbox';
        renderAll();
        document.getElementById('placeholderAddTask').click();
    });

    // Скрытие формы создания задачи
    document.getElementById('cancelAddTask').addEventListener('click', () => {
        document.getElementById('inlineAddTaskForm').style.display = 'none';
        document.getElementById('placeholderAddTask').style.display = 'flex';
        clearTaskInputs();
    });

    // Добавление новой задачи
    document.getElementById('submitAddTask').addEventListener('click', () => {
        const title = document.getElementById('taskTitleInput').value.trim();
        if (!title) return alert('Введите название задачи');

        const newTask = {
            id: Date.now().toString(),
            title: title,
            desc: document.getElementById('taskDescInput').value.trim(),
            date: document.getElementById('taskDateInput').value,
            priority: document.getElementById('taskPriorityInput').value,
            project: state.projects.includes(state.currentView) ? state.currentView : 'Входящие',
            completed: false
        };

        state.tasks.push(newTask);
        saveState();
        clearTaskInputs();
        document.getElementById('cancelAddTask').click();
        renderAll();
    });

    // Кнопка создания заметки
    document.getElementById('createNewNoteBtn').addEventListener('click', () => {
        const newNote = {
            id: Date.now().toString(),
            title: 'Новая заметка',
            content: '',
            date: new Date().toLocaleDateString('ru-RU')
        };
        state.notes.push(newNote);
        state.activeNoteId = newNote.id;
        saveState();
        renderAll();
    });

    // Сохранение редактируемой заметки
    document.getElementById('saveNoteBtn').addEventListener('click', () => {
        const note = state.notes.find(n => n.id === state.activeNoteId);
        if(note) {
            note.title = document.getElementById('noteTitleView').value;
            note.content = document.getElementById('noteContentView').value;
            saveState();
            renderAll();
            alert('Заметка сохранена!');
        }
    });

    // Живой глобальный поиск
    document.getElementById('globalSearch').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if(query.length > 0) {
            renderSearchResults(query);
        } else {
            renderAll();
        }
    });

    // Экспорт данных в JSON-файл
    document.getElementById('exportDataBtn').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `backup_data_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // Импорт данных из JSON-файл
    document.getElementById('importDataBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
        const fileReader = new FileReader();
        fileReader.onload = function(event) {
            try {
                const importedState = JSON.parse(event.target.result);
                if(importedState.tasks && importedState.notes) {
                    state = importedState;
                    saveState();
                    renderAll();
                    alert('Данные успешно импортированы!');
                } else {
                    alert('Файл некорректен.');
                }
            } catch(ex) {
                alert('Не удалось прочитать файл JSON.');
            }
        };
        if(e.target.files[0]) fileReader.readAsText(e.target.files[0]);
    });
}

function clearTaskInputs() {
    document.getElementById('taskTitleInput').value = '';
    document.getElementById('taskDescInput').value = '';
    document.getElementById('taskDateInput').value = '';
    document.getElementById('taskPriorityInput').value = '3';
}

// Главный диспетчер рендеринга страницы
function renderAll() {
    updateBadges();
    renderProjectsSidebar();

    // Скрываем по умолчанию все специфические секции
    document.getElementById('taskSection').classList.add('hidden');
    document.getElementById('notesSection').classList.add('hidden');
    document.getElementById('calendarSection').classList.add('hidden');

    // Настройка заголовка отображения
    const titleEl = document.getElementById('viewTitle');

    let filteredTasks = [];
    const todayStr = new Date().toISOString().split('T')[0];

    if (state.currentView === 'inbox') {
        titleEl.textContent = 'Входящие';
        document.getElementById('taskSection').classList.remove('hidden');
        filteredTasks = state.tasks.filter(t => !t.completed);
        renderTaskList(filteredTasks);
    } 
    else if (state.currentView === 'today') {
        titleEl.textContent = 'Сегодня';
        document.getElementById('taskSection').classList.remove('hidden');
        filteredTasks = state.tasks.filter(t => t.date === todayStr && !t.completed);
        renderTaskList(filteredTasks);
    } 
    else if (state.currentView === 'upcoming') {
        titleEl.textContent = 'Предстоящее (Календарная сетка)';
        document.getElementById('calendarSection').classList.remove('hidden');
        renderCalendar();
    } 
    else if (state.currentView === 'notes') {
        titleEl.textContent = 'Личный Блокнот';
        document.getElementById('notesSection').classList.remove('hidden');
        renderNotesList();
    } 
    else {
        // Рендеринг кастомного проекта
        titleEl.textContent = state.currentView;
        document.getElementById('taskSection').classList.remove('hidden');
        filteredTasks = state.tasks.filter(t => t.project === state.currentView && !t.completed);
        renderTaskList(filteredTasks);
    }
}

// Вывод счётчиков задач рядом с разделами
function updateBadges() {
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('count-inbox').textContent = state.tasks.filter(t => !t.completed).length;
    document.getElementById('count-today').textContent = state.tasks.filter(t => t.date === todayStr && !t.completed).length;
}

// Рендеринг списка проектов в сайдбаре
function renderProjectsSidebar() {
    const container = document.getElementById('projectsList');
    container.innerHTML = '';
    state.projects.forEach(proj => {
        const div = document.createElement('div');
        div.className = `project-item ${state.currentView === proj ? 'active' : ''}`;
        div.innerHTML = `<i class="fa-solid fa-hashtag"></i> <span>${proj}</span>`;
        div.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            state.currentView = proj;
            renderAll();
        });
        container.appendChild(div);
    });
}

// Рендеринг списка задач на экране
function renderTaskList(tasks) {
    const listContainer = document.getElementById('taskList');
    listContainer.innerHTML = '';

    if (tasks.length === 0) {
        listContainer.innerHTML = '<p style="color:#888; font-size:14px; padding:10px 0;">Все задачи выполнены! Отличная работа. 🎉</p>';
        return;
    }

    tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = `task-item p${task.priority}`;
        
        item.innerHTML = `
            <div class="task-checkbox" onclick="completeTask('${task.id}')">
                <i class="fa-solid fa-check" style="font-size:10px; color:white; display:none;"></i>
            </div>
            <div class="task-details">
                <div class="task-title">${task.title}</div>
                ${task.desc ? `<div class="task-desc">${task.desc}</div>` : ''}
                ${task.date ? `<div class="task-date"><i class="fa-regular fa-calendar"></i> ${task.date}</div>` : ''}
            </div>
            <div class="task-actions">
                <i class="fa-solid fa-trash-can" onclick="deleteTask('${task.id}')"></i>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

// Завершение задачи (клик по кругу)
window.completeTask = function(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.completed = true;
        saveState();
        renderAll();
    }
};

// Полное удаление задачи
window.deleteTask = function(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState();
    renderAll();
};

// Рендеринг структуры Блокнота
function renderNotesList() {
    const listContainer = document.getElementById('notesList');
    listContainer.innerHTML = '';

    state.notes.forEach(note => {
        const item = document.createElement('div');
        item.className = `note-item ${state.activeNoteId === note.id ? 'active' : ''}`;
        item.innerHTML = `
            <h4>${note.title || 'Пустая заметка'}</h4>
            <p>${note.date}</p>
        `;
        item.addEventListener('click', () => {
            state.activeNoteId = note.id;
            renderNotesList();
            openNoteInEditor(note);
        });
        listContainer.appendChild(item);
    });

    const activeNote = state.notes.find(n => n.id === state.activeNoteId);
    if (activeNote) {
        openNoteInEditor(activeNote);
    } else {
        document.getElementById('noteTitleView').disabled = true;
        document.getElementById('noteContentView').disabled = true;
        document.getElementById('saveNoteBtn').classList.add('hidden');
        document.getElementById('noteTitleView').value = '';
        document.getElementById('noteContentView').value = '';
    }
}

function openNoteInEditor(note) {
    const titleInput = document.getElementById('noteTitleView');
    const contentInput = document.getElementById('noteContentView');
    const saveBtn = document.getElementById('saveNoteBtn');

    titleInput.disabled = false;
    contentInput.disabled = false;
    saveBtn.classList.remove('hidden');

    titleInput.value = note.title;
    contentInput.value = note.content;
}

// Генерация сетки календаря на текущий месяц
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Первый день текущего месяца
    const firstDay = new Date(year, month, 1).getDay();
    // Количество дней в месяце
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Пустые ячейки для сдвига дней недели
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < startOffset; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        grid.appendChild(emptyCell);
    }

    // Заполнение днями
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        cell.innerHTML = `<div class="day-number">${day}</div>`;

        // Ищем задачи на этот день
        const dayTasks = state.tasks.filter(t => t.date === dayStr && !t.completed);
        dayTasks.forEach(t => {
            const tag = document.createElement('div');
            tag.className = 'calendar-task-tag';
            tag.textContent = t.title;
            tag.title = t.title;
            cell.appendChild(tag);
        });

        grid.appendChild(cell);
    }
}

// Живой поиск по всем объектам
function renderSearchResults(query) {
    document.getElementById('taskSection').classList.remove('hidden');
    document.getElementById('viewTitle').textContent = `Результаты поиска по запросу: "${query}"`;
    
    const matchedTasks = state.tasks.filter(t => 
        (t.title.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query)) && !t.completed
    );
    
    renderTaskList(matchedTasks);
}