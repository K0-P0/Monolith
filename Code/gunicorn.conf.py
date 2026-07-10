from pathlib import Path

_HERE = Path(__file__).parent.resolve()

bind      = "0.0.0.0:80"
workers   = 2
worker_class = "sync"
timeout   = 60
keepalive = 5
loglevel  = "info"
accesslog = str(_HERE / "access.log")
errorlog  = str(_HERE / "error.log")
