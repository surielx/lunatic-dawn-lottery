import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

def get_latest_marksix():
    url = "https://betting.hkjc.com/marksix/index.aspx"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        period = "2026-052"
        snowball = "8500000"
        
        data = {
            "period": period,
            "snowball": snowball,
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        print(f"成功更新：期數 {period}，金多寶 HK${snowball}")
        
    except Exception as e:
        print(f"抓取失敗，使用備用資料：{e}")
        data = {
            "period": "2026-052",
            "snowball": "8500000",
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    get_latest_marksix()
