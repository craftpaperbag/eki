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
const directionNames = [
  '北',
  '北北東',
  '北東',
  '東北東',
  '東',
  '東南東',
  '南東',
  '南南東',
  '南',
  '南南西',
  '南西',
  '西南西',
  '西',
  '西北西',
  '北西',
  '北北西'
];

type Mode = 'nearest' | 'other';

function normalizeBearing(bearing: number) {
  return (bearing + 360) % 360;
}

function toDirectionName(degrees: number) {
  const normalized = normalizeBearing(degrees);
  const index = Math.round(normalized / 22.5) % directionNames.length;
  return directionNames[index];
}

function bearingInfoFromStation(position: Position, station: Station): BearingInfo {
  const distanceMeters = haversineDistanceMeters(position, {
    latitude: station.latitude,
    longitude: station.longitude
  });
  const bearingFromNorth = bearingDegrees(position, {
    latitude: station.latitude,
    longitude: station.longitude
  });

  return { station, distanceMeters, bearingFromNorth };
}

export default function HomePage() {
  const [position, setPosition] = useState<Position | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('nearest');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

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
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitHeading === 'number') {
        setHeading(360 - webkitHeading);
      } else if (typeof event.alpha === 'number') {
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
      const info = bearingInfoFromStation(position, station);

      if (!closest || info.distanceMeters < closest.distanceMeters) {
        closest = info;
      }
    });

    return closest;
  }, [position]);

  const otherStationInfo = useMemo<BearingInfo | null>(() => {
    if (!position || !selectedStation) return null;
    return bearingInfoFromStation(position, selectedStation);
  }, [position, selectedStation]);

  const activeInfo = mode === 'nearest' ? nearest : otherStationInfo;
  const baseBearing = activeInfo ? normalizeBearing(activeInfo.bearingFromNorth) : null;
  const relativeHeading = useMemo(() => {
    if (baseBearing !== null && heading !== null) {
      const normalizedHeading = normalizeBearing(heading);
      return (baseBearing - normalizedHeading + 360) % 360;
    }
    return null;
  }, [baseBearing, heading]);
  const [compassAngle, setCompassAngle] = useState<number | null>(null);

  useEffect(() => {
    if (baseBearing === null) {
      setCompassAngle(null);
      return;
    }
    setCompassAngle(relativeHeading ?? baseBearing);
  }, [baseBearing, relativeHeading]);

  const displayAngle = compassAngle;
  const displayDirection = compassAngle !== null ? toDirectionName(compassAngle) : null;
  const baseDirection = baseBearing !== null ? toDirectionName(baseBearing) : null;

  const filteredStations = useMemo(() => {
    const term = searchTerm.trim();
    const filtered = term
      ? stationList.filter((station) => station.name.includes(term))
      : stationList;
    return filtered.slice(0, 8);
  }, [searchTerm]);

  const resetToNearest = () => {
    setMode('nearest');
    setSelectedStation(null);
    setSearchTerm('');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs text-slate-300">最寄駅コンパス</p>
          <h1 className="text-2xl font-bold leading-tight">駅コンパス</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-slate-900/70 p-1 shadow-inner shadow-black/20">
            <button
              type="button"
              onClick={() => setMode('nearest')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === 'nearest'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              最寄駅モード
            </button>
            <button
              type="button"
              onClick={() => setMode('other')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === 'other'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              他の駅モード
            </button>
          </div>
          {mode === 'other' && (
            <button
              type="button"
              onClick={resetToNearest}
              className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/30"
            >
              最寄駅に戻る
            </button>
          )}
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 shadow hover:bg-slate-700"
          >
            このアプリについて
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-xl">
          {error && <p className="text-sm text-amber-300">{error}</p>}
          {!error && !position && (
            <p className="text-sm text-slate-300">位置情報を取得しています...</p>
          )}

          {position && activeInfo && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-300">
                    {mode === 'nearest' ? '現在地に最も近い駅' : '選択中の駅'}
                  </p>
                  <h2
                    className="text-2xl font-bold"
                    style={{ color: activeInfo.station.lineColor }}
                  >
                    {activeInfo.station.name}
                  </h2>
                  <p className="text-sm text-slate-300">{activeInfo.station.line}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-300">距離</p>
                  <p className="text-3xl font-semibold">{formatDistance(activeInfo.distanceMeters)}</p>
                </div>
              </div>

              <div className="grid gap-4 rounded-2xl bg-slate-900/70 p-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-300">方角</p>
                  <p className="text-xl font-semibold">
                    {displayAngle !== null
                      ? `${Math.round(displayAngle)}° / ${displayDirection}`
                      : '方角を計算中'}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {baseBearing !== null && baseDirection
                      ? `北から見た方角は ${Math.round(baseBearing)}°（${baseDirection}）`
                      : '北から見た方角を取得しています。'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {relativeHeading !== null
                      ? '端末の向きに対する角度で表示しています。'
                      : '方位センサーがない場合は北を基準にした角度で表示します。'}
                  </p>
                </div>

                <div className="flex items-center justify-center">
                  <div className="relative h-48 w-48">
                    <div className="absolute inset-0 rounded-full border border-white/10 bg-slate-950/60 shadow-inner shadow-black/40" />
                    <div className="absolute inset-3 rounded-full border border-white/5" />
                    <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200" />
                    <div className="absolute left-1/2 top-3 -translate-x-1/2 text-xs font-semibold text-slate-200">北</div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-200">東</div>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-200">南</div>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-200">西</div>
                    <div className="absolute inset-6 flex items-center justify-center">
                      <div
                        className="relative h-full w-full"
                        style={{ transform: `rotate(${displayAngle ?? 0}deg)` }}
                      >
                        <div className="absolute left-1/2 top-0 h-20 w-3 -translate-x-1/2 rounded-b-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 shadow-lg" />
                        <div className="absolute left-1/2 top-20 h-4 w-4 -translate-x-1/2 rounded-full bg-amber-600" />
                        <div className="absolute left-1/2 top-1/2 h-[1px] w-24 -translate-x-1/2 -translate-y-1/2 bg-white/10" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {position && !activeInfo && (
            <p className="text-sm text-slate-300">
              {mode === 'other'
                ? '駅を選択すると距離と方角を表示します。'
                : '駅情報を準備しています...'}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-slate-900/70 p-5 text-sm text-slate-200">
          {mode === 'nearest' ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-50">使い方</h3>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">最寄駅モード</span>
              </div>
              <ol className="list-decimal space-y-2 pl-5">
                <li>ブラウザから位置情報と方位の許可を求められたら許可してください。</li>
                <li>表示される最寄駅が、現在地に合わせて自動で更新されます。</li>
                <li>距離が1km未満ならメートル、1km以上ならキロメートルで表示されます。</li>
              </ol>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-50">他の駅を探す</h3>
                <button
                  type="button"
                  onClick={() => setSelectedStation(null)}
                  className="rounded-full border border-white/10 bg-slate-800 px-3 py-1 text-xs text-slate-200 transition hover:border-white/30"
                >
                  選択をクリア
                </button>
              </div>

              <label className="text-xs text-slate-400" htmlFor="station-search">
                駅名は部分一致で検索できます。
              </label>
              <input
                id="station-search"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="駅名を入力"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-white/20 focus:ring-amber-400/30"
              />

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {filteredStations.map((station) => (
                  <button
                    key={`${station.name}-${station.line}`}
                    type="button"
                    onClick={() => {
                      setSelectedStation(station);
                      setMode('other');
                    }}
                    className={`flex flex-col rounded-2xl border border-white/10 px-4 py-3 text-left transition hover:border-white/30 ${
                      selectedStation?.name === station.name ? 'bg-white/10' : 'bg-slate-950/70'
                    }`}
                  >
                    <span className="text-sm font-semibold" style={{ color: station.lineColor }}>
                      {station.name}
                    </span>
                    <span className="text-xs text-slate-300">{station.line}</span>
                  </button>
                ))}
              </div>

              {selectedStation ? (
                <div className="rounded-2xl bg-slate-800/80 p-3 text-xs text-slate-200">
                  <p>選択中: {selectedStation.name}</p>
                  <p className="text-slate-400">最寄駅モードの計算と同じ距離・方角を表示します。</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">駅を選択すると距離と方角が表示されます。</p>
              )}
            </div>
          )}
        </section>
      </div>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}
