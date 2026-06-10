export class GeolocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeolocationError";
  }
}

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new GeolocationError("Geolocation is not supported in this browser."));
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      reject(
        new GeolocationError(
          "GPS requires a secure connection. Open the app via https:// (use ./start-https.sh on the server, not http:// with an IP address).",
        ),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new GeolocationError("Location permission denied. Enable GPS to punch attendance."));
          return;
        }
        reject(new GeolocationError("Unable to read your location. Please try again."));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}
