"""
Tool execution services for handling automatic tool calls.
"""

import json
import logging
import asyncio
from typing import Dict, List, Any, Optional
import anthropic

from ..services.conversation import (
    conversations, auto_execute_tasks, 
    add_message_to_conversation, set_task_status
)
from app.api.tools.tool_wrapper import (
    process_tool_calls,
    format_tool_results_for_claude,
    TOOL_DEFINITIONS
) 