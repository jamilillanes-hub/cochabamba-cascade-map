# Comunidad Segura · Cochabamba
## Especificaciones y guía de construcción paso a paso

**Fecha:** 25 de noviembre de 2026.  
**Idioma de la aplicación:** español.  
**Ámbito:** departamento de Cochabamba, Bolivia.

Este documento permite organizar la construcción de la aplicación y revisar sus resultados. Distingue los requisitos deseados de las limitaciones de la versión existente. No sustituye la validación de límites territoriales, estadísticas ni teléfonos con fuentes oficiales.

## 1. Objetivo

Crear una aplicación web atractiva donde los residentes puedan explorar Cochabamba, consultar reportes locales, hacer preguntas sobre una zona con inteligencia artificial, conversar con su comunidad, encontrar oportunidades de voluntariado y acceder a contactos de emergencia.

La primera pantalla debe mostrar el mapa utilizable, no una página publicitaria.

## 2. Requisitos principales

1. Mostrar un mapa continuo de Cochabamba: las provincias no deben aparecer como piezas separadas.
2. Permitir mover libremente el mapa, acercarlo, alejarlo, girarlo y restablecer su posición.
3. Al seleccionar una provincia, mostrar sus municipios; al seleccionar un municipio, mostrar sus distritos cuando haya datos disponibles.
4. Usar la imagen del mapa aportada como referencia visual y la fotografía nocturna de Cochabamba como fondo de la página.
5. Permitir publicar y consultar reportes ciudadanos, con clasificación asistida por IA.
6. Incorporar una conversación comunitaria abierta con temas de conversación.
7. Permitir seleccionar una zona y escribir una pregunta; responder mediante AI Gateway a partir de reportes, alertas e índices disponibles.
8. Mostrar talleres, actividades y puntos de acopio de voluntariado.
9. Mantener acceso visible al botón SOS y al directorio de emergencias.
10. Permitir registro e inicio de sesión por correo y contraseña, Google y Lovable.

## 3. Diseño visual

- Fondo: fotografía panorámica nocturna de Cochabamba proporcionada por el usuario.
- Estilo: interfaz oscura, acentos dorados y paneles translúcidos con suficiente contraste.
- Tipografías de la versión existente: DM Sans y Space Grotesk.
- Mapa: colores vivos que distingan territorios, bordes legibles, nombres y marcadores de incidentes.
- Adaptación: usable en teléfonos, tabletas y computadoras, sin textos ni controles superpuestos.
- Accesibilidad: etiquetas comprensibles, foco visible, navegación por teclado y alternativa de selección mediante listas.
- Animaciones: discretas y compatibles con la preferencia de movimiento reducido.

## 4. Tecnología y organización

### 4.1 Herramientas

| Área | Tecnología |
| --- | --- |
| Aplicación | TanStack Start v1, React 19 y Vite 7 |
| Navegación | TanStack Router |
| Estilos | Tailwind CSS v4 y componentes shadcn/ui |
| Iconos | Lucide React |
| Datos y cuentas | Lovable Cloud |
| IA | Lovable AI Gateway |
| Validación de entradas | Zod |
| Pruebas | Vitest y Playwright |

El mapa actual utiliza SVG con transformaciones de cámara; no es un motor geográfico oficial ni una escena Three.js. Para una reconstrucción basada en cartografía real, elegir un motor adecuado después de obtener los datos oficiales.

### 4.2 Páginas

| Dirección | Contenido | Archivo actual |
| --- | --- | --- |
| `/` | Mapa, índices y asistente por zona | `src/routes/index.tsx` |
| `/reportes` | Reportes y moderación | `src/routes/reportes.tsx` |
| `/comunidad` | Conversación ciudadana | `src/routes/comunidad.tsx` |
| `/voluntariado` | Talleres y puntos de ayuda | `src/routes/voluntariado.tsx` |
| `/emergencias` | Directorio de emergencia | `src/routes/emergencias.tsx` |
| `/auth` | Registro e inicio de sesión | `src/routes/auth.tsx` |

La estructura compartida pertenece a `src/routes/__root.tsx`. Cada página debe tener título, descripción y metadatos sociales propios. No editar manualmente `src/routeTree.gen.ts`.

## 5. Mapa y datos territoriales

### 5.1 Jerarquía

```text
Cochabamba
└── Provincia
    └── Municipio
        └── Distrito, cuando exista información validada
```

Provincias: Arani, Arque, Ayopaya, Bolívar, Campero, Capinota, Carrasco, Cercado, Chapare, Esteban Arce, Germán Jordán, Mizque, Punata, Quillacollo, Tapacarí y Tiraque.

### 5.2 Información necesaria por territorio

