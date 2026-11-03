import os
import sys
import uuid

# Asegurar que el directorio raíz de backend esté en el PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db

def run_tests():
    print("--- INICIANDO PRUEBAS DE BACKEND Y PERSISTENCIA (tests/test_api.py) ---")
    
    # 1. Inicialización
    init_db()
    client = TestClient(app)
    
    # 2. Health check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check falló: {res.text}"
    print("✅ Health check exitoso:", res.json())

    # 2.1 Verificar que endpoints protegidos rechazan peticiones sin token (Zero Fallback)
    unauth_res = client.get("/api/baules")
    assert unauth_res.status_code == 401, f"Se esperaba 401 para petición sin autenticación, pero se obtuvo {unauth_res.status_code}"
    print("✅ Seguridad validada: Acceso anónimo rechazado con 401 Unauthorized.")
    
    # 3. Autenticación y Control de Sesión Única
    test_email = f"test_{uuid.uuid4().hex[:8]}@baulmagico.local"
    print("\n--- PRUEBA DE CONTROL DE SESIÓN ÚNICA ---")
    auth_res1 = client.post("/api/auth/google", json={"code": "auth_code_1", "email": test_email})
    assert auth_res1.status_code == 200, f"Auth 1 falló: {auth_res1.text}"
    user_data = auth_res1.json()["usuario"]
    token_1 = auth_res1.json()["access_token"]
    user_id = user_data["id"]
    assert user_data["tiene_clave_maestra"] is False, "Nuevo usuario no debe tener clave aún"
    print("✅ Sesión 1 creada para nuevo usuario (sin clave maestra aún).")
    
    # Verificar que sesión 1 está activa
    check1 = client.get("/api/auth/session-check", headers={"Authorization": f"Bearer {token_1}"})
    assert check1.json()["activa"] is True, "Sesión 1 debería estar activa"
    print("✅ Sesión 1 verificada como activa.")
    
    # Crear sesión 2 para el mismo usuario (simulando login en otra pestaña/dispositivo)
    auth_res2 = client.post("/api/auth/google", json={"code": "auth_code_2", "email": test_email})
    assert auth_res2.status_code == 200
    token_2 = auth_res2.json()["access_token"]
    print("✅ Sesión 2 creada con token:", token_2[:15] + "...")
    
    # Ahora la sesión 1 DEBE estar invalidada
    check1_after = client.get("/api/auth/session-check", headers={"Authorization": f"Bearer {token_1}"})
    assert check1_after.json()["activa"] is False, "Sesión 1 debería haber sido invalidada"
    print("✅ Control de Sesión Única validado: Sesión 1 fue invalidada inmediatamente al abrirse la Sesión 2.")
    
    # Sesión 2 debe estar activa
    check2 = client.get("/api/auth/session-check", headers={"Authorization": f"Bearer {token_2}"})
    assert check2.json()["activa"] is True, "Sesión 2 debe estar activa"
    print("✅ Sesión 2 verificada como activa.")
    
    headers = {"Authorization": f"Bearer {token_2}"}
    
    # 4. Configuración de Clave Maestra Zero-Knowledge
    print("\n--- PRUEBA DE CONFIGURACIÓN DE CLAVE MAESTRA ZERO-KNOWLEDGE ---")
    setup_res = client.post(
        "/api/auth/setup-master-key",
        json={
            "salt_cifrado": "bW9ja19zYWx0XzE2Ynl0ZXM=",
            "canary_cifrado": "Y2FuYXJ5X2VuY3J5cHRlZF9iYXNlNjQ=",
            "canary_iv": "Y2FuYXJ5X2l2Xzk2Yml0cw=="
        },
        headers=headers
    )
    assert setup_res.status_code == 200
    assert setup_res.json()["usuario"]["tiene_clave_maestra"] is True
    print("✅ Clave maestra configurada con éxito con salt y canario.")
    
    # 5. CRUD de Baúles (Carpetas) y Tesoros (Archivos)
    print("\n--- PRUEBA DE CRUD DE BAÚLES ---")
    # Crear baúl en Modo Secreto
    baul_secreto_res = client.post(
        "/api/baules",
        json={"nombre_cifrado": "bW9ja19ub21icmVfYmF1bA==", "iv": "bW9ja19pdg==", "es_cifrado": True},
        headers=headers
    )
    assert baul_secreto_res.status_code == 201
    baul_secreto = baul_secreto_res.json()
    assert baul_secreto["es_cifrado"] is True
    print("✅ Baúl secreto creado con ID:", baul_secreto["id"])

    # Crear baúl en Modo Libre
    baul_libre_res = client.post(
        "/api/baules",
        json={"nombre_cifrado": "Carpeta Libre de Prueba", "iv": "", "es_cifrado": False},
        headers=headers
    )
    assert baul_libre_res.status_code == 201
    baul_libre = baul_libre_res.json()
    assert baul_libre["es_cifrado"] is False
    print("✅ Baúl libre creado con ID:", baul_libre["id"])

    # Listar filtrando por modo
    list_secretos = client.get("/api/baules?es_cifrado=true", headers=headers).json()
    list_libres = client.get("/api/baules?es_cifrado=false", headers=headers).json()
    assert any(b["id"] == baul_secreto["id"] for b in list_secretos)
    assert not any(b["id"] == baul_libre["id"] for b in list_secretos)
    assert any(b["id"] == baul_libre["id"] for b in list_libres)
    assert not any(b["id"] == baul_secreto["id"] for b in list_libres)
    print("✅ Filtrado estricto de baúles por Modo Libre / Modo Secreto verificado.")

    # Crear tesoro en baúl secreto
    client.post(
        "/api/tesoros",
        json={
            "baul_id": baul_secreto["id"],
            "drive_file_id": "gdrive-test-reset-999",
            "nombre_cifrado": "YXJjaGl2b19zZWNyZXRv",
            "iv": "aXZfc2VjcmV0bw==",
            "tamano_bytes": 1024,
            "tipo_mime": "application/octet-stream",
            "es_cifrado": True
        },
        headers=headers
    )

    # Crear tesoro en baúl libre
    client.post(
        "/api/tesoros",
        json={
            "baul_id": baul_libre["id"],
            "drive_file_id": "gdrive-test-libre-111",
            "nombre_cifrado": "mi_foto.jpg",
            "iv": "",
            "tamano_bytes": 2048,
            "tipo_mime": "image/jpeg",
            "es_cifrado": False
        },
        headers=headers
    )

    tesoros_secretos = client.get(f"/api/tesoros?baul_id={baul_secreto['id']}&es_cifrado=true", headers=headers).json()
    assert len(tesoros_secretos) == 1
    assert tesoros_secretos[0]["es_cifrado"] is True

    tesoros_libres = client.get(f"/api/tesoros?baul_id={baul_libre['id']}&es_cifrado=false", headers=headers).json()
    assert len(tesoros_libres) == 1
    assert tesoros_libres[0]["es_cifrado"] is False
    print("✅ Tesoros en Modo Secreto y Modo Libre aislados y verificados.")

    # 6. Prueba de Purga y Reseteo Total del Baúl
    print("\n--- PRUEBA DE RESETEO Y PURGA DE BAÚL ---")
    reset_res = client.post(
        "/api/auth/reset-vault",
        json={"confirmacion": "BORRAR_TODO"},
        headers=headers
    )
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    assert "gdrive-test-reset-999" in reset_data["deleted_drive_file_ids"]
    print("✅ Purga y reseteo completado. Drive IDs devueltos:", reset_data["deleted_drive_file_ids"])

    # Verificar que el usuario volvió a quedar sin clave y sin baúles
    auth_check_after_reset = client.post("/api/auth/google", json={"email": test_email})
    assert auth_check_after_reset.json()["usuario"]["tiene_clave_maestra"] is False
    token_3 = auth_check_after_reset.json()["access_token"]
    list_baules_after = client.get("/api/baules", headers={"Authorization": f"Bearer {token_3}"})
    assert len(list_baules_after.json()) == 0
    print("✅ Usuario verificado sin clave y sin baúles tras el reseteo.")
    
    print("\n🎉 ¡TODAS LAS PRUEBAS DE BACKEND Y PERSISTENCIA PASARON CON ÉXITO! 🎉")

if __name__ == "__main__":
    run_tests()
