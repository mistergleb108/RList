const itemList = document.getElementById('itemList');
const addFromClipboardBtn = document.getElementById('addFromClipboard');
const addEmptyBtn = document.getElementById('addEmpty');
const clearListBtn = document.getElementById('clearList');
const newListBtn = document.getElementById('newListBtn');
const copyAllBtn = document.getElementById('copyAllBtn');
const deleteListBtn = document.getElementById('deleteListBtn');
const removeDuplicatesCheckbox = document.getElementById('removeDuplicatesCheckbox');
const listNameInput = document.getElementById('listNameInput');
const itemCount = document.getElementById('itemCount');
const listsContainer = document.getElementById('listsContainer');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');

const confirmOverlay = document.getElementById('confirmOverlay');
const confirmClearBtn = document.getElementById('confirmClear');
const cancelClearBtn = document.getElementById('cancelClear');

const confirmDeleteListOverlay = document.getElementById('confirmDeleteListOverlay');
const confirmDeleteList = document.getElementById('confirmDeleteList');
const cancelDeleteList = document.getElementById('cancelDeleteList');

const STORAGE_KEY = 'listsData';
const SETTINGS_KEY = 'listSettings';
const LIST_HEIGHT_KEY = 'listHeight';

let lists = [];
let currentListIndex = 0;
let saveTimer = null;
let removeDuplicates = true;
let listContainerWrapper = document.querySelector('.list-container-wrapper');

document.addEventListener('DOMContentLoaded', function() {
    // Миграция из cookies в localStorage
    migrateFromCookies();

    loadFromStorage();
    loadSettings();
    loadListHeight();

    if (lists.length === 0) {
        createNewList();
    }

    renderListTabs();
    switchToList(0);
    updateButtonsState();

    setTimeout(() => {
        focusLastInput();
    }, 100);

    setupEventListeners();

    if (listContainerWrapper) {
        const resizeObserver = new ResizeObserver(() => {
            saveListHeight();
        });
        resizeObserver.observe(listContainerWrapper);
    }
});

// Миграция данных из cookies в localStorage
function migrateFromCookies() {
    try {
        // Проверяем есть ли данные в cookies
        const cookies = document.cookie.split(';');
        let cookieData = null;
        let cookieSettings = null;

        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith('listsData=')) {
                const data = cookie.substring('listsData='.length);
                try {
                    cookieData = JSON.parse(decodeURIComponent(data));
                } catch (e) {
                    console.error('Ошибка парсинга cookie данных:', e);
                }
            } else if (cookie.startsWith('removeDuplicatesState=')) {
                const value = cookie.substring('removeDuplicatesState='.length);
                cookieSettings = { removeDuplicates: value === 'true' };
            }
        }

        // Если есть данные в cookies и нет в localStorage, переносим
        if (cookieData && !localStorage.getItem(STORAGE_KEY)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cookieData));
            console.log('Данные мигрированы из cookies в localStorage');
        }

        if (cookieSettings && !localStorage.getItem(SETTINGS_KEY)) {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(cookieSettings));
            console.log('Настройки мигрированы из cookies в localStorage');
        }

        // Очищаем cookies
        clearCookies();

    } catch (e) {
        console.error('Ошибка миграции данных:', e);
    }
}

function clearCookies() {
    // Очищаем все старые cookies
    const cookies = ['listsData', 'clipboardListData', 'removeDuplicatesState', 'listHeight'];
    cookies.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
}

function setupEventListeners() {
    clearListBtn.addEventListener('click', showConfirmDialog);
    confirmClearBtn.addEventListener('click', performClearList);
    cancelClearBtn.addEventListener('click', hideConfirmDialog);

    removeDuplicatesCheckbox.addEventListener('change', toggleDuplicates);

    newListBtn.addEventListener('click', handleNewList);
    copyAllBtn.addEventListener('click', copyAllToClipboard);
    deleteListBtn.addEventListener('click', showDeleteListDialog);

    listNameInput.addEventListener('input', updateListName);
    listNameInput.addEventListener('blur', saveCurrentList);

    confirmDeleteList.addEventListener('click', performDeleteList);
    cancelDeleteList.addEventListener('click', hideDeleteListDialog);
}

function loadListHeight() {
    try {
        const height = localStorage.getItem(LIST_HEIGHT_KEY);
        if (height && listContainerWrapper) {
            const heightNum = parseInt(height);
            if (!isNaN(heightNum) && heightNum > 0) {
                listContainerWrapper.style.height = heightNum + 'px';
            }
        }
    } catch (e) {
        console.error('Ошибка загрузки высоты:', e);
    }
}

