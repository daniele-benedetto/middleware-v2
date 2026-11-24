/* eslint-disable @next/next/no-img-element */

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
