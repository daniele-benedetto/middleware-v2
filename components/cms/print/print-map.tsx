import { PrintFooterQr } from "@/components/cms/print/print-footer-qr";
import { PrintTextRuns } from "@/components/cms/print/print-text-runs";
import { PrintTitle } from "@/components/cms/print/print-title";

import type { PrintMapEntry, PrintMapSection } from "@/lib/print/issue-document";
import type { CSSProperties } from "react";

/* eslint-disable @next/next/no-img-element -- the print document is serialized for the paginator. */

/** All entries share one page, in rows of two with the same height. */
function toRows(entries: PrintMapEntry[]) {
  const rows: PrintMapEntry[][] = [];
  for (let index = 0; index < entries.length; index += 2) {
    rows.push(entries.slice(index, index + 2));
  }
  return rows;
}

function MapEntry({ entry, excerptLines }: { entry: PrintMapEntry; excerptLines: number }) {
  const excerptStyle = {
    height: `calc(${excerptLines} * var(--body-leading))`,
    WebkitLineClamp: excerptLines,
  } as CSSProperties;

  return (
    <article className="map__entry">
      <div className="map__entry-header">
        <span className="map__entry-number">{entry.label}</span>
        <h3 className="map__entry-title">{entry.title}</h3>
      </div>
      {excerptLines > 0 && entry.excerpt.length > 0 ? (
        <p className="map__entry-excerpt" style={excerptStyle}>
          <PrintTextRuns runs={entry.excerpt} />
        </p>
      ) : null}
    </article>
  );
}

function MapPlate({ map }: { map: PrintMapSection }) {
  const { plate } = map;

  return (
    <figure className="map__plate" aria-label={`${map.plainTitle}, ${plate.markers.length} punti`}>
      <div
        className="map__canvas"
        style={{
          width: `${plate.widthMm}mm`,
          height: `${plate.heightMm}mm`,
          marginLeft: `${-plate.widthMm / 2}mm`,
          marginTop: `${-plate.heightMm / 2}mm`,
        }}
      >
        <div className="map__tiles">
          {plate.tiles.map((tile) => (
            <img
              key={tile.url}
              className="map__tile"
              src={tile.url}
              alt=""
              style={{
                left: `${tile.left}%`,
                top: `${tile.top}%`,
                width: `${tile.width}%`,
                height: `${tile.height}%`,
              }}
            />
          ))}
        </div>
        {plate.markers.map((marker) => (
          <span
            key={marker.label}
            className="map__marker"
            style={{ left: `${marker.left}%`, top: `${marker.top}%` }}
          >
            {marker.label}
          </span>
        ))}
      </div>
      <figcaption className="map__attribution">© OpenStreetMap contributors</figcaption>
    </figure>
  );
}

export function PrintMap({
  map,
  qrCode,
  siteLabel,
}: {
  map: PrintMapSection;
  qrCode: string | null;
  siteLabel: string;
}) {
  const showDirectory = !map.stopWithSiteCta && map.entries.length > 0;
  const service = qrCode ? (
    <PrintFooterQr
      qrCode={qrCode}
      label="Leggi la mappa dettagliata"
      siteLabel={siteLabel}
      alt="QR code: mappa sul sito"
    />
  ) : null;

  return (
    <section
      id={map.anchor}
      className="map"
      data-print-anchor={map.anchor}
      data-print-end-logo={map.showEndLogo ? "" : undefined}
    >
      <div className={`map__opener${showDirectory ? "" : " map__opener--with-service"}`}>
        <MapPlate map={map} />
        <PrintTitle as="h2" className="map__title" segments={map.title} />
        {map.deck ? <p className="map__deck">{map.deck}</p> : null}
        {showDirectory ? null : service}
      </div>

      {showDirectory ? (
        <div className="map__directory">
          {toRows(map.entries).map((row) => (
            <div
              className="map__row"
              key={row[0]!.id}
              style={{ height: `${map.directory.rowHeightMm}mm` }}
            >
              {row.map((entry) => (
                <MapEntry key={entry.id} entry={entry} excerptLines={map.directory.excerptLines} />
              ))}
            </div>
          ))}
          {service}
        </div>
      ) : null}
    </section>
  );
}
