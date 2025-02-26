"""
Pydantic models for request/response schemas.
"""

from typing import Dict, List, Any, Optional
from pydantic import BaseModel

class Message(BaseModel):
    """Message model for chat conversations."""
    role: str
    content: List[Dict[str, Any]] = []
    
class ToolUse(BaseModel):
    """Model for tool use information."""
    id: str
    type: str
    name: str
    input: Dict[str, Any]
    
class ToolOutput(BaseModel):
    """Model for tool output results."""
    tool_use_id: str
    content: str
    
class UserRequest(BaseModel):
    """Request model for chat endpoint."""
    messages: List[Message]
    max_tokens: int = 4096
    temperature: float = 0.7
    thinking_mode: bool = True
    thinking_budget_tokens: int = 2000
    auto_execute_tools: bool = True
    
class UserResponse(BaseModel):
    """Response model for chat endpoint."""
    message: Message
    conversation_id: Optional[str] = None
    tool_calls: List[Dict[str, Any]] = []
    thinking: Optional[str] = None 