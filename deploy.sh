#!/bin/bash
echo "Загрузка frontend/index.html на сервер..."

# Копируем файл на сервер
scp -i C:/Users/teramisuslik/.ssh/id_ed25519 frontend/index.html root@45.144.176.42:/tmp/index.html

if [ $? -eq 0 ]; then
    echo "Файл скопирован на сервер"
    # Копируем в контейнер
    ssh -i C:/Users/teramisuslik/.ssh/id_ed25519 root@45.144.176.42 "docker cp /tmp/index.html loginus-backend:/app/frontend/index.html && rm /tmp/index.html && echo 'Файл успешно загружен в контейнер!'"
else
    echo "Ошибка при копировании файла"
    exit 1
fi