function saveListHeight() {
    try {
        if (listContainerWrapper) {
            const height = listContainerWrapper.offsetHeight;
            localStorage.setItem(LIST_HEIGHT_KEY, height.toString());
        }
    } catch (e) {
        console.error('Ошибка сохранения высоты:', e);
    }
}

function loadSettings() {
    try {
        const settings = localStorage.getItem(SETTINGS_KEY);
        if (settings) {
            const parsed = JSON.parse(settings);
            removeDuplicates = parsed.removeDuplicates !== undefined ? parsed.removeDuplicates : true;
            removeDuplicatesCheckbox.checked = removeDuplicates;
        } else {
            // Значение по умолчанию
            removeDuplicates = true;
            removeDuplicatesCheckbox.checked = true;
        }
    } catch (e) {
        console.error('Ошибка загрузки настроек:', e);
        removeDuplicates = true;
        removeDuplicatesCheckbox.checked = true;
    }
}

function saveSettings() {
    try {
        const settings = {
            removeDuplicates: removeDuplicates
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Ошибка сохранения настроек:', e);
    }
}

function toggleDuplicates() {
    removeDuplicates = removeDuplicatesCheckbox.checked;
    saveSettings();

    if (removeDuplicates) {
        const removedCount = removeDuplicateItems();
        if (removedCount > 0) {
            showNotification(`Удалено ${removedCount} дубликатов`);
        }
    }
}

function showNotification(message) {
    notificationText.textContent = message;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function loadFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            lists = JSON.parse(data);
            // Проверяем структуру данных
            if (!Array.isArray(lists)) {
                console.warn('Некорректная структура данных, сброс к начальному состоянию');
                lists = [];
            }
        }
    } catch (e) {
        console.error('Ошибка загрузки данных:', e);
        lists = [];
    }
}

function saveToStorage() {
    if (saveTimer) {
        clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
        try {
            const data = JSON.stringify(lists);
            localStorage.setItem(STORAGE_KEY, data);
        } catch (e) {
            console.error('Ошибка сохранения данных в localStorage:', e);
            // Попробуем сохранить в cookies как запасной вариант (только для небольших данных)
            try {
                const smallData = encodeURIComponent(JSON.stringify(lists.slice(-5))); // Сохраняем только последние 5 списков
                const expirationDate = new Date();
                expirationDate.setDate(expirationDate.getDate() + 30);
                document.cookie = `listsData=${smallData}; expires=${expirationDate.toUTCString()}; path=/`;
            } catch (e2) {
                console.error('Ошибка сохранения в cookies:', e2);
            }
        }
    }, 500);
}

function createNewList() {
    const newList = {
        id: Date.now() + Math.random(),
        name: `Список ${lists.length + 1}`,
        items: []
    };

    lists.push(newList);
    saveToStorage();
    return lists.length - 1;
}

function handleNewList() {
    const newIndex = createNewList();
    renderListTabs();
    switchToList(newIndex);
    showNotification('Создан новый список');
}

function renderListTabs() {
    listsContainer.innerHTML = '';

    lists.forEach((list, index) => {
        const tab = document.createElement('div');
        tab.className = `list-tab ${index === currentListIndex ? 'active' : ''}`;
        tab.dataset.index = index;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'list-tab-name';
        nameSpan.textContent = list.name || `Список ${index + 1}`;

        tab.appendChild(nameSpan);
        tab.addEventListener('click', () => switchToList(index));

        listsContainer.appendChild(tab);
    });
}

function switchToList(index) {
    if (index >= 0 && index < lists.length) {
        currentListIndex = index;
        const list = lists[index];
        listNameInput.value = list.name || `Список ${index + 1}`;
        renderListTabs();
        renderList();
        updateButtonsState();
    }
}

function updateListName() {
    const name = listNameInput.value.trim();
    if (name && lists[currentListIndex]) {
        lists[currentListIndex].name = name;
        saveToStorage();
        renderListTabs();
    }
}

function getCurrentList() {
    return lists[currentListIndex];
}

function saveCurrentList() {
    saveToStorage();
}

function updateButtonsState() {
    const currentList = getCurrentList();
    const hasItems = currentList && currentList.items && currentList.items.length > 0;
    clearListBtn.disabled = !hasItems;
    deleteListBtn.disabled = lists.length <= 1;
}

function isRutubeId(text) {
    const rutubeIdRegex = /^[0-9a-f]{32}$/i;
    return rutubeIdRegex.test(text.trim());
}

