/* eslint-disable @next/next/no-img-element -- the print document is serialized for the paginator. */

/**
 * Same QR block as the cover, in the page footer on the folio line. The parent
 * is either a page-height, relatively positioned box (map) or the
 * `print-footer-float` strip that closes a fitted text (cut article, course).
 */
export function PrintFooterQr({
  qrCode,
  label,
  siteLabel,
  alt,
}: {
  qrCode: string;
  label: string;
  siteLabel: string;
  alt: string;
}) {
  return (
    <aside className="print-footer-qr">
      <span>
        {label}
        <br />
        {siteLabel}
      </span>
      <img src={qrCode} alt={alt} />
    </aside>
  );
}
