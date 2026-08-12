# CMS Maps Plan

## Scope

Maps are a CMS-only editorial resource. They have no public routes, public tRPC procedures, sitemap entries, public cache tags, or publication status.

- Access: `ADMIN` and `EDITOR`, consistent with the other editorial resources.
- Geography: only the Province of Modena.
- Geometry in V1: points only.
- A map owns its points. A point cannot belong to more than one map.
- A point contains only a title, an optional TipTap description, and a location.
- Coordinates are not classified as sensitive in this initial scope.

## Product Behavior

- The CMS sidebar exposes `Mappe`.
- `/cms/maps` displays the maps collection.
- `/cms/maps/[id]/edit` is the map workspace: map canvas on the left, mapped-point list on the right.
- Selecting a marker selects and focuses its list row; selecting a row pans to and focuses its marker.
- Selecting a point opens its dedicated editor page.
- The map workspace is read-only: selecting a marker opens its point information card, but does not change coordinates.
- A point is positioned and repositioned only in its own editor through the interactive map picker.
- A new, empty map opens around Sacca and Crocetta, Modena.
- New map creation starts with a provisional point at Sacca/Crocetta; it can be repositioned before saving and is created with the map.
- A map with points automatically fits its viewport to the complete point set.
- Points must remain within the Province of Modena administrative boundary.

## Data Model

The first version uses owned points rather than a reusable location catalogue.

```text
Map
- id: UUID
- title: string
- titleStyled: optional highlighted/line-break title segments
- descriptionRich: version-compatible TipTap JSON, optional
- createdAt
- updatedAt

MapItem
- id: UUID
- mapId: UUID
- title: string
- descriptionRich: version-compatible TipTap JSON, optional
- latitude: decimal
- longitude: decimal
- sortOrder: integer
- createdAt
- updatedAt
```

Constraints:

- Coordinates are stored as `Decimal(9, 6)`, never floating point.
- Latitude and longitude are validated globally and against the Province of Modena polygon at the server boundary.
- Map-item ordering is local to a map.
- A map hard delete cascades to its owned points.
- Reorder input must contain all and only the existing points for its map.

## Cartographic Infrastructure

The CMS uses Leaflet with raster tiles from the public OpenStreetMap tile service.

- `Leaflet` is the client-only renderer. All map instances are created through `features/cms/maps/utils/leaflet-map.ts`.
- Tiles are requested from `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`; the Content Security Policy permits this origin.
- The standard Leaflet attribution control visibly credits OpenStreetMap contributors.
- The administrative border is stored as versioned boundary data sourced from OpenStreetMap. It supplies both client `maxBounds` and server-side point-in-polygon validation.
- Address autocomplete uses the external Nominatim API through the authenticated `maps.searchAddress` tRPC procedure. It is rate-limited, requested server-side, and requires `NOMINATIM_USER_AGENT` to identify the deployment.
- This use is limited to the authenticated CMS. Review the OpenStreetMap Tile Usage Policy before extending maps to public, high-traffic pages.
- The V1 map does not use browser geolocation, import/export, map layers, routes, lines, polygons, clustering, or a persisted manual viewport.

## Backend Boundary

Follow the existing resource layout:

```text
lib/server/modules/maps/
  schema/
  dto/
  policy/
  repository/
  service/
lib/server/trpc/routers/maps.ts
```

Procedures:

- `maps.list`, `maps.getById`, `maps.create`, `maps.update`, `maps.delete`
- `maps.createItem`, `maps.updateItem`, `maps.deleteItem`, `maps.reorderItems`

All writes use the established write/reorder rate-limit procedures, policy middleware, audit middleware, Zod input validation, service-level domain rules, and parsed output DTOs. CMS React Query invalidation and RSC prefetching extend the existing helpers; they are not implemented ad hoc in feature components.

## Routes

- `/cms/maps`: map collection.
- `/cms/maps/new`: create map metadata.
- `/cms/maps/[id]/edit`: map workspace and map metadata editing.
- `/cms/maps/[mapId]/items/new`: create a mapped point.
- `/cms/maps/[mapId]/items/[itemId]/edit`: edit a mapped point.

Route helpers belong in `lib/cms/crud-routes.ts`; sidebar configuration belongs in `lib/cms/navigation.ts`.

## Delivery Phases

Each phase is completed, reviewed, and verified before starting the next. No later page is implemented early for convenience.

### Phase 6: Point Positioning

Extend only the completed point editor and read-only workspace.

- The workspace map remains read-only and opens point information when a marker is selected.
- The point editor map supports click-to-position and marker dragging, then saves through the standard point form.
- Keep coordinate fields as the keyboard-accessible fallback.
- Point-list ordering is deferred until a separate interaction decision.

### Phase 7: Quality Gate

Verify the completed feature end-to-end before extending the domain.

- Run formatting, linting, typecheck, unit tests, Prisma validation, and production build.
- Add focused tests for list URL state, form errors, boundary constraints, map-to-list selection, gesture mutation failure, and authorization.
- Perform manual browser QA for desktop and mobile layouts, reduced motion, focus handling, empty/error/forbidden states, tile-service outage, and point persistence after reload.
- Verify that no public route, sitemap, feed, analytics event, or public cache tag exposes maps or coordinates.

## Deferred Decisions

Do not add these without a separate product and data-model decision:

- categories, marker styles, images, external links, dates, or sources on points;
- reusable locations across maps;
- address search or geocoding;
- CSV/GeoJSON import and export;
- public maps or embedding;
- lines, polygons, routes, layers, clustering, or temporal views;
- map revision/restore history beyond the existing audit log;
- persisted viewport or per-map visual style.

## UI Governance

The map canvas is an exceptional custom component. Everything around it follows `docs/cms-ui.md` exactly: CMS form wrappers, actions, table/list patterns, focus behavior, responsive states, toasts, confirmations, and loading/empty/error/forbidden coverage. Each route remains a thin RSC entrypoint; feature-specific client behavior belongs under `features/cms/maps`.
