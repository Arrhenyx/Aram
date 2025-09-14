
import os
import requests

API_KEY = ""
BASE_URL = "https://openrouter.ai/api/v1"
MODEL_NAME = "deepseek/deepseek-r1-0528-qwen3-8b:free"

chat_history = []

print("=== DeepSeek R1 0528 Qwen3-8B (free) Chat ===")
print("برای خروج 'exit' را تایپ کنید.\n")

while True:
    user_input = input("شما: ")
    if user_input.lower() == "exit":
        break

    chat_history.append({"role": "user", "content": user_input})

    payload = {
        "model": MODEL_NAME,
        "messages": chat_history,
        "max_tokens": 500,      # برای کنترل مصرف
        "temperature": 0.6      # مشابه رفتار توصیه‌شده DeepSeek :contentReference[oaicite:1]{index=1}
    }

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers)
        data = resp.json()

        if resp.status_code == 200:
            reply = data["choices"][0]["message"]["content"]
            print("DeepSeek:", reply)
            chat_history.append({"role": "assistant", "content": reply})

        elif resp.status_code == 402:
            print("❌ خطا: موجودی کافی نیست — نیاز به ارتقا یا اضافه کردن credit داری.")
            break
        elif resp.status_code == 401:
            print("❌ خطا: کلید غیرمعتبر است.")
            break
        else:
            print("❌ خطای دیگر:", data)
            break

    except Exception as e:
        print("❌ خطا در اتصال یا پردازش:", str(e))
        break
