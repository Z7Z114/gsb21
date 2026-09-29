# 国家公园生物多样性监测会议纪要系统

国家公园巡护员生物多样性监测会议足迹纪要全栈系统。前端展示红外相机点位、动物出现热图、
物种记录与统计分析；后端处理巡护员汇报录音（librosa 降低溪流声 → Whisper 转写 →
pyannote 区分各保护站 → 抽取物种拉丁名与种群评估 → 生成季度监测报告），并把季度报告
通过邮件发给管理局。

## 系统架构

```
┌──────────────────────────────────────────────────────────┐
│                      前端 (React)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐   │
│  │ 监测地图 │ │ 物种记录 │ │ 音频处理 │ │ 统计分析   │   │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘   │
└────────────────────────────┬─────────────────────────────┘
                             │ REST API
┌────────────────────────────▼─────────────────────────────┐
│                    后端 (FastAPI)                        │
│  ┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐ ┌────────┐ │
│  │ librosa│ │Whisper │ │pyannote │ │ 物种   │ │ OpenAI │ │
│  │ 降噪   │ │ 转写   │ │说话人   │ │ 抽取   │ │ 摘要   │ │
│  └────────┘ └────────┘ └─────────┘ └────────┘ └────────┘ │
│  ┌────────────────────┐  ┌─────────────────────────────┐ │
│  │ 红外相机 / 观测数据│  │ 邮件发送（季度报告）        │ │
│  └────────────────────┘  └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## 主要功能

### 后端模块
1. **音频降噪** - librosa 降低溪流等环境噪声
2. **语音转写** - Whisper 中文语音识别
3. **说话人分离** - pyannote 区分各保护站发言
4. **物种抽取** - 从汇报文本中抽取物种、拉丁名、保护级别与种群数量评估
5. **报告生成** - 汇总各保护站汇报，生成季度监测报告
6. **邮件发送** - 把季度报告发给管理局（SMTP）

### 前端模块
1. **监测地图** - 红外相机点位 + 动物出现热图
2. **物种记录** - 物种卡片与分类/保护级别筛选
3. **音频处理** - 上传巡护员汇报录音并查看处理进度与结果
4. **统计分析** - 各保护站对比、保护级别分布、照片拍摄量

## 快速开始

### 后端启动

```bash
cd backend
pip install -r requirements.txt          # 轻量依赖
python main.py                           # http://localhost:8000
```

### 前端启动

```bash
cd frontend
npm install
npm start                                # http://localhost:3000
```

### 测试

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest -q
```

## 环境变量

配置 `.env` 文件（见 `.env.example`）：

```
OPENAI_API_KEY=            # 留空则报告摘要走离线分支
HF_TOKEN=                  # pyannote 模型令牌
SMTP_SERVER=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
ADMIN_EMAIL=admin@park.gov.cn
NP_UPLOAD_DIR=             # 可选，覆盖上传落盘目录
NP_ENABLE_MODELS=0         # 置 1 才真正加载 Whisper / pyannote / spaCy 模型
```

### 离线运行说明

`backend/requirements.txt` 只包含轻量依赖。librosa、soundfile、numpy、Whisper、pyannote、
spaCy、OpenAI SDK 属**可选**重型依赖（见 `requirements-ml.txt`）。未安装这些依赖、或未打开
`NP_ENABLE_MODELS`、或未配置 `OPENAI_API_KEY` 时，降噪 / 转写 / 说话人分离 / 摘要都会走
**确定性离线分支**，因此后端与 `pytest` 能在无网络、无 GPU、不调用任何外部 API 的环境下跑通。
请保持这条离线分支可用。离线分支下：

- 降噪产物是一个带 `NP-OFFLINE-DENOISED-V1` 标记的确定性文件；
- 全文转写使用固定文本 `audio_processor.OFFLINE_TRANSCRIPT`；
- 说话人分离按 `_offline_speaker_segments` 的固定时间轴给出 `SPEAKER_00` / `SPEAKER_01` 两段；
- 中文物种名抽取退化为基于已知物种表 `nlp_processor.CHINESE_NAME_MAP` 的规则匹配
  （替代 spaCy 实体识别），它同样属于被验收的实现范围；
- 报告摘要由模板生成（`NLPProcessor._offline_summary`）。

## API 一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/` | 服务状态 |
| GET | `/api/cameras` | 红外相机点位列表 |
| GET | `/api/cameras/{camera_id}` | 单个相机点位 |
| GET | `/api/observations` | 物种观测记录（`camera_id`、`category`、`start_date`、`end_date`） |
| GET | `/api/heatmap` | 动物出现热图数据 |
| GET | `/api/statistics` | 监测统计 |
| POST | `/api/upload-audio` | 上传汇报音频（multipart，字段 `file`） |
| POST | `/api/process/{task_id}` | 处理已上传的音频 |
| GET | `/api/tasks/{task_id}` | 任务状态与结果 |
| POST | `/api/send-report/{task_id}` | 把季度报告发送给管理局 |

## 行为规格（验收标准）

本节是本次修复的唯一验收依据，逐条以本节为准。

