# Comunidad Segura · Cochabamba

- [x] Configurar autenticación (correo, Google y Lovable) y migración de base de datos compartida con RLS (`perfiles`, `user_roles`, `reportes`, `publicaciones_voluntariado`, `alertas_oficiales`, `indices_por_provincia`, `mensajes_comunidad`)
- [x] Definir sistema de diseño editorial oscuro (`src/styles.css`) y fuentes tipográficas en `src/routes/__root.tsx`
- [x] Integrar la imagen de fondo subida (`cochabamba-fondo.png`) con tratamiento visual atractivo y paneles translúcidos
- [x] Crear datos geoespaciales de Cochabamba con las 16 provincias unidas sin separaciones (silueta fiel a la referencia), 48 municipios y distritos/comunas con red vial dorada y balizas 3D
- [x] Implementar Mapa 3D libre interactivo en `/` (pan, giro 360°, inclinación, zoom, provincias → municipios → distritos, 6 índices e histograma)
- [x] Implementar página de Reportes (`/reportes`) con clasificación IA (AI Gateway) y Panel de Moderador
- [x] Implementar página de Voluntariado (`/voluntariado`) conectada a la base de datos compartida
- [x] Implementar apartado de conversación abierta (`/comunidad`) para que las personas hablen libremente en tiempo real
- [x] Implementar Botón SOS flotante y Biblioteca de Seguridad 24/7 (`/emergencias`) con caché local
- [x] Implementar página de ingreso/registro (`/auth`)
- [x] Verificar compilación, pruebas y flujo visual en navegador