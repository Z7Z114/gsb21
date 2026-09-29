from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

class CameraPoint(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    station: str
    status: str = "active"
    installed_date: datetime
    last_check: datetime
    battery_level: int
    photos_taken: int = 0

class SpeciesObservation(BaseModel):
    id: str
    camera_id: str
    latin_name: str
    chinese_name: str
    category: str
    protection_level: str
    count: int
    timestamp: datetime
    confidence: float
    image_url: Optional[str] = None

class StationReport(BaseModel):
    station_name: str
    transcription: str
    species_list: List[Dict]
    population_assessment: Dict
    threats: List[str]
    habitat_quality: str

class MeetingMinutes(BaseModel):
    id: str
    date: datetime
    title: str
    audio_path: str
    full_transcription: str
    station_reports: List[StationReport]
    summary_report: str
    species_observations: List[SpeciesObservation]
    camera_points: List[CameraPoint]
    heatmap_data: List[Dict]

class EmailConfig(BaseModel):
    smtp_server: str
    smtp_port: int
    username: str
    password: str
    recipient: str
    subject: str
    body: str
    attachments: List[str] = []

class ProcessingStatus(BaseModel):
    task_id: str
    status: str
    progress: int
    message: str
    result: Optional[Dict] = None
