# Elaichi — 360° walk-through

The café rendered in Blender (`../elaichi-blender`), shown as four 360° panoramas you can look around in
and walk between. The older photo-based site in `../elaichi-cafe-site` is the backup.

- Open `index.html` through a local server (`npx serve .` or VS Code Live Server), not by double-clicking:
  browsers block the panorama images on `file://` pages.
- `js/data.js` holds the menu, dishes, reviews and panels (same file as the backup site).
- `js/tour.js` is generated: `python3 _source/tools/make_tour.py _source/hotspots.json js/tour.js`.
  It says where each clickable spot and each "walk here" ring sits in each panorama.
- `assets/pano/` holds the panoramas (4096 × 2048 JPEG, plus 1024 × 512 previews that load first).
  New renders from Blender: save as JPEG quality 86 with the same names.
- `?flat` at the end of the URL shows the fallback for browsers without WebGL.
- The food models are CC BY 4.0, so the Credits link must stay on the page.
- Before using this for a real client, remove the `noindex` line in `index.html` and the fine print.
