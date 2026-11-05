# 🏛️ Arquitectura del Sistema — RataVix

> **Documento Oficial de Arquitectura v1.0**  
> *Aplicación Web de Almacenamiento Seguro con Arquitectura Dual, Cifrado en Cliente y Cero Conocimiento.*

---

## 🧭 1. Resumen Ejecutivo y Filosofía de Diseño

RataVix es una solución de almacenamiento personal en la nube construida sobre una premisa inquebrantable: **la privacidad y el control total de los datos pertenecen al usuario**. 

Para resolver el dilema clásico entre **usabilidad ágil** y **seguridad de grado militar**, RataVix implementa una **Arquitectura Dual**:

```mermaid
flowchart TD
    User["Usuario Autenticado (Google OAuth)"]
    
    User --> ModeSelector{"Selector de Modo"}
    
    subgraph ModoLibre ["🔓 Modo Libre (Sin Fricción)"]
        ML_Desc["Uso diario / Acceso instantáneo"]
        ML_Drive["Google Drive: 'RataVix - Free Files'"]
        ML_Data["Archivos y nombres en formato estándar"]
    end

    subgraph ModoSecreto ["🔒 Modo Secreto (Zero-Knowledge)"]
        MS_Key["Clave Maestra derivada en RAM (PBKDF2)"]
        MS_Crypto["Cifrado AES-GCM 256 bits en navegador"]
        MS_Drive["Google Drive: 'RataVix - Secret Files'"]
        MS_Data["Blobs binarios opacos (.enc) y nombres cifrados"]
    end

    ModeSelector -->|Navegación normal| ModoLibre
    ModeSelector -->|Demanda de alta privacidad| ModoSecreto
```

### 1.2 Topología de Infraestructura Cloud y Redes

Diagrama completo de la arquitectura distribuida en la nube ($0/mes), balanceo de carga, CDN y terminación SSL:

```mermaid
flowchart TB
    subgraph Clients ["Dispositivos de Usuario"]
        Browser["Navegador Web (Chrome / Firefox / Edge / Safari)"]
    end

    subgraph EdgeLayer ["Capa Edge y CDN (Vercel Global Anycast)"]
        VercelDNS["DNS Anycast & SSL Termination (HTTPS / TLS 1.3)"]
        StaticAssets["Edge Cache (HTML5 / CSS3 / Chunks JS con Code Splitting)"]
        VercelDNS --> StaticAssets
    end

    subgraph RenderCloud ["Backend Cloud (Render.com - US East Virginia)"]
        LoadBalancer["Load Balancer & Reverse Proxy (Render Gateway)"]
        SecurityMiddleware["CORS, Security Headers & Bearer Auth Middleware"]
        FastAPI_App["FastAPI ASGI Core (Uvicorn Workers)"]
        ColdStartDetector["Health Check & Cold-Start Monitor"]
        
        LoadBalancer --> SecurityMiddleware
        SecurityMiddleware --> FastAPI_App
        LoadBalancer --> ColdStartDetector
    end

    subgraph DatabaseCloud ["Base de Datos Cloud (Neon Serverless - AWS US-East 1)"]
        NeonPooler["PgBouncer Connection Pooler (Pooling con SSL)"]
        NeonCompute["PostgreSQL Compute Node (Escalado a cero)"]
        NeonStorage["Neon Distributed Storage Engine"]
        
        NeonPooler --> NeonCompute --> NeonStorage
    end

    subgraph GoogleCloud ["Google Cloud Platform (GCP)"]
        GoogleIdentity["Google Identity Services (OAuth 2.0 Auth Server)"]
        GoogleDriveAPI["Google Drive REST API v3 (Direct-to-Storage Object Store)"]
    end

    Browser -->|1. HTTPS 443: Descarga SPA Web| VercelDNS
    Browser -->|2. OAuth 2.0: Token de Usuario| GoogleIdentity
    Browser -->|3. API REST: Metadatos Cifrados + Bearer Token| LoadBalancer
    Browser -->|4. Direct-to-Storage: Upload / Download XHR| GoogleDriveAPI
    FastAPI_App -->|SQLAlchemy 2.0: Pooling y Consultas Optimizadas| NeonPooler
```

