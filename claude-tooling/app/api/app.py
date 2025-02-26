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
    auto_execute_tools: bool = True  # 新参数，控制是否自动执行工具

# 添加新的自动工具执行函数
async def auto_execute_tool_calls(tool_calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    自动执行工具调用并返回结果。
    """
    try:
        logger.info(f"自动执行 {len(tool_calls)} 个工具调用")
        
        # 使用现有的process_tool_calls函数处理工具调用
        # 由于process_tool_calls可能不是异步函数，需要确保正确处理
        tool_results = process_tool_calls(tool_calls)
        
        # 返回格式化后的工具结果
        logger.info(f"工具执行完成，获得 {len(tool_results)} 个结果")
        return tool_results
    
    except Exception as e:
        logger.error(f"自动执行工具调用时出错: {str(e)}")
        # 返回错误结果
        error_results = []
        for tool_call in tool_calls:
            error_results.append({
                "tool_use_id": tool_call.get("id"),
                "content": json.dumps({
                    "status": "error",
                    "message": f"自动执行工具调用时出错: {str(e)}"
                })
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
            logger.info("自动执行工具调用已启用，开始执行工具任务")
            
            # 创建一个后台任务处理工具调用并继续对话
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
    处理工具调用，获取结果，并继续与Claude的对话，直到完成所有工具调用。
    """
    try:
        if not tool_calls:
            logger.info("没有工具调用需要处理")
            return
            
        # 获取会话历史
        if conversation_id not in conversations:
            logger.error(f"找不到对话ID: {conversation_id}")
            return
        
        # 初始化或检查任务状态
        if conversation_id not in auto_execute_tasks:
            auto_execute_tasks[conversation_id] = "running"
        
        # 检查是否被取消
        if auto_execute_tasks.get(conversation_id) == "cancelled":
            logger.info(f"会话 {conversation_id} 的自动执行已被取消")
            return
            
        history = conversations[conversation_id]
        
        # 自动执行工具调用并获取结果
        try:
            tool_results = await auto_execute_tool_calls(tool_calls)
        except Exception as e:
            logger.error(f"执行工具调用时出错: {str(e)}")
            # 添加错误消息到历史记录
            history.append({
                "role": "system",
                "content": [{"type": "text", "text": f"执行工具调用时出错: {str(e)}"}]
            })
            auto_execute_tasks[conversation_id] = "error"
            return
        
        # 检查是否被取消
        if auto_execute_tasks.get(conversation_id) == "cancelled":
            logger.info(f"会话 {conversation_id} 的自动执行已被取消")
            return
        
        # 将工具结果格式化为Claude API期望的格式
        tool_result_blocks = format_tool_results_for_claude(tool_results)
        
        # 添加工具结果到会话历史
        history.append({
            "role": "user",
            "content": tool_result_blocks
        })
        
        # 准备thinking参数
        thinking_param = None
        temperature_param = 0.7
        if thinking_mode:
            thinking_param = {
                "type": "enabled",
                "budget_tokens": thinking_budget_tokens
            }
            temperature_param = 1.0
        
        # 检查是否被取消
        if auto_execute_tasks.get(conversation_id) == "cancelled":
            logger.info(f"会话 {conversation_id} 的自动执行已被取消")
            return
            
        # 调用Claude API继续对话
        logger.info(f"继续与Claude对话，会话ID: {conversation_id}")
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
            logger.error(f"调用Claude API时出错: {str(e)}")
            # 添加错误消息到历史记录
            history.append({
                "role": "system",
                "content": [{"type": "text", "text": f"调用Claude API时出错: {str(e)}"}]
            })
            auto_execute_tasks[conversation_id] = "error"
            return
        
        # 处理响应
        try:
            # 提取响应内容
            if hasattr(response, 'model_dump'):
                response_dict = response.model_dump()
                raw_content = response_dict.get('content', [])
            else:
                raw_content = response.content
                
            # 转换内容项为字典
            content = []
            for item in raw_content:
                if hasattr(item, 'model_dump'):
                    content.append(item.model_dump())
                elif hasattr(item, '__dict__'):
                    content.append(item.__dict__)
                else:
                    content.append(dict(item))
                    
            # 添加助手响应到会话历史
            history.append({"role": "assistant", "content": content})
            
            # 检查是否被取消
            if auto_execute_tasks.get(conversation_id) == "cancelled":
                logger.info(f"会话 {conversation_id} 的自动执行已被取消")
                return
                
            # 提取新的工具调用
            new_tool_calls = []
            for item in content:
                if item.get('type') == 'tool_use':
                    new_tool_calls.append({
                        "id": item.get('id'),
                        "name": item.get('name'),
                        "input": item.get('input', {})
                    })
                    
            # 如果有新的工具调用且启用了自动执行，递归处理
            if auto_execute_tools and new_tool_calls:
                logger.info(f"发现{len(new_tool_calls)}个新的工具调用，继续处理")
                await process_tool_calls_and_continue(
                    new_tool_calls, 
                    conversation_id, 
                    max_tokens, 
                    thinking_mode, 
                    thinking_budget_tokens,
                    auto_execute_tools
                )
                
        except Exception as e:
            logger.error(f"处理Claude响应时出错: {str(e)}")
            # 添加错误消息到历史记录
            history.append({
                "role": "system",
                "content": [{"type": "text", "text": f"处理Claude响应时出错: {str(e)}"}]
            })
            auto_execute_tasks[conversation_id] = "error"
            
    except Exception as e:
        logger.error(f"处理工具调用和继续对话时出错: {str(e)}")
        # 添加错误消息到会话历史
        if conversation_id in conversations:
            conversations[conversation_id].append({
                "role": "system",
                "content": [{"type": "text", "text": f"处理工具调用和继续对话时出错: {str(e)}"}]
            })
        auto_execute_tasks[conversation_id] = "error"
    finally:
        # 任务完成后清理状态
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
        
        # 如果启用了自动执行工具且有工具调用，启动后台任务处理
        if auto_execute_tools and tool_calls:
            logger.info("自动执行工具调用已启用，开始执行工具任务")
            
            # 创建一个后台任务处理工具调用并继续对话
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
    获取指定会话的消息历史。
    用于前端轮询获取自动工具执行的结果和新助手响应。
    """
    try:
        logger.info(f"获取会话 {conversation_id} 的消息")
        
        if conversation_id not in conversations:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        # 获取会话历史
        history = conversations[conversation_id]
        
        # 判断会话状态
        # 查找最后一条消息，如果是助手消息且没有工具调用，则认为会话已完成
        status = "in_progress"
        if history and len(history) > 0:
            last_message = history[-1]
            if last_message["role"] == "assistant":
                # 检查是否有工具调用
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
        logger.error(f"获取会话消息时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 添加一个新的端点用于取消自动工具执行
@app.post("/api/conversation/{conversation_id}/cancel")
async def cancel_auto_execution(conversation_id: str):
    """
    取消正在进行的自动工具执行。
    允许用户中断长时间运行的自动工具执行过程。
    """
    try:
        logger.info(f"收到取消自动执行的请求，会话ID: {conversation_id}")
        
        if conversation_id not in conversations:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        # 标记该会话的自动执行任务为已取消
        auto_execute_tasks[conversation_id] = "cancelled"
        
        # 添加系统消息到会话历史
        if conversation_id in conversations:
            conversations[conversation_id].append({
                "role": "system", 
                "content": [{"type": "text", "text": "自动工具执行已被用户取消"}]
            })
        
        return {"status": "success", "message": "自动工具执行已取消"}
        
    except Exception as e:
        logger.error(f"取消自动执行时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 