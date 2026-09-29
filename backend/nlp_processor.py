"""物种种群评估与季度监测报告生成：抽取物种拉丁名 + 生成报告摘要。

spaCy 与 OpenAI SDK 都是可选依赖：未安装、或未打开 NP_ENABLE_MODELS 开关、
或未配置 OPENAI_API_KEY 时走确定性离线分支。离线分支下，中文物种名抽取退化为
基于「已知物种表」的确定性规则匹配（替代 spaCy 的中文实体识别），报告摘要由
模板生成，不发起任何网络请求。
"""
import os
import re
from typing import Dict, List

from dotenv import load_dotenv

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:  # pragma: no cover - 取决于运行环境
    spacy = None
    SPACY_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:  # pragma: no cover
    OpenAI = None
    OPENAI_AVAILABLE = False

load_dotenv()

OFFLINE_SUMMARY_HEADER = "【离线生成的季度监测报告】"

# 中文名 -> 拉丁名。这张表是系统唯一的物种知识来源：
# 分类、保护级别、拉丁名都应当以它（及其反向映射）为准。
CHINESE_NAME_MAP = {
    "华北豹": "Panthera pardus",
    "云豹": "Neofelis nebulosa",
    "小熊猫": "Ailurus fulgens",
    "金丝猴": "Rhinopithecus roxellana",
    "绿尾虹雉": "Lophophorus lhuysii",
    "暗腹雪鸡": "Tetraophasis obscurus",
    "血雉": "Ithaginis cruentus",
    "大鲵": "Andrias davidianus",
    "西藏山溪鲵": "Batrachuperus tibetanus",
    "珙桐": "Davidia involucrata",
    "连香树": "Cercidiphyllum japonicum",
    "水青树": "Tetracentron sinense",
}


def models_enabled():
    """只有显式打开开关时才真正加载重型模型。"""
    return os.getenv("NP_ENABLE_MODELS") == "1"