### 1.3 Diagrama de Casos de Uso del Sistema

Diagrama funcional de los actores y los casos de uso disponibles en la plataforma:

```mermaid
flowchart LR
    UserGuest(("Usuario Invitado"))
    UserAuth(("Usuario Autenticado"))

    subgraph CasosDeUso ["RataVix — Casos de Uso"]
        UC_Login["1. Iniciar Sesión con Google OAuth"]
        UC_FreeNav["2. Explorar Carpetas en Modo Libre"]
        UC_FreeUpload["3. Subir Archivos Estándar a Drive"]
        UC_SetupKey["4. Crear Clave Maestra y Canario"]
        UC_Unlock["5. Desbloquear Bóveda Secreta en RAM"]
        UC_SecretUpload["6. Cifrar AES-GCM (256 bits) y Subir .enc"]
        UC_Bridge["7. Migrar Archivos entre Modos (Puente Mágico)"]
        UC_ViewMedia["8. Previsualizar Multimedia (PiP / PDF / Audio)"]
        UC_CascadeDelete["9. Eliminar Carpeta con Purga en Drive"]
        UC_ResetVault["10. Resetear Bóveda por Olvido de Clave"]
    end

    UserGuest --> UC_Login
    UserGuest -.->|Autenticación| UserAuth

    UserAuth --> UC_FreeNav
    UserAuth --> UC_FreeUpload
    UserAuth --> UC_SetupKey
    UserAuth --> UC_Unlock
    UserAuth --> UC_SecretUpload
    UserAuth --> UC_Bridge
    UserAuth --> UC_ViewMedia
    UserAuth --> UC_CascadeDelete
    UserAuth --> UC_ResetVault
```

---

## 🛡️ 2. Arquitectura de Cero Conocimiento (Zero-Knowledge)

En el **Modo Secreto**, el sistema opera bajo un modelo estricto de **Conocimiento Cero**:

1. **Ni el Backend (FastAPI):** Nunca recibe contraseñas maestras, claves criptográficas, nombres originales ni contenido de archivos en texto plano.
2. **Ni Google Drive:** Solo almacena blobs binarios con extensión `.enc` e identificadores opacos. No puede inspeccionar el contenido ni aplicar minería de datos o indexación.
3. **Ni Terceros en Tránsito:** Toda la criptografía ocurre localmente en la memoria RAM del navegador antes de que cualquier paquete toque la red.

### 2.1 Especificación Criptográfica (Web Crypto API Nativa)

RataVix no utiliza librerías JavaScript externas para criptografía (como CryptoJS), eliminando vulnerabilidades de dependencias y maximizando el rendimiento mediante aceleración por hardware (**AES-NI**):

| Fase | Algoritmo | Parámetros | Propósito |
| :--- | :--- | :--- | :--- |
| **Derivación de Clave** | **PBKDF2** (Password-Based Key Derivation Function 2) | SHA-256, 100,000 iteraciones, Salt criptográfico de 16 bytes | Deriva una `CryptoKey` simétrica de 256 bits a partir de la contraseña maestra del usuario. |
| **Cifrado Simétrico** | **AES-GCM** (Galois/Counter Mode) | Longitud de clave: 256 bits, Tag de autenticación: 128 bits | Cifra y autentica metadatos (nombres de archivo/carpetas) y streams binarios. |
| **Vector de Inicialización** | **CSPRNG IV** | 12 bytes (96 bits) únicos por cada operación | Garantiza que dos archivos con el mismo contenido o nombre generen cifras completamente distintas. |
| **Empaquetado de Archivos** | **Prefijado de IV** | Primeros 12 bytes del archivo `.enc` = IV; Resto = Ciphertext + Tag | Autocontención: el archivo cifrado contiene su propio vector para descifrado sin sobrecargar la base de datos. |
| **Validación de Clave** | **Mensaje Canario** | Texto fijo `ratavix-master-key-canary-valid` cifrado con AES-GCM | Permite validar si la contraseña maestra ingresada es correcta sin almacenar ningún hash de la misma en el servidor. |

