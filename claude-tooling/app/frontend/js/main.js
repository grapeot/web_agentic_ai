document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const temperatureSlider = document.getElementById('temperature');
    const tempValue = document.getElementById('temp-value');
    const maxTokensSlider = document.getElementById('max-tokens');
    const tokensValue = document.getElementById('tokens-value');
    const thinkingModeSwitch = document.getElementById('thinking-mode');
    const thinkingBudgetSlider = document.getElementById('thinking-budget');
    const budgetValue = document.getElementById('budget-value');
    const autoExecuteToolsSwitch = document.getElementById('auto-execute-tools');
    const clearChatButton = document.getElementById('clear-chat');
    const responseSpinner = document.getElementById('response-spinner');
    const toolsSpinner = document.getElementById('tools-spinner');
    const toolsGroup = document.getElementById('tools-group');
    const toolResultModal = new bootstrap.Modal(document.getElementById('toolResultModal'));
    const toolResultTextarea = document.getElementById('toolResult');
    const submitToolResultButton = document.getElementById('submitToolResult');
    const autoExecutionIndicator = document.getElementById('auto-execution-indicator');
    const cancelAutoExecutionButton = document.getElementById('cancel-auto-execution');

    // State
    let conversationId = null;
    let currentToolUseId = null;
    let messages = [];
    let waitingForToolResult = false;
    let isAutoExecutingTools = false;
    let pollingInterval = null;
    let lastToolCallId = null; // Store the last tool call ID for result association
    
    // API endpoint - dynamically get current host
    const API_URL = window.location.origin;

    // Initialize
    fetchAvailableTools();
    
    // Event listeners
    temperatureSlider.addEventListener('input', function() {
        tempValue.textContent = this.value;
    });
    
    maxTokensSlider.addEventListener('input', function() {
        tokensValue.textContent = this.value;
    });
    
    thinkingBudgetSlider.addEventListener('input', function() {
        budgetValue.textContent = this.value;
    });
    
    clearChatButton.addEventListener('click', function() {
        chatMessages.innerHTML = '';
        messages = [];
        conversationId = null;
        currentToolUseId = null;
        waitingForToolResult = false;
        isAutoExecutingTools = false;
        
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
        
        autoExecutionIndicator.style.display = 'none';
        console.log("Chat cleared, all state reset");
    });
    
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    submitToolResultButton.addEventListener('click', function() {
        const toolResult = toolResultTextarea.value;
        if (toolResult && currentToolUseId) {
            submitToolResult(currentToolUseId, toolResult);
            toolResultModal.hide();
        }
    });
    
    // Add cancel auto-execution event listener
    cancelAutoExecutionButton.addEventListener('click', function() {
        if (isAutoExecutingTools) {
            isAutoExecutingTools = false;
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
            autoExecutionIndicator.style.display = 'none';
            
            addMessageToChat('system', 'Auto tool execution cancelled');
        }
    });

    // Add event delegation for chat messages area to handle collapsible tool calls
    chatMessages.addEventListener('click', function(e) {
        // Find the closest tool call header element
        const toolHeader = e.target.closest('.tool-call-header');
        if (toolHeader) {
            const toolCall = toolHeader.closest('.tool-call');
            if (toolCall) {
                const toolContent = toolCall.querySelector('.tool-content');
                if (toolContent) {
                    // Toggle expand/collapse state
                    toolContent.classList.toggle('collapsed');
                    
                    // Update arrow icon
                    const arrow = toolHeader.querySelector('.toggle-arrow');
                    if (arrow) {
                        if (toolContent.classList.contains('collapsed')) {
                            arrow.innerHTML = '&#9654;'; // Right arrow (expand)
                        } else {
                            arrow.innerHTML = '&#9660;'; // Down arrow (collapse)
                        }
                    }
                }
            }
        }
        
        // Also handle debug info toggles for file results
        const jsonToggle = e.target.closest('.toggle-json-details');
        if (jsonToggle) {
            const jsonDetails = jsonToggle.closest('.file-result').querySelector('.file-json-details');
            if (jsonDetails) {
                jsonDetails.classList.toggle('collapsed');
            }
        }
    });

    // Functions
    function fetchAvailableTools() {
        toolsSpinner.style.display = 'block';
        fetch(`${API_URL}/api/tools`)
            .then(response => response.json())
            .then(data => {
                toolsSpinner.style.display = 'none';
                const tools = data.tools;
                tools.forEach(tool => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.innerHTML = `<strong>${tool.name}</strong>: ${tool.description}`;
                    toolsGroup.appendChild(li);
                });
            })
            .catch(error => {
                toolsSpinner.style.display = 'none';
                console.error('Error fetching tools:', error);
            });
    }

    function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        addMessageToChat('user', message);
        userInput.value = '';
        
        const requestBody = {
            messages: buildMessagesForAPI(message),
            temperature: parseFloat(temperatureSlider.value),
            max_tokens: parseInt(maxTokensSlider.value),
            thinking_mode: thinkingModeSwitch.checked,
            thinking_budget_tokens: parseInt(thinkingBudgetSlider.value),
            auto_execute_tools: autoExecuteToolsSwitch.checked
        };
        
        responseSpinner.style.display = 'block';
        
        // 基础API端点
        let apiEndpoint = `${API_URL}/api/chat`;
        
        // 如果有会话ID，通过URL参数传递
        if (conversationId) {
            apiEndpoint += `?conversation_id=${encodeURIComponent(conversationId)}`;
            console.log("Continuing conversation:", conversationId);
        }
        
        let requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        };
        
        fetch(apiEndpoint, requestOptions)
        .then(response => response.json())
        .then(data => {
            responseSpinner.style.display = 'none';
            
            if (data.conversation_id) {
                conversationId = data.conversation_id;
            }
            
            if (data.thinking) {
                addThinkingToChat(data.thinking);
            }
            
            if (data.message && data.message.content) {
                processAssistantMessage(data.message.content);
            } else {
                console.error('Response missing message field:', data);
                addMessageToChat('assistant', 'Error: Failed to get a proper response from Claude. Please try again.');
            }
            
            if (data.tool_calls && data.tool_calls.length > 0) {
                const toolCall = data.tool_calls[0];
                addToolCallToChat(toolCall);
                
                currentToolUseId = toolCall.id;
                
                if (autoExecuteToolsSwitch.checked) {
                    console.log("Tool calls found in initial response with auto-execute enabled, starting polling");
                    isAutoExecutingTools = true;
                    waitingForToolResult = false;
                    startPollingForUpdates();
                } else {
                    waitingForToolResult = true;
                    toolResultTextarea.value = '';
                    toolResultModal.show();
                }
            } else if (autoExecuteToolsSwitch.checked) {
                console.log("No immediate tool calls, but auto-execute is enabled - starting polling anyway");
                isAutoExecutingTools = true;
                startPollingForUpdates();
            }
        })
        .catch(error => {
            responseSpinner.style.display = 'none';
            console.error('Error sending message:', error);
        });
    }
    
    function submitToolResult(toolUseId, result) {
        addToolResultToChat(result, toolUseId);
        
        const requestBody = {
            tool_use_id: toolUseId,
            content: result
        };
        
        responseSpinner.style.display = 'block';
        fetch(`${API_URL}/api/tool-results?conversation_id=${conversationId}&auto_execute_tools=${autoExecuteToolsSwitch.checked}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => response.json())
        .then(data => {
            responseSpinner.style.display = 'none';
            
            processAssistantMessage(data.message.content);
            
            if (data.tool_calls && data.tool_calls.length > 0) {
                waitingForToolResult = true;
                const toolCall = data.tool_calls[0];
                addToolCallToChat(toolCall);
                
                currentToolUseId = toolCall.id;
                
                if (autoExecuteToolsSwitch.checked) {
                    console.log("Tool calls found with auto-execute enabled, continuing polling");
                    isAutoExecutingTools = true;
                    waitingForToolResult = false;
                    startPollingForUpdates();
                } else {
                    waitingForToolResult = true;
                    toolResultTextarea.value = '';
                    toolResultModal.show();
                }
            } else {
                waitingForToolResult = false;
                if (autoExecuteToolsSwitch.checked) {
                    console.log("No immediate tool calls after tool result, but ensuring polling continues");
                    isAutoExecutingTools = true;
                    startPollingForUpdates();
                }
            }
        })
        .catch(error => {
            responseSpinner.style.display = 'none';
            console.error('Error submitting tool result:', error);
        });
    }
    
    function buildMessagesForAPI(userMessage) {
        const apiMessages = [];
        
        // Add any existing conversation history
        if (messages.length > 0) {
            messages.forEach(msg => {
                apiMessages.push(msg);
            });
        }
        
        // Add the new user message
        apiMessages.push({
            role: 'user',
            content: [{
                type: 'text',
                text: userMessage
            }]
        });
        
        return apiMessages;
    }
    
    function processAssistantMessage(content) {
        let textContent = '';
        let toolCalls = [];
        
        const displayedToolIds = new Set();
        document.querySelectorAll('.tool-call').forEach(el => {
            if (el.dataset.toolId) {
                displayedToolIds.add(el.dataset.toolId);
            }
        });
        
        for (const item of content) {
            if (item.type === 'text') {
                textContent += item.text;
            } else if (item.type === 'tool_use' && !displayedToolIds.has(item.id)) {
                toolCalls.push({
                    id: item.id,
                    name: item.name,
                    input: item.input
                });
                displayedToolIds.add(item.id);
                lastToolCallId = item.id;
            }
        }
        
        if (textContent) {
            addMessageToChat('assistant', textContent);
        }
        
        for (const toolCall of toolCalls) {
            addToolCallToChat(toolCall);
        }
        
        messages.push({
            role: 'assistant',
            content: content
        });
    }
    
    function addMessageToChat(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        messageDiv.innerHTML = marked.parse(content);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
        
        if (role === 'user') {
            messages.push({
                role: 'user',
                content: [{
                    type: 'text',
                    text: content
                }]
            });
        }
    }
    
    function addThinkingToChat(thinking) {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message thinking';
        thinkingDiv.innerHTML = '<h5>Thinking:</h5>' + marked.parse(thinking);
        chatMessages.appendChild(thinkingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    }
    
    function addToolCallToChat(toolCall) {
        const toolCallDiv = document.createElement('div');
        toolCallDiv.className = 'message tool-call';
        toolCallDiv.dataset.toolId = toolCall.id;
        
        const header = document.createElement('div');
        header.className = 'tool-call-header';
        
        const arrow = document.createElement('span');
        arrow.className = 'toggle-arrow';
        arrow.innerHTML = '&#9654;'; // Right arrow (collapsed state)
        header.appendChild(arrow);
        
        const headerText = document.createElement('span');
        headerText.textContent = `Tool Call: ${toolCall.name}`;
        header.appendChild(headerText);
        
        toolCallDiv.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'tool-content collapsed'; // Start collapsed by default
        
        if (toolCall.input) {
            const inputLabel = document.createElement('div');
            inputLabel.className = 'tool-section-label';
            inputLabel.textContent = 'Input Parameters:';
            content.appendChild(inputLabel);
            
            const toolInput = document.createElement('div');
            toolInput.className = 'tool-input';
            
            try {
                let jsonInput;
                if (typeof toolCall.input === 'string') {
                    jsonInput = JSON.parse(toolCall.input);
                } else {
                    jsonInput = toolCall.input;
                }
                
                const formattedJson = JSON.stringify(jsonInput, null, 2);
                toolInput.innerHTML = `<pre>${formattedJson}</pre>`;
            } catch (e) {
                toolInput.innerHTML = `<pre>${toolCall.input}</pre>`;
            }
            
            content.appendChild(toolInput);
        }
        
        const resultLabel = document.createElement('div');
        resultLabel.className = 'tool-section-label';
        resultLabel.textContent = 'Result:';
        content.appendChild(resultLabel);
        
        const resultContainer = document.createElement('div');
        resultContainer.className = 'tool-result-container';
        resultContainer.dataset.forToolId = toolCall.id;
        
        content.appendChild(resultContainer);
        toolCallDiv.appendChild(content);
        
        chatMessages.appendChild(toolCallDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function addToolResultToChat(result, toolUseId) {
        const resultContainer = document.querySelector(`.tool-result-container[data-for-tool-id="${toolUseId}"]`);
        
        if (resultContainer) {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'tool-result';
            resultDiv.dataset.resultId = toolUseId;
            
            let resultContent = '';
            let parsedResult = null;
            
            try {
                // Try to parse the result as JSON
                parsedResult = JSON.parse(result);
                
                // Check if this is a file result with rendering information
                if (parsedResult.status === "success" && parsedResult.file_path && parsedResult.file_url) {
                    // This is a file result, handle it based on render_type
                    const fileName = parsedResult.file_path.split('/').pop();
                    
                    // Create a file result header
                    resultContent += `<div class="file-result-header">
                        <strong>File saved:</strong> ${fileName}
                        <a href="${parsedResult.file_url}" target="_blank" class="file-download-link">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>`;
                    
                    // Handle different file types based on render_type
                    if (parsedResult.render_type === "image") {
                        // Image file - display it inline
                        resultContent += `<div class="file-preview image-preview">
                            <img src="${parsedResult.file_url}" alt="${fileName}" class="preview-image" />
                        </div>`;
                    } else if (parsedResult.render_type === "markdown") {
                        // Markdown file - add a preview button
                        resultContent += `<div class="file-preview markdown-preview-btn">
                            <button class="btn btn-sm btn-outline-primary view-markdown" data-url="${parsedResult.view_url}">
                                <i class="fas fa-file-alt"></i> View Markdown
                            </button>
                        </div>`;
                    } else if (parsedResult.render_type === "html") {
                        // HTML file - add a preview button
                        resultContent += `<div class="file-preview html-preview-btn">
                            <button class="btn btn-sm btn-outline-primary view-html" data-url="${parsedResult.view_url}">
                                <i class="fas fa-code"></i> View HTML
                            </button>
                        </div>`;
                    }
                    
                    // Add the full JSON for debugging
                    resultContent += `<div class="file-json-details collapsed">
                        <button class="btn btn-sm btn-outline-secondary toggle-json">Show Details</button>
                        <pre class="json-content" style="display:none;">${JSON.stringify(parsedResult, null, 2)}</pre>
                    </div>`;
                } 
                // Check if this is a command result with generated files
                else if (parsedResult.status === "success" && parsedResult.generated_files && parsedResult.generated_files.length > 0) {
                    // First add the regular command output
                    resultContent += `<pre>${JSON.stringify(parsedResult, null, 2)}</pre>`;
                    
                    // Then add a separate section for generated files
                    resultContent += `<div class="generated-files-section">
                        <h5>Generated Files:</h5>
                    </div>`;
                    
                    // For each generated file, add rendering based on file type
                    for (const file of parsedResult.generated_files) {
                        const fileName = file.file_name || file.file_path.split('/').pop();
                        
                        resultContent += `<div class="file-result">
                            <div class="file-result-header">
                                <strong>File:</strong> ${fileName}
                                <a href="${file.file_url}" target="_blank" class="file-download-link">
                                    <i class="fas fa-download"></i> Download
                                </a>
                            </div>`;
                        
                        // Handle different file types based on render_type
                        if (file.render_type === "image") {
                            resultContent += `<div class="file-preview image-preview">
                                <img src="${file.file_url}" alt="${fileName}" class="preview-image" />
                            </div>`;
                        } else if (file.render_type === "markdown") {
                            resultContent += `<div class="file-preview markdown-preview-btn">
                                <button class="btn btn-sm btn-outline-primary view-markdown" data-url="${file.view_url || file.file_url}">
                                    <i class="fas fa-file-alt"></i> View Markdown
                                </button>
                            </div>`;
                        } else if (file.render_type === "html") {
                            resultContent += `<div class="file-preview html-preview-btn">
                                <button class="btn btn-sm btn-outline-primary view-html" data-url="${file.view_url || file.file_url}">
                                    <i class="fas fa-code"></i> View HTML
                                </button>
                            </div>`;
                        }
                        
                        resultContent += `</div>`;  // Close file-result div
                    }
                }
                else {
                    // Regular JSON result - display formatted
                    resultContent = `<pre>${JSON.stringify(parsedResult, null, 2)}</pre>`;
                }
            } catch (e) {
                // Not JSON, display as text
                console.error("Error parsing tool result:", e);
                resultContent = `<pre>${result}</pre>`;
            }
            
            resultDiv.innerHTML = resultContent;
            resultContainer.appendChild(resultDiv);
            
            // Add event listeners for buttons if needed
            if (parsedResult) {
                // Handle file result buttons
                if (parsedResult.render_type || (parsedResult.generated_files && parsedResult.generated_files.length > 0)) {
                    const viewMarkdownBtns = resultDiv.querySelectorAll('.view-markdown');
                    viewMarkdownBtns.forEach(btn => {
                        btn.addEventListener('click', function() {
                            const url = this.getAttribute('data-url');
                            fetchAndDisplayMarkdown(url, resultDiv);
                        });
                    });
                    
                    const viewHtmlBtns = resultDiv.querySelectorAll('.view-html');
                    viewHtmlBtns.forEach(btn => {
                        btn.addEventListener('click', function() {
                            const url = this.getAttribute('data-url');
                            displayHtmlPreview(url, resultDiv);
                        });
                    });
                    
                    const toggleJsonBtns = resultDiv.querySelectorAll('.toggle-json');
                    toggleJsonBtns.forEach(btn => {
                        btn.addEventListener('click', function() {
                            const jsonContent = this.nextElementSibling;
                            const isHidden = jsonContent.style.display === 'none';
                            jsonContent.style.display = isHidden ? 'block' : 'none';
                            this.textContent = isHidden ? 'Hide Details' : 'Show Details';
                        });
                    });
                }
            }
            
            // Find the parent tool call div and make sure it remains collapsed
            const toolCallDiv = resultContainer.closest('.tool-call');
            const toolContent = toolCallDiv.querySelector('.tool-content');
            if (toolContent) {
                // Ensure the content stays collapsed
                toolContent.classList.add('collapsed');
            }
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            console.warn(`Tool container with ID ${toolUseId} not found, creating standalone result`);
            
            const standAloneResult = document.createElement('div');
            standAloneResult.className = 'message tool-result';
            standAloneResult.dataset.resultId = toolUseId;
            
            let resultContent = '';
            let parsedResult = null;
            
            try {
                // Try to parse the result as JSON
                parsedResult = JSON.parse(result);
                
                // Check if this is a file result with rendering information
                if (parsedResult.status === "success" && parsedResult.file_path && parsedResult.file_url) {
                    // This is a file result, handle it based on render_type
                    const fileName = parsedResult.file_path.split('/').pop();
                    
                    // Create a file result header
                    resultContent += `<div class="file-result-header">
                        <strong>File saved:</strong> ${fileName}
                        <a href="${parsedResult.file_url}" target="_blank" class="file-download-link">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>`;
                    
                    // Handle different file types based on render_type
                    if (parsedResult.render_type === "image") {
                        // Image file - display it inline
                        resultContent += `<div class="file-preview image-preview">
                            <img src="${parsedResult.file_url}" alt="${fileName}" class="preview-image" />
                        </div>`;
                    } else if (parsedResult.render_type === "markdown") {
                        // Markdown file - add a preview button
                        resultContent += `<div class="file-preview markdown-preview-btn">
                            <button class="btn btn-sm btn-outline-primary view-markdown" data-url="${parsedResult.view_url}">
                                <i class="fas fa-file-alt"></i> View Markdown
                            </button>
                        </div>`;
                    } else if (parsedResult.render_type === "html") {
                        // HTML file - add a preview button
                        resultContent += `<div class="file-preview html-preview-btn">
                            <button class="btn btn-sm btn-outline-primary view-html" data-url="${parsedResult.view_url}">
                                <i class="fas fa-code"></i> View HTML
                            </button>
                        </div>`;
                    }
                    
                    // Add the full JSON for debugging
                    resultContent += `<div class="file-json-details collapsed">
                        <button class="btn btn-sm btn-outline-secondary toggle-json">Show Details</button>
                        <pre class="json-content" style="display:none;">${JSON.stringify(parsedResult, null, 2)}</pre>
                    </div>`;
                } 
                // Check if this is a command result with generated files
                else if (parsedResult.status === "success" && parsedResult.generated_files && parsedResult.generated_files.length > 0) {
                    // First add the regular command output
                    resultContent += `<pre>${JSON.stringify(parsedResult, null, 2)}</pre>`;
                    
                    // Then add a separate section for generated files
                    resultContent += `<div class="generated-files-section">
                        <h5>Generated Files:</h5>
                    </div>`;
                    
                    // For each generated file, add rendering based on file type
                    for (const file of parsedResult.generated_files) {
                        const fileName = file.file_name || file.file_path.split('/').pop();
                        
                        resultContent += `<div class="file-result">
                            <div class="file-result-header">
                                <strong>File:</strong> ${fileName}
                                <a href="${file.file_url}" target="_blank" class="file-download-link">
                                    <i class="fas fa-download"></i> Download
                                </a>
                            </div>`;
                        
                        // Handle different file types based on render_type
                        if (file.render_type === "image") {
                            resultContent += `<div class="file-preview image-preview">
                                <img src="${file.file_url}" alt="${fileName}" class="preview-image" />
                            </div>`;
                        } else if (file.render_type === "markdown") {
                            resultContent += `<div class="file-preview markdown-preview-btn">
                                <button class="btn btn-sm btn-outline-primary view-markdown" data-url="${file.view_url || file.file_url}">
                                    <i class="fas fa-file-alt"></i> View Markdown
                                </button>
                            </div>`;
                        } else if (file.render_type === "html") {
                            resultContent += `<div class="file-preview html-preview-btn">
                                <button class="btn btn-sm btn-outline-primary view-html" data-url="${file.view_url || file.file_url}">
                                    <i class="fas fa-code"></i> View HTML
                                </button>
                            </div>`;
                        }
                        
                        resultContent += `</div>`;  // Close file-result div
                    }
                }
                else {
                    // Regular JSON result - display formatted
                    resultContent = `<pre>${JSON.stringify(parsedResult, null, 2)}</pre>`;
                }
            } catch (e) {
                // Not JSON, display as text
                console.error("Error parsing tool result:", e);
                resultContent = `<pre>${result}</pre>`;
            }
            
            standAloneResult.innerHTML = resultContent;
            chatMessages.appendChild(standAloneResult);
            
            // Add event listeners for buttons if needed
            if (parsedResult) {
                // Handle file result buttons
                if (parsedResult.render_type || (parsedResult.generated_files && parsedResult.generated_files.length > 0)) {
                    const viewMarkdownBtns = standAloneResult.querySelectorAll('.view-markdown');
                    viewMarkdownBtns.forEach(btn => {
                        btn.addEventListener('click', function() {
                            const url = this.getAttribute('data-url');
                            fetchAndDisplayMarkdown(url, standAloneResult);
                        });
                    });
                    
                    const viewHtmlBtns = standAloneResult.querySelectorAll('.view-html');
                    viewHtmlBtns.forEach(btn => {
                        btn.addEventListener('click', function() {
                            const url = this.getAttribute('data-url');
                            displayHtmlPreview(url, standAloneResult);
                        });
                    });
                    
                    const toggleJsonBtns = standAloneResult.querySelectorAll('.toggle-json');
                    toggleJsonBtns.forEach(btn => {
                        btn.addEventListener('click', function() {
                            const jsonContent = this.nextElementSibling;
                            const isHidden = jsonContent.style.display === 'none';
                            jsonContent.style.display = isHidden ? 'block' : 'none';
                            this.textContent = isHidden ? 'Hide Details' : 'Show Details';
                        });
                    });
                }
            }
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // Add functions to fetch and display file content
    function fetchAndDisplayMarkdown(url, container) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'markdown-content-preview';
        previewContainer.innerHTML = '<div class="preview-loading"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        
        // Find the preview button container and append after it
        const btnContainer = container.querySelector('.markdown-preview-btn');
        if (btnContainer) {
            btnContainer.after(previewContainer);
        } else {
            container.appendChild(previewContainer);
        }
        
        // Fetch the markdown content
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(markdown => {
                // Render markdown
                previewContainer.innerHTML = `
                    <div class="markdown-preview-header">
                        <button class="btn btn-sm btn-outline-secondary close-preview">
                            <i class="fas fa-times"></i> Close Preview
                        </button>
                    </div>
                    <div class="markdown-preview-content">${marked.parse(markdown)}</div>
                `;
                
                // Add close button functionality
                const closeBtn = previewContainer.querySelector('.close-preview');
                if (closeBtn) {
                    closeBtn.addEventListener('click', function() {
                        previewContainer.remove();
                    });
                }
                
                // Apply syntax highlighting to code blocks
                previewContainer.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightBlock(block);
                });
            })
            .catch(error => {
                previewContainer.innerHTML = `<div class="alert alert-danger">Error loading Markdown: ${error.message}</div>`;
            });
    }
    
    function displayHtmlPreview(url, container) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'html-content-preview';
        
        // Create iframe container with header
        previewContainer.innerHTML = `
            <div class="html-preview-header">
                <button class="btn btn-sm btn-outline-secondary close-preview">
                    <i class="fas fa-times"></i> Close Preview
                </button>
                <a href="${url}" target="_blank" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-external-link-alt"></i> Open in New Tab
                </a>
            </div>
            <div class="iframe-container">
                <iframe src="${url}" sandbox="allow-scripts" class="html-preview-iframe"></iframe>
            </div>
        `;
        
        // Find the preview button container and append after it
        const btnContainer = container.querySelector('.html-preview-btn');
        if (btnContainer) {
            btnContainer.after(previewContainer);
        } else {
            container.appendChild(previewContainer);
        }
        
        // Add close button functionality
        const closeBtn = previewContainer.querySelector('.close-preview');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                previewContainer.remove();
            });
        }
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
    }

    function startPollingForUpdates() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        
        if (!conversationId || !isAutoExecutingTools) {
            autoExecutionIndicator.style.display = 'none';
            return;
        }
        
        autoExecutionIndicator.style.display = 'block';
        
        pollingInterval = setInterval(() => {
            if (!isAutoExecutingTools) {
                clearInterval(pollingInterval);
                autoExecutionIndicator.style.display = 'none';
                return;
            }
            
            fetch(`${API_URL}/api/conversation/${conversationId}/messages`)
                .then(response => {
                    if (!response.ok) {
                        if (response.status === 404) {
                            return null;
                        }
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.messages && data.messages.length > 0) {
                        updateChatWithNewMessages(data.messages);
                        
                        // Even when conversation is marked as complete,
                        // we keep isAutoExecutingTools true to allow continued interaction
                        if (data.status === "completed") {
                            clearInterval(pollingInterval);
                            autoExecutionIndicator.style.display = 'none';
                        }
                    }
                })
                .catch(error => {
                    console.error("Error polling for updates:", error);
                });
        }, 5000);
    }
    
    function updateChatWithNewMessages(newMessages) {
        let lastMessageIndex = messages.length - 1;
        
        const displayedToolIds = new Set();
        document.querySelectorAll('.tool-call').forEach(el => {
            if (el.dataset.toolId) {
                displayedToolIds.add(el.dataset.toolId);
            }
        });
        
        const displayedResultIds = new Set();
        document.querySelectorAll('.tool-result').forEach(el => {
            if (el.dataset.resultId) {
                displayedResultIds.add(el.dataset.resultId);
            }
        });
        
        let hasNewToolCalls = false;
        let hasToolResults = false;
        
        for (let i = lastMessageIndex + 1; i < newMessages.length; i++) {
            const msg = newMessages[i];
            
            if (msg.role === "assistant") {
                if (msg.content) {
                    let textContent = '';
                    let hasNewToolCall = false;
                    let newToolCalls = [];
                    
                    for (const item of msg.content) {
                        if (item.type === 'text') {
                            textContent += item.text;
                        } else if (item.type === 'tool_use' && !displayedToolIds.has(item.id)) {
                            displayedToolIds.add(item.id);
                            lastToolCallId = item.id;
                            newToolCalls.push({
                                id: item.id,
                                name: item.name,
                                input: item.input
                            });
                            hasNewToolCall = true;
                            hasNewToolCalls = true;
                        }
                    }
                    
                    if (textContent) {
                        addMessageToChat('assistant', textContent);
                    }
                    
                    for (const toolCall of newToolCalls) {
                        addToolCallToChat(toolCall);
                    }
                    
                    if (textContent || hasNewToolCall) {
                        messages.push(msg);
                    }
                }
            } else if (msg.role === "user" && msg.content && msg.content.length > 0) {
                let hasToolResult = false;
                for (const item of msg.content) {
                    if (item.type === "tool_result" && !displayedResultIds.has(item.tool_use_id)) {
                        displayedResultIds.add(item.tool_use_id);
                        addToolResultToChat(item.content, item.tool_use_id);
                        hasToolResult = true;
                        hasToolResults = true;
                    }
                }
                
                if (hasToolResult) {
                    messages.push(msg);
                }
            }
        }
        
        // If new tool calls are detected, ensure polling continues
        if (hasNewToolCalls) {
            isAutoExecutingTools = true;
            autoExecutionIndicator.style.display = 'block';
        }
        
        // If tool results are detected, ensure polling continues for assistant responses
        if (hasToolResults) {
            isAutoExecutingTools = true;
            autoExecutionIndicator.style.display = 'block';
        }
    }
}); 