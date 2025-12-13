'use client';

import { useEffect, useMemo, useState } from 'react';
import stations from '@/data/stations.json';
import { AboutModal } from '@/components/AboutModal';
import { Station, bearingDegrees, formatDistance, haversineDistanceMeters, Position } from '@/lib/geo';

type BearingInfo = {
  station: Station;
  distanceMeters: number;
  bearingFromNorth: number;
};

const stationList = stations as Station[];

export default function HomePage() {
  const [position, setPosition] = useState<Position | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('この端末では位置情報が利用できません');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setError(null);
      },
      () => {
        setError('位置情報の取得に失敗しました');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 10_000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (typeof event.alpha === 'number') {
        setHeading(event.alpha);
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const nearest = useMemo<BearingInfo | null>(() => {
    if (!position) return null;

    let closest: BearingInfo | null = null;

    stationList.forEach((station) => {
      const distanceMeters = haversineDistanceMeters(position, {
        latitude: station.latitude,
        longitude: station.longitude
      });
      const bearingFromNorth = bearingDegrees(position, {
        latitude: station.latitude,
        longitude: station.longitude
      });

      if (!closest || distanceMeters < closest.distanceMeters) {
        closest = { station, distanceMeters, bearingFromNorth };
      }
    });

    return closest;
  }, [position]);

  const relativeHeading = useMemo(() => {
    if (nearest && heading !== null) {
      const normalizedBearing = (nearest.bearingFromNorth + 360) % 360;
      const normalizedHeading = (heading + 360) % 360;
      return (normalizedBearing - normalizedHeading + 360) % 360;
    }
    return null;
  }, [heading, nearest]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-300">最寄駅コンパス</p>
          <h1 className="text-3xl font-bold">駅コンパス</h1>
        </div>
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 shadow hover:bg-slate-700"
        >
          このアプリについて
        </button>
      </header>

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-xl">
        {error && <p className="text-sm text-amber-300">{error}</p>}
        {!error && !position && <p className="text-sm text-slate-300">位置情報を取得しています...</p>}
        {position && nearest && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">現在地に最も近い駅</p>
                <h2
                  className="text-2xl font-bold"
                  style={{ color: nearest.station.lineColor }}
                >
                  {nearest.station.name}
                </h2>
                <p className="text-sm text-slate-300">{nearest.station.line}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-300">距離</p>
                <p className="text-3xl font-semibold">{formatDistance(nearest.distanceMeters)}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-900/70 p-4">
              <p className="text-sm text-slate-300">方角</p>
              <p className="text-lg font-semibold">
                {relativeHeading !== null
                  ? `${Math.round(relativeHeading)}° (北=0°)`
                  : `${Math.round((nearest.bearingFromNorth + 360) % 360)}° (北=0°)`}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                方位センサーが利用できない場合は端末の向きに関係なく、北から見た方角を表示します。
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 text-sm text-slate-200">
        <h3 className="text-lg font-semibold text-slate-50">使い方</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>ブラウザから位置情報と方位の許可を求められたら許可してください。</li>
          <li>表示される最寄駅が、現在地に合わせて自動で更新されます。</li>
          <li>距離が1km未満ならメートル、1km以上ならキロメートルで表示されます。</li>
        </ol>
      </section>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}