- Identificador estable, nombre y tipo de territorio.
- Identificador del territorio padre.
- Polígono de límites y punto central para enfocar el mapa.
- Fuente, fecha y estado de validación del dato.
- Índices y reportes asociados, si existen.

### 5.3 Interacciones

- Arrastrar para desplazarse sin activar una selección accidental.
- Acercar y alejar con controles; adaptar los gestos a pantallas táctiles.
- Alternar entre mover y girar/inclinar.
- Restablecer la cámara.
- Buscar provincias y municipios por nombre.
- Seleccionar un territorio por mapa o lista.
- Mostrar el recorrido de selección y permitir volver al nivel anterior.
- Mostrar nombres al señalar una zona y enfocar territorios desde el histograma.
- Recortar los territorios hijos al límite de su padre, sin desbordamientos.

**Limitación existente:** `src/data/cochabamba-geo.ts` contiene polígonos construidos manualmente y subdivisiones ilustrativas. No deben presentarse como límites oficiales. Para fidelidad geográfica, sustituirlos por cartografía validada y documentar su licencia. No inventar distritos para completar municipios sin información.

## 6. Modelo de datos

Los siguientes nombres corresponden al esquema actual. Los tipos, valores admitidos y restricciones definitivos deben comprobarse en las migraciones y en los tipos generados antes de reconstruirlo.

| Tabla | Campos principales |
| --- | --- |
| `perfiles` | `id`, `email`, `nombre_completo`, `nombre_institucion`, `provincia_id`, `tipo_cuenta`, `creado_en` |
| `user_roles` | `id`, `user_id`, `role`, `created_at` |
| `reportes` | `id`, `autor_id`, `autor_nombre`, `descripcion`, `provincia_id`, `municipio_distrito`, `latitud`, `longitud`, `categoria_ia`, `urgencia_ia`, `motivo_breve_ia`, `entidad_sugerida_ia`, `telefono_sugerido_ia`, `estado_verificacion`, `moderado_por`, `creado_en` |
| `mensajes_comunidad` | `id`, `autor_id`, `autor_nombre`, `contenido`, `tema`, `provincia_id`, `creado_en` |
| `publicaciones_voluntariado` | `id`, `autor_id`, `titulo`, `descripcion`, `tipo_publicacion`, `nombre_institucion`, `direccion`, `provincia_id`, `municipio_distrito`, `latitud`, `longitud`, `telefono_contacto`, `fecha_horario`, `cupos`, `verificada`, `creado_en` |
| `indices_por_provincia` | `provincia_id`, `indice_general`, `indice_robos`, `indice_asesinatos`, `indice_derrumbes`, `indice_inundaciones`, `indice_incendios`, `fuente_oficial`, `actualizado_en` |
| `alertas_oficiales` | `id`, `titulo`, `descripcion`, `categoria`, `nivel`, `provincias_afectadas`, `fuente_oficial`, `codigo_boletin`, `enlace_respaldo`, `vigencia_hasta`, `cargado_por`, `creado_en` |

Actualmente municipio y distrito se guardan juntos en `municipio_distrito`. Una separación mediante identificadores geográficos requeriría un cambio de esquema y migración de registros; no asumir que ya existe.

### 6.1 Seguridad

- Activar seguridad por filas y permisos explícitos para cada tabla pública.
- Restringir perfiles al propietario o a moderadores/administradores autorizados.
- Permitir publicaciones solamente a usuarios autenticados y validar su autoría.
- Guardar privilegios en `user_roles`, no en campos de perfil que el usuario pueda editar.
- Ocultar reportes rechazados al público; permitir acceso al autor y a moderadores autorizados.
- Mostrar alertas sin vencimiento o todavía vigentes.
- Limitar mensajes a los temas `general`, `seguridad`, `vias` y `ayuda`.
- Limitar publicaciones de voluntariado a `clase_taller` y `ubicacion_sede_acopio`.
- Mantener `indice_general` entre 0 y 100.
- Revisar por separado lectura, inserción, actualización y borrado: una regla de lectura no protege las otras operaciones.
- No exponer correos, claves privadas ni otros datos de contacto sin necesidad y consentimiento.

## 7. IA: clasificación y preguntas por zona

### 7.1 Clasificación de reportes

Archivo actual: `src/lib/ai.functions.ts`.

Entrada: descripción de al menos 8 caracteres y provincia opcional.

Salida esperada:

- Categoría: `robo`, `asesinato`, `derrumbe`, `inundacion`, `incendio`, `infraestructura_vial` o `emergencia_medica`.
- Urgencia: `baja`, `media`, `alta` o `critica`.
- Motivo breve, entidad sugerida y teléfono sugerido.

