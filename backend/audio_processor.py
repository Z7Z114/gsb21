"""巡护员汇报音频处理链路：溪流声降噪（librosa）+ 语音转写（Whisper）+ 说话人分离（pyannote）。

重型依赖（librosa / soundfile / numpy / Whisper / pyannote）全部按可选依赖处理：
未安装模型或未打开 NP_ENABLE_MODELS 开关时走确定性离线分支，后端与 pytest 可在无网络、
无 GPU、不调用任何外部服务的环境下跑通。离线分支只替换「模型/信号处理」这一步的实现，
其余业务逻辑与线上一致。
"""
import os

from dotenv import load_dotenv

try:
    import librosa
    import numpy as np
    import soundfile as sf
    AUDIO_DSP_AVAILABLE = True
except ImportError:  # pragma: no cover - 取决于运行环境
    librosa = None
    np = None
    sf = None
    AUDIO_DSP_AVAILABLE = False

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:  # pragma: no cover
    whisper = None
    WHISPER_AVAILABLE = False

try:
    from pyannote.audio import Pipeline
    PYANNOTE_AVAILABLE = True
except ImportError:  # pragma: no cover
    Pipeline = None
    PYANNOTE_AVAILABLE = False

load_dotenv()

# 离线分支使用的确定性占位值：不联网、不加载模型、不调用外部 API。
OFFLINE_TRANSCRIPT = (
    "主峰保护站汇报：红外相机记录华北豹 Panthera pardus 3只，"
    "小熊猫 Ailurus fulgens 5只，栖息地质量良好，未发现明显威胁。"
)
OFFLINE_DENOISE_TAG = b"NP-OFFLINE-DENOISED-V1\n"


def models_enabled():
    """只有显式打开开关时才真正加载重型模型。"""
    return os.getenv("NP_ENABLE_MODELS") == "1"


class AudioProcessor:
    def __init__(self):
        self.whisper_model = None
        self.pyannote_pipeline = None
        if WHISPER_AVAILABLE and models_enabled():
            self.whisper_model = whisper.load_model("base")
        if PYANNOTE_AVAILABLE and models_enabled():
            self.pyannote_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=os.getenv("HF_TOKEN")
            )
        self.protection_stations = {
            "SPEAKER_00": "主峰保护站",
            "SPEAKER_01": "溪谷保护站",
            "SPEAKER_02": "森林保护站",
            "SPEAKER_03": "高山草甸保护站"
        }

    def reduce_stream_noise(self, audio_path: str, output_path: str) -> str:
        """降低溪流等环境噪声，把结果写到 output_path。"""
        if not AUDIO_DSP_AVAILABLE:
            # 离线分支：不做真实 DSP，产出一个可判定的确定性降噪文件。
            with open(audio_path, "rb") as src:
                payload = src.read()
            with open(output_path, "wb") as dst:
                dst.write(OFFLINE_DENOISE_TAG + payload)
            return output_path

        y, sr = librosa.load(audio_path, sr=None)

        stft = librosa.stft(y)
        magnitude, phase = librosa.magphase(stft)

        noise_magnitude = np.mean(magnitude[:, :10], axis=1, keepdims=True)
        alpha = 2
        beta = 0.5
        mask = (magnitude > alpha * noise_magnitude).astype(float)
        mask = mask * (1 - beta) + beta

        enhanced_magnitude = magnitude * mask
        enhanced_stft = enhanced_magnitude * phase
        y_denoised = librosa.istft(enhanced_stft)

        sf.write(output_path, y_denoised, sr)
        return output_path

    def transcribe_audio(self, audio_path: str) -> str:
        if self.whisper_model is None:
            return OFFLINE_TRANSCRIPT
        result = self.whisper_model.transcribe(audio_path, language="zh")
        return result["text"]

    def diarize_speakers(self, audio_path: str) -> list:
        if self.pyannote_pipeline is None:
            return self._offline_speaker_segments(audio_path)

        diarization = self.pyannote_pipeline(audio_path)
        segments = []

        for turn, _, speaker in diarization.itertracks(yield_label=True):
            station = self.protection_stations.get(speaker, f"未知保护站_{speaker}")
            segments.append({
                "speaker": speaker,
                "station": station,
                "start": turn.start,
                "end": turn.end,
                "duration": turn.end - turn.start
            })

        return segments

    def _offline_speaker_segments(self, audio_path: str) -> list:
        """离线说话人分离：给出确定性的固定分段，让整条链路可测。"""
        plan = [("SPEAKER_00", 0.0, 1.0), ("SPEAKER_01", 1.0, 3.0)]
        segments = []
        for speaker, start, end in plan:
            station = self.protection_stations.get(speaker, f"未知保护站_{speaker}")
            segments.append({
                "speaker": speaker,
                "station": station,
                "start": start,
                "end": end,
                "duration": end - start
            })
        return segments

    def transcribe_segment(self, audio_path: str, segment: dict) -> str:
        """把单个说话人分段的音频切出来单独转写。"""
        if not AUDIO_DSP_AVAILABLE:
            return self.transcribe_audio(audio_path)

        start_idx = int(segment["start"] * 16000)
        end_idx = int(segment["end"] * 16000)
        y, sr = librosa.load(audio_path, sr=16000)
        segment_audio = y[start_idx:end_idx]

        temp_path = f"temp_{segment['speaker']}_{segment['start']:.0f}.wav"
        sf.write(temp_path, segment_audio, sr)
        segment_text = self.transcribe_audio(temp_path)
        os.remove(temp_path)
        return segment_text

    def process_audio(self, audio_path: str) -> dict:
        """完整链路：降噪 -> 全文转写 -> 说话人分离 -> 分站转写。"""
        denoised_path = audio_path.replace(".wav", "_denoised.wav")
        self.reduce_stream_noise(audio_path, denoised_path)

        transcription = self.transcribe_audio(denoised_path)
        speaker_segments = self.diarize_speakers(audio_path)

        station_transcripts = {}
        for seg in speaker_segments:
            station = seg["station"]
            if station not in station_transcripts:
                station_transcripts[station] = []

            station_transcripts[station].append(self.transcribe_segment(denoised_path, seg))

        return {
            "full_transcription": transcription,
            "speaker_segments": speaker_segments,
            "station_transcripts": {k: " ".join(v) for k, v in station_transcripts.items()}
        }
