"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// 코스의 방문 순서를 번호 마커와 선으로 보여 주는 지도 (OpenStreetMap 타일 사용)
// stops: [{ name, lat, lng }] — 좌표가 없는 장소는 지도에서 제외됩니다.
export default function CourseMap({ stops }) {
  const ref = useRef(null);
  const points = stops
    .map((stop, index) => ({ ...stop, number: index + 1 }))
    .filter((stop) => typeof stop.lat === "number" && typeof stop.lng === "number");

  useEffect(() => {
    if (!ref.current || points.length === 0) return;
    let map;
    let cancelled = false;

    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const latlngs = points.map((p) => [p.lat, p.lng]);
      for (const p of points) {
        L.marker([p.lat, p.lng], {
          title: `${p.number}. ${p.name}`,
          keyboard: false,
          icon: L.divIcon({
            className: "",
            html: `<span class="ts-marker">${p.number}</span>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }).addTo(map);
      }
      if (latlngs.length > 1) L.polyline(latlngs, { color: "#0d9488", weight: 3, dashArray: "6 6" }).addTo(map);
      map.fitBounds(latlngs, { padding: [32, 32], maxZoom: 14 });
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
    // 장소 목록이 바뀔 때만 다시 그림
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);

  if (points.length === 0) return null;

  return (
    <section aria-label="코스 지도" className="flex flex-col gap-2">
      <h2 className="text-xl font-bold">코스 지도</h2>
      {/* 지도 조작 버튼이 안에 있어 role을 붙이지 않음. 순서는 아래 "코스 순서" 목록에서도 확인 가능 */}
      <div
        ref={ref}
        className="h-72 w-full overflow-hidden rounded-2xl border border-border bg-slate-200 md:h-96"
      />
      <p className="text-xs text-muted">장소 위치는 대략적인 위치이며, 실제와 조금 다를 수 있습니다.</p>
    </section>
  );
}
