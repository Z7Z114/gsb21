import React, { useState } from 'react';

const SpeciesList = ({ observations, cameras }) => {
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterProtection, setFilterProtection] = useState('all');

  const categories = ['all', '哺乳纲', '鸟纲', '两栖纲', '植物'];
  const protectionLevels = ['all', '国家一级保护', '国家二级保护', '无危'];

  const filteredObservations = observations.filter(obs => {
    if (filterCategory !== 'all' && obs.category !== filterCategory) return false;
    if (filterProtection !== 'all' && obs.protection_level !== filterProtection) return false;
    return true;
  });

  const getCameraName = (cameraId) => {
    const camera = cameras.find(c => c.id === cameraId);
    return camera ? camera.name : '未知';
  };

  const getProtectionBadgeClass = (level) => {
    if (level === '国家一级保护') return 'protected-badge';
    if (level === '国家二级保护') return 'protected-badge level2';
    return '';
  };

  return (
    <div className="species-list">
      <div className="filters">
        <label>
          分类筛选：
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? '全部' : cat}</option>
            ))}
          </select>
        </label>
        <label>
          保护级别：
          <select value={filterProtection} onChange={(e) => setFilterProtection(e.target.value)}>
            {protectionLevels.map(level => (
              <option key={level} value={level}>{level === 'all' ? '全部' : level}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="species-grid">
        {filteredObservations.map(obs => (
          <div key={obs.id} className="species-card">
            <div className="species-header">
              <h3>{obs.chinese_name}</h3>
              {obs.protection_level !== '无危' && (
                <span className={getProtectionBadgeClass(obs.protection_level)}>
                  {obs.protection_level}
                </span>
              )}
            </div>
            <p className="latin-name"><em>{obs.latin_name}</em></p>
            <div className="species-info">
              <p><strong>分类：</strong>{obs.category}</p>
              <p><strong>观测数量：</strong>{obs.count}只</p>
              <p><strong>观测相机：</strong>{getCameraName(obs.camera_id)}</p>
              <p><strong>观测时间：</strong>{new Date(obs.timestamp).toLocaleString('zh-CN')}</p>
              <p><strong>识别置信度：</strong>{(obs.confidence * 100).toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>

      {filteredObservations.length === 0 && (
        <div className="no-data">
          没有符合条件的观测记录
        </div>
      )}

      <style>{`
        .species-list {
          max-width: 1200px;
          margin: 0 auto;
        }
        .filters {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          background: white;
          padding: 1rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .filters label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .filters select {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .species-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }
        .species-card {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .species-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .species-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .species-header h3 {
          color: #1a5f3c;
          margin: 0;
        }
        .latin-name {
          color: #666;
          margin-bottom: 1rem;
          font-size: 0.95rem;
        }
        .species-info p {
          margin: 0.3rem 0;
          color: #555;
          font-size: 0.9rem;
        }
        .no-data {
          text-align: center;
          padding: 3rem;
          color: #999;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default SpeciesList;
