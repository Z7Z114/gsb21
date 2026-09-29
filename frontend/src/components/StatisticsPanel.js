import React from 'react';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const StatisticsPanel = ({ statistics }) => {
  if (!statistics) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
        加载统计数据中...
      </div>
    );
  }

  const stationChartData = {
    labels: Object.keys(statistics.station_statistics || {}),
    datasets: [
      {
        label: '观测记录数',
        data: Object.values(statistics.station_statistics || {}).map(s => s.observation_count),
        backgroundColor: 'rgba(45, 138, 90, 0.7)',
        borderColor: 'rgba(26, 95, 60, 1)',
        borderWidth: 1
      },
      {
        label: '物种数',
        data: Object.values(statistics.station_statistics || {}).map(s => s.species_count),
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
        borderColor: 'rgba(41, 128, 185, 1)',
        borderWidth: 1
      }
    ]
  };

  const categoryChartData = {
    labels: ['国家一级保护', '国家二级保护', '无危'],
    datasets: [
      {
        data: [
          statistics.protected_species_count || 0,
          Math.max(0, (statistics.total_species || 0) - (statistics.protected_species_count || 0)),
          0
        ],
        backgroundColor: [
          'rgba(231, 76, 60, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(149, 165, 166, 0.8)'
        ],
        borderColor: [
          'rgba(192, 57, 43, 1)',
          'rgba(243, 156, 18, 1)',
          'rgba(127, 140, 141, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const photoChartData = {
    labels: Object.keys(statistics.station_statistics || {}),
    datasets: [
      {
        label: '拍摄照片数',
        data: Object.values(statistics.station_statistics || {}).map(s => s.total_photos),
        backgroundColor: [
          'rgba(26, 95, 60, 0.7)',
          'rgba(45, 138, 90, 0.7)',
          'rgba(70, 180, 120, 0.7)',
          'rgba(100, 200, 150, 0.7)'
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  return (
    <div className="statistics-panel">
      <h2>监测统计分析</h2>
      
      <div className="stats-overview">
        <div className="stat-card">
          <h3>{statistics.total_cameras || 0}</h3>
          <p>红外相机点位</p>
        </div>
        <div className="stat-card">
          <h3>{statistics.total_photos?.toLocaleString() || 0}</h3>
          <p>拍摄照片总数</p>
        </div>
        <div className="stat-card">
          <h3>{statistics.total_species || 0}</h3>
          <p>记录物种数</p>
        </div>
        <div className="stat-card">
          <h3>{statistics.protected_species_count || 0}</h3>
          <p>国家一级保护物种</p>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>各保护站监测对比</h3>
          <div style={{ height: '300px' }}>
            <Bar data={stationChartData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <h3>物种保护级别分布</h3>
          <div style={{ height: '300px' }}>
            <Doughnut data={categoryChartData} options={pieOptions} />
          </div>
        </div>

        <div className="chart-card full-width">
          <h3>各保护站照片拍摄量</h3>
          <div style={{ height: '300px' }}>
            <Pie data={photoChartData} options={pieOptions} />
          </div>
        </div>
      </div>

      <div className="stations-detail">
        <h3>各保护站详细数据</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>保护站</th>
              <th>相机数量</th>
              <th>观测记录数</th>
              <th>物种数</th>
              <th>照片总数</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(statistics.station_statistics || {}).map(([station, data]) => (
              <tr key={station}>
                <td><strong>{station}</strong></td>
                <td>{data.camera_count}</td>
                <td>{data.observation_count}</td>
                <td>{data.species_count}</td>
                <td>{data.total_photos.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .statistics-panel {
          max-width: 1400px;
          margin: 0 auto;
        }
        .statistics-panel h2 {
          color: #1a5f3c;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: linear-gradient(135deg, #1a5f3c 0%, #2d8a5a 100%);
          color: white;
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          box-shadow: 0 4px 12px rgba(26, 95, 60, 0.3);
        }
        .stat-card h3 {
          font-size: 2.5rem;
          margin-bottom: 0.3rem;
        }
        .stat-card p {
          opacity: 0.9;
          margin: 0;
        }
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .chart-card {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .chart-card.full-width {
          grid-column: 1 / -1;
        }
        .chart-card h3 {
          color: #1a5f3c;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }
        .stations-detail {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .stations-detail h3 {
          color: #1a5f3c;
          margin-bottom: 1rem;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        .data-table th, .data-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }
        .data-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #333;
        }
        .data-table tr:hover {
          background: #f5f5f5;
        }
      `}</style>
    </div>
  );
};

export default StatisticsPanel;
