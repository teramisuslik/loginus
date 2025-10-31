// Отключаем скрытие кнопок для viewer
console.log("🚫 [DISABLED] Quick Actions hiding disabled");

// Переопределяем функцию скрытия кнопок
if (typeof window.hideQuickActionsForViewer === 'function') {
    window.hideQuickActionsForViewer = function() {
        console.log("🚫 [DISABLED] hideQuickActionsForViewer disabled");
        return; // Не скрываем кнопки
    };
}

// Переопределяем функцию скрытия админских секций
if (typeof window.hideAdminOnlySections === 'function') {
    window.hideAdminOnlySections = function() {
        console.log("🚫 [DISABLED] hideAdminOnlySections disabled");
        return; // Не скрываем секции
    };
}

// Удаляем все атрибуты data-viewer-hide
document.querySelectorAll('[data-viewer-hide]').forEach(el => {
    el.removeAttribute('data-viewer-hide');
    console.log("✅ [FIX] Removed data-viewer-hide from:", el.tagName, el.className);
});

// Принудительно показываем все кнопки
document.querySelectorAll('button').forEach(btn => {
    btn.style.display = 'block';
    btn.style.visibility = 'visible';
    btn.style.opacity = '1';
});

console.log("✅ [FIX] Viewer button hiding completely disabled");
