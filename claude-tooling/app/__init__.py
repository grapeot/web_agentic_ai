"""
Claude Tooling Application

This application integrates Claude 3.7 with local tools for file management,
command execution, and more. It provides a web interface for interacting
with Claude and executing commands on the local system.
"""

import logging
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

logger.info("Claude Tooling Application initialized") 