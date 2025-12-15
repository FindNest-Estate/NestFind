import logging
import sys
from pythonjsonlogger import jsonlogger

def setup_logging():
    logger = logging.getLogger()
    
    # Clear existing handlers
    for handler in logger.handlers:
        logger.removeHandler(handler)
        
    handler = logging.StreamHandler(sys.stdout)
    
    # Custom formatter
    formatter = jsonlogger.JsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s',
        timestamp=True
    )
    
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    
    # Set levels for third-party libs
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    return logger

logger = setup_logging()
