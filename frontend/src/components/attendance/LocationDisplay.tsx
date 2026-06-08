import { getGoogleMapsUrl } from "@/lib/attendanceUtils";

interface LocationDisplayProps {
  latitude: string | number | null | undefined;
  longitude: string | number | null | undefined;
  mapUrl?: string | null;
  className?: string;
}

export default function LocationDisplay({
  latitude,
  longitude,
  mapUrl,
  className = "text-sm",
}: LocationDisplayProps) {
  const url = mapUrl ?? getGoogleMapsUrl(latitude, longitude);

  if (!url) {
    return <span className={`${className} text-slate-500`}>—</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 hover:underline`}
      title="Open in Google Maps"
    >
      <span aria-hidden>📍</span>
      <span>View Location</span>
    </a>
  );
}
