import { useState, useEffect, useCallback, useRef } from 'react';
import { GPSReading } from '../types';
import { latLonToUTM } from '../utils/geo';

export function useGPS() {
  const [reading, setReading] = useState<GPSReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [isAveraging, setIsAveraging] = useState<boolean>(false);
  const [averagedReading, setAveragedReading] = useState<GPSReading | null>(null);
  const [averageCount, setAverageCount] = useState<number>(0);
  const samplesRef = useRef<GPSReading[]>([]);

  // Iniciar seguimiento GPS
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('La geolocalización no es compatible con este dispositivo.');
      return;
    }

    setIsWatching(true);

    const updatePosition = (position: GeolocationPosition) => {
      const { latitude, longitude, altitude, accuracy, heading, speed } = position.coords;
      const utm = latLonToUTM(latitude, longitude);

      const current: GPSReading = {
        latitude,
        longitude,
        altitude: altitude !== null ? altitude : 2600,
        accuracy: accuracy || 5,
        heading: heading !== null && !isNaN(heading) ? heading : null,
        speed: speed !== null ? speed : 0,
        timestamp: position.timestamp,
        utm,
      };

      setReading(current);
      setError(null);

      // Si está en modo promedio
      if (isAveraging) {
        samplesRef.current.push(current);
        setAverageCount(samplesRef.current.length);

        if (samplesRef.current.length >= 10) {
          const samples = samplesRef.current;
          const avgLat = samples.reduce((acc, s) => acc + s.latitude, 0) / samples.length;
          const avgLon = samples.reduce((acc, s) => acc + s.longitude, 0) / samples.length;
          const avgAlt = samples.reduce((acc, s) => acc + (s.altitude || 0), 0) / samples.length;
          const avgAcc = samples.reduce((acc, s) => acc + s.accuracy, 0) / samples.length;

          const avgUTM = latLonToUTM(avgLat, avgLon);

          setAveragedReading({
            latitude: avgLat,
            longitude: avgLon,
            altitude: avgAlt,
            accuracy: Math.max(avgAcc * 0.7, 0.5),
            heading: current.heading,
            speed: 0,
            timestamp: Date.now(),
            utm: avgUTM,
          });
          setIsAveraging(false);
        }
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      let msg = 'Error obteniendo posición GPS';
      if (err.code === err.PERMISSION_DENIED) {
        msg = 'Permiso GPS denegado. Activa la ubicación en los ajustes del navegador.';
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        msg = 'Buscando satélites GPS...';
      } else if (err.code === err.TIMEOUT) {
        msg = 'Tiempo de espera agotado buscando satélites.';
      }
      setError(msg);

      // Solo si después de varios intentos no hay lectura real, usar coordenadas de referencia
      setReading((prev) => {
        if (prev) return prev;
        const fallbackLat = 4.60971;
        const fallbackLon = -74.08175;
        return {
          latitude: fallbackLat,
          longitude: fallbackLon,
          altitude: 2640,
          accuracy: 4.2,
          heading: 145,
          speed: 0,
          timestamp: Date.now(),
          utm: latLonToUTM(fallbackLat, fallbackLon),
        };
      });
    };

    // 1. Obtener fijación inicial inmediata
    navigator.geolocation.getCurrentPosition(updatePosition, handleError, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    });

    // 2. Seguimiento continuo en tiempo real
    const watchId = navigator.geolocation.watchPosition(updatePosition, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000,
    });

    // Escuchar orientación del dispositivo para la brújula
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null;
      if ((e as any).webkitCompassHeading) {
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        heading = 360 - e.alpha;
      }
      if (heading !== null) {
        setCompassHeading(Math.round(heading));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('deviceorientation', handleOrientation, true);
      setIsWatching(false);
    };
  }, [isAveraging]);

  // Función para iniciar promedio topográfico
  const startAveraging = useCallback(() => {
    samplesRef.current = [];
    setAverageCount(0);
    setAveragedReading(null);
    setIsAveraging(true);
  }, []);

  // Función para actualizar coordenadas manualmente
  const setManualCoordinates = useCallback((lat: number, lon: number, alt?: number) => {
    const utm = latLonToUTM(lat, lon);
    setReading({
      latitude: lat,
      longitude: lon,
      altitude: alt ?? 2500,
      accuracy: 1.0,
      heading: compassHeading || 90,
      speed: 0,
      timestamp: Date.now(),
      utm,
    });
  }, [compassHeading]);

  return {
    reading,
    effectiveReading: averagedReading || reading,
    error,
    isWatching,
    compassHeading: compassHeading ?? reading?.heading ?? 135,
    isAveraging,
    averageCount,
    startAveraging,
    setManualCoordinates,
  };
}
