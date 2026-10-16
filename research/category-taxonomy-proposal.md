# Propuesta de categorías y facetas para mejorar los filtros de DataYacht

_Fecha: 2026-10-16. Basado en el grafo actual (4,656 nodos, 3,401 aristas) y en el código del query builder (`app/src/query/model.ts`, `engine.ts`) y de la tabla (`app/src/components/DataTable.vue`)._

## 1. Diagnóstico: por qué los filtros de hoy son débiles

| Problema | Evidencia en los datos | Efecto en el usuario |
|---|---|---|
| Casi todo es texto libre | `builder.specialty` tiene 213 valores distintos para 160 builders; `person.industry` 69 valores para 86 personas; `engine.segment` 25 combinaciones; `shipyard.lift_type` 21 variantes para 7 conceptos reales | No se puede ofrecer un desplegable; el usuario tiene que adivinar la palabra exacta |
| No hay jerarquía geográfica | 937 regiones planas (ciudad, país y "City, FL" mezclados). Solo las ciudades de Florida tienen `part_of` hacia `region:florida`. Países duplicados: "USA" / "United States", "UK" / "United Kingdom" | Imposible filtrar "todas las marinas de Estados Unidos" o "astilleros de Europa" |
| Las categorías existen pero no son atributos | La clase de tamaño del yate existe solo como arista `classified_as`; la categoría de marina (dry stack, municipal, superyacht) solo existe en prosa | El query builder no las ve |
| El query builder es un formulario, no un panel de facetas | Operadores `eq/contains/gte/lte/between` y relaciones por nombre. Sin multi-selección, sin conteos, sin rangos predefinidos | Un usuario normal no sabe qué escribir |
| El buscador global solo mira el nombre | `searchIndex` indexa nombre y, para yates, el builder | "marinas en Miami con fuel dock" no devuelve nada |
| Datos incompletos sin marcar | 343 de 581 yates son `fragment`; 1,056 de 1,206 marinas tienen región pero solo 187 tienen `berths` | Los filtros numéricos descartan silenciosamente la mayoría de filas |

## 2. Principio de diseño

Cada entidad debe llevar un bloque `attrs.facets` con **vocabulario controlado** (valores de una lista cerrada, en inglés como clave interna y con etiqueta en español e inglés en la UI). Las facetas se calculan en la ingesta con un paso nuevo (`ingest/src/mappers/facets.js`) que normaliza el texto libre existente; nunca se escriben a mano en los markdown. Los valores originales se conservan tal cual.

Tipos de faceta:

- **Categórica simple** (una por nodo): país, clase de tamaño, tipo de instalación.
- **Categórica múltiple** (varias por nodo): servicios, tipos de motor, segmentos.
- **Rango** (bandas predefinidas calculadas de un número): eslora, año, capacidad.
- **Booleana**: tiene fuel dock, es hurricane-rated, ficha completa.

## 3. Jerarquía geográfica (aplica a todos los tipos)

Esta es la faceta más importante y la que más falta hace. Propuesta de tres niveles:

```text
country  (ISO-3166: US, IT, NL, ES, FR, GB, TR, DE, AE, ...)
  └─ subdivision  (estado / provincia / región: Florida, Veneto, Catalonia, Balearic Islands ...)
       └─ city  (Fort Lauderdale, Venice, Palma de Mallorca ...)
```

Cómo construirla con lo que ya existe:

1. Nuevo archivo `ingest/src/mappers/regionHierarchy.js` con un mapa `city slug → { subdivision, country }` para las ~900 regiones. Se puede generar en tres pasadas: (a) las 180+ ciudades de Florida ya resueltas por `regions.js`; (b) `builder.country` y `shipyard.country` ya traen el país de 236 astilleros y 149 builders; (c) el resto por lista manual priorizando las ciudades con más entidades enlazadas.
2. Normalizar alias de país en un solo lugar: USA = United States = US; UK = United Kingdom; UAE = United Arab Emirates = Abu Dhabi/Dubai.
3. Emitir aristas `part_of` city → subdivision → country (hoy solo existen para Florida) y copiar `facets.country`, `facets.subdivision`, `facets.city` a cada nodo con `located_in` o `based_in`.
4. Agrupar países en macro-regiones para un filtro rápido: North America, Caribbean, Mediterranean, Northern Europe, Middle East, Asia-Pacific, South America.

## 4. Facetas por tipo de entidad

### Yates (581)

