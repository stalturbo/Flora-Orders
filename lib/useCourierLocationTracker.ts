import { useEffect, useRef, useCallback, useState } from 'react';
import { Platform, AppState } from 'react-native';
import { api } from './api';

const SEND_INTERVAL_MS = 30_000;
const MIN_DISTANCE_METERS = 20;

export type TrackingStatus = 'inactive' | 'requesting' | 'active' | 'error' | 'permission_denied';

interface TrackerOptions {
  enabled: boolean;
  activeOrderId?: string | null;
}

function getWebGeolocation(): Promise<{ lat: number; lon: number; accuracy: number | null }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );
  });
}

export function useCourierLocationTracker({ enabled, activeOrderId }: TrackerOptions) {
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('inactive');
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const lastSentRef = useRef<{ lat: number; lon: number; time: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<any>(null);
  const latestLocationRef = useRef<{ lat: number; lon: number; accuracy: number | null } | null>(null);
  const enabledRef = useRef(enabled);
  const activeOrderIdRef = useRef(activeOrderId);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { activeOrderIdRef.current = activeOrderId; }, [activeOrderId]);

  const sendLocation = useCallback(async () => {
    const loc = latestLocationRef.current;
    if (!loc) return;

    const now = Date.now();
    const last = lastSentRef.current;

    if (last) {
      const timeDiff = now - last.time;
      if (timeDiff < SEND_INTERVAL_MS * 0.8) return;
      const dist = haversineDistance(last.lat, last.lon, loc.lat, loc.lon);
      if (dist < MIN_DISTANCE_METERS && timeDiff < SEND_INTERVAL_MS * 2) return;
    }

    try {
      const orderId = activeOrderIdRef.current;
      await api.courierLocation.send({
        lat: loc.lat,
        lon: loc.lon,
        accuracy: loc.accuracy ?? undefined,
        ...(orderId ? { activeOrderId: orderId } : {}),
      });
      lastSentRef.current = { lat: loc.lat, lon: loc.lon, time: now };
      setLastSentAt(now);
    } catch (e) {
      console.warn('Failed to send courier location:', e);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (watchRef.current) {
      if (Platform.OS === 'web' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current);
      } else if (watchRef.current?.remove) {
        watchRef.current.remove();
      }
      watchRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTracking = useCallback(async () => {
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) {
        setTrackingStatus('error');
        return;
      }

      setTrackingStatus('requesting');

      try {
        const loc = await getWebGeolocation();
        latestLocationRef.current = loc;
        setTrackingStatus('active');
        sendLocation();
      } catch (e: any) {
        if (e.code === 1) {
          setTrackingStatus('permission_denied');
        } else {
          setTrackingStatus('error');
        }
        return;
      }

      watchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          latestLocationRef.current = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
        },
        (error) => {
          console.warn('Geolocation watch error:', error);
        },
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 }
      );

      intervalRef.current = setInterval(() => {
        if (latestLocationRef.current) {
          sendLocation();
        }
      }, SEND_INTERVAL_MS);

    } else {
      try {
        setTrackingStatus('requesting');
        const Location = require('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setTrackingStatus('permission_denied');
          return;
        }

        setTrackingStatus('active');

        watchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10_000,
            distanceInterval: 10,
          },
          (location: any) => {
            latestLocationRef.current = {
              lat: location.coords.latitude,
              lon: location.coords.longitude,
              accuracy: location.coords.accuracy,
            };
          }
        );

        sendLocation();

        intervalRef.current = setInterval(() => {
          sendLocation();
        }, SEND_INTERVAL_MS);
      } catch (e) {
        console.warn('Location tracking failed:', e);
        setTrackingStatus('error');
      }
    }
  }, [sendLocation, cleanup]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    cleanup();
    await startTracking();
    return trackingStatus === 'active';
  }, [startTracking, cleanup, trackingStatus]);

  const openSettings = useCallback(async () => {
    if (Platform.OS === 'web') {
      cleanup();
      await startTracking();
    } else {
      const { Linking } = require('react-native');
      Linking.openSettings();
    }
  }, [startTracking, cleanup]);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      setTrackingStatus('inactive');
      return;
    }

    startTracking();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && enabledRef.current) {
        if (latestLocationRef.current) {
          sendLocation();
        }
      }
    });

    return () => {
      subscription.remove();
      cleanup();
    };
  }, [enabled]);

  return { trackingStatus, lastSentAt, requestPermission, openSettings };
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
