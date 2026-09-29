from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import os
import uuid
import aiofiles
from dotenv import load_dotenv

from audio_processor import AudioProcessor
from nlp_processor import NLPProcessor
from email_sender import EmailSender
from models import (
    CameraPoint, SpeciesObservation, StationReport,
    MeetingMinutes, ProcessingStatus
)

load_dotenv()

app = FastAPI(title="国家公园生物多样性监测系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

audio_processor = AudioProcessor()
nlp_processor = NLPProcessor()

email_sender = EmailSender(
    smtp_server=os.getenv("SMTP_SERVER", "smtp.example.com"),
    smtp_port=int(os.getenv("SMTP_PORT", 587)),
    username=os.getenv("SMTP_USER", ""),
    password=os.getenv("SMTP_PASSWORD", "")
)

# 上传落盘目录可用 NP_UPLOAD_DIR 覆盖（测试时指向临时目录）。
UPLOAD_DIR = os.getenv("NP_UPLOAD_DIR", "uploads")

processing_tasks: Dict[str, ProcessingStatus] = {}

camera_points_db: List[CameraPoint] = [
    CameraPoint(
        id="cam_001",
        name="主峰北坡1号",
        lat=33.5123,
        lng=103.8945,
        station="主峰保护站",
        installed_date=datetime(2024, 1, 15),
        last_check=datetime(2024, 3, 10),
        battery_level=85,
        photos_taken=1247
    ),
    CameraPoint(
        id="cam_002",
        name="主峰南坡2号",
        lat=33.5089,
        lng=103.8992,
        station="主峰保护站",
        installed_date=datetime(2024, 1, 20),
        last_check=datetime(2024, 3, 12),
        battery_level=72,
        photos_taken=892
    ),
    CameraPoint(
        id="cam_003",
        name="溪谷上游1号",
        lat=33.4856,
        lng=103.9234,
        station="溪谷保护站",
        installed_date=datetime(2024, 2, 1),
        last_check=datetime(2024, 3, 8),
        battery_level=90,
        photos_taken=2103
    ),
    CameraPoint(
        id="cam_004",
        name="溪谷下游2号",
        lat=33.4789,
        lng=103.9312,
        station="溪谷保护站",
        installed_date=datetime(2024, 2, 5),
        last_check=datetime(2024, 3, 15),
        battery_level=65,
        photos_taken=1567
    ),
    CameraPoint(
        id="cam_005",
        name="森林东区1号",
        lat=33.5234,
        lng=103.9456,
        station="森林保护站",
        installed_date=datetime(2024, 1, 25),
        last_check=datetime(2024, 3, 5),
        battery_level=78,
        photos_taken=3421
    ),
    CameraPoint(
        id="cam_006",
        name="森林西区2号",
        lat=33.5312,
        lng=103.9567,
        station="森林保护站",
        installed_date=datetime(2024, 2, 10),
        last_check=datetime(2024, 3, 18),
        battery_level=88,
        photos_taken=2789
    ),
    CameraPoint(
        id="cam_007",
        name="草甸东区1号",
        lat=33.5678,
        lng=103.8678,
        station="高山草甸保护站",
        installed_date=datetime(2024, 3, 1),
        last_check=datetime(2024, 3, 20),
        battery_level=95,
        photos_taken=567
    ),
    CameraPoint(
        id="cam_008",
        name="草甸西区2号",
        lat=33.5734,
        lng=103.8567,
        station="高山草甸保护站",
        installed_date=datetime(2024, 3, 5),
        last_check=datetime(2024, 3, 22),
        battery_level=92,
        photos_taken=432
    )
]

species_observations_db: List[SpeciesObservation] = [
    SpeciesObservation(
        id="obs_001",
        camera_id="cam_001",
        latin_name="Panthera pardus",
        chinese_name="华北豹",
        category="哺乳纲",
        protection_level="国家一级保护",
        count=3,
        timestamp=datetime(2024, 3, 15, 2, 30),
        confidence=0.98,
        image_url="/images/leopard_001.jpg"
    ),
    SpeciesObservation(
        id="obs_002",
        camera_id="cam_003",
        latin_name="Ailurus fulgens",
        chinese_name="小熊猫",
        category="哺乳纲",
        protection_level="国家二级保护",
        count=5,
        timestamp=datetime(2024, 3, 12, 14, 20),
        confidence=0.95,
        image_url="/images/red_panda_001.jpg"
    ),
    SpeciesObservation(
        id="obs_003",
        camera_id="cam_005",
        latin_name="Rhinopithecus roxellana",
        chinese_name="金丝猴",
        category="哺乳纲",
        protection_level="国家一级保护",
        count=12,
        timestamp=datetime(2024, 3, 18, 10, 15),
        confidence=0.97,
        image_url="/images/monkey_001.jpg"
    ),
    SpeciesObservation(
        id="obs_004",
        camera_id="cam_002",
        latin_name="Lophophorus lhuysii",
        chinese_name="绿尾虹雉",
        category="鸟纲",
        protection_level="国家一级保护",
        count=2,
        timestamp=datetime(2024, 3, 20, 6, 45),
        confidence=0.93,
        image_url="/images/monal_001.jpg"
    ),
    SpeciesObservation(
        id="obs_005",
        camera_id="cam_004",
        latin_name="Andrias davidianus",
        chinese_name="大鲵",
        category="两栖纲",
        protection_level="国家一级保护",
        count=1,
        timestamp=datetime(2024, 3, 8, 20, 10),
        confidence=0.89,
        image_url="/images/salamander_001.jpg"
    )
]

heatmap_data = [
    {"lat": 33.5123, "lng": 103.8945, "intensity": 45},
    {"lat": 33.5089, "lng": 103.8992, "intensity": 32},
    {"lat": 33.4856, "lng": 103.9234, "intensity": 78},
    {"lat": 33.4789, "lng": 103.9312, "intensity": 56},
    {"lat": 33.5234, "lng": 103.9456, "intensity": 92},
    {"lat": 33.5312, "lng": 103.9567, "intensity": 67},
    {"lat": 33.5678, "lng": 103.8678, "intensity": 23},
    {"lat": 33.5734, "lng": 103.8567, "intensity": 18},
    {"lat": 33.5150, "lng": 103.9100, "intensity": 55},
    {"lat": 33.5000, "lng": 103.9200, "intensity": 41}
]

@app.get("/")
async def root():
    return {"message": "国家公园生物多样性监测系统 API"}

@app.get("/api/cameras")
async def get_cameras() -> List[CameraPoint]:
    return camera_points_db

@app.get("/api/cameras/{camera_id}")
async def get_camera(camera_id: str) -> CameraPoint:
    for cam in camera_points_db:
        if cam.id == camera_id:
            return cam
    raise HTTPException(status_code=404, detail="Camera not found")

@app.get("/api/observations")
async def get_observations(camera_id: Optional[str] = None, 
                        category: Optional[str] = None,
                        start_date: Optional[datetime] = None,
                        end_date: Optional[datetime] = None) -> List[SpeciesObservation]:
    results = species_observations_db
    
    if camera_id:
        results = [o for o in results if o.camera_id == camera_id]
    if category:
        results = [o for o in results if o.category == category]
    if start_date:
        results = [o for o in results if o.timestamp >= start_date]
    if end_date:
        results = [o for o in results if o.timestamp <= end_date]
    
    return results

@app.get("/api/heatmap")
async def get_heatmap() -> List[Dict]:
    return heatmap_data

@app.post("/api/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    task_id = str(uuid.uuid4())
    
    processing_tasks[task_id] = ProcessingStatus(
        task_id=task_id,
        status="processing",
        progress=0,
        message="开始处理音频文件..."
    )
    
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = f"{UPLOAD_DIR}/{task_id}_{file.filename}"
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    processing_tasks[task_id].progress = 10
    processing_tasks[task_id].message = "音频降噪处理中..."
    
    return {"task_id": task_id, "status": "started"}

@app.post("/api/process/{task_id}")
async def process_audio(task_id: str):
    if task_id not in processing_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    status = processing_tasks[task_id]
    status.status = "processing"
    status.progress = 30
    status.message = "正在进行音频降噪处理..."
    
    import glob
    audio_files = glob.glob(f"{UPLOAD_DIR}/{task_id}_*")
    if not audio_files:
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    audio_path = audio_files[0]
    
    status.progress = 50
    status.message = "正在进行语音转写..."
    
    audio_result = audio_processor.process_audio(audio_path)
    
    status.progress = 70
    status.message = "正在进行NLP分析..."
    
    station_reports = []
    for station, transcript in audio_result["station_transcripts"].items():
        species_list = nlp_processor.extract_latin_names(transcript)
        assessment = nlp_processor.extract_population_assessment(transcript)
        
        station_reports.append(StationReport(
            station_name=station,
            transcription=transcript,
            species_list=species_list,
            population_assessment=assessment,
            threats=assessment["threats"],
            habitat_quality=assessment["habitat_quality"]
        ))
    
    status.progress = 85
    status.message = "正在生成摘要报告..."
    
    summary = nlp_processor.generate_summary(audio_result["station_transcripts"])
    
    status.progress = 95
    status.message = "正在整理会议纪要..."
    
    meeting_minutes = MeetingMinutes(
        id=task_id,
        date=datetime.now(),
        title="国家公园巡护员生物多样性监测会议纪要",
        audio_path=audio_path,
        full_transcription=audio_result["full_transcription"],
        station_reports=station_reports,
        summary_report=summary,
        species_observations=species_observations_db,
        camera_points=camera_points_db,
        heatmap_data=heatmap_data
    )
    
    status.progress = 100
    status.status = "completed"
    status.message = "处理完成"
    status.result = meeting_minutes.model_dump()
    
    return {"status": "completed", "result": meeting_minutes.model_dump()}

@app.get("/api/tasks/{task_id}")
async def get_task_status(task_id: str) -> ProcessingStatus:
    if task_id not in processing_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return processing_tasks[task_id]

@app.post("/api/send-report/{task_id}")
async def send_report(task_id: str):
    if task_id not in processing_tasks or processing_tasks[task_id].status != "completed":
        raise HTTPException(status_code=400, detail="Processing not completed")
    
    result = processing_tasks[task_id].result
    if not result:
        raise HTTPException(status_code=400, detail="No result available")
    
    admin_email = os.getenv("ADMIN_EMAIL", "admin@park.gov.cn")
    
    now = datetime.now()
    quarter = (now.month - 1) // 3 + 1
    
    success = email_sender.send_quarterly_report(
        to_email=admin_email,
        report_content=result["summary_report"],
        quarter=str(quarter),
        year=now.year
    )
    
    if success:
        return {"status": "success", "message": f"报告已发送至 {admin_email}"}
    else:
        raise HTTPException(status_code=500, detail="发送邮件失败")

@app.get("/api/statistics")
async def get_statistics():
    total_photos = sum(cam.photos_taken for cam in camera_points_db)
    total_species = len(set(obs.latin_name for obs in species_observations_db))
    total_observations = len(species_observations_db)
    protected_species = len([o for o in species_observations_db if o.protection_level == "国家一级保护"])
    
    station_stats = {}
    for station in ["主峰保护站", "溪谷保护站", "森林保护站", "高山草甸保护站"]:
        station_cams = [c for c in camera_points_db if c.station == station]
        station_obs = [o for o in species_observations_db if 
                      any(c.id == o.camera_id for c in station_cams)]
        
        station_stats[station] = {
            "camera_count": len(station_cams),
            "observation_count": len(station_obs),
            "species_count": len(set(o.latin_name for o in station_obs)),
            "total_photos": sum(c.photos_taken for c in station_cams)
        }
    
    return {
        "total_cameras": len(camera_points_db),
        "total_photos": total_photos,
        "total_species": total_species,
        "total_observations": total_observations,
        "protected_species_count": protected_species,
        "station_statistics": station_stats,
        "last_update": datetime.now()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
