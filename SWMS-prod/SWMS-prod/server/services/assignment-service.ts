import { db, dbManager } from '../db';
import { realtimeBus } from '../realtime';
import { advancePickupStatus } from './pickup-service';
export { processCompletedPickupRewards } from './rewards-service';

// Active simulation timers map so multiple simulations don't collide
const activeSimulations = new Map<string, NodeJS.Timeout>();

export async function simulateCollectorDrive(pickupId: string): Promise<{ success: boolean; message: string }> {
  const pickup = db.pickups.find((p) => p.id === pickupId);
  if (!pickup) {
    return { success: false, message: 'Pickup not found' };
  }

  const collector = db.collectors.find((c) => c.id === pickup.collectorId) || db.collectors[0];
  const targetLat = pickup.addressSnapshot.lat;
  const targetLng = pickup.addressSnapshot.lng;

  // Realistic starting location in Mangaluru (e.g. Kadri/Mallikatte area)
  const startLat = targetLat + 0.012;
  const startLng = targetLng - 0.009;

  // Clear existing simulation if any
  if (activeSimulations.has(pickupId)) {
    clearInterval(activeSimulations.get(pickupId)!);
    activeSimulations.delete(pickupId);
  }

  // Move status to EN_ROUTE
  pickup.status = 'EN_ROUTE';
  pickup.history.push({
    id: `h_sim_${Date.now()}`,
    pickupId,
    status: 'EN_ROUTE',
    notes: `${collector.name} is en route to customer doorstep along arterial road.`,
    createdAt: new Date().toISOString(),
  });
  dbManager.persist();

  realtimeBus.emitToUser(pickup.customerId, 'pickup_status_changed', {
    pickupId,
    status: 'EN_ROUTE',
    notes: `${collector.name} has started driving towards your location.`,
  });

  // Attempt to fetch real road waypoints from OSRM
  let roadWaypoints: [number, number][] = [];
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${targetLng},${targetLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
        roadWaypoints = data.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number]
        );
      }
    }
  } catch (e) {
    // Fallback road waypoints
  }

  // If OSRM returned road waypoints, sample 8 evenly-spaced waypoints along the road
  let stepsWaypoints: [number, number][] = [];
  if (roadWaypoints.length >= 8) {
    const total = roadWaypoints.length;
    for (let i = 0; i < 8; i++) {
      const idx = Math.min(total - 1, Math.round((i / 7) * (total - 1)));
      stepsWaypoints.push(roadWaypoints[idx]);
    }
  } else {
    // Urban road grid fallback with street turns (not a straight line)
    const mid1: [number, number] = [startLat + (targetLat - startLat) * 0.4, startLng];
    const mid2: [number, number] = [startLat + (targetLat - startLat) * 0.4, targetLng];
    stepsWaypoints = [
      [startLat, startLng],
      [startLat + (mid1[0] - startLat) * 0.5, startLng],
      mid1,
      [mid1[0], startLng + (targetLng - startLng) * 0.5],
      mid2,
      [mid2[0] + (targetLat - mid2[0]) * 0.5, targetLng],
      [targetLat, targetLng],
    ];
  }

  const steps = stepsWaypoints.length;
  let currentStep = 0;

  const timer = setInterval(() => {
    currentStep += 1;
    const fraction = currentStep / steps;
    const activePoint = stepsWaypoints[Math.min(currentStep, steps - 1)];

    collector.currentLat = activePoint[0];
    collector.currentLng = activePoint[1];
    collector.lastLocationAt = new Date().toISOString();
    dbManager.persist();

    const remainingDistanceKm = parseFloat((1.8 * (1 - fraction)).toFixed(2));
    const etaMinutes = Math.max(0, Math.round(remainingDistanceKm * 3.5));

    realtimeBus.emitToUser(pickup.customerId, 'collector_location_updated', {
      pickupId,
      collectorId: collector.id,
      collectorName: collector.name,
      lat: activePoint[0],
      lng: activePoint[1],
      distanceKm: remainingDistanceKm,
      etaMinutes,
      status: fraction >= 1 ? 'ARRIVED' : 'EN_ROUTE',
    });

    if (currentStep >= steps) {
      clearInterval(timer);
      activeSimulations.delete(pickupId);

      // Advance to ARRIVED
      advancePickupStatus(pickupId, 'ARRIVED', 'Collector arrived at customer doorstep.');
    }
  }, 2200);

  activeSimulations.set(pickupId, timer);

  return {
    success: true,
    message: `Simulator started for collector ${collector.name}. Vehicle is following road route to doorstep!`,
  };
}
