import re

with open('src/rbac/rbac.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Удаляем блок проверки super_admin в методе updateRolePermissions
pattern = r'    // Проверяем, является ли пользователь super_admin\s+let isSuperAdmin = false;\s+if \(userId\) \{[^}]+\}\s+// Если роль системная, разрешаем изменение только суперадмину\s+if \(role\.isSystem && !isSuperAdmin\) \{\s+throw new ForbiddenException\('Cannot modify system role'\);\s+\}'

replacement = '''    // Разрешаем изменение прав для всех ролей (включая системные)
    // Права можно изменять, так как это не влияет на структуру роли'''

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/rbac/rbac.service.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Fixed')

