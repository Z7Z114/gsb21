import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import os
from typing import List

class EmailSender:
    def __init__(self, smtp_server: str, smtp_port: int, username: str, password: str):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.username = username
        self.password = password

    def send_report(self, to_email: str, subject: str, body: str, attachments: List[str] = None) -> bool:
        try:
            msg = MIMEMultipart()
            msg['From'] = self.username
            msg['To'] = to_email
            msg['Subject'] = subject

            msg.attach(MIMEText(body, 'plain', 'utf-8'))

            if attachments:
                for file_path in attachments:
                    if os.path.exists(file_path):
                        with open(file_path, 'rb') as f:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(f.read())
                        encoders.encode_base64(part)
                        part.add_header(
                            'Content-Disposition',
                            f'attachment; filename= {os.path.basename(file_path)}'
                        )
                        msg.attach(part)

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                text = msg.as_string()
                server.sendmail(self.username, to_email, text)

            return True
        except Exception as e:
            print(f"发送邮件失败: {str(e)}")
            return False

    def send_quarterly_report(self, to_email: str, report_content: str, quarter: str, year: int) -> bool:
        subject = f"【国家公园】{year}年第{quarter}季度生物多样性监测报告"
        body = f"""
尊敬的管理局领导：

您好！现将{year}年第{quarter}季度国家公园生物多样性监测报告呈送，请查阅。

本报告基于各保护站巡护员的红外相机监测数据和现场汇报整理生成，涵盖了以下内容：
1. 各保护站监测详情
2. 物种多样性分析
3. 珍稀濒危物种动态
4. 栖息地状况评估
5. 管理建议

如有任何疑问，请随时联系我们。

此致
敬礼

国家公园监测中心
"""
        
        report_file = f"report_{year}_Q{quarter}.txt"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)

        return self.send_report(to_email, subject, body, [report_file])
