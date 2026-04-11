from mangum import Mangum

from app.bootstrap_runtime import bootstrap_runtime_secrets
# key-link: backend/app/lambda_handler.py -> backend/app/bootstrap_runtime.py (bootstrap before app import)

bootstrap_runtime_secrets()

from app.main import app


handler = Mangum(app, lifespan="off")
