# 🔐 Módulo Criptográfico — Web Crypto API

Este módulo gestiona la seguridad de Conocimiento Cero en el cliente:
* **`pbkdf2.js`:** Derivación de clave maestra de 256 bits a partir de la contraseña del usuario.
* **`aesGcm.js`:** Cifrado y descifrado de archivos y metadatos usando AES-GCM (256 bits) con vector de inicialización (IV) de 96 bits.
* **`keyStorage.js`:** Manejador de la clave efímera en memoria volátil de React.
