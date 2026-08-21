type MapEmbedProps = {
  lat: number;
  lng: number;
  label?: string;
};

export function MapEmbed({ lat, lng, label }: MapEmbedProps) {
  const pad = 4;
  const bbox = `${lng - pad},${lat - pad / 2},${lng + pad},${lat + pad / 2}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="map-frame">
      <iframe title={label || "Bản đồ tàu"} src={src} loading="lazy" />
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=5/${lat}/${lng}`}
        target="_blank"
        rel="noreferrer"
      >
        Mở bản đồ lớn
      </a>
    </div>
  );
}