### A. 上传接口的输入校验与错误语义

1. `POST /api/upload-audio` 只接受扩展名属于白名单 `wav`、`mp3`、`m4a`、`flac`、`aac`
   （大小写不敏感）的音频文件。扩展名不在白名单时（含无扩展名、`.txt`、`.exe` 等）必须返回
   `400` 并带 JSON 错误体；白名单内返回 `200`，响应体包含非空 `task_id` 与 `status`。
2. 请求里没有 `file` 字段时必须返回 `400` 并带 JSON 错误体，不能是 FastAPI 默认的 `422`。
3. 落盘文件名不得受客户端文件名里的目录成分影响：`sub/dir/rec.wav`、`..\..\rec.wav`、
   `../rec.wav` 这类文件名必须被安全化为纯文件名。这类请求既不能返回 `500`，也不能把文件
   写到上传目录以外的地方。

### B. 音频处理任务的生命周期

4. 处理过程中抛出异常时，任务不得永远停留在 `processing`：`POST /api/process/{task_id}`
   不得返回 `5xx`；此后 `GET /api/tasks/{task_id}` 必须报告 `status="failed"`、`message`
   非空，且 `result` 为空。成功路径仍须报告 `status="completed"`、`progress=100` 与非空 `result`。

### C. 降噪产物的落盘路径

5. 降噪产物必须写到由输入路径派生的**独立文件**，文件名规则为
   `<原文件名去掉扩展名>_denoised<原扩展名>`（例如 `note.mp3` → `note_denoised.mp3`、
   `note.wav` → `note_denoised.wav`）。降噪输出路径绝不能等于输入路径，也绝不能覆盖
   原始上传文件；`.wav` 以外的格式（`.mp3` / `.m4a` / `.flac`）同样必须成立。

### D. 物种抽取的完整性与一致性

6. 文本里出现的中文物种名，只要在已知物种表（`nlp_processor.CHINESE_NAME_MAP` 与
   `NLPProcessor.species_keywords`）内，就必须被 `extract_latin_names` 抽出来，不得漏检
   （例如「华北豹」「金丝猴」「大鲵」「绿尾虹雉」都必须能抽出）。
7. `extract_latin_names` 的返回结果必须按拉丁名去重（同一次调用内同一物种只出现一次）；
   每条记录的 `latin_name`、`chinese_name`、`category`、`protection_level` 必须与已知物种表
   一致——不得出现重复条目、空拉丁名，也不得对已知物种返回 `"未知"` 保护级别。
   `extract_population_assessment` 返回的 `species_list` 与 `species_count` 也必须按去重后的
   结果给出（`species_count == len(species_list)`）。

### E. 统计聚合口径

8. `GET /api/statistics` 里的 `protected_species_count` 必须是**国家一级保护物种**的去重计数
   （按 `latin_name` 去重），口径与 `total_species` 一致：同一物种的多条一级保护观测只能计一次。
   `total_species`、各保护站的 `observation_count` 与 `species_count` 的口径不得因此改变。

### F. 季度报告邮件

9. 报告邮件的附件头必须合法：附件的 `Content-Disposition` 必须是规范的
   `attachment; filename="<文件名>"` 形式（`filename` 参数值首字符就是文件名本身，不得带多余空白），
   解析出的附件文件名必须等于被附加文件的文件名。
10. 发送季度报告不得在工作目录留下临时文件：`send_quarterly_report` 生成的报告文件必须放在
    系统临时目录，并在发送结束后清理（无论发送成功还是失败）；调用结束后工作目录不得出现
    `report_<year>_Q<quarter>.txt`。

### G. 不得回归

11. 现有 `backend/tests/test_smoke.py` 必须继续全绿；不得通过删除或放宽断言来让测试通过。

## 已知问题（现象举例，不完整）

- 上传 `.txt`、`.exe` 这类文件后端都当成功接收；文件名里带目录（如 `sub/dir/rec.wav`）
  时接口直接 500。
- 上传请求里不带 `file` 字段时返回的是 422 而不是 400。
- 提高清录音处理到一半出错，任务就一直卡在「处理中」，页面上一直转圈。
- 上传 mp3 汇报录音后，原始录音文件被降噪结果覆盖，磁盘上找不到 `*_denoised.mp3`。
- 汇报里明明说了「金丝猴 12 只」，物种记录里却找不到金丝猴。
- 同一段汇报里，同一个物种会重复出现两条，其中一条的保护级别还是「未知」。
- 统计页面「国家一级保护物种」的数字比实际物种数偏大。
- 管理局收到的季度报告邮件，附件的文件名前面多了一个空格。
- 每发一次季度报告，项目目录里就多出一个 `report_2026_Q3.txt`。

## 技术栈

- 后端：FastAPI、Pydantic v2、python-multipart、aiofiles
- 前端：React 18、Leaflet、Chart.js、Axios
- 可选重型依赖：librosa / soundfile / openai-whisper / pyannote.audio / spacy / openai SDK
- 测试：pytest（`backend/tests`）

## 许可证

MIT License
