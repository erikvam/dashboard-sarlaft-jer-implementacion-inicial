# Dashboard SARLAFT JER — instalación y uso

Esta versión usa el SDK web compatible de Firebase Authentication 13.0.0 y mantiene el informe con las secciones del proyecto inicial y añade autenticación Firebase, selección libre de varios meses, edición local de textos, inserción de cuadros de texto, páginas de texto, cambio de logo local, exportar/importar configuración y detección de pestañas nuevas.

**Servicios acordados:** GitHub Pages, Firebase Authentication, HTML/CSS/JavaScript, Google Apps Script y Google Sheets. No se utilizan Cloud Functions, Firestore ni Firebase Storage.

> **Antes de publicar datos reales:** esta implementación protege las respuestas del servicio de Apps Script comprobando el ID token de Firebase y una lista de correos autorizados. El Web App de Apps Script sigue siendo una URL accesible públicamente porque GitHub Pages necesita poder invocarlo; una solicitud sin token válido o sin un correo aprobado no debe recibir los datos. Esta solución debe probarse con la cuenta y política de seguridad de JER antes de usar datos operativos. No se ha probado contra un despliegue real porque requiere los identificadores y permisos de tu cuenta.

## 1. Estructura de archivos

```text
dashboard-sarlaft-jer/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── firebase-config.js  # Parámetros públicos de la app web Firebase
│   ├── auth.js             # Registro, ingreso, verificación y cierre de sesión
│   ├── config.js           # URL de Apps Script y secuencia del informe
│   ├── local-store.js      # Guardado local mediante IndexedDB
│   ├── month-filter.js     # Selector múltiple y accesos rápidos por período
│   ├── editor.js           # Textos, cuadros T, logo y páginas
│   └── app.js              # Datos, tablas, gráficas y exportación PDF
├── assets/
│   └── jer-logo.png
├── apps-script/
│   └── Code.gs             # Servicio de datos con validación Firebase
└── README.md
```

## 2. Preparar Google Sheets

1. Abre en Google Drive el Excel `CONSOLIDADO PARA INFORMES LOOKER 2026 en adelante(1).xlsx`.
2. Convierte el archivo a Hojas de cálculo de Google y usa esa copia como fuente del dashboard.
3. Conserva los nombres de las pestañas actuales, incluidos los espacios iniciales/finales de algunos nombres.
4. Copia el ID del libro desde la URL: es el texto entre `/spreadsheets/d/` y `/edit`.

## 3. Crear Firebase Authentication