function extractRutubeId(text) {
    const trimmedText = text.trim();
    if (isRutubeId(trimmedText)) {
        return trimmedText;
    }

    const idMatch = trimmedText.match(/[0-9a-f]{32}/i);
    return idMatch ? idMatch[0] : null;
}

function cleanRutubeId(text) {
    const rutubeId = extractRutubeId(text);
    return rutubeId ? rutubeId : text;
}

function removeDuplicateItems() {
    if (!removeDuplicates) return 0;

    const currentList = getCurrentList();
    if (!currentList || !currentList.items) return 0;

    const seen = new Set();
    const uniqueItems = [];
    let removedCount = 0;

    for (const item of currentList.items) {
        const cleanText = cleanRutubeId(item.text).trim().toLowerCase();
        if (!seen.has(cleanText)) {
            seen.add(cleanText);
            uniqueItems.push(item);
        } else {
            removedCount++;
        }
    }

    if (uniqueItems.length !== currentList.items.length) {
        currentList.items = uniqueItems;
        saveCurrentList();
        renderList();
        updateButtonsState();
    }

    return removedCount;
}

addFromClipboardBtn.addEventListener('click', async function() {
    try {
        const clipboardText = await navigator.clipboard.readText();

        if (clipboardText.trim()) {
            const lines = clipboardText.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            if (lines.length === 0) {
                return;
            }

            const currentList = getCurrentList();
            if (!currentList) return;

            const itemsToAdd = [];
            let duplicatesCount = 0;

            lines.forEach(line => {
                const cleanedText = cleanRutubeId(line);
                const checkText = cleanedText.trim().toLowerCase();

                if (removeDuplicates) {
                    const exists = currentList.items.some(item =>
                        cleanRutubeId(item.text).trim().toLowerCase() === checkText
                    );

                    if (!exists) {
                        itemsToAdd.push(cleanedText);
                    } else {
                        duplicatesCount++;
                    }
                } else {
                    itemsToAdd.push(cleanedText);
                }
            });

            addMultipleItems(itemsToAdd);

            if (duplicatesCount > 0) {
                showNotification(`Пропущено ${duplicatesCount} дубликатов`);
            }

            setTimeout(() => {
                focusLastInput();
            }, 50);
        }
    } catch (err) {
        const userInput = prompt('Вставьте текст из буфера обмена (Ctrl+V):');
        if (userInput && userInput.trim()) {
            const lines = userInput.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            if (lines.length === 0) {
                return;
            }

            const currentList = getCurrentList();
            if (!currentList) return;

            const itemsToAdd = [];
            let duplicatesCount = 0;

            lines.forEach(line => {
                const cleanedText = cleanRutubeId(line);
                const checkText = cleanedText.trim().toLowerCase();

                if (removeDuplicates) {
                    const exists = currentList.items.some(item =>
                        cleanRutubeId(item.text).trim().toLowerCase() === checkText
                    );

                    if (!exists) {
                        itemsToAdd.push(cleanedText);
                    } else {
                        duplicatesCount++;
                    }
                } else {
                    itemsToAdd.push(cleanedText);
                }
            });

            addMultipleItems(itemsToAdd);

            if (duplicatesCount > 0) {
                showNotification(`Пропущено ${duplicatesCount} дубликатов`);
            }

            setTimeout(() => {
                focusLastInput();
            }, 50);
        }
    }
});

function addMultipleItems(texts) {
    const currentList = getCurrentList();
    if (!currentList) return;

    const newItems = [];

    texts.forEach(text => {
        const cleanText = text.trim();
        newItems.push({
            id: Date.now() + Math.random(),
            text: cleanText
        });
    });

    currentList.items.push(...newItems);
    saveCurrentList();
    renderList();
    updateButtonsState();
}

addEmptyBtn.addEventListener('click', function() {
    addItem('');

    setTimeout(() => {
        focusLastInput();
    }, 50);
});

function addItem(text) {
    const currentList = getCurrentList();
    if (!currentList) return;

    const cleanedText = cleanRutubeId(text);

    if (removeDuplicates) {
        const checkText = cleanedText.trim().toLowerCase();
        const exists = currentList.items.some(item =>
            cleanRutubeId(item.text).trim().toLowerCase() === checkText
        );

        if (exists) {
            return;
        }
    }

    const newItem = {
        id: Date.now() + Math.random(),
        text: cleanedText || ''
    };

    currentList.items.push(newItem);
    saveCurrentList();
    renderList();
    updateButtonsState();
}

function deleteItem(id) {
    const currentList = getCurrentList();
    if (!currentList || !currentList.items) return;

    currentList.items = currentList.items.filter(item => item.id !== id);
    saveCurrentList();
    renderList();
    updateButtonsState();
}

