import { buildPrintMapPoints } from "@/lib/print/map-layout";
import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { RouterOutputs } from "@/lib/trpc/types";

type PrintMap = RouterOutputs["maps"]["getById"];

type PrintMapSpreadProps = {
  map: PrintMap;
  openerPageNumber: number;
  directoryPageNumber: number;
  qrCode: string;
};

function formatPageNumber(pageNumber: number) {
  return String(pageNumber).padStart(2, "0");
}

function mapPoints(map: PrintMap) {
  return buildPrintMapPoints(
    map.items.map((item) => ({
      ...item,
      description: extractPlainText(item.descriptionRich) ?? "Scheda in aggiornamento.",
    })),
  );
}

export function PrintMapSpread({
  map,
  openerPageNumber,
  directoryPageNumber,
  qrCode,
}: PrintMapSpreadProps) {
  const points = mapPoints(map);
  const description =
    extractPlainText(map.descriptionRich) ??
    "Una mappa di lavoro per rendere visibili luoghi, pratiche e reti del territorio.";

  return (
    <>
      <section className="print-v3-page print-v3-map-opener" aria-label={`Mappa: ${map.title}`}>
        <div className="print-v3-map-opener__content">
          <div className="print-v3-map-plate" aria-label={`${map.title}, ${points.length} punti`}>
            <svg className="print-v3-map-plate__lines" viewBox="0 0 1000 1000" aria-hidden="true">
              <path d="M-40 205C178 99 297 169 440 91s276 19 600-88" />
              <path d="M-50 453c164-116 291-5 430-82s230-197 670-86" />
              <path d="M-30 746c125-90 269-33 387-107s211-6 683-129" />
              <path d="M174-30c-69 198 36 282-31 477s70 343-19 583" />
              <path d="M527-20c-112 193 17 316-77 471s63 339-16 565" />
              <path d="M786-20c-43 149 46 274-43 433s41 272-12 588" />
            </svg>
            {points.map((point, index) => (
              <span
                className="print-v3-map-marker"
                key={point.id}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                {formatPageNumber(index + 1)}
              </span>
            ))}
            <span className="print-v3-map-attribution">Dati: OpenStreetMap</span>
          </div>

          <h2 className="print-v3-map-opener__title">{map.title}</h2>
          <p className="print-v3-map-opener__description">{description}</p>
        </div>
        <span className="print-v3-map-folio">{formatPageNumber(openerPageNumber)}</span>
      </section>

      <section className="print-v3-page print-v3-map-directory" aria-label={`Schede: ${map.title}`}>
        <div className="print-v3-map-directory__content">
          <ol className="print-v3-map-directory__list">
            {points.map((point, index) => (
              <li key={point.id}>
                <div className="print-v3-map-directory__item-title">
                  <span>{formatPageNumber(index + 1)}</span>
                  <h2>{point.title}</h2>
                </div>
                <p>{point.description}</p>
              </li>
            ))}
          </ol>
          <div className="print-v3-map-directory__service">
            {/* The issue QR is the canonical online entry point until maps gain public detail URLs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="QR code: middleware.media" />
            <strong>
              Leggi la mappa dettagliata
              <br />
              middleware.media
            </strong>
          </div>
        </div>
        <span className="print-v3-map-folio print-v3-map-folio--left">
          {formatPageNumber(directoryPageNumber)}
        </span>
      </section>
    </>
  );
}
