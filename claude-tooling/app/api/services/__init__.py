"""
Services package for the API.
"""

from .conversation import (
    conversations, conversation_root_dirs, auto_execute_tasks,
    create_conversation_root_dir, get_conversation, get_root_dir,
    add_message_to_conversation, get_task_status, set_task_status
)
from .tool_execution import auto_execute_tool_calls, process_tool_calls_and_continue
from .file_service import get_file_path, get_file_content_type, list_files
from .markdown_service import MarkdownService 