### 2.2 Protocolo de Autenticación OAuth 2.0 y Control de Sesión Única

Diagrama de secuencia que detalla el apretón de manos (*handshake*) criptográfico, la verificación de tokens de Google Identity Services y la invalidación atómica de sesiones concurrentes:

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant FE as Frontend (GoogleAuthGate)
    participant GIS as Google Identity Services
    participant BE as Backend API (FastAPI)
    participant DB as Neon PostgreSQL

    U->>FE: Clic en 'Continuar con Google'
    FE->>GIS: Abre popup de consentimiento OAuth 2.0
    GIS-->>U: Solicita autorización (email, profile, drive.file)
    U->>GIS: Autoriza permisos requeridos
    GIS-->>FE: Retorna ID Token (JWT firmado) + Access Token

    FE->>BE: POST /api/auth/google (credencial JWT de Google)
    BE->>BE: Valida firma y expiración del token con Google Auth
    BE->>DB: Busca usuario por google_id o email
    
    alt Usuario Registrado Previamente
        DB-->>BE: Retorna registro existente
    else Usuario Nuevo
        BE->>DB: INSERT INTO usuarios (google_id, email)
        DB-->>BE: Registro creado exitosamente
    end

    BE->>BE: Genera nuevo active_session_token (UUID/JWT único)
    BE->>DB: UPDATE usuarios SET active_session_token = nuevo_token
    Note over BE,DB: Invalida automáticamente cualquier otra pestaña previa
    DB-->>BE: Confirmación de sesión única persistida
    
    BE-->>FE: HTTP 200 OK (Bearer Token + Estado de Canario)
    FE->>FE: Almacena Bearer Token en memoria volátil de sesión
    FE-->>U: Acceso concedido al Baúl Virtual
```

---

## ⚡ 3. Ciclo de Vida: Cifrado, Subida y Descarga

### 3.1 Flujo de Subida en Modo Secreto (Direct-to-Storage)

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant FE as Frontend (React + Web Crypto)
    participant RAM as Memoria RAM (CryptoContext)
    participant GD as Google Drive API
    participant BE as Backend API (FastAPI)
    participant DB as Base de Datos (Neon PostgreSQL)

    U->>FE: Selecciona archivo local (ej: documento.pdf)
    FE->>FE: Valida límite preventivo de RAM (500 MB)
    FE->>RAM: Solicita CryptoKey simétrica en memoria
    RAM-->>FE: Retorna CryptoKey activa
    
    rect rgb(30, 40, 60)
        Note over FE: Pipeline Criptográfico en Cliente
        FE->>FE: Genera IV aleatorio (12 bytes)
        FE->>FE: Cifra contenido con AES-GCM 256 bits
        FE->>FE: Concatena IV + Ciphertext en Blob .enc
        FE->>FE: Cifra nombre "documento.pdf" con AES-GCM + IV propio
    end

    FE->>GD: Upload Multipart XHR (Blob .enc hacia 'RataVix - Secret Files')
    Note over FE,GD: Telemetría en vivo: bytes transferidos, %, MB/s y ETA
    GD-->>FE: Retorna drive_file_id (ej: 1a2B3c...)

    FE->>BE: POST /api/tesoros (drive_file_id, nombre_cifrado, iv, es_cifrado=True)
    BE->>DB: INSERT INTO tesoros (...)
    DB-->>BE: Registro persistido
    BE-->>FE: HTTP 201 Created
    FE-->>U: Archivo disponible en el Baúl Secreto
```

### 3.2 Flujo de Descarga y Previsualización en Vivo

1. **Consulta de Metadatos:** El cliente solicita a FastAPI la lista de carpetas y archivos. FastAPI devuelve exclusivamente identificadores, nombres cifrados e IVs en Base64.
2. **Descifrado en RAM:** `CryptoContext` toma la `CryptoKey` viva en memoria y descifra instantáneamente los nombres para mostrarlos en la cuadrícula de mosaicos.
3. **Descarga Directa del Blob:** Al pulsar `👁️ Ver` o `⬇️ Descargar`, el navegador descarga directamente el stream de bytes desde Google Drive mediante `XMLHttpRequest` con telemetría visual.
4. **Desempaquetado y Decodificación:**
   - El cliente extrae los primeros 12 bytes del stream recibido (IV de archivo).
   - El resto del buffer se introduce en `window.crypto.subtle.decrypt()`.
   - Se genera una URL de objeto en memoria (`URL.createObjectURL(plainBlob)`) con su respectivo tipo MIME estricto.
