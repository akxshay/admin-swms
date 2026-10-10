import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';

export interface LeafletMapHandle {
  updateCollectorAndRemainingRoute: (
    collectorLoc: { lat: number; lng: number },
    heading: number,
    remainingRoute: [number, number][]
  ) => void;
  resetViewToBounds: () => void;
}

export interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  customerLocation?: [number, number];
  collectorLocation?: [number, number];
  collectorName?: string;
  vehicleHeading?: number;
  routeCoordinates?: [number, number][]; // Actual road geometry [[lat, lng], ...]
  refitKey?: string | number; // Increment to force map bounds to refit
  isDraggable?: boolean;
  isSelectingLocation?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

export const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(({
  center,
  zoom = 14,
  customerLocation,
  collectorLocation,
  collectorName = 'Collector',
  vehicleHeading = 0,
  routeCoordinates,
  refitKey,
  isDraggable = false,
  isSelectingLocation = false,
  onLocationChange,
  onMapClick,
  className = 'h-72 w-full',
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const collectorMarkerRef = useRef<L.Marker | null>(null);
  const routeHaloLineRef = useRef<L.Polyline | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const initialFitRef = useRef<boolean>(false);
  const lastRefitKeyRef = useRef<string | number | undefined>(undefined);

  // Imperative handle for smooth 60fps tracking without triggering full React page rerenders
  useImperativeHandle(ref, () => ({
    updateCollectorAndRemainingRoute(collectorLoc, heading, remainingRoute) {
      // 1. Update vehicle marker coordinates
      if (collectorMarkerRef.current) {
        collectorMarkerRef.current.setLatLng([collectorLoc.lat, collectorLoc.lng]);

        // 2. Smoothly rotate marker heading in DOM
        const headingDeg = Math.round(heading || 0);
        const iconEl = collectorMarkerRef.current.getElement();
        if (iconEl) {
          const cone = iconEl.querySelector('.heading-cone') as HTMLElement | null;
          if (cone) cone.style.transform = `rotate(${headingDeg}deg)`;
          const badge = iconEl.querySelector('.vehicle-badge') as HTMLElement | null;
          if (badge) badge.style.transform = `rotate(${headingDeg}deg)`;
          const emoji = iconEl.querySelector('.vehicle-emoji') as HTMLElement | null;
          if (emoji) emoji.style.transform = `rotate(-${headingDeg}deg)`;
        }
      }

      // 3. Update remaining green road route polyline (only road ahead of collector)
      if (remainingRoute && remainingRoute.length >= 2) {
        if (routeHaloLineRef.current) {
          routeHaloLineRef.current.setLatLngs(remainingRoute);
        }
        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs(remainingRoute);
        }
      } else {
        // Destination arrived or route completed: remove polyline
        if (routeHaloLineRef.current) {
          routeHaloLineRef.current.setLatLngs([]);
        }
        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs([]);
        }
      }
    },
    resetViewToBounds() {
      if (mapRef.current && routeLineRef.current) {
        const bounds = routeLineRef.current.getBounds();
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      }
    },
  }));

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapRef.current = map;
    }

    const map = mapRef.current;

    // Handle map click for location selection
    const handleClick = (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      } else if (onLocationChange && isSelectingLocation) {
        onLocationChange(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [center, isSelectingLocation, onMapClick, onLocationChange]);

  // Update Customer / Destination Pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const effectiveCustomerLoc = customerLocation || center;

    const customerIcon = L.divIcon({
      className: 'custom-customer-icon',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="background-color: #166534; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid white; box-shadow: 0 4px 14px rgba(0,0,0,0.35); transition: transform 0.2s ease;">
            🏠
          </div>
          <div style="background: rgba(22, 101, 52, 0.9); color: white; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 9999px; margin-top: 3px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
            Your Doorstep
          </div>
        </div>
      `,
      iconSize: [80, 56],
      iconAnchor: [40, 20],
    });

    if (customerMarkerRef.current) {
      customerMarkerRef.current.setLatLng(effectiveCustomerLoc);
      customerMarkerRef.current.setIcon(customerIcon);
    } else {
      const marker = L.marker(effectiveCustomerLoc, {
        icon: customerIcon,
        draggable: isDraggable,
      }).addTo(map);

      if (isDraggable) {
        marker.on('dragend', () => {
          const latlng = marker.getLatLng();
          if (onLocationChange) {
            onLocationChange(latlng.lat, latlng.lng);
          }
        });
      }
      customerMarkerRef.current = marker;
    }

    if (!collectorLocation && !initialFitRef.current) {
      map.setView(effectiveCustomerLoc, zoom);
    }
  }, [customerLocation, center, isDraggable, onLocationChange, collectorLocation, zoom]);

  // Update Road Polyline (Actual Road Geometry)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const effectiveCustomerLoc = customerLocation || center;
    let polylineCoords: [number, number][] = [];

    // Strictly preserve road geometry - never draw a straight line fallback across buildings
    if (routeCoordinates && routeCoordinates.length >= 2) {
      polylineCoords = routeCoordinates;
    }

    if (polylineCoords.length >= 2) {
      // 1. Road Halo/Casing (outer border for clarity against map streets)
      if (routeHaloLineRef.current) {
        routeHaloLineRef.current.setLatLngs(polylineCoords);
      } else {
        routeHaloLineRef.current = L.polyline(polylineCoords, {
          color: '#166534',
          weight: 7,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }

      // 2. Road Core Line (high visibility delivery green)
      if (routeLineRef.current) {
        routeLineRef.current.setLatLngs(polylineCoords);
      } else {
        routeLineRef.current = L.polyline(polylineCoords, {
          color: '#3E8E41',
          weight: 4.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }

      // Fit bounds when route initializes or when refitKey changes
      const shouldRefit =
        !initialFitRef.current || (refitKey !== undefined && refitKey !== lastRefitKeyRef.current);
      if (shouldRefit) {
        initialFitRef.current = true;
        lastRefitKeyRef.current = refitKey;
        const bounds = L.latLngBounds(polylineCoords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    } else {
      // Clear route lines when routeCoordinates is empty or finished
      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }
      if (routeHaloLineRef.current) {
        map.removeLayer(routeHaloLineRef.current);
        routeHaloLineRef.current = null;
      }
    }
  }, [routeCoordinates, collectorLocation, customerLocation, center, refitKey]);

  // Update Collector Vehicle Marker (Rotates along road heading)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !collectorLocation) return;

    // Collector vehicle marker with direction pointer
    const headingDeg = Math.round(vehicleHeading || 0);
    const collectorIcon = L.divIcon({
      className: 'custom-collector-vehicle-icon',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <!-- Heading direction cone/pointer -->
          <div class="heading-cone" style="position: absolute; top: -6px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 8px solid #8BC83F; transform-origin: 50% 28px; transform: rotate(${headingDeg}deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></div>
          
          <!-- Vehicle circular badge -->
          <div class="vehicle-badge" style="width: 38px; height: 38px; border-radius: 50%; background: #1A1B20; border: 3px solid #8BC83F; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.4); transform: rotate(${headingDeg}deg); transition: transform 0.15s ease;">
            <span class="vehicle-emoji" style="font-size: 19px; line-height: 1; transform: rotate(-${headingDeg}deg);">🚚</span>
          </div>

          <!-- Pulsing radar glow -->
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(139, 200, 63, 0.5); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (collectorMarkerRef.current) {
      collectorMarkerRef.current.setLatLng(collectorLocation);
      collectorMarkerRef.current.setIcon(collectorIcon);
    } else {
      collectorMarkerRef.current = L.marker(collectorLocation, { icon: collectorIcon })
        .addTo(map)
        .bindPopup(`<b>${collectorName}</b><br/>SWMS Electric Vehicle En Route`)
        .openPopup();
    }
  }, [collectorLocation, vehicleHeading, collectorName]);

  // Responsive resize
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [className]);

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-[#E6E1D6] shadow-inner ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
});

LeafletMap.displayName = 'LeafletMap';