| Faceta | Tipo | Valores | Fuente actual |
|---|---|---|---|
| Clase de tamaño | simple | yacht (<24 m), superyacht (24–60), megayacht (60–90), gigayacht (90+) | arista `classified_as` → copiar a atributo |
| Banda de eslora | rango | 15–24, 24–40, 40–60, 60–90, 90–120, 120+ m | `loa.meters` (541 yates) |
| Década | rango | pre-1980, 1980s, 1990s, 2000s, 2010s, 2020s | `year.value` (244) |
| Propulsión / tipo | simple | motor, sailing, explorer, catamaran, classic, sport-fish, unknown | derivar de `features`, `notes` y del `specialty` del builder; hoy no existe |
| Bandera | simple | 28 valores normalizados (Cayman Islands, Marshall Islands, Malta, UAE...) | `flag` (103) |
| País del astillero | simple | hereda `facets.country` del builder via `built_by` | arista |
| Disponible para charter | booleana | sí si tiene `weekly_rate` | `weekly_rate` (23) |
| Ficha completa | booleana | `identifiability === 'identifiable'` | ya existe (238 sí / 343 no) |
| Capacidad de huéspedes | rango | ≤8, 9–12, 13–20, 20+ | `guests` (164) |
| Tiene propietario conocido | booleana | existe arista `owned_by` | arista |

### Marinas (1,206)

| Faceta | Tipo | Valores | Fuente actual |
|---|---|---|---|
| Categoría de instalación | simple | wet-slip marina, dry stack, boatyard, superyacht marina, yacht basin, municipal marina, club marina, mooring field, fuel dock, storage campus | taxonomía del archivo 106; hoy se infiere del nombre ("Dry Stack", "Yacht Club", "Mooring Field", "Boat Works", "Marine Center") y de `notes` |
| Eslora máxima | rango | <20, 20–40, 40–60, 60–100, 100+ m | `max_loa.meters` (150) |
| Atraques | rango | <50, 50–150, 150–400, 400+ | `berths` (187) |
| Servicios | múltiple | fuel, travelift, haul-out, dry storage, hurricane-rated, customs, liveaboard | `fuel_dock`, `travelift_tonnage`, `notes` |
| Tipo de almacenamiento | múltiple | wet, dry-stack, hardstand, indoor | archivos 103/104 via `notes` |
| Geografía | jerárquica | país / estado / ciudad | sección 3 |
| Nivel de datos | simple | completa (≥3 atributos), básica (solo nombre+región) | conteo de atributos no nulos |

### Astilleros (236)

| Faceta | Tipo | Valores | Fuente |
|---|---|---|---|
| Tipo de instalación | simple | commercial dry dock, refit yard, builder yard, builder+refit, submarine/submersible, haul-out yard | `facility_type` (9 → 6 canónicos) |
| Servicios | múltiple | newbuild, refit, repair, conversion, engineering, paint, storage, offshore | `services` (14 → 8) |
| Equipo de izado | múltiple | graving dock, floating dock, travelift, shiplift/syncrolift, slipway, covered hall | `lift_type` (21 → 6) |
| Eslora máxima | rango | <50, 50–100, 100–200, 200+ m | `max_loa` (126) |
| Tonelaje máximo | rango | <500, 500–3000, 3000+ t | `max_tonnage` (70) |

### Constructores (160)

| Faceta | Tipo | Valores | Fuente |
|---|---|---|---|
| País | simple | normalizado | `country` (149, con duplicados USA/United States) |
| Segmento | múltiple | custom superyacht, semi-custom/production motoryacht, sailing yacht, explorer, catamaran, naval/commercial, refit, aluminium specialist | `specialty` (213 valores → 8) |
| Estado | simple | active, defunct, acquired | `status` (71) |
| Volumen en el grafo | rango | 0, 1–4, 5–14, 15+ yates | `yachtCount` |
| Época de fundación | rango | pre-1900, 1900–1949, 1950–1979, 1980–1999, 2000+ | `founded` (129) |

### Empresas (819)

| Faceta | Tipo | Valores | Fuente |
|---|---|---|---|
| Tipo | simple | broker, charter operator, yacht management, shipyard operator, parent company, services, platform/marketplace, salvage & towing, insurance, storage operator, institution | `kind` (12 valores, fusionar "brokerage/management", añadir salvage del archivo 100) |
| Geografía | jerárquica | país / ciudad | `based_in` (solo 53 de 819 la tienen; hay que extraer ciudad de `address` y `locations`) |
| Área de servicio | múltiple | South Florida, Caribbean, Mediterranean, Global... | `locations` (247) |

