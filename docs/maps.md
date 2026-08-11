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
- A new, empty map opens around Sacca and Crocetta, Modena.
- A map with points automatically fits its viewport to the complete point set.
- Points must remain within the Province of Modena administrative boundary.

## Data Model

The first version uses owned points rather than a reusable location catalogue.

```text
Map
- id: UUID
- title: string
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

The map must use open-source software and have no external runtime provider.

```text
OSM data extract
  -> internal update pipeline
  -> local MBTiles archive
  -> TileServer GL Docker service
  -> same-origin Next rewrite at /tiles/*
  -> MapLibre GL JS in the CMS workspace
```

- `MapLibre GL JS` is the client-only map renderer.
- `TileServer GL` serves self-hosted vector tiles from a persistent local MBTiles volume.
- The MBTiles coverage includes the Province of Modena and a small surrounding buffer.
- TileServer is not directly public. A Next rewrite serves it through the application origin to preserve a restrictive CSP and enable normal HTTP tile caching.
- The administrative border is stored as versioned boundary data sourced from OpenStreetMap. It supplies both client `maxBounds` and server-side point-in-polygon validation.
- OSM/OpenMapTiles attribution remains visible in the workspace, as required by the respective data licences.
- Data acquisition is allowed as an operational maintenance activity; the running CMS does not depend on an external tile, geocoding, or map API.
- The V1 map does not use address search, browser geolocation, import/export, map layers, routes, lines, polygons, clustering, or a persisted manual viewport.

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

### Phase 1: Tile Foundation

Implement no CMS content page in this phase.

- Add MapLibre and TileServer GL integration without loading either on unrelated routes.
- Add the internal tile service, persistent MBTiles volume, same-origin reverse-proxy route, healthcheck, and cache headers.
- Define the repeatable data-update procedure: acquire extract, generate/replace MBTiles, validate attribution and bounds, deploy, and healthcheck.
- Verify that the workspace can render the basemap without browser calls to external map services.

Complete when a local internal development harness renders the Province of Modena basemap and production operations have a documented update procedure.

### Phase 2: Maps Collection Page

Implement only `/cms/maps` and its loading state.

- Add the `Mappe` sidebar entry through the existing navigation mapping.
- Follow the courses list conventions: RSC prefetch, URL-backed search/pagination, `CmsPageHeader`, `CmsDataTableShell`, empty/loading/error/forbidden states, and a `Nuova mappa` action.
- Show title, point count, creation/update metadata, and row actions for opening or deleting a map.
- Use the standard hard-delete confirmation, audit trail, error mapping, toasts, cache invalidation, and visible-page selection behavior.
- Do not add a map canvas or point creation controls here.

Complete when the collection is responsive and accessible, its URL state survives reload, and all standard list states match the established CMS UI.

### Phase 3: New Map Page

Implement only `/cms/maps/new` and its loading state.

- Reuse the standard two-column CMS form geometry where appropriate.
- Collect map title and optional TipTap description.
- Validate through the shared form conventions and map schema.
- Save as soon as metadata is valid, then redirect to `/cms/maps/[id]/edit`.
- Do not create points or load a map canvas before the map record exists.

Complete when creation, validation, cancellation, server errors, navigation, and responsive form behavior meet the same standard as existing CMS editors.

### Phase 4: Map Workspace Page

Implement only `/cms/maps/[id]/edit` and its loading state.

- Use a client-only MapLibre workspace within an RSC-prefetched CMS entrypoint.
- Desktop layout: independently scrollable map pane on the left and mapped-point panel on the right.
- Mobile layout: a deliberate pane switcher or vertical stack, never two cramped columns.
- Render the self-hosted basemap, Province bounds, visible attribution, current map metadata, and existing markers.
- Render mapped points in the right panel with title, description summary, order, empty state, and navigation to the point editor.
- Fit the map to all existing markers; use the Sacca/Crocetta fallback viewport when empty.
- Do not add click-to-create, marker drag, or item reordering yet.

Complete when the workspace is usable with empty and populated maps, marker/list selection is bidirectional and keyboard accessible, and failures in tile rendering do not prevent the point list or map metadata from working.

### Phase 5: Point Editor Pages

Implement `/cms/maps/[mapId]/items/new` and `/cms/maps/[mapId]/items/[itemId]/edit`, with their loading states.

- Reuse the lesson child-editor pattern: map parent context, title, optional TipTap description, latitude, longitude, save, cancel, and hard delete in edit mode.
- Reject points outside the Province of Modena with a precise form-level error.
- Return to the owning map workspace after create, update, or delete.
- Keep coordinate text fields as the accessible, deterministic fallback for all geographic interaction.

Complete when an editor can manage a point solely through the form, with consistent form states, audit entries, cache invalidation, and ownership protection.

### Phase 6: Workspace Gestures

Extend only the completed map workspace and point editor integration.

- Clicking the map opens the new-point flow with coordinate fields prefilled.
- Dragging a marker updates its coordinates through the established point-update mutation and handles rollback/error feedback.
- Add non-drag controls and keyboard alternatives for all essential interactions.
- Add point-list ordering using the existing dnd-kit conventions and a complete-set reorder procedure.
- Preserve synchronization between selected list row and marker after all mutations.

Complete when mouse, touch, and keyboard workflows can create, locate, move, select, and order points without bypassing server validation.

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
