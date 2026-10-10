import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Truck,
  Phone,
  MessageSquare,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  KeyRound,
  AlertTriangle,
  Radio,
  Sliders,
  Search,
  Crosshair,
  Navigation,
  Square,
  RefreshCw,
  AlertCircle,
  Compass,
  Package,
  CreditCard
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { LeafletMap, LeafletMapHandle } from '../components/shared/LeafletMap';
import { api } from '../lib/api';
import { Pickup, Collector } from '../lib/types';
import { useToast } from '../components/ui/Toast';
import {
  getRoadRoute,
  densifyRoute,
  calculateCumulativeDistances,
  getPositionAlongRoute,
  calculateHeading,
  RouteResult,
} from '../lib/routing';

interface LiveTrackingPageProps {
  pickupId: string;
  onBack: () => void;
  onPickupUpdated?: () => void;
}

export const LiveTrackingPage: React.FC<LiveTrackingPageProps> = ({
  pickupId,
  onBack,
  onPickupUpdated,
}) => {
  const { toast, success, error } = useToast();

  const isDev = import.meta.env.DEV || process.env.NODE_ENV !== 'production';

  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [collector, setCollector] = useState<Collector | null>(null);
  const [doorstepOtp, setDoorstepOtp] = useState<string | null>(null);
  const [collectorLocation, setCollectorLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [vehicleHeading, setVehicleHeading] = useState<number>(0);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [distanceKm, setDistanceKm] = useState<number>(1.8);
  const [etaMinutes, setEtaMinutes] = useState<number>(8);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [verifyingOtp, setVerifyingOtp] = useState<boolean>(false);
  const [isLiveGpsActive, setIsLiveGpsActive] = useState<boolean>(true);

  // =========================================================================
  // DEVELOPMENT-ONLY: Manual Collector Starting Location State
  // =========================================================================
  const [simulatedStartCoords, setSimulatedStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [simulatedStartAddress, setSimulatedStartAddress] = useState<string>('Mallikatte / Kadri Area, Mangaluru');
  const [isPickingCollectorOnMap, setIsPickingCollectorOnMap] = useState<boolean>(false);
  const [activeStartTab, setActiveStartTab] = useState<'search' | 'map' | 'manual' | 'gps'>('search');

  // Search Tab State
  const [startSearchQuery, setStartSearchQuery] = useState<string>('');
  const [startSearchResults, setStartSearchResults] = useState<
    Array<{ placeId: string | number; name: string; formatted: string; lat: number; lng: number }>
  >([]);
  const [isSearchingStart, setIsSearchingStart] = useState<boolean>(false);

  // Manual Coordinates Input State
  const [manualLatInput, setManualLatInput] = useState<string>('12.8792');
  const [manualLngInput, setManualLngInput] = useState<string>('74.8451');
  const [coordValidationError, setCoordValidationError] = useState<string | null>(null);

  // Routing State
  const [routeDetails, setRouteDetails] = useState<RouteResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [routeCalcError, setRouteCalcError] = useState<string | null>(null);
  const [isRouteValid, setIsRouteValid] = useState<boolean>(true);
  const [refitKey, setRefitKey] = useState<number>(0);

  // Animation & Request Guard Refs
  const animationFrameRef = useRef<number | null>(null);
  const verifyingRef = useRef<boolean>(false);
  const isSimulatingRef = useRef<boolean>(false);
  const routeRequestIdRef = useRef<number>(0);
  const fullRouteRef = useRef<[number, number][]>([]);
  const leafletMapRef = useRef<LeafletMapHandle | null>(null);

  useEffect(() => {
    loadTrackingData();

    // Listen to live SSE coordinates & status events
    const eventSource = new EventSource(
      `/api/notifications/stream?userId=${pickup?.customerId || 'usr_demo_customer'}`
    );

    eventSource.addEventListener('collector_location_updated', (e) => {
      // If client-side smooth road simulation is currently running, let client drive
      if (isSimulatingRef.current) return;

      try {
        const data = JSON.parse(e.data);
        if (data.pickupId === pickupId) {
          setCollectorLocation((prev) => {
            if (prev) {
              const newHeading = calculateHeading(prev.lat, prev.lng, data.lat, data.lng);
              setVehicleHeading(newHeading);
            }
            return { lat: data.lat, lng: data.lng };
          });
          setDistanceKm(data.distanceKm);
          setEtaMinutes(data.etaMinutes);
          setIsLiveGpsActive(true);
          if (data.status === 'ARRIVED') {
            setPickup((prev) => (prev ? { ...prev, status: 'ARRIVED' } : prev));
          }
        }
      } catch (err) {}
    });

    eventSource.addEventListener('pickup_status_changed', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.pickupId === pickupId) {
          setPickup((prev) => (prev ? { ...prev, status: data.status } : prev));
          toast({ type: 'info', title: `Status: ${data.status}`, message: data.notes });
        }
      } catch (err) {}
    });

    eventSource.addEventListener('doorstep_pin_generated', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.pickupId === pickupId) {
          setDoorstepOtp(data.pin);
          toast({
            type: 'success',
            title: 'Doorstep PIN Ready',
            message: `Share PIN [${data.pin}] with collector.`,
          });
        }
      } catch (err) {}
    });

    return () => {
      eventSource.close();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [pickupId]);

  const loadTrackingData = async () => {
    setLoading(true);
    try {
      const data = await api.getTrackingInfo(pickupId);
      setPickup(data.pickup);
      setCollector(data.collector);

      if (data.doorstepOtp?.rawCode) {
        setDoorstepOtp(data.doorstepOtp.rawCode);
      }

      // Customer destination from pickup address snapshot - PRESERVED & UNCHANGED!
      const destLat = data.pickup.addressSnapshot.lat || 12.8732;
      const destLng = data.pickup.addressSnapshot.lng || 74.8474;

      // Default simulator collector starting position (e.g. ~1.5km away in Mangaluru)
      const defaultStartLat = destLat + 0.012;
      const defaultStartLng = destLng - 0.009;

      const currentStart = simulatedStartCoords || { lat: defaultStartLat, lng: defaultStartLng };
      if (!simulatedStartCoords) {
        setSimulatedStartCoords(currentStart);
        setManualLatInput(defaultStartLat.toFixed(5));
        setManualLngInput(defaultStartLng.toFixed(5));
      }

      setCollectorLocation(currentStart);

      // Fetch actual road route from OSRM (evaluating shortest valid road distance)
      const route = await getRoadRoute([currentStart.lat, currentStart.lng], [destLat, destLng], {
        preference: 'shortest',
      });
      const densified = densifyRoute(route.coordinates, 12);
      fullRouteRef.current = densified;
      setRouteCoordinates(densified);
      setRouteDetails(route);
      setDistanceKm(parseFloat((route.distanceMeters / 1000).toFixed(2)));
      setEtaMinutes(Math.max(1, Math.round(route.durationSeconds / 60)));

      // Initial vehicle heading towards the first waypoint
      if (densified.length >= 2) {
        const h = calculateHeading(
          densified[0][0],
          densified[0][1],
          densified[1][0],
          densified[1][1]
        );
        setVehicleHeading(h);
      }
      setIsRouteValid(true);
    } catch (err: any) {
      error('Could not load tracking information', err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // Apply New Simulated Collector Starting Location & Recalculate Route
  // =========================================================================
  const applyNewCollectorStartingLocation = async (
    coords: { lat: number; lng: number },
    addressLabel?: string
  ) => {
    if (!pickup) return;

    // 1. Validate coordinate boundaries (-90 to 90, -180 to 180)
    if (
      isNaN(coords.lat) ||
      isNaN(coords.lng) ||
      coords.lat < -90 ||
      coords.lat > 90 ||
      coords.lng < -180 ||
      coords.lng > 180
    ) {
      const errMsg =
        'Invalid coordinates. Latitude must be between -90 and 90, and longitude between -180 and 180.';
      setCoordValidationError(errMsg);
      error('Coordinate Error', errMsg);
      return;
    }
    setCoordValidationError(null);

    // 2. Stop any currently running simulation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isSimulatingRef.current = false;
    setSimulating(false);

    // 3. Increment request ID to prevent race conditions from older responses
    const requestId = ++routeRequestIdRef.current;
    setIsCalculatingRoute(true);
    setRouteCalcError(null);
    setIsRouteValid(false);

    // 4. Update starting coordinates & move collector marker to selected position
    setSimulatedStartCoords(coords);
    setCollectorLocation(coords);
    setManualLatInput(coords.lat.toFixed(5));
    setManualLngInput(coords.lng.toFixed(5));
    setIsPickingCollectorOnMap(false);

    // 5. Clear stale route geometry
    setRouteCoordinates([]);
    fullRouteRef.current = [];

    // 6. Customer destination is preserved and untouched!
    const destLat = pickup.addressSnapshot.lat || 12.8732;
    const destLng = pickup.addressSnapshot.lng || 74.8474;

    // Resolve address label if not provided
    if (addressLabel) {
      setSimulatedStartAddress(addressLabel);
    } else {
      api
        .reverseGeocode(coords.lat, coords.lng)
        .then((rev) => {
          if (requestId === routeRequestIdRef.current) {
            setSimulatedStartAddress(
              rev.formattedAddress ||
                `Coordinates (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
            );
          }
        })
        .catch(() => {});
    }

    // 7. Request fresh driving route from newly selected collector location to customer destination (evaluating shortest driving distance)
    try {
      const route = await getRoadRoute([coords.lat, coords.lng], [destLat, destLng], {
        preference: 'shortest',
      });

      // Check if this is still the latest request
      if (requestId !== routeRequestIdRef.current) return;

      if (!route || !route.coordinates || route.coordinates.length < 2) {
        throw new Error('Routing engine returned an empty or invalid road geometry.');
      }

      const densified = densifyRoute(route.coordinates, 12);
      fullRouteRef.current = densified;
      setRouteCoordinates(densified);
      setRouteDetails(route);

      // Initial heading towards first route segment
      const initialHeading = calculateHeading(
        densified[0][0],
        densified[0][1],
        densified[1][0],
        densified[1][1]
      );
      setVehicleHeading(initialHeading);

      // Reset distance, progress, and ETA using new route
      const distKm = parseFloat((route.distanceMeters / 1000).toFixed(2));
      const etaMin = Math.max(1, Math.round(route.durationSeconds / 60));
      setDistanceKm(distKm);
      setEtaMinutes(etaMin);

      setIsRouteValid(true);
      setRefitKey((k) => k + 1);

      // Update Leaflet map directly
      leafletMapRef.current?.updateCollectorAndRemainingRoute(coords, initialHeading, densified);

      success(
        'Collector Starting Point Set 🚚',
        `Shortest road route calculated: ${distKm} km • ETA ${etaMin} min. Click "Drive Simulator Now" to test.`
      );
    } catch (err: any) {
      if (requestId !== routeRequestIdRef.current) return;
      const errMsg =
        err.message || 'Failed to calculate driving route. Please check coordinates and retry.';
      setRouteCalcError(errMsg);
      error('Route Calculation Failed', errMsg);
    } finally {
      if (requestId === routeRequestIdRef.current) {
        setIsCalculatingRoute(false);
      }
    }
  };

  // Reset to Default Simulator Coordinates
  const handleResetToDefault = () => {
    if (!pickup) return;
    const destLat = pickup.addressSnapshot.lat || 12.8732;
    const destLng = pickup.addressSnapshot.lng || 74.8474;
    const defaultCoords = { lat: destLat + 0.012, lng: destLng - 0.009 };
    applyNewCollectorStartingLocation(defaultCoords, 'Default Simulator Location (Kadri Corridor)');
  };

  // Stop / Reset Active Simulation
  const handleStopSimulation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isSimulatingRef.current = false;
    setSimulating(false);

    const destLat = pickup?.addressSnapshot.lat || 12.8732;
    const destLng = pickup?.addressSnapshot.lng || 74.8474;

    // Rewind vehicle to simulated starting position
    const startPos = simulatedStartCoords || { lat: destLat + 0.012, lng: destLng - 0.009 };
    setCollectorLocation(startPos);

    // Restore complete driving route on map and UI
    if (fullRouteRef.current.length >= 2) {
      setRouteCoordinates(fullRouteRef.current);
      const initialHeading = calculateHeading(
        fullRouteRef.current[0][0],
        fullRouteRef.current[0][1],
        fullRouteRef.current[1][0],
        fullRouteRef.current[1][1]
      );
      setVehicleHeading(initialHeading);

      leafletMapRef.current?.updateCollectorAndRemainingRoute(
        startPos,
        initialHeading,
        fullRouteRef.current
      );
    }

    if (routeDetails) {
      setDistanceKm(parseFloat((routeDetails.distanceMeters / 1000).toFixed(2)));
      setEtaMinutes(Math.max(1, Math.round(routeDetails.durationSeconds / 60)));
    }

    toast({
      type: 'info',
      title: 'Simulation Stopped',
      message: 'Vehicle rewound to starting location. Complete route restored.',
    });
  };

  // Forward Geocode Search Handler for Starting Point
  const handleSearchStartLocation = async (query: string) => {
    setStartSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setStartSearchResults([]);
      return;
    }
    setIsSearchingStart(true);
    try {
      const res = await api.searchAddresses(query);
      setStartSearchResults(res.results || []);
    } catch (err) {
      setStartSearchResults([]);
    } finally {
      setIsSearchingStart(false);
    }
  };

  // Browser GPS Detection for Collector Starting Point
  const handleFetchCurrentDeviceGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      error('GPS Unsupported', 'Browser does not support geolocation.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        applyNewCollectorStartingLocation(coords, 'Current Device Browser GPS');
      },
      (geoError) => {
        let msg = 'Failed to fetch GPS location.';
        if (geoError.code === geoError.PERMISSION_DENIED) {
          msg = 'Location permission denied by browser.';
        } else if (geoError.code === geoError.TIMEOUT) {
          msg = 'GPS request timed out.';
        }
        error('GPS Error', msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Drive Simulator along Road Route with Progressive Green Polyline Trimming
  const handleStartSimulator = async () => {
    if (!pickup || !isRouteValid || isCalculatingRoute) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setSimulating(true);
    isSimulatingRef.current = true;

    const destLat = pickup.addressSnapshot.lat || 12.8732;
    const destLng = pickup.addressSnapshot.lng || 74.8474;

    const startCoords = simulatedStartCoords || {
      lat: destLat + 0.012,
      lng: destLng - 0.009,
    };

    // Calculate road route if not cached in fullRouteRef
    let currentRoute = fullRouteRef.current;
    if (!currentRoute || currentRoute.length < 2) {
      const roadRoute = await getRoadRoute([startCoords.lat, startCoords.lng], [destLat, destLng], {
        preference: 'shortest',
      });
      currentRoute = densifyRoute(roadRoute.coordinates, 12);
      fullRouteRef.current = currentRoute;
      setRouteDetails(roadRoute);
    }

    // Initialize display with the full complete driving route
    setRouteCoordinates(currentRoute);

    const cumulativeDistances = calculateCumulativeDistances(currentRoute);
    const totalDistMeters = cumulativeDistances[cumulativeDistances.length - 1] || 1500;
    const totalDurationSeconds = routeDetails?.durationSeconds || Math.round(totalDistMeters / 7);

    setPickup((prev) => (prev ? { ...prev, status: 'EN_ROUTE' } : prev));

    success(
      'Drive Simulator Started 🚚',
      'Vehicle is navigating the selected shortest road route.'
    );

    // Smooth client animation over ~14 seconds at 60fps
    const totalAnimDurationMs = 14000;
    const startTime = performance.now();

    const animateRoadProgress = async (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / totalAnimDurationMs);
      const currentDistanceMeters = progress * totalDistMeters;

      const animatedPos = getPositionAlongRoute(
        currentRoute,
        cumulativeDistances,
        currentDistanceMeters,
        totalDurationSeconds
      );

      // 1. Immediately update Leaflet map:
      //    Vehicle marker moves and rotates along road heading,
      //    and the green route polyline trims off travelled sections behind the collector!
      leafletMapRef.current?.updateCollectorAndRemainingRoute(
        { lat: animatedPos.lat, lng: animatedPos.lng },
        animatedPos.heading,
        animatedPos.remainingCoordinates
      );

      // 2. Sync React states
      setCollectorLocation({ lat: animatedPos.lat, lng: animatedPos.lng });
      setVehicleHeading(animatedPos.heading);
      setRouteCoordinates(animatedPos.remainingCoordinates);
      setDistanceKm(parseFloat((animatedPos.remainingDistanceMeters / 1000).toFixed(2)));
      setEtaMinutes(Math.max(0, Math.ceil(animatedPos.remainingDurationSeconds / 60)));

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateRoadProgress);
      } else {
        // Destination reached
        isSimulatingRef.current = false;
        setSimulating(false);
        setDistanceKm(0);
        setEtaMinutes(0);
        setRouteCoordinates([]);
        leafletMapRef.current?.updateCollectorAndRemainingRoute(
          { lat: destLat, lng: destLng },
          animatedPos.heading,
          []
        );
        try {
          const arrival = await api.markCollectorArrived(pickupId);
          setPickup(arrival.pickup);
          if (arrival.doorstepOtp?.rawCode) {
            setDoorstepOtp(arrival.doorstepOtp.rawCode);
          }
          toast({
            type: 'success',
            title: 'Collector Arrived! 📍',
            message: 'Vehicle reached customer doorstep. Doorstep PIN ready.',
          });
        } catch (err: any) {
          error('Arrival Sync Error', err.message || 'Could not sync collector arrival.');
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateRoadProgress);
  };

  // Doorstep PIN Verification
  const handleCollectorVerifyPin = async () => {
    if (verifyingRef.current || verifyingOtp) return;

    if (!doorstepOtp) {
      error('Verification Error', 'The collector PIN is not available yet. Please wait for arrival synchronization.');
      return;
    }
    const pinToSubmit = doorstepOtp;
    verifyingRef.current = true;
    setVerifyingOtp(true);

    try {
      const res = await api.verifyDoorstepOtp(pickupId, pinToSubmit);
      if (res.success) {
        success('Collection Verified & Completed! 🎉', 'Doorstep PIN confirmed. +Eco Points credited!');
        setPickup(res.pickup);
        if (onPickupUpdated) onPickupUpdated();
      }
    } catch (err: any) {
      error('Verification Error', err.message || 'Doorstep PIN verification failed');
    } finally {
      verifyingRef.current = false;
      setVerifyingOtp(false);
    }
  };

  if (loading || !pickup) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#3E8E41] border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-bold text-[#6B7280]">Connecting to live vehicle tracking GPS...</p>
      </div>
    );
  }

  // Customer Destination (Protected & Unchanged)
  const customerLat = pickup.addressSnapshot.lat || 12.8732;
  const customerLng = pickup.addressSnapshot.lng || 74.8474;

  const effectiveCollectorLat =
    collectorLocation?.lat || simulatedStartCoords?.lat || customerLat + 0.012;
  const effectiveCollectorLng =
    collectorLocation?.lng || simulatedStartCoords?.lng || customerLng - 0.009;

  const milestones = [
    { id: 'REQUESTED', label: 'Requested' },
    { id: 'ASSIGNED', label: 'Assigned' },
    { id: 'ACCEPTED', label: 'Accepted' },
    { id: 'EN_ROUTE', label: 'En Route' },
    { id: 'ARRIVED', label: 'Arrived' },
    { id: 'COLLECTED', label: 'Collected' },
    { id: 'VERIFIED', label: 'Verified' },
    { id: 'COMPLETED', label: 'Completed' },
  ];

  const currentIdx = milestones.findIndex((m) => m.id === pickup.status);

  const totalWeightKg =
    pickup.pricingSnapshot?.items?.reduce(
      (acc, i) =>
        acc +
        (i.bagSize === 'LARGE' ? 15 : i.bagSize === 'MEDIUM' ? 8 : 3) * i.numberOfBags,
      0
    ) || 12;
  const totalCo2AvoidedKg = (totalWeightKg * 1.6).toFixed(1);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-black text-[#16181D] hover:text-[#3E8E41] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Pickups</span>
        </button>

        <div className="flex items-center gap-2">
          <StatusBadge status={pickup.status} />
          <span className="text-xs font-mono font-bold text-[#6B7280]">
            #{pickup.id.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main 2-Pane Tracking Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: Large Leaflet Map & Simulator Controls */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-2 sm:p-3 relative overflow-hidden bg-white border border-[#E6E1D6]">
            {/* Live Telemetry Floating Pill */}
            <div className="absolute top-5 left-5 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg border border-[#E6E1D6] flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3E8E41] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#3E8E41]"></span>
              </span>
              <div>
                <span className="text-xs font-black text-[#16181D] block">
                  {pickup.status === 'ARRIVED'
                    ? 'Collector Arrived at Doorstep 📍'
                    : pickup.status === 'COMPLETED'
                    ? 'Pickup Verified & Completed 🎉'
                    : 'OpenStreetMap Road-Level Tracking'}
                </span>
                <span className="text-[11px] text-[#6B7280] block">
                  {isCalculatingRoute
                    ? 'Calculating road route...'
                    : pickup.status === 'EN_ROUTE'
                    ? `ETA ${etaMinutes} mins (${distanceKm} km away)`
                    : pickup.status === 'ARRIVED'
                    ? 'Digital scale weighing in progress'
                    : `Route: ${distanceKm} km (${etaMinutes} min ETA)`}
                </span>
              </div>
            </div>

            {/* Map Selection Banner when active */}
            {isPickingCollectorOnMap && (
              <div className="absolute top-20 left-5 right-5 z-20 bg-[#16181D]/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between border border-[#8BC83F]/50 animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5 text-xs">
                  <Crosshair className="w-4 h-4 text-[#8BC83F] animate-spin" />
                  <span className="font-bold">
                    Map Selection Active: Click anywhere on the map to set collector starting point.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPickingCollectorOnMap(false)}
                  className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-bold"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Map Container */}
            <LeafletMap
              ref={leafletMapRef}
              center={[customerLat, customerLng]}
              customerLocation={[customerLat, customerLng]}
              collectorLocation={[effectiveCollectorLat, effectiveCollectorLng]}
              collectorName={collector?.name || 'Rajesh Shetty'}
              vehicleHeading={vehicleHeading}
              routeCoordinates={routeCoordinates}
              refitKey={refitKey}
              isSelectingLocation={isPickingCollectorOnMap}
              onMapClick={(lat, lng) => {
                if (isPickingCollectorOnMap) {
                  applyNewCollectorStartingLocation({ lat, lng });
                }
              }}
              zoom={15}
              className="h-[420px] sm:h-[490px] w-full"
            />
          </Card>

          {/* ================================================================= */}
          {/* Driving route and progress */}
          {/* ================================================================= */}
          <div className="bg-white border border-[#E6E1D6] p-4 sm:p-5 rounded-3xl space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E6E1D6]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3E8E41] animate-pulse shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider text-[#16181D]">
                  Shortest Driving Route Engine
                </span>
                <span className="text-[10px] bg-[#E8F5D8] text-[#2E7031] font-black px-2 py-0.5 rounded-full">
                  OSRM + OpenStreetMap
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#6B7280]">
                Preference: <span className="text-[#2E7031] font-black">Shortest Road Distance</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#E6E1D6]">
                <span className="text-[10px] uppercase font-bold text-[#6B7280] block mb-0.5">
                  Road Distance
                </span>
                <span className="text-sm font-black text-[#16181D]">
                  {distanceKm} km
                </span>
                <span className="text-[10px] text-gray-500 block">Actual driving geometry</span>
              </div>

              <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#E6E1D6]">
                <span className="text-[10px] uppercase font-bold text-[#6B7280] block mb-0.5">
                  Driving ETA
                </span>
                <span className="text-sm font-black text-[#16181D]">
                  {etaMinutes} min
                </span>
                <span className="text-[10px] text-gray-500 block">City road conditions</span>
              </div>

            </div>

            {/* Route calculation details */}
            {routeDetails && (
              <div className="bg-[#F0EDE6]/50 p-3 rounded-2xl text-[11px] space-y-1.5 border border-[#E6E1D6]">
                <div className="flex items-start gap-1.5 text-[#16181D]">
                  <span className="font-black text-[#2E7031] shrink-0">Route selection:</span>
                  <span className="text-gray-700">{routeDetails.selectionReason}</span>
                </div>
                <div className="flex items-start gap-1.5 text-gray-500 text-[10px]">
                  <span className="font-bold text-gray-600 shrink-0">Routing details:</span>
                  <span>{routeDetails.limitationsNote}</span>
                </div>

                {/* Candidate alternatives comparison if multiple were returned by OSRM */}
                {routeDetails.evaluatedAlternatives && routeDetails.evaluatedAlternatives.length > 1 && (
                  <div className="pt-2 border-t border-[#E6E1D6] space-y-1">
                    <span className="text-[10px] font-black uppercase text-gray-600 block">
                      Evaluated Driving Alternatives:
                    </span>
                    <div className="space-y-1">
                      {routeDetails.evaluatedAlternatives.map((alt) => (
                        <div
                          key={alt.index}
                          className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                            alt.isSelected
                              ? 'bg-[#E8F5D8] border-[#8BC83F] font-bold text-[#2E7031]'
                              : 'bg-white border-[#E6E1D6] text-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>Route #{alt.index + 1} ({alt.summary})</span>
                            {alt.isShortest && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-200 text-emerald-900 font-black">
                                Shortest Distance
                              </span>
                            )}
                            {alt.isFastest && !alt.isShortest && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-blue-100 text-blue-800 font-bold">
                                Fastest Time
                              </span>
                            )}
                          </div>
                          <span>{alt.distanceKm} km • {alt.durationMinutes} min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* DEVELOPMENT-ONLY: MANUAL COLLECTOR LOCATION CONTROLLER PANEL */}
          {/* ================================================================= */}
          {isDev && (
            <div className="bg-[#FAF8F5] border-2 border-[#8BC83F] p-4 sm:p-5 rounded-3xl space-y-4 shadow-sm">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#E6E1D6]">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#2E7031]" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#2E7031]">
                    Dev Collector Location Controller
                  </span>
                  <span className="text-[10px] bg-[#E8F5D8] text-[#2E7031] font-black px-2 py-0.5 rounded-full">
                    DEV ONLY
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    disabled={simulating || isCalculatingRoute}
                    className="text-xs text-[#6B7280] hover:text-[#16181D] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Default</span>
                  </button>

                  {simulating ? (
                    <Button
                      onClick={handleStopSimulation}
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold"
                    >
                      <Square className="w-3.5 h-3.5 mr-1 fill-current" />
                      <span>Stop Simulation</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStartSimulator}
                      variant="accent"
                      size="sm"
                      loading={simulating || isCalculatingRoute}
                      disabled={!isRouteValid || isCalculatingRoute}
                      className="font-black text-xs shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                      <span>Drive Simulator Now</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Current Starting Coordinates & Destination Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Collector Starting Point */}
                <div className="bg-white p-3 rounded-2xl border border-[#E6E1D6] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-[#2E7031] tracking-wider flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-[#3E8E41]" />
                      <span>Simulated Starting Position</span>
                    </span>
                    <span className="font-mono text-[10px] text-gray-500 font-bold">
                      {effectiveCollectorLat.toFixed(5)}, {effectiveCollectorLng.toFixed(5)}
                    </span>
                  </div>
                  <p className="font-bold text-[#16181D] truncate">{simulatedStartAddress}</p>
                </div>

                {/* Customer Destination (Preserved) */}
                <div className="bg-white p-3 rounded-2xl border border-[#E6E1D6] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      <span>Customer Destination (Protected)</span>
                    </span>
                    <span className="font-mono text-[10px] text-gray-500 font-bold">
                      {customerLat.toFixed(5)}, {customerLng.toFixed(5)}
                    </span>
                  </div>
                  <p className="font-bold text-[#16181D] truncate">
                    {pickup.addressSnapshot.formatted || 'Customer Doorstep'}
                  </p>
                </div>
              </div>

              {/* Route Error Notification if any */}
              {routeCalcError && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Route Calculation Failed</span>
                      <span>{routeCalcError}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      simulatedStartCoords && applyNewCollectorStartingLocation(simulatedStartCoords)
                    }
                    className="px-2.5 py-1 rounded-xl bg-red-100 hover:bg-red-200 font-black text-[11px] shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Tabs to choose starting point */}
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#F0EDE6] rounded-2xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStartTab('search');
                      setIsPickingCollectorOnMap(false);
                    }}
                    className={`py-2 rounded-xl transition-all cursor-pointer ${
                      activeStartTab === 'search'
                        ? 'bg-white text-[#2E7031] shadow-xs'
                        : 'text-[#6B7280] hover:text-[#16181D]'
                    }`}
                  >
                    Search Area
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStartTab('map');
                      setIsPickingCollectorOnMap(true);
                    }}
                    className={`py-2 rounded-xl transition-all cursor-pointer ${
                      activeStartTab === 'map'
                        ? 'bg-white text-[#2E7031] shadow-xs'
                        : 'text-[#6B7280] hover:text-[#16181D]'
                    }`}
                  >
                    Click on Map
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStartTab('manual');
                      setIsPickingCollectorOnMap(false);
                    }}
                    className={`py-2 rounded-xl transition-all cursor-pointer ${
                      activeStartTab === 'manual'
                        ? 'bg-white text-[#2E7031] shadow-xs'
                        : 'text-[#6B7280] hover:text-[#16181D]'
                    }`}
                  >
                    Lat / Lng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStartTab('gps');
                      setIsPickingCollectorOnMap(false);
                    }}
                    className={`py-2 rounded-xl transition-all cursor-pointer ${
                      activeStartTab === 'gps'
                        ? 'bg-white text-[#2E7031] shadow-xs'
                        : 'text-[#6B7280] hover:text-[#16181D]'
                    }`}
                  >
                    Device GPS
                  </button>
                </div>

                {/* TAB 1: Search Location */}
                {activeStartTab === 'search' && (
                  <div className="space-y-2.5">
                    <div className="relative">
                      <input
                        type="text"
                        value={startSearchQuery}
                        onChange={(e) => handleSearchStartLocation(e.target.value)}
                        placeholder="Search starting location (e.g. Mallikatte, Kottara, Bejai, Hampankatta)..."
                        className="w-full bg-white border border-[#E6E1D6] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#16181D] focus:ring-2 focus:ring-[#3E8E41] outline-none"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    </div>

                    {isSearchingStart && (
                      <p className="text-[11px] text-[#3E8E41] font-bold animate-pulse">
                        Searching Mangaluru locations...
                      </p>
                    )}

                    {startSearchResults.length > 0 && (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto bg-white p-2 rounded-2xl border border-[#E6E1D6]">
                        {startSearchResults.map((item) => (
                          <div
                            key={item.placeId}
                            onClick={() =>
                              applyNewCollectorStartingLocation(
                                { lat: item.lat, lng: item.lng },
                                item.name
                              )
                            }
                            className="p-2 rounded-xl hover:bg-[#E8F5D8] cursor-pointer transition-colors text-xs flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-[#16181D] block">{item.name}</span>
                              <span className="text-[11px] text-[#6B7280] line-clamp-1">
                                {item.formatted}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg bg-[#3E8E41] text-white text-[10px] font-black shrink-0"
                            >
                              Set Start
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Click on Map */}
                {activeStartTab === 'map' && (
                  <div className="p-3.5 bg-white rounded-2xl border border-[#E6E1D6] flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-[#16181D]">
                      <Crosshair className="w-4 h-4 text-[#3E8E41] animate-spin" />
                      <span>
                        {isPickingCollectorOnMap
                          ? 'Click anywhere on the map above to drop the collector starting pin.'
                          : 'Map selection is paused.'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant={isPickingCollectorOnMap ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setIsPickingCollectorOnMap(!isPickingCollectorOnMap)}
                    >
                      {isPickingCollectorOnMap ? 'Active (Click Map)' : 'Activate Map Picker'}
                    </Button>
                  </div>
                )}

                {/* TAB 3: Enter Coordinates */}
                {activeStartTab === 'manual' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#6B7280] mb-1">
                          Latitude (-90 to 90)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={manualLatInput}
                          onChange={(e) => setManualLatInput(e.target.value)}
                          placeholder="e.g. 12.8792"
                          className="w-full bg-white border border-[#E6E1D6] rounded-2xl px-3 py-2 text-xs font-mono text-[#16181D] focus:ring-2 focus:ring-[#3E8E41] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#6B7280] mb-1">
                          Longitude (-180 to 180)
                        </label>
                        <input
                          type="number"
                          step="0.0001"
                          value={manualLngInput}
                          onChange={(e) => setManualLngInput(e.target.value)}
                          placeholder="e.g. 74.8451"
                          className="w-full bg-white border border-[#E6E1D6] rounded-2xl px-3 py-2 text-xs font-mono text-[#16181D] focus:ring-2 focus:ring-[#3E8E41] outline-none"
                        />
                      </div>
                    </div>

                    {coordValidationError && (
                      <p className="text-[11px] text-red-600 font-bold">{coordValidationError}</p>
                    )}

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="w-full font-black text-xs"
                      onClick={() => {
                        const lat = parseFloat(manualLatInput);
                        const lng = parseFloat(manualLngInput);
                        applyNewCollectorStartingLocation({ lat, lng });
                      }}
                    >
                      <MapPin className="w-3.5 h-3.5 mr-1.5" />
                      <span>Set Collector Location</span>
                    </Button>
                  </div>
                )}

                {/* TAB 4: Use Current Device GPS */}
                {activeStartTab === 'gps' && (
                  <div className="p-3.5 bg-white rounded-2xl border border-[#E6E1D6] flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-[#16181D] block">Browser Device GPS</span>
                      <span className="text-[11px] text-[#6B7280]">
                        Use current real device location as simulated collector origin
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleFetchCurrentDeviceGps}
                    >
                      <Navigation className="w-3.5 h-3.5 mr-1" />
                      <span>Fetch & Set Collector Location</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Doorstep OTP, LIVE ORDER SUMMARY, Collector Profile, Milestones */}
        <div className="lg:col-span-5 space-y-4">
          {/* DOORSTEP OTP CARD */}
          {['ARRIVED', 'COLLECTING', 'COLLECTED', 'EN_ROUTE'].includes(pickup.status) && (
            <div className="bg-gradient-to-br from-[#1A1B20] to-[#262830] text-white p-6 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#8BC83F]">
                  <KeyRound className="w-4 h-4" />
                  <span>Doorstep Verification PIN</span>
                </div>
                <span className="text-[10px] bg-white/10 px-2.5 py-0.5 rounded-full text-gray-300 font-semibold">
                  {pickup.status === 'ARRIVED' ? 'Arrived at door' : 'Active PIN'}
                </span>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed mb-4">
                Share this 4-digit security PIN with the collector only after your recyclable bags are
                weighed on the digital scale.
              </p>

              <div className="flex items-center justify-center gap-3 bg-white/10 p-4 rounded-2xl border border-white/10 mb-4">
                {(doorstepOtp || '').split('').map((digit, idx) => (
                  <span
                    key={idx}
                    className="w-12 h-14 rounded-xl bg-white text-[#16181D] font-mono font-black text-3xl flex items-center justify-center shadow-md"
                  >
                    {digit}
                  </span>
                ))}
                {!doorstepOtp && <span className="text-sm text-gray-300">Waiting for arrival PIN...</span>}
              </div>

              {/* Dev Shortcut to simulate collector scanning / entering this PIN */}
              {pickup.status !== 'COMPLETED' && (
                <button
                  type="button"
                  onClick={handleCollectorVerifyPin}
                  disabled={verifyingOtp || !doorstepOtp}
                  className="w-full py-3 px-4 rounded-xl bg-[#8BC83F] hover:bg-[#7db935] text-[#16181D] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md active:scale-[0.99]"
                >
                  {verifyingOtp ? (
                    <div className="w-4 h-4 border-2 border-[#16181D] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    {verifyingOtp
                      ? 'Verifying Doorstep PIN...'
                      : 'Simulate Collector Entering PIN → Complete'}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* LIVE ORDER SUMMARY CARD (Preserved & prominent) */}
          {/* ================================================================= */}
          <div className="bg-[#16181D] text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-white/10 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-xs font-black tracking-wider text-[#8BC83F] uppercase">
                <Sparkles className="w-4 h-4 text-[#8BC83F]" />
                <span>LIVE ORDER SUMMARY</span>
              </div>
              <span className="text-[10px] bg-white/10 px-2.5 py-0.5 rounded-full text-gray-300 font-mono font-bold">
                #{pickup.id.toUpperCase().slice(-8)}
              </span>
            </div>

            {/* Recyclables Items List */}
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {pickup.pricingSnapshot?.items && pickup.pricingSnapshot.items.length > 0 ? (
                pickup.pricingSnapshot.items.map((item, idx) => (
                  <div key={idx} className="pb-2.5 border-b border-white/10 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-white leading-snug">
                        {item.wasteTypeName}
                      </span>
                      <span className="text-sm font-black text-white shrink-0">
                        ₹{(item.lineTotalMinor / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{item.numberOfBags}x {item.bagSize} bag</span>
                      <span>₹{(item.unitPriceMinor / 100).toFixed(2)}/bag</span>
                    </div>
                  </div>
                ))
              ) : (
                pickup.items?.map((item, idx) => (
                  <div key={idx} className="pb-2.5 border-b border-white/10 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-white leading-snug">
                        Recyclable Item #{idx + 1}
                      </span>
                      <span className="text-sm font-black text-white shrink-0">
                        ₹{(item.lineTotalMinor / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {item.numberOfBags}x {item.bagSize} bag
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* ESTIMATED GREEN IMPACT */}
            <div className="bg-[#202229] border border-white/10 rounded-2xl p-3.5 space-y-2 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#8BC83F]">
                ESTIMATED GREEN IMPACT
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">Total Recyclables:</span>
                <span className="font-bold text-white">{totalWeightKg} kg</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">CO₂ Avoided:</span>
                <span className="font-black text-[#8BC83F]">{totalCo2AvoidedKg} kg</span>
              </div>
            </div>

            {/* Pickup Scheduled Slot & Address Snapshot */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-gray-300 font-semibold">
                <Clock className="w-3.5 h-3.5 text-[#8BC83F] shrink-0" />
                <span>
                  {pickup.scheduledDate} • {pickup.scheduledSlot}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="truncate">
                  {pickup.addressSnapshot?.formatted || 'Customer Doorstep'}
                </span>
              </div>
            </div>

            {/* Tariff Total & Payment Status */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-400 block">
                  ORDER TARIFF
                </span>
                <span className="text-2xl font-black text-[#8BC83F]">
                  ₹{(pickup.totalAmountMinor / 100).toFixed(2)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-400 block mb-1">
                  Payment Mode
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    pickup.paymentStatus === 'SUCCESS'
                      ? 'bg-[#E8F5D8] text-[#2E7031]'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {pickup.paymentStatus === 'SUCCESS'
                    ? 'PAID ONLINE ✓'
                    : pickup.paymentMode === 'PAY_NOW'
                      ? 'PAY ONLINE'
                      : 'PAY AT DOORSTEP'}
                </span>
              </div>
            </div>
          </div>

          {/* Collector Details Card */}
          <Card className="p-5 border border-[#E6E1D6]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-3">
              Assigned Collector Partner
            </span>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <img
                  src={
                    collector?.photoUrl ||
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'
                  }
                  alt={collector?.name || 'Collector'}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-[#8BC83F]"
                />
                <div>
                  <h4 className="text-base font-black text-[#16181D]">
                    {collector?.name || 'Rajesh Shetty'}
                  </h4>
                  <p className="text-xs font-semibold text-[#6B7280]">
                    {collector?.vehicleType || 'Electric Auto (E-Rickshaw)'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono font-bold bg-gray-100 px-2 py-0.5 rounded-md text-[#16181D]">
                      {collector?.vehicleNumber || 'KA-19-EA-4102'}
                    </span>
                    <span className="text-xs font-bold text-amber-600">
                      ★ {collector?.rating || 4.9}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Phone & Message */}
              <div className="flex flex-col gap-2">
                <a
                  href={`tel:${collector?.phone || '+919845012345'}`}
                  className="w-10 h-10 rounded-full bg-[#E8F5D8] text-[#3E8E41] hover:bg-[#3E8E41] hover:text-white flex items-center justify-center shadow-xs transition-colors"
                  title="Call Collector"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() =>
                    toast({
                      type: 'info',
                      title: 'Connecting to Collector',
                      message: 'SMS and chat channel opened with Rajesh Shetty.',
                    })
                  }
                  className="w-10 h-10 rounded-full bg-gray-100 text-[#16181D] hover:bg-gray-200 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                  title="Message Collector"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Telemetry Freshness */}
            <div className="bg-[#F0EDE6] p-3 rounded-2xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#16181D]">
                <Radio className="w-3.5 h-3.5 text-[#3E8E41] animate-pulse" />
                <span className="font-bold">Live GPS Telemetry</span>
              </div>
              <span className="text-[#6B7280] font-medium">Signal Fresh (1s ago)</span>
            </div>
          </Card>

          {/* Pickup Progress Timeline Milestones */}
          <Card className="p-5 border border-[#E6E1D6]">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#6B7280] mb-4">
              Pickup Milestones
            </h4>
            <div className="space-y-3">
              {milestones.map((m, idx) => {
                const isDone = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isDone
                          ? 'bg-[#3E8E41] text-white shadow-xs'
                          : 'bg-gray-100 text-[#6B7280] border border-gray-200'
                      } ${isCurrent ? 'ring-2 ring-[#8BC83F] ring-offset-2' : ''}`}
                    >
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          isDone ? 'text-[#16181D]' : 'text-gray-400'
                        } ${isCurrent ? 'text-[#3E8E41] font-black' : ''}`}
                      >
                        {m.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-[#E8F5D8] text-[#2E7031] px-2 py-0.5 rounded-full">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
