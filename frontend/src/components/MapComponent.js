import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const MapComponent = ({ cameras, observations, heatmapData, onCameraClick, selectedCamera }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current).setView([33.52, 103.92], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker || layer instanceof L.HeatLayer) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    if (heatmapData && heatmapData.length > 0) {
      const heatPoints = heatmapData.map(d => [d.lat, d.lng, d.intensity]);
      L.heatLayer(heatPoints, {
        radius: 40,
        blur: 25,
        maxZoom: 15,
        gradient: { 0.2: 'blue', 0.4: 'lime', 0.6: 'yellow', 0.8: 'orange', 1.0: 'red' }
      }).addTo(mapInstanceRef.current);
    }

    cameras.forEach(camera => {
      const isSelected = selectedCamera && selectedCamera.id === camera.id;
      
      const cameraIcon = L.divIcon({
        className: 'camera-marker',
        html: `<div style="
          width: ${isSelected ? '32px' : '24px'};
          height: ${isSelected ? '32px' : '24px'};
          background: ${isSelected ? '#1a5f3c' : '#2d8a5a'};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${isSelected ? '14px' : '10px'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">📷</div>`,
        iconSize: isSelected ? [32, 32] : [24, 24],
        iconAnchor: isSelected ? [16, 16] : [12, 12]
      });

      const marker = L.marker([camera.lat, camera.lng], { icon: cameraIcon })
        .addTo(mapInstanceRef.current)
        .on('click', () => onCameraClick(camera));

      marker.bindPopup(`
        <strong>${camera.name}</strong><br/>
        保护站: ${camera.station}<br/>
        电量: ${camera.battery_level}%<br/>
        照片数: ${camera.photos_taken}
      `);
    });

    observations.forEach(obs => {
      const camera = cameras.find(c => c.id === obs.camera_id);
      if (!camera) return;

      const categoryColor = {
        '哺乳纲': '#e74c3c',
        '鸟纲': '#3498db',
        '两栖纲': '#9b59b6',
        '植物': '#2ecc71'
      };

      const obsIcon = L.divIcon({
        className: 'observation-marker',
        html: `<div style="
          width: 16px;
          height: 16px;
          background: ${categoryColor[obs.category] || '#95a5a6'};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const jitteredLat = camera.lat + (Math.random() - 0.5) * 0.005;
      const jitteredLng = camera.lng + (Math.random() - 0.5) * 0.005;

      L.marker([jitteredLat, jitteredLng], { icon: obsIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <strong>${obs.chinese_name}</strong><br/>
          <em>${obs.latin_name}</em><br/>
          ${obs.protection_level}<br/>
          数量: ${obs.count}只<br/>
          置信度: ${(obs.confidence * 100).toFixed(1)}%
        `);
    });

  }, [cameras, observations, heatmapData, selectedCamera, onCameraClick]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '8px' }} />;
};

export default MapComponent;
