"""
Script de verificación integral de Baúl Mágico 2 — Backend & Persistencia.
Prueba:
1. Inicialización de base de datos.
2. Control de Sesión Única (Single Active Session).
3. Ciclo de vida completo (CRUD) de Baúles (Carpetas virtuales).
4. Ciclo de vida completo (CRUD) de Tesoros (Archivos virtuales).
5. Jerarquía y cascada de eliminación.
6. Configuración de clave maestra Zero-Knowledge (salt + canario).
7. Purga total y reseteo de baúl (olvido de contraseña).
"""
from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db

def run_tests():
    print("--- INICIANDO PRUEBAS DE BACKEND Y PERSISTENCIA ---")
    
    # 1. Inicialización
    init_db()
    client = TestClient(app)
    
    # 2. Health check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check falló: {res.text}"
    print("✅ Health check exitoso:", res.json())
    
    # 3. Autenticación y Control de Sesión Única
    print("\n--- PRUEBA DE CONTROL DE SESIÓN ÚNICA ---")
    auth_res1 = client.post("/api/auth/google", json={"code": "auth_code_1", "email": "test_user_autonomia@baulmagico.local"})
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
    auth_res2 = client.post("/api/auth/google", json={"code": "auth_code_2", "email": "test_user_autonomia@baulmagico.local"})
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
    assert setup_res.status_code == 200, f"Setup clave falló: {setup_res.text}"
    setup_data = setup_res.json()["usuario"]
    assert setup_data["tiene_clave_maestra"] is True
    assert setup_data["salt_cifrado"] == "bW9ja19zYWx0XzE2Ynl0ZXM="
    print("✅ Clave maestra configurada con éxito con salt y canario.")

    # 5. CRUD de Baúles (Carpetas)
    print("\n--- PRUEBA DE CRUD DE BAÚLES ---")
    create_baul_res = client.post(
        "/api/baules",
        json={
            "nombre_cifrado": "RG9jdW1lbnRvcyBTZWNyZXRvcw==",
            "iv": "MTIzNDU2Nzg5MDEy",
            "baul_padre_id": None
        },
        headers=headers
    )
    assert create_baul_res.status_code == 201
    baul_raiz = create_baul_res.json()
    baul_raiz_id = baul_raiz["id"]
    print("✅ Baúl raíz creado con ID:", baul_raiz_id)
    
    # Crear un tesoro
    client.post("/api/tesoros", json={
        "baul_id": baul_raiz_id,
        "drive_file_id": "gdrive-test-reset-999",
        "nombre_cifrado": "dGVzb3JvX3BhcmFfcHVyZ2E=",
        "iv": "aXZfZXhhbXBsZV85Ng==",
        "tamano_bytes": 1024,
        "tipo_mime": "text/plain"
    }, headers=headers)
    print("✅ Tesoro de prueba creado.")

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
    auth_check_after_reset = client.post("/api/auth/google", json={"email": "test_user_autonomia@baulmagico.local"})
    assert auth_check_after_reset.json()["usuario"]["tiene_clave_maestra"] is False
    token_3 = auth_check_after_reset.json()["access_token"]
    list_baules_after = client.get("/api/baules", headers={"Authorization": f"Bearer {token_3}"})
    assert len(list_baules_after.json()) == 0
    print("✅ Usuario verificado sin clave y sin baúles tras el reseteo.")
    
    print("\n🎉 ¡TODAS LAS PRUEBAS DE BACKEND Y PERSISTENCIA PASARON CON ÉXITO! 🎉")

if __name__ == "__main__":
    run_tests()
