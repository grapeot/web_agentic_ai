#!/usr/bin/env python3
"""
FastAPI application to integrate Claude 3.7 with local tools.
"""

import os
import json
import logging
import time
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import anthropic
from dotenv import load_dotenv

# Import local tool modules
from ..tools.tool_wrapper import (
    TOOL_DEFINITIONS,
    process_tool_calls,
    format_tool_results_for_claude
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Claude Tooling API",
    description="API for interacting with Claude 3.7 and local tools",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Anthropic client
try:
    client = anthropic.Anthropic(
        api_key=os.environ.get("ANTHROPIC_API_KEY")
    )
    logger.info("Anthropic client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Anthropic client: {str(e)}")
    raise

# Pydantic models for request/response
class Message(BaseModel):
    role: str
    content: List[Dict[str, Any]] = []
    
class ToolUse(BaseModel):
    id: str
    type: str
    name: str
    input: Dict[str, Any]
    
class ToolOutput(BaseModel):
    tool_use_id: str
    content: str
    
class UserRequest(BaseModel):
    messages: List[Message]
    max_tokens: int = 4096
    temperature: float = 0.7
    thinking_mode: bool = True
    thinking_budget_tokens: int = 2000
    auto_execute_tools: bool = True
    
class UserResponse(BaseModel):
    message: Message
    conversation_id: Optional[str] = None
    tool_calls: List[Dict[str, Any]] = []
    thinking: Optional[str] = None

# Store conversations
conversations = {}

# 存储正在执行的自动工具调用任务状态
auto_execute_tasks = {}

# 添加一个新的路由参数
class UserRequest(BaseModel):
    messages: List[Message]
    max_tokens: int = 4096
    temperature: float = 0.7
    thinking_mode: bool = True
    thinking_budget_tokens: int = 2000
    auto_execute_tools: bool = True  # New parameter to control automatic tool execution

# 添加新的自动工具执行函数
async def auto_execute_tool_calls(tool_calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Automatically execute tool calls and return results.
    """
    try:
        logger.info(f"Automatically executing {len(tool_calls)} tool calls")
        
        # Use the existing process_tool_calls function to handle tool calls
        # Since process_tool_calls may not be an async function, ensure proper handling
        tool_results = process_tool_calls(tool_calls)
        
        # Return formatted tool results
        logger.info(f"Tool execution completed, {len(tool_results)} results obtained")
        return tool_results
    
    except Exception as e:
        logger.error(f"Error executing tool calls: {str(e)}")
        # Return error results
        error_results = []
        for tool_call in tool_calls:
            error_results.append({
                "tool_use_id": tool_call.get("id"),
                "content": json.dumps({
                    "status": "error",
                    "message": f"Error executing tool calls: {str(e)}"
                }, ensure_ascii=False)
            })
        return error_results

# 修改chat路由，添加自动工具执行功能
@app.post("/api/chat", response_model=UserResponse)
async def chat(request: UserRequest, background_tasks: BackgroundTasks):
    """
    Process a chat request to Claude 3.7, handling tool calls.
    """
    try:
        logger.info("Received chat request")
        
        # Extract conversation ID from the request if available
        conversation_id = None
        for message in request.messages:
            if message.role == "system" and any(content.get("conversation_id") for content in message.content if isinstance(content, dict)):
                conversation_id = next((content.get("conversation_id") for content in message.content if isinstance(content, dict) and "conversation_id" in content), None)
                break
        
        if not conversation_id:
            conversation_id = f"conv_{int(time.time())}"
            logger.info(f"Created new conversation ID: {conversation_id}")
        else:
            logger.info(f"Using existing conversation ID: {conversation_id}")
        
        # Prepare messages for Claude API
        api_messages = []
        
        # Extract system message content for Claude API
        system_content = "You are running in a headless environment. When generating code that creates visualizations or outputs, DO NOT use interactive elements like plt.show(), figure.show(), or display()."
        
        for msg in request.messages:
            # Format message content for the API
            content_list = msg.content
            if isinstance(content_list, list):
                api_messages.append({
                    "role": msg.role,
                    "content": content_list
                })
            else:
                # If content is not a list, make it a list with a text item
                api_messages.append({
                    "role": msg.role,
                    "content": [{"type": "text", "text": content_list}]
                })
        
        # Make the API call to Claude
        logger.info("Sending request to Claude API")
        
        # Prepare thinking parameter if thinking mode is enabled
        thinking_param = None
        temperature_param = request.temperature
        if request.thinking_mode:
            thinking_param = {
                "type": "enabled",
                "budget_tokens": request.thinking_budget_tokens
            }
            # When thinking is enabled, temperature must be 1
            temperature_param = 1.0
            logger.info("Thinking mode enabled, setting temperature to 1.0")
        
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            system=system_content,
            messages=api_messages,
            max_tokens=request.max_tokens,
            temperature=temperature_param,
            tools=TOOL_DEFINITIONS,
            thinking=thinking_param,
        )
        
        logger.info("Received response from Claude API")
        logger.info(f"Response type: {type(response)}")
        
        # Extract thinking if available
        thinking = None
        if hasattr(response, 'thinking'):
            thinking = response.thinking
            logger.info(f"Found thinking: {thinking}")
        
        # Convert response content to dictionaries
        try:
            # First try to dump the model to a dict
            if hasattr(response, 'model_dump'):
                response_dict = response.model_dump()
                logger.info(f"Successfully dumped response model")
                raw_content = response_dict.get('content', [])
            else:
                # Fallback: try to access content directly
                raw_content = response.content
                logger.info(f"Accessed content directly: {type(raw_content)}")
            
            # Convert content items to dictionaries
            content = []
            for item in raw_content:
                if hasattr(item, 'model_dump'):
                    content.append(item.model_dump())
                elif hasattr(item, '__dict__'):
                    content.append(item.__dict__)
                else:
                    # If it's already a dict or compatible
                    content.append(dict(item))
                    
            logger.info(f"Processed content items: {len(content)}")
        except Exception as e:
            logger.error(f"Error converting response content: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing response: {str(e)}")
        
        # Process tool calls
        tool_calls = []
        try:
            for item in content:
                if item.get('type') == 'tool_use':
                    tool_calls.append({
                        "id": item.get('id'),
                        "name": item.get('name'),
                        "input": item.get('input', {})
                    })
            
            if tool_calls:
                logger.info(f"Found {len(tool_calls)} tool calls")
        except Exception as e:
            logger.error(f"Error processing tool calls: {str(e)}")
            
        # Update the conversation history
        if conversation_id not in conversations:
            conversations[conversation_id] = []
        
        # Add user message and assistant response to conversation history
        conversations[conversation_id].extend([
            {"role": "user", "content": request.messages[-1].content},
            {"role": "assistant", "content": content}
        ])
        
        # 如果启用了自动执行工具且有工具调用，自动处理并递归处理后续调用
        if request.auto_execute_tools and tool_calls:
            logger.info("Automatic tool execution enabled, starting tool task")
            
            # Create a background task to handle tool calls and continue conversation
            background_tasks.add_task(process_tool_calls_and_continue, tool_calls, conversation_id, request.max_tokens, request.thinking_mode, request.thinking_budget_tokens, request.auto_execute_tools)
        
        # Prepare the response
        return UserResponse(
            message=Message(role="assistant", content=content),
            conversation_id=conversation_id,
            tool_calls=tool_calls,
            thinking=thinking
        )
        
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 修改process_tool_calls_and_continue函数，添加中断检查
async def process_tool_calls_and_continue(
    tool_calls: List[Dict[str, Any]], 
    conversation_id: str, 
    max_tokens: int, 
    thinking_mode: bool, 
    thinking_budget_tokens: int,
    auto_execute_tools: bool
):
    """
    Process tool calls, get results, and continue conversation with Claude until all tool calls are completed.
    """
    try:
        if not tool_calls:
            logger.info("No tool calls to process")
            return
            
        # Get conversation history
        if conversation_id not in conversations:
            logger.error(f"Conversation ID not found: {conversation_id}")
            return
        
        # Initialize or check task status
        if conversation_id not in auto_execute_tasks:
            auto_execute_tasks[conversation_id] = "running"
        
        # Check if cancelled
        if auto_execute_tasks.get(conversation_id) == "cancelled":
            logger.info(f"Automatic execution of conversation {conversation_id} cancelled")
            return
            
        history = conversations[conversation_id]
        
        # Automatically execute tool calls and get results
        try:
            tool_results = await auto_execute_tool_calls(tool_calls)
        except Exception as e:
            logger.error(f"Error executing tool calls: {str(e)}")
            # Add error message to history
            history.append({
                "role": "system",
                "content": [{"type": "text", "text": f"Error executing tool calls: {str(e)}"}]
            })
            auto_execute_tasks[conversation_id] = "error"
            return
        
        # Check if cancelled
        if auto_execute_tasks.get(conversation_id) == "cancelled":
            logger.info(f"Automatic execution of conversation {conversation_id} cancelled")
            return
        
        # Format tool results as expected by Claude API
        tool_result_blocks = format_tool_results_for_claude(tool_results)
        
        # Add tool results to conversation history
        history.append({
            "role": "user",
            "content": tool_result_blocks
        })
        
        # Prepare thinking parameter
        thinking_param = None
        temperature_param = 0.7
        if thinking_mode:
            thinking_param = {
                "type": "enabled",
                "budget_tokens": thinking_budget_tokens
            }
            temperature_param = 1.0
        
        # Check if cancelled
        if auto_execute_tasks.get(conversation_id) == "cancelled":
            logger.info(f"Automatic execution of conversation {conversation_id} cancelled")
            return
            
        # Call Claude API to continue conversation
        logger.info(f"Continuing conversation with Claude, conversation ID: {conversation_id}")
        try:
            response = client.messages.create(
                model="claude-3-7-sonnet-20250219",
                system="You are running in a headless environment. When generating code that creates visualizations or outputs:\n"\
                      "1. DO NOT use interactive elements like plt.show(), figure.show(), or display()\n"\
                      "2. Instead, save outputs to files (e.g., plt.savefig('output.png'))\n"\
                      "3. For Python plots, use matplotlib's savefig() method\n"\
                      "4. For Jupyter-style outputs, write to files instead\n"\
                      "5. Always provide complete, self-contained code that can run without user interaction\n"\
                      "6. Assume your code runs in a script context, not an interactive notebook",
                messages=history,
                max_tokens=max_tokens,
                temperature=temperature_param,
                tools=TOOL_DEFINITIONS,
                thinking=thinking_param,
            )
        except Exception as e:
            logger.error(f"Error calling Claude API: {str(e)}")
            # Add error message to history
            history.append({
                "role": "system",
                "content": [{"type": "text", "text": f"Error calling Claude API: {str(e)}"}]
            })
            auto_execute_tasks[conversation_id] = "error"
            return
        
        # Process response
        try:
            # Extract response content
            if hasattr(response, 'model_dump'):
                response_dict = response.model_dump()
                raw_content = response_dict.get('content', [])
            else:
                raw_content = response.content
                
            # Convert content items to dictionaries
            content = []
            for item in raw_content:
                if hasattr(item, 'model_dump'):
                    content.append(item.model_dump())
                elif hasattr(item, '__dict__'):
                    content.append(item.__dict__)
                else:
                    content.append(dict(item))
                    
            # Add assistant response to conversation history
            history.append({"role": "assistant", "content": content})
            
            # Check if cancelled
            if auto_execute_tasks.get(conversation_id) == "cancelled":
                logger.info(f"Automatic execution of conversation {conversation_id} cancelled")
                return
                
            # Extract new tool calls
            new_tool_calls = []
            for item in content:
                if item.get('type') == 'tool_use':
                    new_tool_calls.append({
                        "id": item.get('id'),
                        "name": item.get('name'),
                        "input": item.get('input', {})
                    })
                    
            # If there are new tool calls and automatic execution is enabled, recursively process
            if auto_execute_tools and new_tool_calls:
                logger.info(f"Found {len(new_tool_calls)} new tool calls, continuing processing")
                await process_tool_calls_and_continue(
                    new_tool_calls, 
                    conversation_id, 
                    max_tokens, 
                    thinking_mode, 
                    thinking_budget_tokens,
                    auto_execute_tools
                )
                
        except Exception as e:
            logger.error(f"Error processing Claude response: {str(e)}")
            # Add error message to history
            history.append({
                "role": "system",
                "content": [{"type": "text", "text": f"Error processing Claude response: {str(e)}"}]
            })
            auto_execute_tasks[conversation_id] = "error"
            
    except Exception as e:
        logger.error(f"Error processing tool calls and continuing conversation: {str(e)}")
        # Add error message to conversation history
        if conversation_id in conversations:
            conversations[conversation_id].append({
                "role": "system",
                "content": [{"type": "text", "text": f"Error processing tool calls and continuing conversation: {str(e)}"}]
            })
        auto_execute_tasks[conversation_id] = "error"
    finally:
        # Clean up state after task completion
        if conversation_id in auto_execute_tasks and auto_execute_tasks[conversation_id] not in ["cancelled", "error"]:
            auto_execute_tasks[conversation_id] = "completed"

# 修改/api/tool-results端点，使其支持自动工具调用标志
@app.post("/api/tool-results", response_model=UserResponse)
async def submit_tool_results(
    tool_output: ToolOutput,
    background_tasks: BackgroundTasks,
    conversation_id: str,
    auto_execute_tools: bool = True
):
    """
    Process tool outputs and continue the conversation with Claude.
    """
    try:
        logger.info(f"Received tool output for conversation {conversation_id}")
        
        if conversation_id not in conversations:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Get conversation history
        history = conversations[conversation_id]
        
        # Add tool output to conversation history
        history.append({
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": tool_output.tool_use_id,
                    "content": tool_output.content
                }
            ]
        })
        
        # Make the API call to continue the conversation
        logger.info("Sending tool result to Claude API")
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            system="You are running in a headless environment. When generating code that creates visualizations or outputs:\n"\
                  "1. DO NOT use interactive elements like plt.show(), figure.show(), or display()\n"\
                  "2. Instead, save outputs to files (e.g., plt.savefig('output.png'))\n"\
                  "3. For Python plots, use matplotlib's savefig() method\n"\
                  "4. For Jupyter-style outputs, write to files instead\n"\
                  "5. Always provide complete, self-contained code that can run without user interaction\n"\
                  "6. Assume your code runs in a script context, not an interactive notebook",
            messages=history,
            max_tokens=4096,
            temperature=1.0,  # Must be 1.0 when thinking is enabled
            tools=TOOL_DEFINITIONS,
            thinking={
                "type": "enabled",
                "budget_tokens": 2000
            },
        )
        
        logger.info("Received response from Claude API")
        logger.info(f"Response type: {type(response)}")
        
        # Convert response content to dictionaries
        try:
            # First try to dump the model to a dict
            if hasattr(response, 'model_dump'):
                response_dict = response.model_dump()
                logger.info(f"Successfully dumped response model")
                raw_content = response_dict.get('content', [])
            else:
                # Fallback: try to access content directly
                raw_content = response.content
                logger.info(f"Accessed content directly: {type(raw_content)}")
            
            # Convert content items to dictionaries
            content = []
            for item in raw_content:
                if hasattr(item, 'model_dump'):
                    content.append(item.model_dump())
                elif hasattr(item, '__dict__'):
                    content.append(item.__dict__)
                else:
                    # If it's already a dict or compatible
                    content.append(dict(item))
                    
            logger.info(f"Processed content items: {len(content)}")
        except Exception as e:
            logger.error(f"Error converting response content: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing response: {str(e)}")
        
        # Process tool calls
        tool_calls = []
        try:
            for item in content:
                if item.get('type') == 'tool_use':
                    tool_calls.append({
                        "id": item.get('id'),
                        "name": item.get('name'),
                        "input": item.get('input', {})
                    })
            
            if tool_calls:
                logger.info(f"Found {len(tool_calls)} tool calls")
        except Exception as e:
            logger.error(f"Error processing tool calls: {str(e)}")
        
        # Add assistant response to conversation history
        history.append({"role": "assistant", "content": content})
        
        # If automatic execution is enabled and there are tool calls, start background task to handle
        if auto_execute_tools and tool_calls:
            logger.info("Automatic tool execution enabled, starting tool task")
            
            # Create a background task to handle tool calls and continue conversation
            background_tasks.add_task(
                process_tool_calls_and_continue, 
                tool_calls, 
                conversation_id, 
                4096,  # max_tokens 
                True,  # thinking_mode
                2000,  # thinking_budget_tokens
                auto_execute_tools
            )
        
        # Prepare the response
        return UserResponse(
            message=Message(role="assistant", content=content),
            conversation_id=conversation_id,
            tool_calls=tool_calls
        )
        
    except Exception as e:
        logger.error(f"Error processing tool results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tools")
async def get_tools():
    """
    Get the list of available tools and their schemas.
    """
    return {"tools": TOOL_DEFINITIONS}

# Add root route to redirect to frontend
@app.get("/")
async def root():
    """Redirect root to the frontend UI"""
    return RedirectResponse(url="/frontend/index.html")

# Mount static files for frontend
app.mount("/frontend", StaticFiles(directory=os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")), name="frontend")

# 添加一个新的路由来获取特定会话的消息
@app.get("/api/conversation/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str):
    """
    Get message history for a specific conversation.
    Used for front-end polling to get results of automatic tool execution and new assistant responses.
    """
    try:
        logger.info(f"Getting messages for conversation {conversation_id}")
        
        if conversation_id not in conversations:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Get conversation history
        history = conversations[conversation_id]
        
        # Check conversation status
        # Find the last message, if it's assistant message and no tool calls, then consider conversation completed
        status = "in_progress"
        if history and len(history) > 0:
            last_message = history[-1]
            if last_message["role"] == "assistant":
                # Check if there are tool calls
                has_tool_call = False
                for item in last_message["content"]:
                    if isinstance(item, dict) and item.get("type") == "tool_use":
                        has_tool_call = True
                        break
                
                if not has_tool_call:
                    status = "completed"
        
        return {
            "conversation_id": conversation_id,
            "messages": history,
            "status": status
        }
        
    except Exception as e:
        logger.error(f"Error getting conversation messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 添加一个新的端点用于取消自动工具执行
@app.post("/api/conversation/{conversation_id}/cancel")
async def cancel_auto_execution(conversation_id: str):
    """
    Cancel ongoing automatic tool execution.
    Allows user to interrupt long-running automatic tool execution process.
    """
    try:
        logger.info(f"Received cancel automatic execution request, conversation ID: {conversation_id}")
        
        if conversation_id not in conversations:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Mark automatic execution task for this conversation as cancelled
        auto_execute_tasks[conversation_id] = "cancelled"
        
        # Add system message to conversation history
        if conversation_id in conversations:
            conversations[conversation_id].append({
                "role": "system", 
                "content": [{"type": "text", "text": "Automatic tool execution cancelled by user"}]
            })
        
        return {"status": "success", "message": "Automatic tool execution cancelled"}
        
    except Exception as e:
        logger.error(f"Error cancelling automatic execution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 