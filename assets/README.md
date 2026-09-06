# Carpetas de assets

Este archivo explica para qué sirve cada carpeta. Puedes eliminarlo cuando quieras.

## logo/
Coloca aquí el logo del clan: `logo.png`.

Mientras no exista, la web muestra un logo placeholder (círculo con ⚡).

## eventos/
Imágenes de los eventos (torneos, capturas, concursos...).

Para usarlas, escribe la ruta en el campo `imagen` del evento dentro de `data/eventos.json`:
```
assets/eventos/mi-evento.jpg
```
Si la imagen no existe todavía, la web muestra un placeholder automático.

## pokemon/
Imágenes o sprites de pokémon que quieras usar como decoración o ilustración de la web.

## icons/
Iconos de la web (favicon, pequeños elementos gráficos).

---

Sugerencias de pasos para agregar una imagen:
1. Copia el archivo dentro de la carpeta correspondiente.
2. Nombra el archivo sin espacios y en minúsculas: `torneo-invierno.jpg`.
3. Referencialo en el JSON o en el HTML con ruta relativa.