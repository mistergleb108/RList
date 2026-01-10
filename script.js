// DOM элементы
const itemList = document.getElementById('itemList');
const addFromClipboardBtn = document.getElementById('addFromClipboard');
const addEmptyBtn = document.getElementById('addEmpty');
const clearListBtn = document.getElementById('clearList');
const exportBtn = document.getElementById('exportBtn');
const downloadBtn = document.getElementById('downloadBtn');
const exportTextarea = document.getElementById('exportTextarea');
const itemCount = document.getElementById('itemCount');
const exportToggle = document.getElementById('exportToggle');
const toggleIcon = document.getElementById('toggleIcon');
const exportContent = document.getElementById('exportContent');
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmClearBtn = document.getElementById('confirmClear');
const cancelClearBtn = document.getElementById('cancelClear');

// Ключ для сохранения в cookies
const COOKIE_KEY = 'clipboardListData';

// Массив для хранения элементов списка
let listItems = [];

// Автосохранение таймер
let saveTimer = null;

// Состояние экспорта (свёрнут/развёрнут) - по умолчанию свёрнут
let exportExpanded = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadFromCookies();
    renderList();
    updateButtonsState();

    // Устанавливаем свёрнутое состояние экспорта
    updateExportSectionState();

    // Фокус на последнем элементе при загрузке
    setTimeout(() => {
        focusLastInput();
    }, 100);

    // Настройка обработчиков
    setupEventListeners();
});

function setupEventListeners() {
    // Переключение состояния экспорта
    exportToggle.addEventListener('click', toggleExport);

    // Диалог подтверждения очистки
    clearListBtn.addEventListener('click', showConfirmDialog);
    confirmClearBtn.addEventListener('click', performClearList);
    cancelClearBtn.addEventListener('click', hideConfirmDialog);
}

// Проверка на Rutube ID
function isRutubeId(text) {
    // Rutube ID: 32 символа, шестнадцатеричные цифры (0-9, a-f)
    const rutubeIdRegex = /^[0-9a-f]{32}$/i;
    return rutubeIdRegex.test(text.trim());
}

// Извлечение Rutube ID из текста
function extractRutubeId(text) {
    const trimmedText = text.trim();
    if (isRutubeId(trimmedText)) {
        return trimmedText;
    }

    // Попробуем найти ID в строке с другими символами
    const idMatch = trimmedText.match(/[0-9a-f]{32}/i);
    return idMatch ? idMatch[0] : null;
}

// Обновление видимого состояния секции экспорта
function updateExportSectionState() {
    if (exportExpanded) {
        exportContent.classList.add('expanded');
        toggleIcon.textContent = '▼';
    } else {
        exportContent.classList.remove('expanded');
        toggleIcon.textContent = '▶';
    }
}

// Переключение состояния экспорта
function toggleExport() {
    exportExpanded = !exportExpanded;
    updateExportSectionState();
}

// Показать диалог подтверждения очистки
function showConfirmDialog() {
    if (listItems.length > 0) {
        confirmOverlay.style.display = 'flex';
    }
}

// Скрыть диалог подтверждения очистки
function hideConfirmDialog() {
    confirmOverlay.style.display = 'none';
}

// Выполнить очистку списка
function performClearList() {
    listItems = [];
    saveToCookies();
    renderList();
    updateButtonsState();
    hideConfirmDialog();
}

// Загрузка списка из cookies
function loadFromCookies() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(`${COOKIE_KEY}=`)) {
            const data = cookie.substring(COOKIE_KEY.length + 1);
            try {
                listItems = JSON.parse(decodeURIComponent(data));
            } catch (e) {
                console.error('Ошибка при загрузке из cookies:', e);
                listItems = [];
            }
            break;
        }
    }
}

// Сохранение списка в cookies
function saveToCookies() {
    if (saveTimer) {
        clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
        const data = encodeURIComponent(JSON.stringify(listItems));
        // Устанавливаем срок действия на 30 дней
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);

        document.cookie = `${COOKIE_KEY}=${data}; expires=${expirationDate.toUTCString()}; path=/`;
    }, 500);
}

// Обновление состояния кнопок
function updateButtonsState() {
    const hasItems = listItems.length > 0;
    clearListBtn.disabled = !hasItems;
    exportBtn.disabled = !hasItems;
    downloadBtn.disabled = !hasItems;
}

// Добавление элемента из буфера обмена с разбиением на строки
addFromClipboardBtn.addEventListener('click', async function() {
    try {
        // Запрос доступа к буферу обмена
        const clipboardText = await navigator.clipboard.readText();

        if (clipboardText.trim()) {
            // Разделяем текст на строки
            const lines = clipboardText.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            if (lines.length === 0) {
                return;
            }

            // Если только одна строка - добавляем как один элемент
            if (lines.length === 1) {
                addItem(lines[0]);
            } else {
                // Если несколько строк - добавляем каждую как отдельный элемент
                lines.forEach(line => {
                    addItem(line);
                });
            }

            // Фокус на последний элемент
            setTimeout(() => {
                focusLastInput();
            }, 50);
        }
    } catch (err) {
        console.error('Ошибка при чтении буфера обмена:', err);

        // Альтернативный метод для браузеров без поддержки Clipboard API
        const userInput = prompt('Вставьте текст из буфера обмена (Ctrl+V):');
        if (userInput && userInput.trim()) {
            // Разделяем текст на строки
            const lines = userInput.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            if (lines.length === 0) {
                return;
            }

            // Если только одна строка - добавляем как один элемент
            if (lines.length === 1) {
                addItem(lines[0]);
            } else {
                // Если несколько строк - добавляем каждую как отдельный элемент
                lines.forEach(line => {
                    addItem(line);
                });
            }

            // Фокус на последний элемент
            setTimeout(() => {
                focusLastInput();
            }, 50);
        }
    }
});

