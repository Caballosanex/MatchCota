from mangum import Mangum

from app.bootstrap_runtime import bootstrap_runtime_secrets

bootstrap_runtime_secrets()

from app.main import app


handler = Mangum(app, lifespan="off")
