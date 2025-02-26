import subprocess
import logging
import shlex
from typing import Dict, Any, List, Optional, Union

logger = logging.getLogger(__name__)

def run_command(command: str, timeout: int = 300, cwd: Optional[str] = None) -> Dict[str, Any]:
    """
    Run a terminal command and return the result.
    
    Args:
        command: Command to execute in the terminal
        timeout: Timeout in seconds (default: 300)
        cwd: Current working directory for the command
        
    Returns:
        Dict with status, stdout, stderr, and returncode
    """
    try:
        logger.info(f"Running command: {command}")
        
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=True, 
            text=True,
            timeout=timeout,
            cwd=cwd
        )
        
        # Log command execution details
        logger.info(f"Command executed with return code: {result.returncode}")
        if result.stdout:
            logger.debug(f"Command stdout: {result.stdout}")
        if result.stderr:
            logger.debug(f"Command stderr: {result.stderr}")
            
        return {
            "status": "success" if result.returncode == 0 else "error",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
            "command": command
        }
    except subprocess.TimeoutExpired:
        error_msg = f"Command timed out after {timeout} seconds: {command}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg,
            "command": command
        }
    except Exception as e:
        error_msg = f"Error executing command: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg,
            "command": command
        }

def install_python_package(package_name: str, upgrade: bool = False) -> Dict[str, Any]:
    """
    Install a Python package using pip.
    
    Args:
        package_name: Name of the package to install
        upgrade: Whether to upgrade the package if already installed
        
    Returns:
        Dict with status and message
    """
    try:
        # Sanitize input
        package_name = shlex.quote(package_name)
        
        # Build command
        cmd = f"pip install {package_name}"
        if upgrade:
            cmd += " --upgrade"
            
        # Run the command
        return run_command(cmd)
        
    except Exception as e:
        error_msg = f"Error installing package {package_name}: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg
        } 