// Добавление пустой строки
addEmptyBtn.addEventListener('click', function() {
    addItem('');

    // Фокус на новый элемент
    setTimeout(() => {
        focusLastInput();
    }, 50);
});

// Экспорт списка в текстовое поле
exportBtn.addEventListener('click', function() {
    const exportText = listItems.map(item => item.text).join('\n');
    exportTextarea.value = exportText;

    // Развернуть секцию экспорта, если она свёрнута
    if (!exportExpanded) {
        exportExpanded = true;
        updateExportSectionState();
    }

    // Автоматически выделить весь текст для удобного копирования
    exportTextarea.focus();
    exportTextarea.select();
});

// Скачивание списка как текстового файла
downloadBtn.addEventListener('click', function() {
    const exportText = listItems.map(item => item.text).join('\n');
    const blob = new Blob([exportText], {
        type: 'text/plain;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'список.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Добавление нового элемента в список
function addItem(text) {
    const newItem = {
        id: Date.now() + Math.random(), // Уникальный ID
        text: text || ''
    };

    listItems.push(newItem);
    saveToCookies();
    renderList();
    updateButtonsState();
}

// Удаление элемента из списка
function deleteItem(id) {
    listItems = listItems.filter(item => item.id !== id);
    saveToCookies();
    renderList();
    updateButtonsState();
}

// Обновление элемента списка
function updateItem(id, newText) {
    const item = listItems.find(item => item.id === id);
    if (item) {
        item.text = newText;
        saveToCookies();
        return true;
    }
    return false;
}

// Фокус на последний input
function focusLastInput() {
    const inputs = document.querySelectorAll('.list-item-input');
    if (inputs.length > 0) {
        const lastInput = inputs[inputs.length - 1];
        lastInput.focus();
        lastInput.select();
    }
}

// Автоматическое изменение высоты textarea при вводе
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    const newHeight = Math.max(50, textarea.scrollHeight); // Минимум 50px
    textarea.style.height = newHeight + 'px';

    // Также обновляем высоту родительского элемента
    const listItem = textarea.closest('.list-item');
    if (listItem) {
        listItem.style.minHeight = newHeight + 'px';
    }
}

// Отрисовка списка
function renderList() {
    // Обновляем счетчик элементов
    itemCount.textContent = listItems.length;

    // Если список пуст
    if (listItems.length === 0) {
        itemList.innerHTML = '<li class="empty-list">Список пуст</li>';
        return;
    }

    // Отрисовываем элементы списка
    itemList.innerHTML = '';

    listItems.forEach(item => {
        const listItem = document.createElement('li');
        listItem.className = 'list-item';
        listItem.dataset.id = item.id;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'list-item-content';

        // Каждая строка - всегда textarea для многострочного текста
        const textarea = document.createElement('textarea');
        textarea.className = 'list-item-input';
        textarea.value = item.text;
        textarea.placeholder = "Введите текст...";
        textarea.rows = 1;

        // Автоматическое изменение высоты
        autoResizeTextarea(textarea);

        // Обновление при изменении
        textarea.addEventListener('input', function() {
            updateItem(item.id, this.value);
            autoResizeTextarea(this);
        });

        // Автосохранение при потере фокуса
        textarea.addEventListener('blur', function() {
            updateItem(item.id, this.value);
        });

        // Enter добавляет новый элемент (только если не нажата Ctrl)
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                // Добавляем новый элемент после текущего
                const index = listItems.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    const newItem = {
                        id: Date.now() + Math.random(),
                        text: ''
                    };
                    listItems.splice(index + 1, 0, newItem);
                    saveToCookies();
                    renderList();
                    updateButtonsState();

                    // Фокус на новый элемент
                    setTimeout(() => {
                        const newTextarea = document.querySelector(`[data-id="${newItem.id}"] .list-item-input`);
                        if (newTextarea) {
                            newTextarea.focus();
                        }
                    }, 50);
                }
            }

            // Ctrl+Enter добавляет новую строку внутри textarea
            if (e.key === 'Enter' && e.ctrlKey) {
                // Разрешаем стандартное поведение - добавление новой строки
                return;
            }

            // Delete или Backspace на пустом поле удаляет элемент
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.value === '') {
                e.preventDefault();
                deleteItem(item.id);
            }
        });

        contentDiv.appendChild(textarea);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'list-item-actions';

        // Проверяем, содержит ли текст Rutube ID
        const rutubeId = extractRutubeId(item.text);

        // Кнопка Rutube (если есть ID)
        if (rutubeId) {
            const rutubeBtn = document.createElement('button');
            rutubeBtn.className = 'rutube-btn';
            rutubeBtn.title = 'Открыть на Rutube';
            rutubeBtn.textContent = '▶';
            rutubeBtn.addEventListener('click', () => {
                window.open(`https://rutube.ru/video/${rutubeId}/`, '_blank');
            });
            actionsDiv.appendChild(rutubeBtn);
        }

        // Кнопка удаления
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.title = 'Удалить';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', () => deleteItem(item.id));

        actionsDiv.appendChild(deleteBtn);

        listItem.appendChild(contentDiv);
        listItem.appendChild(actionsDiv);

        itemList.appendChild(listItem);
    });
}
