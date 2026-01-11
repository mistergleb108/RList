const itemList = document.getElementById('itemList');
const addFromClipboardBtn = document.getElementById('addFromClipboard');
const addEmptyBtn = document.getElementById('addEmpty');
const clearListBtn = document.getElementById('clearList');
const toggleDuplicatesBtn = document.getElementById('toggleDuplicates');
const toggleIconDuplicates = document.getElementById('toggleIconDuplicates');
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
    updateToggleDuplicatesButton();

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
    toggleDuplicatesBtn.addEventListener('click', toggleDuplicates);
}

function loadDuplicatesSetting() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(`${COOKIE_DUPLICATES_KEY}=`)) {
            const value = cookie.substring(COOKIE_DUPLICATES_KEY.length + 1);
            removeDuplicates = value === 'true';
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
    removeDuplicates = !removeDuplicates;
    saveDuplicatesSetting();
    updateToggleDuplicatesButton();

    if (removeDuplicates) {
        removeDuplicateItems();
    }
}

function updateToggleDuplicatesButton() {
    if (removeDuplicates) {
        toggleDuplicatesBtn.classList.add('active');
        toggleIconDuplicates.textContent = '✓';
    } else {
        toggleDuplicatesBtn.classList.remove('active');
        toggleIconDuplicates.textContent = '✗';
    }
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
    if (!removeDuplicates) return;

    const seen = new Set();
    const uniqueItems = [];

    for (const item of listItems) {
        const cleanText = cleanRutubeId(item.text).trim().toLowerCase();
        if (!seen.has(cleanText)) {
            seen.add(cleanText);
            uniqueItems.push(item);
        }
    }

    if (uniqueItems.length !== listItems.length) {
        listItems = uniqueItems;
        saveToCookies();
        renderList();
        updateButtonsState();
    }
}

function updateExportSectionState() {
    if (exportExpanded) {
        exportContent.classList.add('expanded');
        toggleIcon.textContent = '▼';
    } else {
        exportContent.classList.remove('expanded');
        toggleIcon.textContent = '▶';
    }
}

function toggleExport() {
    exportExpanded = !exportExpanded;
    updateExportSectionState();
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
                console.error('Ошибка при загрузке из cookies:', e);
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
    exportBtn.disabled = !hasItems;
    downloadBtn.disabled = !hasItems;
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

            if (lines.length === 1) {
                itemsToAdd.push(cleanRutubeId(lines[0]));
            } else {
                lines.forEach(line => {
                    itemsToAdd.push(cleanRutubeId(line));
                });
            }

            addMultipleItems(itemsToAdd);

            setTimeout(() => {
                focusLastInput();
            }, 50);
        }
    } catch (err) {
        console.error('Ошибка при чтении буфера обмена:', err);

        const userInput = prompt('Вставьте текст из буфера обмена (Ctrl+V):');
        if (userInput && userInput.trim()) {
            const lines = userInput.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            if (lines.length === 0) {
                return;
            }

            const itemsToAdd = [];

            if (lines.length === 1) {
                itemsToAdd.push(cleanRutubeId(lines[0]));
            } else {
                lines.forEach(line => {
                    itemsToAdd.push(cleanRutubeId(line));
                });
            }

            addMultipleItems(itemsToAdd);

            setTimeout(() => {
                focusLastInput();
            }, 50);
        }
    }
});

function addMultipleItems(texts) {
    const seen = new Set();
    const newItems = [];

    texts.forEach(text => {
        const cleanText = text.trim();
        const checkText = cleanRutubeId(cleanText).trim().toLowerCase();

        if (!removeDuplicates || !seen.has(checkText)) {
            seen.add(checkText);
            newItems.push({
                id: Date.now() + Math.random() + Math.random(),
                text: cleanText
            });
        }
    });

    listItems.push(...newItems);
    saveToCookies();
    renderList();
    updateButtonsState();
}

addEmptyBtn.addEventListener('click', function() {
    addItem('');

    setTimeout(() => {
        focusLastInput();
    }, 50);
});

exportBtn.addEventListener('click', function() {
    const exportText = listItems.map(item => item.text).join('\n');
    exportTextarea.value = exportText;

    if (!exportExpanded) {
        exportExpanded = true;
        updateExportSectionState();
    }

    exportTextarea.focus();
    exportTextarea.select();
});

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
}

function deleteItem(id) {
    listItems = listItems.filter(item => item.id !== id);
    saveToCookies();
    renderList();
    updateButtonsState();
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
    const newHeight = Math.max(50, textarea.scrollHeight);
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

        const rutubeId = extractRutubeId(item.text);

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