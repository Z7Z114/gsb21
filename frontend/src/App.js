import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MapComponent from './components/MapComponent';
import StatisticsPanel from './components/StatisticsPanel';
import SpeciesList from './components/SpeciesList';
import AudioUploader from './components/AudioUploader';
import TaskStatus from './components/TaskStatus';
import './App.css';

function App() {
  const [cameras, setCameras] = useState([]);
  const [observations, setObservations] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [activeTab, setActiveTab] = useState('map');
  const [currentTask, setCurrentTask] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [camerasRes, observationsRes, heatmapRes, statsRes] = await Promise.all([
        axios.get('http://localhost:8000/api/cameras'),
        axios.get('http://localhost:8000/api/observations'),
        axios.get('http://localhost:8000/api/heatmap'),
        axios.get('http://localhost:8000/api/statistics')
      ]);

      setCameras(camerasRes.data);
      setObservations(observationsRes.data);
      setHeatmapData(heatmapRes.data);
      setStatistics(statsRes.data);
    } catch (error) {
      console.error('获取数据失败:', error);
      setCameras([
        { id: 'cam_001', name: '主峰北坡1号', lat: 33.5123, lng: 103.8945, station: '主峰保护站', battery_level: 85, photos_taken: 1247 },
        { id: 'cam_002', name: '主峰南坡2号', lat: 33.5089, lng: 103.8992, station: '主峰保护站', battery_level: 72, photos_taken: 892 },
        { id: 'cam_003', name: '溪谷上游1号', lat: 33.4856, lng: 103.9234, station: '溪谷保护站', battery_level: 90, photos_taken: 2103 },
        { id: 'cam_004', name: '溪谷下游2号', lat: 33.4789, lng: 103.9312, station: '溪谷保护站', battery_level: 65, photos_taken: 1567 },
        { id: 'cam_005', name: '森林东区1号', lat: 33.5234, lng: 103.9456, station: '森林保护站', battery_level: 78, photos_taken: 3421 },
        { id: 'cam_006', name: '森林西区2号', lat: 33.5312, lng: 103.9567, station: '森林保护站', battery_level: 88, photos_taken: 2789 },
        { id: 'cam_007', name: '草甸东区1号', lat: 33.5678, lng: 103.8678, station: '高山草甸保护站', battery_level: 95, photos_taken: 567 },
        { id: 'cam_008', name: '草甸西区2号', lat: 33.5734, lng: 103.8567, station: '高山草甸保护站', battery_level: 92, photos_taken: 432 }
      ]);
      setObservations([
        { id: 'obs_001', camera_id: 'cam_001', latin_name: 'Panthera pardus', chinese_name: '华北豹', category: '哺乳纲', protection_level: '国家一级保护', count: 3, timestamp: '2024-03-15T02:30:00', confidence: 0.98 },
        { id: 'obs_002', camera_id: 'cam_003', latin_name: 'Ailurus fulgens', chinese_name: '小熊猫', category: '哺乳纲', protection_level: '国家二级保护', count: 5, timestamp: '2024-03-12T14:20:00', confidence: 0.95 },
        { id: 'obs_003', camera_id: 'cam_005', latin_name: 'Rhinopithecus roxellana', chinese_name: '金丝猴', category: '哺乳纲', protection_level: '国家一级保护', count: 12, timestamp: '2024-03-18T10:15:00', confidence: 0.97 },
        { id: 'obs_004', camera_id: 'cam_002', latin_name: 'Lophophorus lhuysii', chinese_name: '绿尾虹雉', category: '鸟纲', protection_level: '国家一级保护', count: 2, timestamp: '2024-03-20T06:45:00', confidence: 0.93 },
        { id: 'obs_005', camera_id: 'cam_004', latin_name: 'Andrias davidianus', chinese_name: '大鲵', category: '两栖纲', protection_level: '国家一级保护', count: 1, timestamp: '2024-03-08T20:10:00', confidence: 0.89 }
      ]);
      setHeatmapData([
        { lat: 33.5123, lng: 103.8945, intensity: 45 },
        { lat: 33.5089, lng: 103.8992, intensity: 32 },
        { lat: 33.4856, lng: 103.9234, intensity: 78 },
        { lat: 33.4789, lng: 103.9312, intensity: 56 },
        { lat: 33.5234, lng: 103.9456, intensity: 92 },
        { lat: 33.5312, lng: 103.9567, intensity: 67 },
        { lat: 33.5678, lng: 103.8678, intensity: 23 },
        { lat: 33.5734, lng: 103.8567, intensity: 18 },
        { lat: 33.5150, lng: 103.9100, intensity: 55 },
        { lat: 33.5000, lng: 103.9200, intensity: 41 }
      ]);
      setStatistics({
        total_cameras: 8,
        total_photos: 13018,
        total_species: 5,
        total_observations: 5,
        protected_species_count: 4,
        station_statistics: {
          '主峰保护站': { camera_count: 2, observation_count: 2, species_count: 2, total_photos: 2139 },
          '溪谷保护站': { camera_count: 2, observation_count: 2, species_count: 2, total_photos: 3670 },
          '森林保护站': { camera_count: 2, observation_count: 1, species_count: 1, total_photos: 6210 },
          '高山草甸保护站': { camera_count: 2, observation_count: 0, species_count: 0, total_photos: 999 }
        }
      });
    }
  };

  const handleCameraClick = (camera) => {
    setSelectedCamera(camera);
  };

  const handleTaskStart = (taskId) => {
    setCurrentTask({ task_id: taskId, status: 'processing', progress: 0 });
  };

  const handleTaskUpdate = (taskData) => {
    setCurrentTask(taskData);
    if (taskData.status === 'completed') {
      fetchData();
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>国家公园生物多样性监测系统</h1>
        <div className="header-subtitle">巡护员生物多样性监测会议足迹纪要</div>
      </header>

      <nav className="tabs">
        <button 
          className={`tab ${activeTab === 'map' ? 'active' : ''}`} 
          onClick={() => setActiveTab('map')}
        >
          监测地图
        </button>
        <button 
          className={`tab ${activeTab === 'species' ? 'active' : ''}`} 
          onClick={() => setActiveTab('species')}
        >
          物种记录
        </button>
        <button 
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`} 
          onClick={() => setActiveTab('upload')}
        >
          音频处理
        </button>
        <button 
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`} 
          onClick={() => setActiveTab('stats')}
        >
          统计分析
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'map' && (
          <div className="map-container">
            <MapComponent 
              cameras={cameras}
              observations={observations}
              heatmapData={heatmapData}
              onCameraClick={handleCameraClick}
              selectedCamera={selectedCamera}
            />
            {selectedCamera && (
              <div className="camera-detail">
                <h3>{selectedCamera.name}</h3>
                <p><strong>所属保护站：</strong>{selectedCamera.station}</p>
                <p><strong>电量：</strong>{selectedCamera.battery_level}%</p>
                <p><strong>拍摄照片数：</strong>{selectedCamera.photos_taken}</p>
                <h4>该相机观测记录：</h4>
                <ul>
                  {observations
                    .filter(o => o.camera_id === selectedCamera.id)
                    .map(o => (
                      <li key={o.id}>
                        {o.chinese_name} ({o.latin_name}) - {o.count}只
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'species' && (
          <SpeciesList observations={observations} cameras={cameras} />
        )}

        {activeTab === 'upload' && (
          <div className="upload-section">
            <AudioUploader onUploadStart={handleTaskStart} />
            {currentTask && (
              <TaskStatus 
                taskId={currentTask.task_id} 
                onUpdate={handleTaskUpdate}
              />
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <StatisticsPanel statistics={statistics} />
        )}
      </main>

      <footer className="footer">
        <p>国家公园监测中心 © 2024</p>
      </footer>
    </div>
  );
}

export default App;
