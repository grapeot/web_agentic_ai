#!/usr/bin/env python3
"""
测试自动工具执行功能的脚本。

使用方法:
    python tests/test_auto_execute.py "你的请求消息"
    
例如:
    python tests/test_auto_execute.py "写一个Python脚本计算斐波那契数列的前20个数"
    
按Ctrl+C可以随时中断执行过程。
"""

import os
import sys
import json
import time
import signal
import requests
from dotenv import load_dotenv

# Add parent directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# 加载环境变量
load_dotenv()

# 设置API端点
API_URL = "http://localhost:8000"  # 修正端口为默认的8000

# 全局变量用于中断处理
current_conversation_id = None
interrupt_requested = False

def signal_handler(sig, frame):
    """处理Ctrl+C信号"""
    global interrupt_requested
    
    if interrupt_requested:  # 如果已经按过一次Ctrl+C，则直接退出
        print("\n\033[91m强制退出...\033[0m")
        sys.exit(1)
        
    interrupt_requested = True
    print("\n\033[93m收到中断信号，正在尝试取消执行...\033[0m")
    
    # 如果有活跃的会话，发送取消请求
    if current_conversation_id:
        try:
            cancel_auto_execution(current_conversation_id)
        except Exception as e:
            print(f"\033[91m取消请求失败: {str(e)}\033[0m")
            
    # 不立即退出，让程序有机会完成清理工作

# 设置信号处理
signal.signal(signal.SIGINT, signal_handler)

def cancel_auto_execution(conversation_id):
    """发送取消自动执行的请求"""
    try:
        response = requests.post(f"{API_URL}/api/conversation/{conversation_id}/cancel")
        if response.status_code == 200:
            print(f"\033[93m已发送取消请求\033[0m")
            return True
        else:
            print(f"\033[91m取消请求失败，状态码: {response.status_code}\033[0m")
            print(response.text)
            return False
    except Exception as e:
        print(f"\033[91m发送取消请求时出错: {str(e)}\033[0m")
        return False

def get_conversation_messages(conversation_id):
    """获取对话的消息历史"""
    try:
        response = requests.get(f"{API_URL}/api/conversation/{conversation_id}/messages")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"获取消息失败，状态码: {response.status_code}")
            return None
    except Exception as e:
        print(f"获取消息时出错: {str(e)}")
        return None

def print_message(message, prefix=""):
    """打印消息内容"""
    role = message.get("role", "unknown")
    content = message.get("content", [])
    
    # 根据角色设置颜色
    color = "\033[0m"  # 默认
    if role == "user":
        color = "\033[94m"  # 蓝色
    elif role == "assistant":
        color = "\033[92m"  # 绿色
    elif role == "system":
        color = "\033[93m"  # 黄色
    
    print(f"{prefix}{color}[{role}]:\033[0m")
    
    for item in content:
        if isinstance(item, dict):
            item_type = item.get("type", "unknown")
            
            if item_type == "text" and "text" in item:
                print(f"{prefix}  {item['text']}")
            elif item_type == "tool_use":
                print(f"{prefix}  \033[93m[工具调用]: {item.get('name', 'unknown')}\033[0m")
                print(f"{prefix}    输入: {json.dumps(item.get('input', {}), indent=2)}")
            elif item_type == "tool_result":
                print(f"{prefix}  \033[96m[工具结果]:\033[0m")
                try:
                    result = json.loads(item.get("content", "{}"))
                    print(f"{prefix}    {json.dumps(result, indent=2)}")
                except:
                    print(f"{prefix}    {item.get('content', '')}")
            elif item_type == "thinking" and "thinking" in item:
                print(f"{prefix}  \033[95m[思考过程]:\033[0m")
                print(f"{prefix}    {item['thinking']}")
        elif isinstance(item, str):
            print(f"{prefix}  {item}")

def send_message(message):
    """发送消息到API并获取响应"""
    try:
        # 准备请求体
        request_body = {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": message
                        }
                    ]
                }
            ],
            "temperature": 0.7,
            "max_tokens": 4096,
            "thinking_mode": True,
            "thinking_budget_tokens": 2000,
            "auto_execute_tools": True  # 启用自动工具执行
        }
        
        # 发送请求
        print("\033[93m发送请求...\033[0m")
        response = requests.post(f"{API_URL}/api/chat", json=request_body)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"请求失败，状态码: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"发送消息时出错: {str(e)}")
        return None

def main():
    """主函数"""
    global current_conversation_id, interrupt_requested
    
    if len(sys.argv) < 2:
        print(f"使用方法: {sys.argv[0]} \"你的请求消息\"")
        return
    
    # 获取用户消息
    user_message = sys.argv[1]
    
    # 发送消息
    response = send_message(user_message)
    
    if not response:
        return
    
    # 获取对话ID
    current_conversation_id = response.get("conversation_id")
    
    if not current_conversation_id:
        print("未找到对话ID")
        return
    
    print(f"\033[93m对话ID: {current_conversation_id}\033[0m")
    print(f"\033[93m(按Ctrl+C可随时中断执行)\033[0m")
    
    # 显示初始响应
    if "message" in response:
        print_message(response["message"])
    
    # 轮询获取新消息
    print("\033[93m开始轮询新消息...\033[0m")
    
    last_messages_count = 2  # 初始有用户消息和助手响应
    status = "in_progress"
    
    try:
        while status == "in_progress" and not interrupt_requested:
            time.sleep(1.5)  # 每1.5秒轮询一次
            
            conversation = get_conversation_messages(current_conversation_id)
            
            if not conversation:
                continue
            
            status = conversation.get("status", "in_progress")
            messages = conversation.get("messages", [])
            
            # 如果有新消息，打印出来
            if len(messages) > last_messages_count:
                for i in range(last_messages_count, len(messages)):
                    print_message(messages[i])
                
                last_messages_count = len(messages)
            
            # 检查是否有系统消息表明执行已被取消
            if len(messages) > 0 and messages[-1].get("role") == "system":
                status = "cancelled"
                
        if status == "cancelled":
            print("\033[93m自动执行已被取消！\033[0m")
        else:
            print("\033[93m对话已完成！\033[0m")
            
    except KeyboardInterrupt:
        # 这个异常处理是多余的，因为信号处理器已经处理了Ctrl+C
        # 但保留它作为额外的安全措施
        global interrupt_requested
        if current_conversation_id and not interrupt_requested:
            cancel_auto_execution(current_conversation_id)
            
    except Exception as e:
        print(f"\033[91m执行出错: {str(e)}\033[0m")
        
    finally:
        # 确保脚本结束时重置全局变量
        current_conversation_id = None
        interrupt_requested = False

if __name__ == "__main__":
    main() 