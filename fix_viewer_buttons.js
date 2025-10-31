// Исправляем функции скрытия кнопок для viewer
window.hideQuickActionsForViewer = function() { 
    console.log("🚫 [DISABLED] hideQuickActionsForViewer disabled"); 
    return; // DISABLED
};

window.hideQuickActionsForViewerLoop = function() { 
    console.log("🚫 [DISABLED] hideQuickActionsForViewerLoop disabled"); 
    return; // DISABLED
};

// Отключаем все установки атрибута data-viewer-hide
const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function(name, value) {
    if (name === 'data-viewer-hide' && value === 'true') {
        console.log("🚫 [DISABLED] setAttribute data-viewer-hide disabled");
        return; // Не устанавливаем атрибут
    }
    return originalSetAttribute.call(this, name, value);
};

console.log("✅ [FIX] Viewer button hiding disabled");