function updateItem(id, newText) {
    const currentList = getCurrentList();
    if (!currentList || !currentList.items) return false;

    const item = currentList.items.find(item => item.id === id);
    if (item) {
        const cleanedText = cleanRutubeId(newText);

        if (removeDuplicates) {
            const checkText = cleanedText.trim().toLowerCase();
            const duplicate = currentList.items.find(otherItem =>
                otherItem.id !== id &&
                cleanRutubeId(otherItem.text).trim().toLowerCase() === checkText
            );

            if (duplicate) {
                deleteItem(id);
                return false;
            }
        }

        item.text = cleanedText;
        saveCurrentList();
        return true;
    }
    return false;
}

function copyAllToClipboard() {
    const currentList = getCurrentList();
    if (!currentList || !currentList.items || currentList.items.length === 0) {
        showNotification('Список пуст');
        return;
    }

    const exportText = currentList.items.map(item => item.text).join('\n');

    navigator.clipboard.writeText(exportText)
        .then(() => {
            showNotification('Скопировано в буфер обмена');
        })
        .catch(err => {
            console.error('Ошибка копирования:', err);
            showNotification('Ошибка копирования');
        });
}

function showConfirmDialog() {
    const currentList = getCurrentList();
    if (currentList && currentList.items && currentList.items.length > 0) {
        confirmOverlay.style.display = 'flex';
    }
}

function hideConfirmDialog() {
    confirmOverlay.style.display = 'none';
}

function performClearList() {
    const currentList = getCurrentList();
    if (currentList) {
        currentList.items = [];
        saveCurrentList();
        renderList();
        updateButtonsState();
        hideConfirmDialog();
        showNotification('Список очищен');
    }
}

function showDeleteListDialog() {
    if (lists.length > 1) {
        confirmDeleteListOverlay.style.display = 'flex';
    }
}

function hideDeleteListDialog() {
    confirmDeleteListOverlay.style.display = 'none';
}

function performDeleteList() {
    if (lists.length > 1) {
        lists.splice(currentListIndex, 1);
        if (currentListIndex >= lists.length) {
            currentListIndex = lists.length - 1;
        }
        saveToStorage();
        renderListTabs();
        switchToList(currentListIndex);
        hideDeleteListDialog();
        showNotification('Список удалён');
    }
}

function focusLastInput() {
    const inputs = document.querySelectorAll('.list-item-input');
    if (inputs.length > 0) {
        const lastInput = inputs[inputs.length - 1];
        lastInput.focus();
        lastInput.select();
    }
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    const newHeight = Math.max(38, textarea.scrollHeight);
    textarea.style.height = newHeight + 'px';

    const listItem = textarea.closest('.list-item');
    if (listItem) {
        listItem.style.minHeight = newHeight + 'px';
    }
}

function renderList() {
    const currentList = getCurrentList();

    if (!currentList || !currentList.items || currentList.items.length === 0) {
        itemList.innerHTML = '<li class="empty-list">Список пуст</li>';
        itemCount.textContent = '0';
        return;
    }

    itemCount.textContent = currentList.items.length;
    itemList.innerHTML = '';

    currentList.items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.className = 'list-item';
        listItem.dataset.id = item.id;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'list-item-content';

        const textarea = document.createElement('textarea');
        textarea.className = 'list-item-input';
        textarea.value = item.text;
        textarea.placeholder = "Введите текст...";
        textarea.rows = 1;

        autoResizeTextarea(textarea);

        textarea.addEventListener('input', function() {
            const success = updateItem(item.id, this.value);
            if (success) {
                autoResizeTextarea(this);
            }
        });

        textarea.addEventListener('blur', function() {
            updateItem(item.id, this.value);
        });

        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                const currentList = getCurrentList();
                const index = currentList.items.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    const newItem = {
                        id: Date.now() + Math.random(),
                        text: ''
                    };
                    currentList.items.splice(index + 1, 0, newItem);
                    saveCurrentList();
                    renderList();
                    updateButtonsState();

                    setTimeout(() => {
                        const newTextarea = document.querySelector(`[data-id="${newItem.id}"] .list-item-input`);
                        if (newTextarea) {
                            newTextarea.focus();
                        }
                    }, 50);
                }
            }

            if (e.key === 'Enter' && e.ctrlKey) {
                return;
            }

            if ((e.key === 'Delete' || e.key === 'Backspace') && this.value === '') {
                e.preventDefault();
                deleteItem(item.id);
            }
        });

        contentDiv.appendChild(textarea);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'list-item-actions';

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