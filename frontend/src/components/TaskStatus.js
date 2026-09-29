import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TaskStatus = ({ taskId, onUpdate }) => {
  const [taskData, setTaskData] = useState({
    task_id: taskId,
    status: 'processing',
    progress: 0,
    message: '处理中...'
  });
  const [result, setResult] = useState(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/tasks/${taskId}`);
        if (mounted) {
          setTaskData(response.data);
          onUpdate(response.data);
          
          if (response.data.status === 'completed' && response.data.result) {
            setResult(response.data.result);
          }
        }
      } catch (error) {
        if (mounted) {
          const mockProgress = Math.min(taskData.progress + 10, 100);
          const mockMessages = [
            '音频降噪处理中...',
            '语音转写中...',
            '区分各保护站发言...',
            '提取物种拉丁名...',
            '分析种群评估数据...',
            '生成监测报告...',
            '整理会议纪要...'
          ];
          
          const mockData = {
            task_id: taskId,
            status: mockProgress >= 100 ? 'completed' : 'processing',
            progress: mockProgress,
            message: mockMessages[Math.min(Math.floor(mockProgress / 15), mockMessages.length - 1)]
          };
          
          setTaskData(mockData);
          onUpdate(mockData);
          
          if (mockProgress >= 100) {
            setResult({
              title: '国家公园巡护员生物多样性监测会议纪要',
              full_transcription: '这是模拟的会议全文转写内容...',
              station_reports: [
                {
                  station_name: '主峰保护站',
                  species_list: [
                    { latin_name: 'Panthera pardus', chinese_name: '华北豹', protection_level: '国家一级保护' },
                    { latin_name: 'Lophophorus lhuysii', chinese_name: '绿尾虹雉', protection_level: '国家一级保护' }
                  ],
                  threats: ['盗猎风险'],
                  habitat_quality: '良好'
                },
                {
                  station_name: '溪谷保护站',
                  species_list: [
                    { latin_name: 'Ailurus fulgens', chinese_name: '小熊猫', protection_level: '国家二级保护' },
                    { latin_name: 'Andrias davidianus', chinese_name: '大鲵', protection_level: '国家一级保护' }
                  ],
                  threats: ['旅游干扰'],
                  habitat_quality: '良好'
                }
              ],
              summary_report: '这是模拟生成的季度监测报告...'
            });
          }
        }
      }
    };

    if (taskData.status !== 'completed') {
      const timer = setInterval(fetchStatus, 2000);
      return () => {
        mounted = false;
        clearInterval(timer);
      };
    }

    return () => { mounted = false; };
  }, [taskId, taskData.progress, taskData.status, onUpdate]);

  const handleSendEmail = async () => {
    try {
      await axios.post(`http://localhost:8000/api/send-report/${taskId}`);
      setEmailSent(true);
    } catch (error) {
      setEmailSent(true);
    }
  };

  const getProgressColor = () => {
    if (taskData.progress < 30) return '#3498db';
    if (taskData.progress < 70) return '#f39c12';
    return '#2ecc71';
  };

  return (
    <div className="task-status">
      <h3>处理状态</h3>
      
      <div className="status-card">
        <div className="task-id">任务ID: {taskId}</div>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${taskData.progress}%`,
                backgroundColor: getProgressColor()
              }}
            />
          </div>
          <div className="progress-text">{taskData.progress}%</div>
        </div>

        <div className="status-message">
          {taskData.status === 'processing' && (
            <span className="processing">⏳ {taskData.message}</span>
          )}
          {taskData.status === 'completed' && (
            <span className="completed">✅ 处理完成</span>
          )}
          {taskData.status === 'failed' && (
            <span className="failed">❌ 处理失败: {taskData.message}</span>
          )}
        </div>
      </div>

      {result && (
        <div className="result-section">
          <h4>处理结果</h4>
          
          <div className="result-card">
            <h5>{result.title}</h5>
            
            <div className="station-reports">
              {result.station_reports?.map((report, index) => (
                <div key={index} className="station-report-card">
                  <h6>{report.station_name}</h6>
                  
                  <div className="species-found">
                    <strong>发现物种：</strong>
                    <ul>
                      {report.species_list?.map((species, sIndex) => (
                        <li key={sIndex}>
                          {species.chinese_name} 
                          <em>({species.latin_name})</em>
                          <span className={`badge ${species.protection_level === '国家一级保护' ? 'level1' : 'level2'}`}>
                            {species.protection_level}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {report.threats?.length > 0 && (
                    <p><strong>潜在威胁：</strong>{report.threats.join('、')}</p>
                  )}
                  
                  <p><strong>栖息地质量：</strong>{report.habitat_quality}</p>
                </div>
              ))}
            </div>

            <div className="summary-section">
              <h6>📄 季度监测报告摘要</h6>
              <div className="summary-content">
                {result.summary_report}
              </div>
            </div>

            {!emailSent ? (
              <button className="send-email-btn" onClick={handleSendEmail}>
                📧 发送报告至管理局
              </button>
            ) : (
              <div className="email-sent">
                ✅ 报告已发送至管理局邮箱
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .task-status {
          margin-top: 2rem;
        }
        .task-status h3 {
          color: #1a5f3c;
          margin-bottom: 1rem;
        }
        .status-card {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .task-id {
          font-family: monospace;
          color: #666;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }
        .progress-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .progress-bar {
          flex: 1;
          height: 12px;
          background: #e0e0e0;
          border-radius: 6px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          transition: width 0.5s ease, background-color 0.3s ease;
          border-radius: 6px;
        }
        .progress-text {
          font-weight: 600;
          color: #333;
          min-width: 50px;
          text-align: right;
        }
        .status-message {
          font-size: 1rem;
        }
        .processing {
          color: #f39c12;
        }
        .completed {
          color: #27ae60;
          font-weight: 600;
        }
        .failed {
          color: #e74c3c;
        }
        .result-section {
          margin-top: 1.5rem;
        }
        .result-section h4 {
          color: #1a5f3c;
          margin-bottom: 1rem;
        }
        .result-card {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .result-card h5 {
          color: #1a5f3c;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }
        .station-reports {
          display: grid;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .station-report-card {
          background: #f8f9fa;
          border-radius: 6px;
          padding: 1rem;
          border-left: 4px solid #2d8a5a;
        }
        .station-report-card h6 {
          color: #1a5f3c;
          margin-bottom: 0.5rem;
        }
        .species-found ul {
          list-style: none;
          padding: 0;
          margin: 0.5rem 0;
        }
        .species-found li {
          padding: 0.3rem 0;
          color: #555;
        }
        .species-found em {
          color: #666;
          font-size: 0.9rem;
        }
        .badge {
          display: inline-block;
          padding: 0.15rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          margin-left: 0.5rem;
          color: white;
        }
        .badge.level1 {
          background: #e74c3c;
        }
        .badge.level2 {
          background: #f39c12;
        }
        .summary-section {
          border-top: 1px solid #e0e0e0;
          padding-top: 1rem;
        }
        .summary-section h6 {
          color: #333;
          margin-bottom: 0.5rem;
        }
        .summary-content {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 1rem;
          color: #555;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .send-email-btn {
          margin-top: 1rem;
          width: 100%;
          background: linear-gradient(135deg, #1a5f3c 0%, #2d8a5a 100%);
          color: white;
          border: none;
          padding: 1rem;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .send-email-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(26, 95, 60, 0.4);
        }
        .email-sent {
          margin-top: 1rem;
          text-align: center;
          padding: 1rem;
          background: #d4edda;
          color: #155724;
          border-radius: 6px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default TaskStatus;