La versión actual solicita clasificación a `google/gemini-3-flash-preview` mediante AI Gateway. Verificar disponibilidad del modelo al reconstruir. Validar también la respuesta del modelo antes de guardarla; la clasificación no equivale a verificación oficial del incidente.

### 7.2 Asistente por zona

Archivos actuales:

- `src/lib/zone-assistant.functions.ts`: valida la pregunta y expone la función.
- `src/lib/zone-assistant.server.ts`: consulta contexto y llama al modelo.

Flujo:

1. El residente selecciona provincia, municipio o distrito.
2. Escribe una pregunta entre 4 y 400 caracteres.
3. El servidor consulta los reportes, alertas e índices permitidos.
4. Envía solamente contexto necesario al AI Gateway.
5. La aplicación muestra respuesta, zona y cantidad de registros analizados.
6. Si falla la consulta o la IA, muestra un error comprensible y permite reintentar.

La implementación existente consulta hasta 15 reportes recientes y 8 alertas de la provincia, además de sus índices. Usa `openai/gpt-6-astra`; verificar disponibilidad antes de una nueva implementación.

**Alcance actual:** aunque la selección incluya municipio o distrito, la consulta de datos es provincial. No afirmar que la respuesta se basa exclusivamente en el distrito. Para precisión municipal/distrital, incorporar filtros sobre ubicaciones validadas.

**Entrega actual:** el servidor usa `streamText`, pero espera el texto completo antes de devolverlo; la interfaz no recibe necesariamente una respuesta progresiva.

Reglas de calidad: responder en español, indicar cuándo faltan datos, distinguir recomendaciones de hechos, no inventar incidentes ni estadísticas y no tratar los textos de los reportes como instrucciones para el modelo. El asistente no sustituye a los servicios de emergencia.

## 8. SOS, comunidad y voluntariado

### SOS

- Mantener un botón visible que abra contactos de emergencia.
- Solicitar ubicación solamente cuando sea necesaria y con permiso del usuario.
- Si hay coordenadas, calcular la unidad más cercana entre las unidades del directorio disponible; no garantizar que sea la más cercana de toda la ciudad.
- Si se rechaza el permiso o falla la ubicación, conservar los contactos generales.
- Usar enlaces de llamada `tel:`; no simular que se envió una alerta o se despachó ayuda.
- Validar números, direcciones y cobertura con fuentes locales oficiales antes de publicar.
- No prometer funcionamiento sin conexión completo por guardar el directorio en almacenamiento local: también deben estar disponibles la página y sus recursos.

### Comunidad

- Permitir lectura y conversación por temas.
- Solicitar inicio de sesión antes de publicar.
- Actualizar nuevos mensajes sin recargar cuando exista conexión.
- Evitar envíos duplicados, mensajes vacíos y errores silenciosos.
- Proteger datos personales y definir mecanismos de moderación contra amenazas, spam y divulgación de datos privados.

### Voluntariado

- Mostrar talleres y sedes/puntos de acopio.
- Incluir institución, ubicación, contacto y horario/cupos cuando corresponda.
- Diferenciar publicaciones verificadas de las no verificadas.
- Validar los datos antes de publicar y confirmar que quedaron guardados.

## 9. Construcción paso a paso

### Paso 1. Reunir y validar materiales

Reunir el documento de requisitos original, imagen de referencia del mapa, fotografía de fondo, cartografía, directorio de emergencias y fuentes de estadísticas. Registrar licencia y fecha de cada fuente. Identificar datos ilustrativos.

**Resultado:** inventario de materiales y lista de datos pendientes.

### Paso 2. Preparar la aplicación

Usar la estructura TanStack Start existente. Revisar `package.json`, instalar dependencias con Bun y preservar el arranque, las rutas y los archivos generados. No introducir otro sistema de navegación.

**Resultado:** primera pantalla y navegación básicas operativas.

### Paso 3. Configurar el aspecto visual

Definir colores, contraste, bordes y sombras en `src/styles.css`; cargar las fuentes desde la cabecera de la ruta raíz. Incorporar las imágenes con el flujo de recursos del proyecto, sin enlaces externos frágiles.

**Resultado:** fondo de Cochabamba y controles legibles en móvil y escritorio.

### Paso 4. Preparar datos y cuentas

Configurar Lovable Cloud, tablas, permisos y políticas. Habilitar correo/contraseña, Google y Lovable antes de mostrar sus botones. Mantener las claves privadas en Secrets. Si se necesitan ejemplos iniciales, incluirlos en una migración y marcarlos como demostración.

**Resultado:** un usuario puede registrarse, iniciar sesión y acceder solo a las acciones permitidas.

### Paso 5. Construir la jerarquía territorial

