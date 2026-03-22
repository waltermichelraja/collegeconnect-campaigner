from pathlib import Path
import os
import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR=Path(__file__).resolve().parent.parent

SECRET_KEY=os.getenv("DJANGO_SECRET_KEY")

DEBUG=os.getenv("DEBUG","False")=="True"

ALLOWED_HOSTS=["collegeconnect-wa-campaigner-production.up.railway.app", "*"]

CORS_ALLOW_ALL_ORIGINS=True
CORS_ALLOW_CREDENTIALS=True
CORS_ALLOW_HEADERS=["content-type","authorization"]

TWILIO_ACCOUNT_SID=os.getenv("TWILIO_ACCOUNT_SID","")
TWILIO_AUTH_TOKEN=os.getenv("TWILIO_AUTH_TOKEN","")
TWILIO_WHATSAPP_NUMBER=os.getenv("TWILIO_WHATSAPP_NUMBER","")
TWILIO_STATUS_CALLBACK=os.getenv("TWILIO_STATUS_CALLBACK","")

FAST2SMS_API_KEY=os.getenv("FAST2SMS_API_KEY","")
FAST2SMS_PHONE_NUMBER_ID=os.getenv("FAST2SMS_PHONE_NUMBER_ID","")

INSTALLED_APPS=[
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',

    'campaign',
]

MIDDLEWARE=[
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF='backend.urls'

TEMPLATES=[
    {
        'BACKEND':'django.template.backends.django.DjangoTemplates',
        'DIRS':[],
        'APP_DIRS':True,
        'OPTIONS':{
            'context_processors':[
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION='backend.wsgi.application'

# DATABASE
DATABASES={
    "default":dj_database_url.parse(
        os.getenv("DATABASE_URL"),
        conn_max_age=600,
        ssl_require=True
    )
}

# DRF
REST_FRAMEWORK={
    "DEFAULT_PERMISSION_CLASSES":[
        "rest_framework.permissions.AllowAny"
    ],
    "DEFAULT_RENDERER_CLASSES":[
        "rest_framework.renderers.JSONRenderer"
    ],
    "DEFAULT_PARSER_CLASSES":[
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser"
    ],
}

# Static
STATIC_URL='/static/'
STATIC_ROOT=os.path.join(BASE_DIR,'staticfiles')

# Logging
LOGGING={
    "version":1,
    "disable_existing_loggers":False,
    "handlers":{
        "console":{
            "class":"logging.StreamHandler",
        },
    },
    "root":{
        "handlers":["console"],
        "level":"INFO",
    },
}

LANGUAGE_CODE='en-us'
TIME_ZONE='UTC'
USE_I18N=True
USE_TZ=True

DEFAULT_AUTO_FIELD='django.db.models.BigAutoField'