#!/usr/bin/env python3
"""
Скрипт для получения информации о пользователе через OAuth API
"""

import requests
import sys

# Параметры
BASE_URL = "https://loginus.startapus.com/api"
EMAIL = "saschkaproshka04@mail.ru"

# Для получения userinfo нужен access_token
# Но мы можем получить данные напрямую из БД
print("Для получения данных через /oauth/userinfo нужен access_token пользователя.")
print("Альтернатива: получить данные напрямую из БД.")
print("\nВыполните на сервере SQL запросы для получения полной информации.")

