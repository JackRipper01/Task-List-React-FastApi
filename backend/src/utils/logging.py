# utils/logging.py

import logging


def setup_logging():
    """
    Configures the application's logging settings.
    Sets the basic logging level and specifically tunes down verbose libraries.
    """
    logging.basicConfig(level=logging.INFO)
    # Get the root logger
    root_logger = logging.getLogger()
    # Ensure all handlers log INFO or higher by default unless overridden
    for handler in root_logger.handlers:
        if handler.level == logging.NOTSET:  # Only change if not explicitly set
            handler.setLevel(logging.INFO)

    # Suppress verbose logging from the websockets library
    logging.getLogger("websockets").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(
        logging.INFO)  # Keep access logs at INFO
    logging.getLogger("uvicorn.error").setLevel(
        logging.INFO)  # Keep error logs at INFO

    # Example of a more detailed handler (optional for production)
    # file_handler = logging.FileHandler("app.log")
    # file_handler.setLevel(logging.DEBUG)
    # formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    # file_handler.setFormatter(formatter)
    # root_logger.addHandler(file_handler)

    logger = logging.getLogger(__name__)
    logger.info("Logging configured successfully.")