### Personas (86)

| Faceta | Tipo | Valores | Fuente |
|---|---|---|---|
| Rol | simple | founder, executive, heir, royalty, politician, investor, celebrity, placeholder | `role` (60 valores → 8) |
| Sector | simple | tech, energy/oil, metals/mining, retail, finance, real estate, media/entertainment, industrial, sports, government | `industry` (69 → 10) |
| Nacionalidad | simple | normalizada | `nationality` (75) |
| Estado | simple | active, deceased, sanctioned | `status` (74) |
| Yates en propiedad | rango | 1, 2–3, 4+ | aristas `owned_by` |

### Motores y modelos (59 + 37)

| Faceta | Tipo | Valores | Fuente |
|---|---|---|---|
| Tipo de motor | múltiple | inboard diesel, inboard gas, outboard, sterndrive, pod drive, waterjet, electric, hybrid, 2-stroke ship | `engine_types` (20 → 9) |
| Segmento | múltiple | recreational, yacht, superyacht, commercial, ship, military, racing | `segment` (25 combinaciones → 7 etiquetas separadas) |
| Potencia | rango | <100, 100–500, 500–2000, 2000+ hp | `power_hp` en modelos (32) |
| País | simple | normalizado | `country` (55) |

### Clubes (360), piezas (111), diseñadores (60)

- Clubes: geografía jerárquica (338 tienen ciudad), década de fundación (97), instalaciones como múltiple (72: marina, pool, dining, racing...).
- Piezas: `category` ya es limpia (6 valores) y `applies_to` sirve como segunda faceta (sail/power).
- Diseñadores: país (59), disciplina (`discipline`: naval architecture / exterior / interior), estado, número de yates.

## 5. Cambios de UI que las facetas habilitan

1. **Panel lateral de facetas en `/browse/:type`**: cada faceta como lista de casillas con conteo ("Florida (412)"), multi-selección, y chips de filtros activos arriba de la tabla. Los rangos como botones de banda, no como cajas min/max.
2. **Query builder con desplegables**: cuando el campo es una faceta, el operador `eq` ofrece un `<select>` con los valores y sus conteos en lugar de un input de texto. Mantener `contains` para nombre y notas.
3. **Buscador global con prefijos**: `marina:miami`, `yacht:>60m`, `country:italy` y chips de tipo para acotar resultados. Indexar también ciudad, país, builder y categoría.
4. **Geografía navegable**: páginas `/browse/marina?country=US&subdivision=FL` y breadcrumbs país → estado → ciudad en cada página de entidad.
5. **Indicador de completitud**: faceta "Ficha completa" por defecto activada en yates para que el usuario no vea 343 fragmentos salvo que lo pida.

## 6. Plan de implementación propuesto (en orden)

| Paso | Qué | Dónde | Esfuerzo |
|---|---|---|---|
| 1 | Jerarquía geográfica + normalización de países | `ingest/src/mappers/regionHierarchy.js`, hook en `ingest.js` | medio: ~900 ciudades, se puede hacer por lotes |
| 2 | Hook `facets.js` que calcula `attrs.facets` por tipo con los mapas de vocabulario controlado | `ingest/src/mappers/facets.js` + tests | medio |
| 3 | Exportar `meta.facets` (lista de facetas, valores y conteos por tipo) en `graph.json` | `graphExporter.js` | bajo |
| 4 | Panel de facetas en `EntityListView` + `DataTable` | `app/src/components/FacetPanel.vue`, `utils/tableRows.ts` | medio |
| 5 | Query builder lee `meta.facets` para desplegables; `urlCodec` soporta multi-valor | `app/src/query/*` | medio |
| 6 | Buscador global: índice ampliado y prefijos | `stores/graph.ts`, `GlobalSearch.vue` | bajo |
| 7 | Actualizar los baselines pinned en `realCorpusExport.spec.js` y añadir tests de facetas | tests | bajo |

## 7. Decisiones que necesito de ti antes de implementar

1. ¿Idioma de la UI de filtros: solo inglés, solo español, o ambos con un selector?
2. ¿Las bandas de eslora y año que propongo te sirven, o prefieres otras (por ejemplo las de size_class del archivo 90: 24 / 60 / 90 m)?
3. ¿Empezamos por la geografía (paso 1) para todas las entidades, o por un solo tipo (marinas, que es el más grande y el que más creció hoy)?