Organizar provincias, municipios y distritos con identificadores estables. Comprobar geometrías, nombres, relaciones y límites compartidos. Mantener explícitos los territorios sin datos.

**Resultado:** navegación territorial coherente sin límites ficticios presentados como oficiales.

### Paso 6. Implementar el mapa

Crear cámara, desplazamiento, giro, zoom, restablecimiento, búsqueda y selección. Añadir recorrido jerárquico, marcadores e histograma. Separar gestos de arrastre y clic.

**Resultado:** se puede explorar una provincia, entrar a un municipio y consultar sus distritos disponibles.

### Paso 7. Implementar los reportes

Crear listado y formulario con descripción y ubicación. Validar entradas, ejecutar la clasificación, permitir guardar y mostrar el registro guardado. Proteger las acciones de moderación en el servidor y en las políticas de datos.

**Resultado:** un residente autenticado publica un reporte y puede volver a consultarlo.

### Paso 8. Implementar el asistente por zona

Validar selección y pregunta. Consultar registros permitidos, llamar al AI Gateway desde el servidor y mostrar respuesta o error. Explicar el alcance provincial cuando los datos no sean más precisos.

**Resultado:** una pregunta real obtiene una respuesta basada en información disponible, sin exponer datos privados.

### Paso 9. Implementar la conversación comunitaria

Crear temas, listado y envío autenticado. Configurar actualizaciones y su recuperación ante desconexión. Añadir estados de envío, error y lista vacía.

**Resultado:** dos sesiones pueden intercambiar mensajes y verlos guardados.

### Paso 10. Implementar voluntariado y emergencias

Crear publicaciones de talleres/acopio y directorio validado. Añadir SOS con ubicación opcional y alternativa sin permiso. No añadir despacho automático de emergencias sin una integración real.

**Resultado:** se puede consultar una actividad y abrir un contacto de emergencia.

### Paso 11. Probar la aplicación

Ejecutar pruebas de reglas y permisos, y recorrer los flujos reales en navegador. Comprobar pantallas móviles y de escritorio, errores de red, acceso sin sesión y estados sin datos.

**Resultado:** evidencia de que las funciones principales funcionan y lista clara de limitaciones.

### Paso 12. Guardar y publicar

Guardar cambios en GitHub si está conectado. Revisar fuentes, secretos, permisos y metadatos. Publicar desde Lovable y repetir las comprobaciones en la dirección pública. Guardar en GitHub no equivale a publicar.

**Resultado:** versión pública comprobada y documentación de mantenimiento.

## 10. Criterios de aceptación

- [ ] El mapa mantiene una silueta continua y distingue sus provincias.
- [ ] Mover, girar, acercar, alejar y restablecer funcionan sin seleccionar accidentalmente una zona.
- [ ] Provincia → municipio → distrito funciona con datos disponibles y retorno al nivel anterior.
- [ ] Los límites ilustrativos y los datos sin validar están identificados.
- [ ] El mapa y los formularios son utilizables en teléfono y con teclado.
- [ ] El registro e ingreso funcionan con los proveedores configurados.
- [ ] Un reporte publicado se puede consultar nuevamente.
- [ ] Usuarios normales no pueden asignarse privilegios ni moderar reportes ajenos.
- [ ] La pregunta por zona muestra una respuesta y su alcance real.
- [ ] Sin datos o ante errores de consulta, el asistente no inventa resultados.
- [ ] Dos sesiones ven mensajes comunitarios nuevos sin duplicados.
- [ ] Voluntariado permite guardar y consultar publicaciones autorizadas.
- [ ] SOS funciona con ubicación concedida, rechazada y no disponible.
- [ ] Los teléfonos y las estadísticas tienen fuentes comprobadas.
- [ ] No hay secretos privados en código, respuestas ni archivos públicos.
- [ ] Cada página tiene metadatos propios y no hay errores de ejecución.

## 11. Limitaciones y decisiones pendientes

1. Sustituir la geometría ilustrativa por cartografía oficial si se requiere exactitud territorial.
2. Validar distritos, directorio de emergencia y fuentes de índices.
3. Mejorar la precisión del asistente por municipio/distrito si se incorporan ubicaciones estructuradas.
4. Definir responsables y procedimiento de moderación de contenido comunitario.
5. Implementar y probar funcionamiento sin conexión si se requiere una biblioteca realmente disponible sin internet.
6. La evidencia fotográfica, el acceso por enlace mágico y el envío automático de alertas no se consideran funciones existentes por esta guía; requieren alcance e implementación adicionales.

Este documento no certifica que todos los criterios estén cumplidos: sirve como especificación, referencia de la versión existente y lista de comprobación para construir y verificar la página.