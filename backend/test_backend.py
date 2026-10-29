"""
Script de verificación integral de Baúl Mágico 2 — Backend & Persistencia.
Prueba:
1. Inicialización de base de datos.
2. Control de Sesión Única (Single Active Session).
3. Ciclo de vida completo (CRUD) de Baúles (Carpetas virtuales).
4. Ciclo de vida completo (CRUD) de Tesoros (Archivos virtuales).
5. Jerarquía y cascada de eliminación.
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
    auth_res1 = client.post("/api/auth/google", json={"code": "auth_code_1"})
    assert auth_res1.status_code == 200, f"Auth 1 falló: {auth_res1.text}"
    token_1 = auth_res1.json()["access_token"]
    user_id = auth_res1.json()["usuario"]["id"]
    print("✅ Sesión 1 creada con token:", token_1[:15] + "...")
    
    # Verificar que sesión 1 está activa
    check1 = client.get("/api/auth/session-check", headers={"Authorization": f"Bearer {token_1}"})
    assert check1.json()["activa"] is True, "Sesión 1 debería estar activa"
    print("✅ Sesión 1 verificada como activa.")
    
    # Crear sesión 2 para el mismo usuario (simulando login en otra pestaña/dispositivo)
    auth_res2 = client.post("/api/auth/google", json={"code": "auth_code_2"})
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
    
    # 4. CRUD de Baúles (Carpetas)
    print("\n--- PRUEBA DE CRUD DE BAÚLES ---")
    # Crear baúl raíz
    create_baul_res = client.post(
        "/api/baules",
        json={
            "nombre_cifrado": "RG9jdW1lbnRvcyBTZWNyZXRvcw==",
            "iv": "MTIzNDU2Nzg5MDEy",
            "baul_padre_id": None
        },
        headers=headers
    )
    assert create_baul_res.status_code == 201, f"Creación de baúl falló: {create_baul_res.text}"
    baul_raiz = create_baul_res.json()
    baul_raiz_id = baul_raiz["id"]
    print("✅ Baúl raíz creado con ID:", baul_raiz_id)
    
    # Crear subbaúl
    subbaul_res = client.post(
        "/api/baules",
        json={
            "nombre_cifrado": "RmFjdHVyYXMyMDI2",
            "iv": "OTg3NjU0MzIxMDk4",
            "baul_padre_id": baul_raiz_id
        },
        headers=headers
    )
    assert subbaul_res.status_code == 201
    subbaul_id = subbaul_res.json()["id"]
    print("✅ Subbaúl creado con ID:", subbaul_id)
    
    # Listar baúles raíz
    list_root = client.get("/api/baules", headers=headers)
    root_ids = [b["id"] for b in list_root.json()]
    assert baul_raiz_id in root_ids, "El baúl raíz debe estar en la lista de raíz"
    assert subbaul_id not in root_ids, "El subbaúl NO debe estar en la lista de raíz"
    print(f"✅ Listado raíz correcto ({len(list_root.json())} baúles en raíz).")
    
    # Listar subbaúles
    list_sub = client.get(f"/api/baules?baul_padre_id={baul_raiz_id}", headers=headers)
    assert len(list_sub.json()) == 1
    assert list_sub.json()[0]["id"] == subbaul_id
    print("✅ Listado de subbaúles correcto.")
    
    # Actualizar baúl (renombrar)
    update_res = client.put(
        f"/api/baules/{baul_raiz_id}",
        json={"nombre_cifrado": "RG9jdW1lbnRvcyBBY3R1YWxpemFkb3M="},
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["nombre_cifrado"] == "RG9jdW1lbnRvcyBBY3R1YWxpemFkb3M="
    print("✅ Renombrado de baúl exitoso.")
    
    # 5. CRUD de Tesoros (Archivos)
    print("\n--- PRUEBA DE CRUD DE TESOROS ---")
    create_tesoro_res = client.post(
        "/api/tesoros",
        json={
            "baul_id": subbaul_id,
            "drive_file_id": "1googleDriveFileIdMock999",
            "nombre_cifrado": "Y29udHJhdG9fc2VjcmV0by5wZGY=",
            "iv": "YWJjZGVmMTIzNDU2",
            "tamano_bytes": 2048500,
            "tipo_mime": "application/pdf"
        },
        headers=headers
    )
    assert create_tesoro_res.status_code == 201, f"Crear tesoro falló: {create_tesoro_res.text}"
    tesoro = create_tesoro_res.json()
    tesoro_id = tesoro["id"]
    print("✅ Tesoro creado con ID:", tesoro_id)
    
    # Listar tesoros del subbaúl
    list_tesoros = client.get(f"/api/tesoros?baul_id={subbaul_id}", headers=headers)
    assert len(list_tesoros.json()) == 1
    assert list_tesoros.json()[0]["id"] == tesoro_id
    print("✅ Listado de tesoros correcto.")
    
    # Renombrar tesoro
    update_tesoro_res = client.put(
        f"/api/tesoros/{tesoro_id}",
        json={"nombre_cifrado": "Y29udHJhdG9fZmluYWxfMjAyNi5wZGY="},
        headers=headers
    )
    assert update_tesoro_res.status_code == 200
    assert update_tesoro_res.json()["nombre_cifrado"] == "Y29udHJhdG9fZmluYWxfMjAyNi5wZGY="
    print("✅ Renombrado de tesoro exitoso.")
    
    # Eliminar tesoro
    del_tesoro = client.delete(f"/api/tesoros/{tesoro_id}", headers=headers)
    assert del_tesoro.status_code == 200
    print("✅ Tesoro eliminado exitosamente.")
    
    # Verificar eliminación
    list_tesoros_after = client.get(f"/api/tesoros?baul_id={subbaul_id}", headers=headers)
    assert len(list_tesoros_after.json()) == 0
    print("✅ Verificación de eliminación de tesoro confirmada.")
    
    # Crear un tesoro anidado en subbaúl para probar cascada de drive_file_ids
    client.post("/api/tesoros", json={
        "baul_id": subbaul_id,
        "drive_file_id": "gdrive-cascade-test-123",
        "nombre_cifrado": "dGVzb3JvX2FuaWRhZG9fY2lmcmFkbw==",
        "iv": "aXZfZXhhbXBsZV85Ng==",
        "tamano_bytes": 4096,
        "tipo_mime": "application/pdf"
    }, headers=headers)

    # Eliminar baúl raíz (debe eliminar también subbaul y devolver deleted_drive_file_ids)
    del_baul = client.delete(f"/api/baules/{baul_raiz_id}", headers=headers)
    assert del_baul.status_code == 200
    del_data = del_baul.json()
    assert "deleted_drive_file_ids" in del_data
    assert "gdrive-cascade-test-123" in del_data["deleted_drive_file_ids"]
    print(f"✅ Baúl raíz eliminado en cascada exitosamente con drive_ids reportados: {del_data['deleted_drive_file_ids']}")
    
    print("\n🎉 ¡TODAS LAS PRUEBAS DE BACKEND Y PERSISTENCIA PASARON CON ÉXITO! 🎉")

if __name__ == "__main__":
    run_tests()