5. **Liberación de Memoria:** Al cerrar el modal de visualización, se invoca inmediatamente `URL.revokeObjectURL()` para evitar fugas de memoria RAM.

### 3.3 Máquina de Estados de la Bóveda y Custodia de Memoria RAM

Diagrama de flujo y máquina de estados que modela el ciclo de vida de la aplicación, la protección de la clave efímera en memoria volátil y el protocolo de auto-bloqueo:

```mermaid
flowchart TD
    Inicio(["Inicio de la Aplicación"]) --> Desconectado["Desconectado (Pantalla de Login)"]

    Desconectado -->|Login con Google OAuth| ModoLibre["🔓 Modo Libre (Activo)"]

    subgraph SL ["Operaciones en Modo Libre"]
        ModoLibre -->|Subida estándar| SubiendoLibre["Subiendo a Google Drive (Plana)"]
        SubiendoLibre -->|Sincronizado| ModoLibre
    end

    ModoLibre -->|Clic en Modo Secreto| SolicitandoClave{"¿Existe Canario?"}

    subgraph SC ["Custodia y Desbloqueo de Clave Maestra"]
        SolicitandoClave -->|Usuario Nuevo| CrearClave["Crear Contraseña Maestra (PBKDF2)"]
        SolicitandoClave -->|Usuario Registrado| IngresarClave["Ingresar Contraseña Maestra"]
        CrearClave --> ValidandoCanario["Derivación PBKDF2 y Cifrado de Canario"]
        IngresarClave --> ValidandoCanario["Prueba de Descifrado de Canario AES-GCM"]
        ValidandoCanario -->|Contraseña Incorrecta| ErrorClave["Error: Contraseña Inválida"]
        ErrorClave --> IngresarClave
    end

    ValidandoCanario -->|Canario Auténtico| ModoSecreto["🔒 Modo Secreto (Bóveda Desbloqueada)"]
    SolicitandoClave -->|Clic en Volver| ModoLibre

    subgraph SS ["Operaciones Seguras en Bóveda"]
        ModoSecreto -->|Dropzone o Selector| CifrandoYSubiendo["Cifrado AES-GCM 256 bits y Subida .enc"]
        CifrandoYSubiendo -->|Blob persistido| ModoSecreto
        ModoSecreto -->|Ver o Descargar| DescifrandoRAM["Descarga Directa y Descifrado en RAM"]
        DescifrandoRAM -->|Cerrar Visor| LimpiezaRAM["Revocación de URL y Liberación de RAM"]
        LimpiezaRAM --> ModoSecreto
    end

    ModoSecreto -->|Clic en Modo Libre| ModoLibre
    ModoSecreto -->|401 Token Revocado en otra pestaña| AutoLock["Auto-Bloqueo de Emergencia"]
    ModoLibre -->|401 Token Revocado en otra pestaña| AutoLock

    AutoLock -->|Purga total de RAM| Desconectado
    ModoLibre -->|Cerrar Sesión| Desconectado
    ModoSecreto -->|Cerrar Sesión y Purga de RAM| Desconectado
```

---

## 🗄️ 4. Modelo de Datos Virtual y Separación de Responsabilidades

RataVix implementa un sistema de archivos virtual jerárquico superpuesto a Google Drive. Google Drive actúa como un almacén de objetos planos (*Object Storage*), mientras que Neon PostgreSQL gestiona la estructura jerárquica de carpetas y permisos:

