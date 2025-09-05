import os

# تعریف ساختار پروژه
# این لیست شامل تمام فایل‌هایی است که باید ایجاد شوند.
# پوشه‌های والد به طور خودکار ساخته می‌شوند.
project_structure = [
    "backend/app/core/config.py",
    "backend/app/core/security.py",
    "backend/app/core/logger.py",
    "backend/app/db/database.py",
    "backend/app/db/models/user.py",
    "backend/app/db/models/chat.py",
    "backend/app/db/models/sentiment.py",
    "backend/app/db/models/__init__.py", # فایل __init__.py برای پکیج بودن پوشه
    "backend/app/db/schemas/user_schema.py",
    "backend/app/db/schemas/chat_schema.py",
    "backend/app/db/schemas/sentiment_schema.py",
    "backend/app/db/schemas/__init__.py", # فایل __init__.py برای پکیج بودن پوشه
    "backend/app/services/otp_service.py",
    "backend/app/services/deepseek_service.py",
    "backend/app/services/sentiment_service.py",
    "backend/app/services/memory_service.py",
    "backend/app/services/__init__.py", # فایل __init__.py برای پکیج بودن پوشه
    "backend/app/routes/auth_routes.py",
    "backend/app/routes/chat_routes.py",
    "backend/app/routes/sentiment_routes.py",
    "backend/app/routes/__init__.py", # فایل __init__.py برای پکیج بودن پوشه
    "backend/app/main.py",
    "backend/app/__init__.py",
    "backend/tests/test_auth.py",
    "backend/tests/test_chat.py",
    "backend/tests/test_sentiment.py",
    "backend/tests/__init__.py", # فایل __init__.py برای پکیج بودن پوشه
    "backend/analyze_data.py",
    "backend/requirements.txt",
    "backend/.env",
    "secret.key"
]

def create_project_structure():
    """
    این تابع ساختار تعریف شده پروژه را ایجاد می‌کند.
    پوشه‌ها در صورت عدم وجود ساخته شده و فایل‌های خالی ایجاد می‌شوند.
    """
    for path in project_structure:
        # اگر مسیر یک فایل است
        if '.' in os.path.basename(path):
            # مسیر دایرکتوری را از مسیر کامل فایل جدا کن
            dir_name = os.path.dirname(path)
            
            # اگر مسیر دایرکتوری وجود داشت، آن را بساز
            if dir_name:
                os.makedirs(dir_name, exist_ok=True)
                print(f"پوشه ایجاد شد: {dir_name}")
            
            # فایل خالی را ایجاد کن
            with open(path, 'w') as f:
                pass # فقط فایل را ایجاد می‌کند
            print(f"فایل ایجاد شد: {path}")
        # اگر مسیر یک پوشه است
        else:
            os.makedirs(path, exist_ok=True)
            print(f"پوشه ایجاد شد: {path}")

if __name__ == "__main__":
    print("شروع به ساخت ساختار پروژه...")
    create_project_structure()
    print("ساختار پروژه با موفقیت ایجاد شد!")

