/**
 * LocationPickerMap - reusable Leaflet map components
 *
 * <LocationPickerMap lat lng onChange />   -> owner picks a pin (AddVenue)
 * <VenueMapView lat lng label />           -> read-only view (VenueDetails)
 */
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

// Fix default Leaflet icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Blue "you are here" icon for live location dot
const liveIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:18px;height:18px;
    background:rgba(59,130,246,0.9);
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 0 4px rgba(59,130,246,0.3);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/* Click handler - places pin on map click */
function ClickHandler({ onChange }) {
  useMapEvents({ click: (e) => onChange(e.latlng.lat, e.latlng.lng) });
  return null;
}

/* Fly to a position when lat/lng changes */
function FlyTo({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 16, { duration: 1 });
  }, [lat, lng, map]);
  return null;
}

/* Live location button rendered inside the map */
function LiveLocationControl({ onLocate, loading }) {
  return (
    <div
      style={{ position: "absolute", top: 10, right: 10, zIndex: 999 }}
      onClick={(e) => { e.stopPropagation(); onLocate(); }}
    >
      <button
        type="button"
        title="Use my current location"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "white", border: "2px solid #0ea5e9",
          borderRadius: 10, padding: "6px 12px",
          fontSize: 12, fontWeight: 700, color: "#0ea5e9",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          opacity: loading ? 0.7 : 1,
          pointerEvents: loading ? "none" : "auto",
          whiteSpace: "nowrap",
        }}
      >
        {loading ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ animation: "spin 1s linear infinite" }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Locating...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
            </svg>
            Use My Location
          </>
        )}
      </button>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* OWNER picker with live location support */
export const LocationPickerMap = ({ lat, lng, onChange }) => {
  const defaultCenter = [30.3753, 69.3451]; // Pakistan centre
  const zoom          = lat ? 16 : 5;

  const [locating,   setLocating]   = useState(false);
  const [liveLat,    setLiveLat]    = useState(null);
  const [liveLng,    setLiveLng]    = useState(null);
  const [flyTarget,  setFlyTarget]  = useState(null);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLiveLat(latitude);
        setLiveLng(longitude);
        setFlyTarget({ lat: latitude, lng: longitude });
        onChange(latitude, longitude);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          alert("Location access denied. Please allow location permission in your browser settings.");
        } else {
          alert("Could not get your location. Please try again or pin manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ position: "relative" }}>
      <MapContainer
        center={lat ? [lat, lng] : defaultCenter}
        zoom={zoom}
        style={{ height: "340px", width: "100%", borderRadius: "16px", zIndex: 1 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={(la, ln) => { onChange(la, ln); setLiveLat(null); setLiveLng(null); }} />
        {/* Red pin for chosen venue location */}
        {lat && lng && <Marker position={[lat, lng]} />}
        {/* Blue dot for device live location */}
        {liveLat && liveLng && (
          <Marker position={[liveLat, liveLng]} icon={liveIcon} />
        )}
        {/* Fly to live location once detected */}
        {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}
      </MapContainer>

      {/* Overlay button - outside MapContainer so no Leaflet event conflict */}
      <LiveLocationControl onLocate={handleLocate} loading={locating} />
    </div>
  );
};

/* CUSTOMER read-only view */
export const VenueMapView = ({ lat, lng }) => {
  if (!lat || !lng) return null;
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      style={{ height: "300px", width: "100%", borderRadius: "16px", zIndex: 1 }}
      scrollWheelZoom={false}
      dragging
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} />
    </MapContainer>
  );
};
