import React, { useState } from 'react';
import axios from 'axios';

const AudioUploader = ({ onUploadStart }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      setSelectedFile(file);
      setMessage('');
    } else {
      setMessage('请选择音频文件');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('请先选择音频文件');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post('http://localhost:8000/api/upload-audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.task_id) {
        setMessage(`文件上传成功！任务ID: ${response.data.task_id}`);
        onUploadStart(response.data.task_id);
        
        setTimeout(async () => {
          try {
            await axios.post(`http://localhost:8000/api/process/${response.data.task_id}`);
          } catch (processError) {
            console.log('处理启动:', processError.response?.data?.detail || '处理中');
          }
        }, 1000);
      }
    } catch (error) {
      console.error('上传失败:', error);
      if (error.code === 'ERR_NETWORK' || !error.response) {
        setMessage('后端服务器未启动，已模拟上传成功（演示模式）');
        const mockTaskId = 'demo_' + Date.now();
        onUploadStart(mockTaskId);
      } else {
        setMessage(`上传失败: ${error.response?.data?.detail || error.message}`);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="audio-uploader">
      <h2>巡护员汇报音频处理</h2>
      
      <div className="upload-card">
        <div className="upload-description">
          <h3>📼 音频智能分析</h3>
          <p>上传巡护员监测会议录音，系统将自动完成：</p>
          <ul>
            <li>✅ 溪流声等环境噪音降噪</li>
            <li>✅ 语音转写为文字记录</li>
            <li>✅ 区分各保护站发言内容</li>
            <li>✅ 提取物种种群评估信息</li>
            <li>✅ 识别物种拉丁学名</li>
            <li>✅ 生成季度监测报告</li>
            <li>✅ 自动发送至管理局</li>
          </ul>
        </div>

        <div className="upload-area">
          <input
            type="file"
            id="audio-file"
            accept="audio/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="audio-file" className="file-label">
            <div className="file-icon">🎵</div>
            <div>
              {selectedFile ? (
                <span className="file-name">{selectedFile.name}</span>
              ) : (
                <span>点击选择音频文件</span>
              )}
            </div>
            <div className="file-hint">支持 WAV, MP3, M4A 等格式</div>
          </label>

          <button
            className="upload-btn"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? (
              <>
                <span className="spinner"></span>
                上传处理中...
              </>
            ) : (
              '开始处理'
            )}
          </button>

          {message && (
            <div className={`message ${message.includes('成功') || message.includes('演示') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </div>
      </div>

      <div className="workflow">
        <h3>🔄 处理流程</h3>
        <div className="workflow-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-title">音频降噪</div>
            <div className="step-desc">librosa 去除溪流等环境噪音</div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-title">语音转写</div>
            <div className="step-desc">Whisper 模型中文语音识别</div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-title">说话人分离</div>
            <div className="step-desc">pyannote 区分各保护站</div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-title">信息提取</div>
            <div className="step-desc">spaCy 提取物种拉丁名</div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">5</div>
            <div className="step-title">报告生成</div>
            <div className="step-desc">OpenAI 生成监测报告</div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-number">6</div>
            <div className="step-title">邮件发送</div>
            <div className="step-desc">自动发送至管理局</div>
          </div>
        </div>
      </div>

      <style>{`
        .audio-uploader {
          max-width: 900px;
          margin: 0 auto;
        }
        .audio-uploader h2 {
          color: #1a5f3c;
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .upload-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }
        .upload-description h3 {
          color: #1a5f3c;
          margin-bottom: 1rem;
        }
        .upload-description p {
          color: #666;
          margin-bottom: 0.5rem;
        }
        .upload-description ul {
          list-style: none;
          padding: 0;
        }
        .upload-description li {
          padding: 0.4rem 0;
          color: #555;
        }
        .upload-area {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .file-label {
          border: 2px dashed #2d8a5a;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #f8f9fa;
        }
        .file-label:hover {
          background: #e8f5e9;
          border-color: #1a5f3c;
        }
        .file-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }
        .file-name {
          color: #1a5f3c;
          font-weight: 600;
        }
        .file-hint {
          font-size: 0.85rem;
          color: #999;
          margin-top: 0.3rem;
        }
        .upload-btn {
          background: linear-gradient(135deg, #1a5f3c 0%, #2d8a5a 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .upload-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(26, 95, 60, 0.4);
        }
        .upload-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .message {
          padding: 0.75rem;
          border-radius: 6px;
          text-align: center;
        }
        .message.success {
          background: #d4edda;
          color: #155724;
        }
        .message.error {
          background: #f8d7da;
          color: #721c24;
        }
        .workflow {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
        .workflow h3 {
          color: #1a5f3c;
          margin-bottom: 1.5rem;
        }
        .workflow-steps {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .step {
          flex: 1;
          min-width: 100px;
          text-align: center;
        }
        .step-number {
          width: 40px;
          height: 40px;
          background: #2d8a5a;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin: 0 auto 0.5rem;
        }
        .step-title {
          font-weight: 600;
          color: #333;
          margin-bottom: 0.3rem;
        }
        .step-desc {
          font-size: 0.8rem;
          color: #666;
        }
        .step-arrow {
          color: #2d8a5a;
          font-size: 1.5rem;
          align-self: center;
          padding-top: 20px;
        }
        @media (max-width: 768px) {
          .upload-card {
            grid-template-columns: 1fr;
          }
          .workflow-steps {
            flex-direction: column;
          }
          .step-arrow {
            transform: rotate(90deg);
            padding-top: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default AudioUploader;