```mermaid
erDiagram
    USUARIOS ||--o{ BAULES : "posee"
    USUARIOS ||--o{ TESOROS : "posee"
    BAULES ||--o{ BAULES : "contiene (auto-referencial)"
    BAULES ||--o{ TESOROS : "contiene"

    USUARIOS {
        int id PK
        string google_id UK
        string email UK
        string active_session_token
        string salt_cifrado
        string canary_cifrado
        string canary_iv
        datetime created_at
    }

    BAULES {
        int id PK
        int usuario_id FK
        string nombre_cifrado
        string iv
        bool es_cifrado
        int baul_padre_id FK
        datetime created_at
    }

    TESOROS {
        int id PK
        int usuario_id FK
        int baul_id FK
        string drive_file_id
        string nombre_cifrado
        int tamano_bytes
        string tipo_mime
        bool es_cifrado
        string iv
        datetime created_at
    }
```

### 4.1 Purga en Cascada y Eliminación Inteligente
Cuando un usuario elimina una carpeta (`baul`):
1. **Recolección en 1 Consulta (Backend):** FastAPI ejecuta un mapeo en memoria de toda la descendencia jerárquica y recopila todos los `drive_file_id` asociados en microsegundos (evitando el antipatrón de consultas N+1).
2. **Purga en Base de Datos:** Los registros en PostgreSQL se eliminan en cascada atómica (`ondelete="CASCADE"`).
3. **Purga Concurrente en Google Drive (Frontend):** El backend devuelve la lista `deleted_drive_file_ids` al frontend, el cual dispara solicitudes asíncronas concurrentes a la API de Google Drive para eliminar los archivos remotos, erradicando por completo archivos huérfanos.

### 4.2 Arquitectura en Capas del Backend (Clean / Layered Architecture en FastAPI)

Diagrama de la arquitectura por capas que aísla el transporte HTTP, la seguridad perimetral, la lógica de negocio y la persistencia relacional:

```mermaid
flowchart TB
    subgraph ClientReq ["1. Petición del Cliente"]
        HTTP_Req["HTTP Requests: Headers, Bearer Token y JSON Cifrado"]
    end

    subgraph SecurityLayer ["2. Capa de Seguridad y Middleware (app/core)"]
        CORSMiddleware["CORSMiddleware: Filtrado estricto de orígenes Vercel"]
        AuthMiddleware["security.py: get_current_user y Validación de Sesión Única"]
        HealthCheck["main.py: Monitor de Cold-Start y Health Check"]
    end

    subgraph TransportLayer ["3. Capa de Transporte y Rutas (app/api/v1)"]
        RouterAuth["auth.py: Endpoints de Google y Clave Maestra"]
        RouterBaules["baules.py: Endpoints CRUD de Carpetas"]
        RouterTesoros["tesoros.py: Endpoints CRUD de Archivos"]
    end

    subgraph ServiceLayer ["4. Capa de Lógica de Negocio y Servicios (app/services)"]
        CanaryService["Verificación y Cifrado de Canario"]
        CascadeDeleteService["Algoritmo BFS: Recolección de drive_file_ids"]
        DuplicateDetector["Control de Nombres Duplicados"]
    end

    subgraph DataAccessLayer ["5. Capa ORM y Persistencia (app/db y app/models)"]
        SQLAlchemyModels["Modelos Declarativos: Usuario, Baul, Tesoro"]
        DBSessionLocal["SessionLocal: Inyección de Dependencias get_db"]
        InitDB["init_db.py: Auto-migraciones ligeras de esquema"]
    end

    subgraph StorageTarget ["6. Motor de Persistencia Relacional"]
        NeonDB["PostgreSQL Serverless (Neon AWS US-East) / SQLite Local"]
    end

    HTTP_Req --> CORSMiddleware
    CORSMiddleware --> AuthMiddleware
    AuthMiddleware --> TransportLayer

    RouterAuth --> CanaryService
    RouterBaules --> CascadeDeleteService
    RouterTesoros --> DuplicateDetector

    CanaryService --> DBSessionLocal
    CascadeDeleteService --> DBSessionLocal
    DuplicateDetector --> DBSessionLocal

    DBSessionLocal --> SQLAlchemyModels
    SQLAlchemyModels --> NeonDB
```

---

## 🧱 5. Aplicación de Principios SOLID

Durante la refactorización arquitectónica de la Fase 5, el código se estructuró bajo los principios SOLID para garantizar mantenibilidad a largo plazo:

