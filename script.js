const itemList = document.getElementById('itemList');
const addFromClipboardBtn = document.getElementById('addFromClipboard');
const addEmptyBtn = document.getElementById('addEmpty');
const clearListBtn = document.getElementById('clearList');
const removeDuplicatesCheckbox = document.getElementById('removeDuplicatesCheckbox');
const copyBtn = document.getElementById('copyBtn');
const exportTextarea = document.getElementById('exportTextarea');
const itemCount = document.getElementById('itemCount');
const exportToggle = document.getElementById('exportToggle');
const toggleIcon = document.getElementById('toggleIcon');
const exportContent = document.getElementById('exportContent');
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmClearBtn = document.getElementById('confirmClear');
const cancelClearBtn = document.getElementById('cancelClear');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');

const COOKIE_KEY = 'clipboardListData';
const COOKIE_DUPLICATES_KEY = 'removeDuplicatesState';

let listItems = [];
let saveTimer = null;
let exportExpanded = false;
let removeDuplicates = true;

document.addEventListener('DOMContentLoaded', function() {
    loadFromCookies();
    loadDuplicatesSetting();
    renderList();
    updateButtonsState();
    updateExportSectionState();

    setTimeout(() => {
        focusLastInput();
    }, 100);

    setupEventListeners();
});

function setupEventListeners() {
    exportToggle.addEventListener('click', toggleExport);
    clearListBtn.addEventListener('click', showConfirmDialog);
    confirmClearBtn.addEventListener('click', performClearList);
    cancelClearBtn.addEventListener('click', hideConfirmDialog);
    removeDuplicatesCheckbox.addEventListener('change', toggleDuplicates);
    copyBtn.addEventListener('click', copyToClipboard);
}

function loadDuplicatesSetting() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(`${COOKIE_DUPLICATES_KEY}=`)) {
            const value = cookie.substring(COOKIE_DUPLICATES_KEY.length + 1);
            removeDuplicates = value === 'true';
            removeDuplicatesCheckbox.checked = removeDuplicates;
            break;
        }
    }
}

function saveDuplicatesSetting() {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);
    document.cookie = `${COOKIE_DUPLICATES_KEY}=${removeDuplicates}; expires=${expirationDate.toUTCString()}; path=/`;
}

function toggleDuplicates() {
    removeDuplicates = removeDuplicatesCheckbox.checked;
    saveDuplicatesSetting();

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

    const seen = new Set();
    const uniqueItems = [];
    let removedCount = 0;

    for (const item of listItems) {
        const cleanText = cleanRutubeId(item.text).trim().toLowerCase();
        if (!seen.has(cleanText)) {
            seen.add(cleanText);
            uniqueItems.push(item);
        } else {
            removedCount++;
        }
    }

    if (uniqueItems.length !== listItems.length) {
        listItems = uniqueItems;
        saveToCookies();
        renderList();
        updateButtonsState();
        updateExportText();
    }

    return removedCount;
}

function updateExportSectionState() {
    if (exportExpanded) {
        exportContent.classList.add('expanded');
        toggleIcon.textContent = '▼';
    } else {
        exportContent.classList.remove('expanded');
        toggleIcon.textContent = '▶';
    }
    updateExportText();
}

function updateExportText() {
    const exportText = listItems.map(item => item.text).join('\n');
    exportTextarea.value = exportText;
}

function toggleExport() {
    exportExpanded = !exportExpanded;
    updateExportSectionState();
}

function copyToClipboard() {
    exportTextarea.select();
    document.execCommand('copy');
    showNotification('Скопировано в буфер обмена');
}

function showConfirmDialog() {
    if (listItems.length > 0) {
        confirmOverlay.style.display = 'flex';
    }
}

function hideConfirmDialog() {
    confirmOverlay.style.display = 'none';
}

function performClearList() {
    listItems = [];
    saveToCookies();
    renderList();
    updateButtonsState();
    updateExportText();
    hideConfirmDialog();
}

function loadFromCookies() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(`${COOKIE_KEY}=`)) {
            const data = cookie.substring(COOKIE_KEY.length + 1);
            try {
                listItems = JSON.parse(decodeURIComponent(data));
            } catch (e) {
                listItems = [];
            }
            break;
        }
    }
}

function saveToCookies() {
    if (saveTimer) {
        clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
        const data = encodeURIComponent(JSON.stringify(listItems));
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);

        document.cookie = `${COOKIE_KEY}=${data}; expires=${expirationDate.toUTCString()}; path=/`;
    }, 500);
}

function updateButtonsState() {
    const hasItems = listItems.length > 0;
    clearListBtn.disabled = !hasItems;
    copyBtn.disabled = !hasItems;
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

            const itemsToAdd = [];
            let duplicatesCount = 0;

            lines.forEach(line => {
                const cleanedText = cleanRutubeId(line);
                const checkText = cleanedText.trim().toLowerCase();

                if (removeDuplicates) {
                    const exists = listItems.some(item =>
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

            const itemsToAdd = [];
            let duplicatesCount = 0;

            lines.forEach(line => {
                const cleanedText = cleanRutubeId(line);
                const checkText = cleanedText.trim().toLowerCase();

                if (removeDuplicates) {
                    const exists = listItems.some(item =>
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
    const newItems = [];

    texts.forEach(text => {
        const cleanText = text.trim();
        newItems.push({
            id: Date.now() + Math.random(),
            text: cleanText
        });
    });

    listItems.push(...newItems);
    saveToCookies();
    renderList();
    updateButtonsState();
    updateExportText();
}

addEmptyBtn.addEventListener('click', function() {
    addItem('');

    setTimeout(() => {
        focusLastInput();
    }, 50);
});

function addItem(text) {
    const cleanedText = cleanRutubeId(text);

    if (removeDuplicates) {
        const checkText = cleanedText.trim().toLowerCase();
        const exists = listItems.some(item =>
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

    listItems.push(newItem);
    saveToCookies();
    renderList();
    updateButtonsState();
    updateExportText();
}

function deleteItem(id) {
    listItems = listItems.filter(item => item.id !== id);
    saveToCookies();
    renderList();
    updateButtonsState();
    updateExportText();
}

function updateItem(id, newText) {
    const item = listItems.find(item => item.id === id);
    if (item) {
        const cleanedText = cleanRutubeId(newText);

        if (removeDuplicates) {
            const checkText = cleanedText.trim().toLowerCase();
            const duplicate = listItems.find(otherItem =>
                otherItem.id !== id &&
                cleanRutubeId(otherItem.text).trim().toLowerCase() === checkText
            );

            if (duplicate) {
                deleteItem(id);
                return false;
            }
        }

        item.text = cleanedText;
        saveToCookies();
        updateExportText();
        return true;
    }
    return false;
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
    const newHeight = Math.max(36, textarea.scrollHeight);
    textarea.style.height = newHeight + 'px';

    const listItem = textarea.closest('.list-item');
    if (listItem) {
        listItem.style.minHeight = newHeight + 'px';
    }
}

function renderList() {
    itemCount.textContent = listItems.length;

    if (listItems.length === 0) {
        itemList.innerHTML = '<li class="empty-list">Список пуст</li>';
        return;
    }

    itemList.innerHTML = '';

    listItems.forEach(item => {
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
                    updateExportText();

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