class NLPProcessor:
    def __init__(self):
        self.nlp = None
        if SPACY_AVAILABLE and models_enabled():
            self.nlp = spacy.load("zh_core_web_sm")
        self.client = None
        if OPENAI_AVAILABLE and os.getenv("OPENAI_API_KEY"):
            self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.latin_name_pattern = re.compile(r'[A-Z][a-z]+ [a-z]+(?: subsp\. [a-z]+)?')
        self.species_keywords = {
            "哺乳纲": ["Panthera pardus", "Neofelis nebulosa", "Ailurus fulgens", "Rhinopithecus roxellana"],
            "鸟纲": ["Lophophorus lhuysii", "Tetraophasis obscurus", "Ithaginis cruentus"],
            "两栖纲": ["Andrias davidianus", "Batrachuperus tibetanus"],
            "植物": ["Davidia involucrata", "Cercidiphyllum japonicum", "Tetracentron sinense"]
        }

    def extract_latin_names(self, text: str) -> List[Dict]:
        doc = self.nlp(text) if self.nlp is not None else None
        species_list = []

        latin_matches = self.latin_name_pattern.findall(text)

        for match in latin_matches:
            category = self._categorize_species(match)
            species_list.append({
                "latin_name": match,
                "category": category,
                "chinese_name": self._get_chinese_name(match),
                "protection_level": self._get_protection_level(match)
            })

        for chinese_name in self._find_chinese_species(text, doc):
            species_list.append({
                "latin_name": self._get_latin_by_chinese(chinese_name),
                "category": self._categorize_by_chinese(chinese_name),
                "chinese_name": chinese_name,
                "protection_level": "未知"
            })

        return species_list

    def _find_chinese_species(self, text: str, doc) -> List[str]:
        """找出文本里出现的中文物种名。"""
        if doc is not None:
            names = []
            for ent in doc.ents:
                if ent.label_ in ["ORG", "PERSON", "NORP"]:
                    if any(char in ent.text for char in ["猫", "熊", "鸟", "蛙", "树", "花"]):
                        names.append(ent.text)
            return names

        # 离线分支：用已知物种表替代 spaCy 的中文实体识别。
        names = []
        for chinese_name in CHINESE_NAME_MAP:
            if chinese_name in text:
                if any(char in chinese_name for char in ["猫", "熊", "鸟", "蛙", "树", "花"]):
                    names.append(chinese_name)
        return names

    def _categorize_species(self, latin_name: str) -> str:
        for category, species_list in self.species_keywords.items():
            if latin_name in species_list:
                return category
        return "未分类"

    def _get_chinese_name(self, latin_name: str) -> str:
        name_map = {
            "Panthera pardus": "华北豹",
            "Neofelis nebulosa": "云豹",
            "Ailurus fulgens": "小熊猫",
            "Rhinopithecus roxellana": "金丝猴",
            "Lophophorus lhuysii": "绿尾虹雉",
            "Tetraophasis obscurus": "暗腹雪鸡",
            "Ithaginis cruentus": "血雉",
            "Andrias davidianus": "大鲵",
            "Batrachuperus tibetanus": "西藏山溪鲵",
            "Davidia involucrata": "珙桐",
            "Cercidiphyllum japonicum": "连香树",
            "Tetracentron sinense": "水青树"
        }
        return name_map.get(latin_name, "未知中文名")

    def _get_protection_level(self, latin_name: str) -> str:
        level1 = ["Panthera pardus", "Neofelis nebulosa", "Rhinopithecus roxellana",
                  "Lophophorus lhuysii", "Andrias davidianus", "Davidia involucrata"]
        level2 = ["Ailurus fulgens", "Tetraophasis obscurus", "Ithaginis cruentus",
                  "Batrachuperus tibetanus", "Cercidiphyllum japonicum", "Tetracentron sinense"]

        if latin_name in level1:
            return "国家一级保护"
        elif latin_name in level2:
            return "国家二级保护"
        return "无危"

    def _get_latin_by_chinese(self, chinese_name: str) -> str:
        reverse_map = {v: k for k, v in {
            "Panthera pardus": "华北豹",
            "Neofelis nebulosa": "云豹",
            "Ailurus fulgens": "小熊猫",
            "Rhinopithecus roxellana": "金丝猴",
            "Lophophorus lhuysii": "绿尾虹雉"
        }.items()}
        return reverse_map.get(chinese_name, "")

    def _categorize_by_chinese(self, chinese_name: str) -> str:
        if any(c in chinese_name for c in ["豹", "猫", "熊猫", "猴"]):
            return "哺乳纲"
        elif any(c in chinese_name for c in ["鸟", "雉", "鸡"]):
            return "鸟纲"
        elif any(c in chinese_name for c in ["鲵", "蛙", "螈"]):
            return "两栖纲"
        elif any(c in chinese_name for c in ["树", "花", "草"]):
            return "植物"
        return "未分类"

    def generate_summary(self, station_data: Dict[str, str]) -> str:
        if self.client is None:
            return self._offline_summary(station_data)

        prompt = self._build_prompt(station_data)

        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "你是国家公园生物多样性监测专家，负责生成专业的季度监测报告。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=3000
        )

        return response.choices[0].message.content

    def _offline_summary(self, station_data: Dict[str, str]) -> str:
        lines = [
            OFFLINE_SUMMARY_HEADER,
            "监测期间：本季度",
            "编制单位：国家公园监测中心",
            "",
            "一、执行摘要",
            "本季度各保护站按计划完成红外相机巡检与现场汇报，整体监测工作正常。",
            "",
            "二、各保护站监测详情",
        ]
        if not station_data:
            lines.append("本季度未收到任何保护站的汇报。")
        for station, transcript in station_data.items():
            lines.append(f"【{station}】{transcript}")
        lines.extend([
            "",
            "三、管理建议",
            "继续按季度开展红外相机巡检，重点关注人为干扰与栖息地变化。",
        ])
        return "\n".join(lines)

    def _build_prompt(self, station_data: Dict[str, str]) -> str:
        station_texts = "\n\n".join([
            f"【{station}汇报】\n{transcript}"
            for station, transcript in station_data.items()
        ])

        return f"""
请基于以下各保护站巡护员的汇报内容，生成一份专业的国家公园生物多样性季度监测报告。

汇报内容：
{station_texts}

报告结构要求：
1. 封面页：报告标题、监测期间、编制单位
2. 执行摘要：概述本季度整体监测情况和重要发现
3. 各保护站监测详情：
   - 红外相机点位布设情况
   - 物种记录（含拉丁名、保护级别、种群数量估算）
   - 栖息地状况评估
4. 生物多样性分析：
   - 物种丰富度分析
   - 珍稀濒危物种动态
   - 潜在威胁因素识别
5. 管理建议：针对发现的问题提出具体保护措施
6. 附录：物种名录（中文名+拉丁名+保护级别）

请使用正式、专业的公文语气，确保数据准确，分析客观。
"""

    def extract_population_assessment(self, text: str) -> Dict:
        doc = self.nlp(text) if self.nlp is not None else None
        assessment = {
            "species_count": 0,
            "individual_count": 0,
            "threats": [],
            "habitat_quality": "良好"
        }

        num_pattern = re.compile(r'(\d+)(?:只|头|匹|群|株)')
        numbers = num_pattern.findall(text)
        if numbers:
            assessment["individual_count"] = sum(int(n) for n in numbers)

        threat_keywords = ["砍伐", "盗猎", "放牧", "旅游干扰", "气候变化", "栖息地破坏"]
        for keyword in threat_keywords:
            if keyword in text:
                assessment["threats"].append(keyword)

        if "退化" in text or "破坏" in text or "减少" in text:
            assessment["habitat_quality"] = "一般"
        if "严重" in text or "紧急" in text:
            assessment["habitat_quality"] = "较差"

        latin_names = self.extract_latin_names(text)
        assessment["species_count"] = len(set(s["latin_name"] for s in latin_names))
        assessment["species_list"] = latin_names

        return assessment