### S — Responsabilidad Única (Single Responsibility Principle)
* **Frontend:**
  * `VaultExplorer.jsx`: Coordina exclusivamente la navegación y estado del explorador.
  * `ExplorerGrid.jsx`: Responsable únicamente de la representación visual de mosaicos y Drag & Drop.
  * `FolderActionModals.jsx`: Encargado de los formularios modales de creación, renombrado y movimiento.
  * `useVaultMigration.js`: Custom Hook que encapsula al 100% la lógica del Puente Mágico entre modos (descarga, recifrado y actualización).
  * **Estilos CSS:** Desacoplados de un archivo monolítico a 8 submódulos CSS por componente.
* **Backend:**
  * `security.py`: Control de sesiones únicas y autenticación HTTP Bearer.
  * `crud/`: Operaciones puras de base de datos sin lógica de presentación.
  * `api/v1/`: Rutas HTTP que delegan la lógica a los servicios correspondientes.

### O — Abierto / Cerrado (Open/Closed Principle)
* El catálogo de detección de tipos de archivo (`fileTypes.js`) permite añadir nuevos formatos, extensiones y categorizaciones visuales sin necesidad de modificar el código interno del visor ni de la cuadrícula.
* Los componentes visuales soportan temas (`Moderno` vs. `Pixel Art`) mediante inyección de clases y estilos desacoplados sin alterar la lógica de negocio.

### L — Sustitución de Liskov (Liskov Substitution Principle)
* La capa de persistencia soporta indistintamente SQLite (para tests unitarios y desarrollo local aislado) y PostgreSQL (para producción en Neon) mediante SQLAlchemy 2.0 y su abstracción agnóstica de dialectos.

### I — Segregación de Interfaces (Interface Segregation Principle)
* El contrato de API (`docs/API_CONTRACT.md`) define esquemas de entrada y salida concisos con Pydantic (`BaulCreate`, `BaulUpdate`, `BaulResponse`). Ningún endpoint obliga al cliente a recibir o enviar campos innecesarios.

### D — Inversión de Dependencias (Dependency Inversion Principle)
* FastAPI utiliza inyección de dependencias (`Depends(get_db)`, `Depends(get_current_user)`), permitiendo mockear la base de datos o el usuario autenticado en la suite de pruebas sin acoplamiento a servicios externos.

### 5.1 Diagrama de Clases y Arquitectura de Componentes

Diagrama de clases UML que representa las relaciones entre los servicios cliente (criptografía y Google Drive) y los modelos de persistencia del backend:

```mermaid
classDiagram
    class CryptoContext {
        +CryptoKey masterKey
        +Uint8Array salt
        +deriveKey(password, salt) CryptoKey
        +encryptMetadata(plainText, key) Object
        +decryptMetadata(cipherText, iv, key) String
        +encryptBinary(buffer, key) Uint8Array
        +decryptBinary(encryptedBuffer, key) ArrayBuffer
        +clearKey() void
    }

    class GoogleDriveService {
        +uploadEncryptedFile(blob, metadata, token) Promise
        +uploadPlainFile(blob, metadata, token) Promise
        +downloadBinaryWithProgress(fileId, token, onProgress) Promise
        +deleteDriveFile(fileId, token) Promise
        +fetchGoogleStorageQuota(token) Promise
    }

    class UseVaultMigration {
        +migrateTesoroToSecret(tesoro) Promise
        +migrateTesoroToFree(tesoro) Promise
        +isMigrating Boolean
    }

    class Usuario {
        +int id
        +string google_id
        +string email
        +string active_session_token
        +string salt_cifrado
        +string canary_cifrado
        +string canary_iv
        +datetime created_at
    }

    class Baul {
        +int id
        +int usuario_id
        +string nombre_cifrado
        +string iv
        +bool es_cifrado
        +int baul_padre_id
        +datetime created_at
    }

    class Tesoro {
        +int id
        +int usuario_id
        +int baul_id
        +string drive_file_id
        +string nombre_cifrado
        +int tamano_bytes
        +string tipo_mime
        +bool es_cifrado
        +string iv
        +datetime created_at
    }

    Usuario "1" *-- "0..*" Baul : posee
    Usuario "1" *-- "0..*" Tesoro : posee
    Baul "1" *-- "0..*" Baul : subcarpetas
    Baul "1" *-- "0..*" Tesoro : archivos
    UseVaultMigration ..> CryptoContext : utiliza
    UseVaultMigration ..> GoogleDriveService : utiliza
```