1. Abre [Firebase Console](https://console.firebase.google.com/) y crea un proyecto aprobado para JER.
2. En **Authentication → Comenzar → Proveedores de acceso**, activa **Correo electrónico/Contraseña**.
3. En **Configuración del proyecto → Tus apps**, registra una aplicación web (`</>`).
4. Copia los valores de `apiKey`, `authDomain`, `projectId` y `appId` en `js/firebase-config.js`. No cambies los nombres de las propiedades.
5. En Firebase Authentication → **Configuración → Dominios autorizados**, agrega el host de GitHub Pages, por ejemplo `tu-organizacion.github.io`. No agregues la ruta `/dashboard-sarlaft-jer` en ese campo.
6. Guarda y prueba que la configuración no contenga `PEGA_AQUI`.

La pantalla permite crear cuentas con correo y contraseña, iniciar sesión y restablecer contraseña. La verificación del correo es obligatoria. Crear una cuenta **no** autoriza automáticamente al usuario a leer el informe.

## 4. Configurar propiedades en Google Apps Script

1. Abre la copia de Google Sheets.
2. Selecciona **Extensiones → Apps Script**.
3. Reemplaza todo el contenido de `Code.gs` por el archivo `apps-script/Code.gs` de este proyecto.
4. Guarda el proyecto.
5. En la barra lateral de Apps Script, abre **Configuración del proyecto** y busca **Propiedades del script**. Añade las siguientes propiedades:

| Propiedad | Valor |
|---|---|
| `SPREADSHEET_ID` | ID del libro de Google Sheets del paso 2. |
| `FIREBASE_API_KEY` | El valor `apiKey` de `js/firebase-config.js`. Es la clave pública de la app Firebase, no una contraseña administrativa. |
| `AUTHORIZED_EMAILS` | Correos que pueden consultar el dashboard, separados por comas. Ejemplo: `persona1@jer.com,persona2@jer.com`. |
| `ALLOWED_ORIGINS` | Origen exacto de GitHub Pages, sin ruta ni `/` final. Ejemplo: `https://tu-organizacion.github.io`. Para pruebas locales puedes añadir `http://127.0.0.1:5500` separado por coma. |

No publiques el archivo del proyecto con datos operativos ni agregues contraseñas privadas a los archivos JavaScript. Las propiedades anteriores deben configurarse en Apps Script, no en `config.js`.

### Autorizar una cuenta

1. La persona abre el dashboard y selecciona **Crear cuenta**.
2. Firebase envía un mensaje para verificar el correo.
3. La persona confirma su dirección e inicia sesión.
4. El administrador agrega el correo verificado a `AUTHORIZED_EMAILS` en las propiedades del script y guarda los cambios.
5. El usuario pulsa **Consultar**. Si el correo no está incluido en la lista, Apps Script no entrega los datos.

Para retirar el acceso, elimina el correo de `AUTHORIZED_EMAILS`. La cuenta seguirá existiendo en Firebase, pero dejará de poder leer los datos del endpoint. Para bloquear además el inicio de sesión, deshabilita la cuenta en Firebase Authentication.

## 5. Probar Google Sheets y desplegar Apps Script

1. En el editor de Apps Script, selecciona `revisarConfiguracion` y ejecútala. En el registro de ejecución no deben faltar propiedades.
2. Ejecuta `probarConexion`. Autoriza el acceso al libro cuando Google lo solicite y revisa el registro de ejecución.
3. Selecciona **Implementar → Nueva implementación → Aplicación web**.
4. En **Ejecutar como**, selecciona tu cuenta autorizada para leer Google Sheets.
5. En **Quién tiene acceso**, selecciona **Cualquier persona** si es la política aprobada por JER. Es necesario para que GitHub Pages invoque el endpoint sin una sesión de Google. La URL es pública, pero el código devuelve datos solo si valida el token Firebase, el correo autorizado y el origen configurado.
6. Pulsa **Implementar** y copia la URL que termina en `/exec`.
7. Si cambias `Code.gs` más adelante, crea una implementación nueva o actualiza la existente para que el endpoint ejecute la versión modificada.

El endpoint no entrega los datos por `GET` ni por JSONP. El dashboard envía la solicitud en un formulario `POST` y recibe el resultado mediante `postMessage` desde el iframe de respuesta para evitar depender de permisos CORS de `fetch` en Apps Script.

## 6. Conectar GitHub Pages

1. Abre `js/config.js`.
2. Reemplaza `PEGA_AQUI_LA_URL_DEL_WEB_APP_DE_APPS_SCRIPT` por la URL completa terminada en `/exec`.
3. Guarda los cambios.
4. Sube todos los archivos y carpetas del proyecto al repositorio, con `index.html` en la raíz.
5. En GitHub, abre **Settings → Pages**, selecciona la rama `main` y la carpeta `/(root)` y guarda.
6. Abre la URL del sitio y verifica que el dominio corresponda con el valor `ALLOWED_ORIGINS` configurado en Apps Script.

Para probar localmente, utiliza un servidor (por ejemplo, la extensión Live Server de Visual Studio Code). No abras `index.html` directamente como archivo `file://`, porque su origen será `null` y no coincide con la lista permitida.

## 7. Uso de las funciones nuevas

### Meses múltiples

Pulsa **Meses** para abrir el selector. Marca cualquier combinación y pulsa **Listo**. Los accesos **T1–T4**, **Sem. 1**, **Sem. 2** y **Todos** son atajos; también puedes marcar meses sueltos. Pulsa **Consultar** para aplicar el año y meses seleccionados. Las tablas y series se ordenan enero-diciembre.

### Editar textos

Pulsa **Editar textos** y modifica los títulos y cuadros de texto habilitados. Los cambios se guardan localmente en el navegador. Vuelve a pulsar el botón para salir del modo edición.

### Insertar un cuadro T

1. Pulsa **T Texto**.
2. Haz clic en el bloque o gráfico donde quieras introducir la explicación.
3. Escribe el texto en el bloque que aparece. Se inserta dentro del flujo del diseño, por lo que la gráfica o el bloque posterior se desplaza en lugar de quedar cubierto por una capa flotante.
4. Si el texto excede la página, acórtalo o muévelo a una página nueva antes de exportar. La descarga avisa cuando detecta cuadros insertados que sobresalen del área disponible.

### Páginas y orden

Haz clic en una página para seleccionarla. **+ Página** agrega una página de texto; **Eliminar página** la retira de la composición local; las flechas mueven la página seleccionada. Ninguna de estas acciones elimina pestañas ni registros de Google Sheets.

### Cambiar logo

Pulsa **Cambiar logo** y selecciona PNG, JPG o WebP de hasta 3 MB. El logo se aplica al informe en ese navegador y se incluye al exportar la configuración.

### Copiar y trasladar las ediciones

Usa **Exportar edición** para descargar un archivo JSON con las ediciones y el logo. En otro navegador del mismo proyecto, inicia sesión y pulsa **Importar edición**. La importación reemplaza la configuración local actual.

### Pestañas nuevas

Las pestañas con nombres nuevos se detectan automáticamente. Si la estructura tiene una columna `MES` y columnas numéricas, el dashboard crea una página con una tabla y una gráfica genérica. Si no, incorpora una o más páginas tabulares. Antes de usar la información de una pestaña nueva en un informe oficial, comprueba que sus encabezados y unidades sean correctos. No todas las pestañas preexistentes que no estaban en el diseño se incorporan automáticamente: la detección automática se aplica a pestañas cuyo nombre no estaba en la lista del libro original.

## 8. Qué se guarda localmente y qué no

Se guardan en IndexedDB del navegador: cambios de textos, cuadros insertados, páginas creadas/eliminadas, orden y logo local. **No** se guardan en Google Sheets y **no** se sincronizan entre usuarios ni equipos. Si borras los datos del navegador, cambias de perfil o equipo, podrías perder los cambios locales; exporta una copia con frecuencia.

Los datos de monitoreo proceden de Google Sheets cada vez que consultas. Las ediciones locales no alteran los valores de la fuente.

## 9. Pruebas de aceptación antes del uso real

- [ ] Usuario no autenticado: no ve la información del reporte.
- [ ] Correo verificado fuera de `AUTHORIZED_EMAILS`: no obtiene datasets.
- [ ] Correo incluido en `AUTHORIZED_EMAILS`: puede consultar los datos.
- [ ] Eliminar el correo de la lista revoca su acceso a los datos.
- [ ] Elegir enero, abril, mayo y diciembre conserva ese orden en tablas y gráficas.
- [ ] Cambiar un texto y recargar el sitio conserva el cambio en el mismo navegador.
- [ ] Exportar/importar una configuración conserva sus textos, páginas y logo.
- [ ] Un cuadro nuevo desplaza el contenido y el PDF no corta el texto insertado.
- [ ] Cambiar el logo se refleja en las páginas y en el PDF.
- [ ] Una pestaña nueva aparece en la sección de nuevos monitoreos tras pulsar **Consultar**.

**Limitación a validar:** no puedo confirmar desde este entorno que el postMessage de Apps Script funcione con tu despliegue específico, porque depende de la URL real, el origen publicado y la configuración de Firebase. Realiza primero una prueba con una copia autorizada de los datos y revisa la consola del navegador antes de publicar información operativa. Apps Script está sujeto a cuotas y límites de ejecución de Google.
