"""
Celery configuration for MealTogether background tasks
"""
import os
from celery import Celery
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def make_celery(app_name=__name__):
    """
    Create and configure Celery instance
    """
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

    celery = Celery(
        app_name,
        broker=redis_url,
        backend=redis_url,
        include=['app.services.timer_service']
    )

    # Configure Celery
    celery.conf.update(
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
        task_track_started=True,
        task_time_limit=3600,  # 1 hour max
        result_expires=3600,   # Results expire after 1 hour
        broker_connection_retry_on_startup=True,
    )

    return celery

# Create Celery instance
celery = make_celery('meal_together')

if __name__ == '__main__':
    celery.start()