### 5.2 Árbol de Componentes de Frontend y Flujo de Estado (React 18)

En el frontend moderno con React, la arquitectura no se modela con clases, sino a través de la **jerarquía de componentes funcionales**, los **contextos globales** y los **custom hooks**:

```mermaid
flowchart TD
    subgraph ContextLayer ["1. Capa de Estado Global y Contextos"]
        GAuthContext["GoogleAuthContext: Sesión OAuth y Cuota Drive"]
        CryptoCtx["CryptoContext: Clave en RAM y Web Crypto API"]
    end

    subgraph AppRoot ["2. Componente Raíz"]
        App["App.jsx: Enrutamiento de Estado y Modos"]
    end

    GAuthContext --> App
    CryptoCtx --> App

    subgraph AuthLayer ["3. Autenticación y Entrada"]
        Gate["GoogleAuthGate: Bienvenida y Login Oficial"]
    end

    subgraph LayoutLayer ["4. Estructura y Navegación"]
        Header["Header: Logo, Cuota y Desplegable Perfil"]
        ModeSelector["ModeSelector: Pestañas Modo Libre y Modo Secreto"]
    end

    subgraph CoreExplorer ["5. Explorador Virtual (VaultExplorer)"]
        VE["VaultExplorer: Buscador, Breadcrumbs y Acciones"]
        Grid["ExplorerGrid: Mosaicos Desktop y Tema Pixel Art"]
        Kebab["Menú Kebab: Renombrar, Mover, Eliminar y Migrar"]
        ModalsAction["FolderActionModals: Crear, Renombrar y Mover"]
        Toasts["ToastContainer: Notificaciones Flotantes"]
        
        VE --> Grid
        Grid --> Kebab
        VE --> ModalsAction
        VE --> Toasts
    end

    subgraph ModalLayer ["6. Modales de Operación y Visores"]
        UnlockModal["UnlockVaultModal: Desbloqueo de Bóveda en RAM"]
        SetupModal["CreateMasterKeyModal: Configuración de Clave"]
        ResetModal["ResetVaultModal: Purga y Reseteo por Olvido"]
        UploadHUD["UploadProgressModal: HUD Gamer con Porcentaje y MB/s"]
        Viewer["TreasureViewerModal: Visor Universal con PiP y PDF"]
        Confirm["ConfirmModal: Diálogos Seguros Oscuros"]
    end

    subgraph LogicServices ["7. Capa de Servicios y Custom Hooks"]
        MigrationHook["useVaultMigration: Orquestador del Puente Mágico"]
        ApiClient["api.js: Cliente HTTP con FastAPI y Sesión Única"]
        DriveClient["googleDrive.js: XHR Direct-to-Storage con Telemetría"]
    end

    App -->|No Autenticado| Gate
    App -->|Autenticado| Header
    App -->|Autenticado| ModeSelector
    App -->|Autenticado| VE
    
    ModeSelector -.->|Solicita Desbloqueo| UnlockModal
    UnlockModal -.->|Primer Uso| SetupModal
    UnlockModal -.->|Olvido de Clave| ResetModal
    
    VE -.->|Subida en Curso| UploadHUD
    Grid -.->|Clic en Archivo| Viewer
    Kebab -.->|Acciones Destructivas| Confirm
    
    Kebab -->|Dispara Migración Dual| MigrationHook
    MigrationHook --> CryptoCtx
    MigrationHook --> DriveClient
    MigrationHook --> ApiClient
    
    VE --> ApiClient
    VE --> DriveClient
    Viewer --> DriveClient
    Viewer --> CryptoCtx
```

### 5.3 Diagrama de Flujo de Datos Unidireccional y Custom Hooks (React Dataflow Lifecycle)

Diagrama dinámico que ilustra cómo fluye la información en el cliente ante un evento de usuario (ejemplo: migración atómica por arrastre o menú contextual):

