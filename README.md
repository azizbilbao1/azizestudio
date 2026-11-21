# Azizestudio

Editor de vídeo en el navegador construido con React, Vite y TypeScript. La interfaz está en español y procesa los archivos localmente en tu dispositivo.

## Funciones

- Importar un vídeo desde el ordenador.
- Vista previa con reproducción y controles de posición.
- Recorte con inicio y final ajustables en el timeline.
- Añadir texto superpuesto.
- Aplicar filtros Original, Cálido, B&N y Vibrante.
- Exportar el resultado como WebM con audio cuando el navegador lo admite.
- Diseño adaptable a escritorio y móvil; los archivos no se suben a un servidor.

## Desarrollo

Necesitas Node.js 20.19+ o 22.12+.

```bash
npm install
npm run dev
```

Para validar y generar la versión de producción:

```bash
npm run build
npm run preview
```

La exportación usa MediaRecorder y `captureStream`, por lo que funciona mejor en versiones actuales de Chrome o Edge. La salida actual es WebM. Algunos navegadores pueden no exponer la pista de audio del vídeo local durante la captura.
