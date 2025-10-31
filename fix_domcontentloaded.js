// Единый обработчик DOMContentLoaded для предотвращения конфликтов
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 [UNIFIED] DOMContentLoaded - single handler');
    
    // Выполняем все инициализации в правильном порядке
    try {
        // 1. Скрываем Quick Actions для viewer
        if (typeof window.hideQuickActionsForViewer === 'function') {
            window.hideQuickActionsForViewer();
        }
        
        // 2. Принудительно показываем контент
        const allElementsHTML = document.querySelectorAll('*');
        allElementsHTML.forEach(el => {
            if (el.classList.contains('stats-grid')) {
                return; // Не трогаем сетку
            }
            el.style.setProperty('display', 'block', 'important');
            el.style.setProperty('visibility', 'visible', 'important');
            el.style.setProperty('opacity', '1', 'important');
        });
        
        // 3. Заменяем старую 2FA
        if (typeof window.replaceOld2FAWithNFA === 'function') {
            window.replaceOld2FAWithNFA();
        }
        
        // 4. Инициализируем реферальную модалку
        if (typeof window.initReferralModal === 'function') {
            window.initReferralModal();
        }
        
        // 5. Настраиваем модалку привязки email
        const modal = document.getElementById('bindEmailModal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    if (typeof window.closeBindEmailModal === 'function') {
                        window.closeBindEmailModal();
                    }
                }
            });
        }
        
        console.log('✅ [UNIFIED] All initializations completed');
    } catch (error) {
        console.error('❌ [UNIFIED] Error in unified DOMContentLoaded handler:', error);
    }
});