```mermaid
flowchart TD
    subgraph UIEvent ["1. Disparador de Interacción (UI Event)"]
        UserAction["Acción del Usuario: Drag and Drop o Menú Contextual Kebab"]
    end

    subgraph HookLayer ["2. Custom Hook Orquestador (useVaultMigration.js)"]
        StartMigration["handleMigrateTesoro: Inicia migración atómica"]
        ProgressState["setUploading y setProgress: Activa HUD Gamer"]
        UpdateVaultState["Actualiza estado local de carpetas y archivos"]
    end

    subgraph CryptoLayer ["3. Capa Criptográfica en RAM (CryptoContext.jsx)"]
        GetMasterKey["Recupera CryptoKey efímera de la memoria RAM"]
        DecryptBlob["Web Crypto: subtle.decrypt con AES-GCM 256 bits"]
        EncryptBlob["Web Crypto: subtle.encrypt con nuevo IV de 12 bytes"]
    end

    subgraph CloudStorageLayer ["4. Servicio de Almacenamiento (googleDrive.js)"]
        DownloadSource["XHR Download: Descarga binario con progreso en vivo"]
        UploadTarget["XHR Multipart: Sube nuevo archivo a la carpeta destino"]
        DeleteOld["DELETE Request: Purga inmediata del archivo anterior en Drive"]
    end

    subgraph BackendSync ["5. Sincronización de Metadatos (api.js)"]
        PutMetadata["PUT /api/tesoros: Actualiza drive_file_id, nombre e IV"]
        VerifyResponse["Valida respuesta HTTP 200 de FastAPI"]
    end

    subgraph UIRender ["6. Re-renderizado de Interfaz"]
        ReRender["Re-renderizado instantáneo de la Cuadrícula ExplorerGrid"]
        ToastSuccess["ToastContainer: Notificación flotante de éxito"]
    end

    UserAction --> StartMigration
    StartMigration --> ProgressState
    StartMigration --> DownloadSource
    
    DownloadSource --> DecryptBlob
    DecryptBlob --> EncryptBlob
    EncryptBlob --> UploadTarget
    
    UploadTarget --> PutMetadata
    PutMetadata --> DeleteOld
    DeleteOld --> UpdateVaultState
    
    UpdateVaultState --> ReRender
    ReRender --> ToastSuccess
```

---

## 🔐 6. Modelo de Amenazas y Control de Sesión Única

```mermaid
flowchart LR
    subgraph Browser ["Navegador del Usuario"]
        Tab1["Pestaña A (Sesión Activa)"]
        Tab2["Pestaña B (Nueva Sesión)"]
        RAM_Mem["Clave Efímera en RAM"]
    end

    subgraph Server ["FastAPI + Neon DB"]
        SessionToken["active_session_token"]
    end

    Tab2 -->|1. Inicia sesión| Server
    Server -->|2. Genera nuevo token| SessionToken
    Tab1 -->|3. Próxima petición HTTP| Server
    Server -->|4. 401 Unauthorized - Token Revocado| Tab1
    Tab1 -->|5. Destruye clave en RAM y bloquea vista| RAM_Mem
```

1. **Destrucción Inmediata de Claves:**
   * La clave maestra nunca toca `localStorage`, `sessionStorage`, `IndexedDB` ni cookies.
   * Al pulsar `🚪 Cerrar Sesión`, cambiar de cuenta o recargar la página (F5), la referencia de `CryptoKey` en JavaScript se desasigna y el recolector de basura de Chromium la destruye de la RAM.
2. **Control de Sesión Única:**
   * Si el usuario inicia sesión en otro dispositivo o pestaña, el backend actualiza su `active_session_token`.
   * Cualquier petición subsecuente desde la sesión anterior recibe un código `401 Unauthorized`, provocando el autobloqueo de la interfaz y la purga de la clave en memoria.
3. **Defensa contra Fugas de Memoria (RAM Exhaustion):**
   * El cliente intercepta cualquier archivo que supere los **500 MB** antes de intentar cargarlo en memoria con `file.arrayBuffer()`, protegiendo la pestaña de caídas por falta de memoria (*Out of Memory*).

