#!/usr/bin/env python3
"""
Скрипт для регистрации OAuth клиента для SV_ERP_Backend
Генерирует client_id и client_secret в том же формате, что и OAuthService
"""

import os
import secrets
import psycopg2
from psycopg2.extras import RealDictCursor
import sys

# Параметры подключения к БД (из переменных окружения или дефолтные)
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'loginus')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')

# Если БД в Docker, используем эти значения
# DB_HOST = 'localhost'
# DB_PORT = '5433'  # Порт проброшен на хост
# DB_NAME = 'loginus'
# DB_USER = 'postgres'
# DB_PASSWORD = 'postgres'

def generate_client_id():
    """Генерирует client_id (16 байт = 32 hex символа)"""
    return secrets.token_hex(16)

def generate_client_secret():
    """Генерирует client_secret (32 байта = 64 hex символа)"""
    return secrets.token_hex(32)

def register_oauth_client():
    """Регистрирует OAuth клиента в БД"""
    client_id = generate_client_id()
    client_secret = generate_client_secret()
    
    redirect_uris = [
        'http://localhost:4000/api/auth/callback',
        'http://localhost:3000/auth/callback'
    ]
    
    scopes = ['openid', 'email', 'profile']
    
    try:
        # Подключение к БД
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Вставка клиента
        cur.execute("""
            INSERT INTO oauth_clients (
                id, "clientId", "clientSecret", name, "redirectUris", scopes, "isActive", "createdAt", "updatedAt"
            )
            VALUES (
                gen_random_uuid(),
                %s,
                %s,
                %s,
                %s,
                %s,
                true,
                NOW(),
                NOW()
            )
            RETURNING "clientId", "clientSecret", name, "redirectUris", scopes;
        """, (
            client_id,
            client_secret,
            'SV ERP Backend',
            redirect_uris,
            scopes
        ))
        
        result = cur.fetchone()
        conn.commit()
        
        print("\n" + "="*60)
        print("✅ OAuth клиент успешно зарегистрирован!")
        print("="*60)
        print(f"\n📋 Название: {result['name']}")
        print(f"\n🔑 CLIENT_ID:")
        print(f"   {result['clientId']}")
        print(f"\n🔐 CLIENT_SECRET:")
        print(f"   {result['clientSecret']}")
        print(f"\n🔗 Redirect URIs:")
        for uri in result['redirectUris']:
            print(f"   - {uri}")
        print(f"\n📝 Scopes:")
        for scope in result['scopes']:
            print(f"   - {scope}")
        print("\n" + "="*60)
        print("\n⚠️  ВАЖНО: Сохраните CLIENT_SECRET сразу!")
        print("   Он больше не будет показан и не хранится в открытом виде.")
        print("="*60 + "\n")
        
        # Сохраняем в файл для удобства
        with open('sv_erp_oauth_credentials.txt', 'w') as f:
            f.write("SV ERP Backend - OAuth Credentials\n")
            f.write("="*60 + "\n\n")
            f.write(f"CLIENT_ID={result['clientId']}\n")
            f.write(f"CLIENT_SECRET={result['clientSecret']}\n")
            f.write(f"\nRedirect URIs:\n")
            for uri in result['redirectUris']:
                f.write(f"  - {uri}\n")
            f.write(f"\nScopes:\n")
            for scope in result['scopes']:
                f.write(f"  - {scope}\n")
        
        print("💾 Credentials сохранены в файл: sv_erp_oauth_credentials.txt\n")
        
        cur.close()
        conn.close()
        
        return result
        
    except psycopg2.Error as e:
        print(f"\n❌ Ошибка при подключении к БД: {e}")
        print(f"\nПроверьте параметры подключения:")
        print(f"  DB_HOST={DB_HOST}")
        print(f"  DB_PORT={DB_PORT}")
        print(f"  DB_NAME={DB_NAME}")
        print(f"  DB_USER={DB_USER}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        sys.exit(1)

if __name__ == '__main__':
    register_oauth_client()

