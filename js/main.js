// 主程序
let canvasManager;
let currentDragComponent = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    canvasManager = new CanvasManager(canvas, componentTemplates, (component) => {
        // 状态栏更新
        const status = document.getElementById('status');
        if (component) {
            status.textContent = `已选中: ${component.name}`;
        } else {
            status.textContent = '就绪';
        }
    });
    
    // 初始化组件库
    initComponentLibrary
// ========== 组件库初始化 ==========
function initComponentLibrary() {
    const libraryContainer = document.getElementById('componentLibrary');
    
    // 清空容器
    libraryContainer.innerHTML = '';
    
    // 遍历预设模板，创建可拖拽的电池项
    componentTemplates.forEach(template => {
        const componentDiv = createLibraryItem(template);
        libraryContainer.appendChild(componentDiv);
    });
}

// 创建库中的电池项
function createLibraryItem(template) {
    const div = document.createElement('div');
    div.className = 'component-item';
    div.setAttribute('data-component-name', template.name);
    div.setAttribute('data-inputs', JSON.stringify(template.inputs));
    div.setAttribute('data-outputs', JSON.stringify(template.outputs));
    
    // 电池名称
    const nameSpan = document.createElement('div');
    nameSpan.className = 'component-name';
    nameSpan.textContent = template.name;
    
    // 端口预览
    const portsDiv = document.createElement('div');
    portsDiv.className = 'component-ports';
    
    const inputsSpan = document.createElement('span');
    inputsSpan.className = 'component-inputs';
    inputsSpan.innerHTML = template.inputs.map(i => `📥 ${i}`).join(' ') || '无输入';
    
    const outputsSpan = document.createElement('span');
    outputsSpan.className = 'component-outputs';
    outputsSpan.innerHTML = template.outputs.map(o => `📤 ${o}`).join(' ') || '无输出';
    
    portsDiv.appendChild(inputsSpan);
    portsDiv.appendChild(outputsSpan);
    
    div.appendChild(nameSpan);
    div.appendChild(portsDiv);
    
    // 添加拖拽事件
    div.setAttribute('draggable', 'true');
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);
    
    return div;
}

// 拖拽开始
let dragData = null;

function handleDragStart(e) {
    const target = e.target.closest('.component-item');
    if (!target) return;
    
    dragData = {
        name: target.getAttribute('data-component-name'),
        inputs: JSON.parse(target.getAttribute('data-inputs') || '[]'),
        outputs: JSON.parse(target.getAttribute('data-outputs') || '[]')
    };
    
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
    
    // 设置拖拽时的光标样式
    e.target.style.opacity = '0.5';
}

function handleDragEnd(e) {
    if (e.target) {
        e.target.style.opacity = '';
    }
    dragData = null;
}

// 画布拖拽放置
function setupCanvasDrop() {
    const canvas = document.getElementById('canvas');
    const canvasContainer = document.querySelector('.canvas-container');
    
    canvasContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });
    
    canvasContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        
        // 获取拖拽数据
        let componentData = dragData;
        if (!componentData) {
            try {
                const jsonData = e.dataTransfer.getData('text/plain');
                if (jsonData) {
                    componentData = JSON.parse(jsonData);
                }
            } catch (err) {
                return;
            }
        }
        
        if (!componentData) return;
        
        // 计算放置位置（相对于画布）
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // 考虑画布的平移和缩放
        const canvasX = (mouseX - canvasManager.panOffset.x) / canvasManager.zoom;
        const canvasY = (mouseY - canvasManager.panOffset.y) / canvasManager.zoom;
        
        // 创建新电池
        const newComponent = new Component(
            generateId(),
            componentData.name,
            canvasX - 60,  // 使电池中心对齐鼠标位置
            canvasY - 30,
            componentData.inputs,
            componentData.outputs
        );
        
        canvasManager.addComponent(newComponent);
        
        // 显示成功提示
        const status = document.getElementById('status');
        status.textContent = `已添加电池: ${componentData.name}`;
        setTimeout(() => {
            if (status.textContent === `已添加电池: ${componentData.name}`) {
                status.textContent = '就绪';
            }
        }, 2000);
    });
}

// ========== 添加自定义电池 ==========
function setupCustomComponent() {
    const addBtn = document.getElementById('addCustomComponent');
    addBtn.addEventListener('click', () => {
        showCustomComponentDialog();
    });
}

function showCustomComponentDialog() {
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>创建自定义电池</h3>
            <input type="text" id="compName" placeholder="电池名称" value="CustomComponent">
            <input type="text" id="compInputs" placeholder="输入端口 (用逗号分隔)" value="A,B">
            <input type="text" id="compOutputs" placeholder="输出端口 (用逗号分隔)" value="Result">
            <div class="modal-buttons">
                <button id="confirmBtn">创建</button>
                <button id="cancelBtn">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    confirmBtn.onclick = () => {
        const name = document.getElementById('compName').value.trim();
        const inputsStr = document.getElementById('compInputs').value.trim();
        const outputsStr = document.getElementById('compOutputs').value.trim();
        
        if (name) {
            const inputs = inputsStr ? inputsStr.split(',').map(s => s.trim()) : [];
            const outputs = outputsStr ? outputsStr.split(',').map(s => s.trim()) : [];
            
            // 添加到模板库
            const newTemplate = { name, inputs, outputs };
            componentTemplates.push(newTemplate);
            
            // 刷新左侧库
            initComponentLibrary();
            
            // 显示成功
            const status = document.getElementById('status');
            status.textContent = `已添加自定义电池: ${name}`;
            setTimeout(() => {
                if (status.textContent === `已添加自定义电池: ${name}`) {
                    status.textContent = '就绪';
                }
            }, 2000);
        }
        
        modal.remove();
    };
    
    cancelBtn.onclick = () => {
        modal.remove();
    };
}

// ========== 导入/导出功能 ==========
function setupImportExport() {
    // 导出 JSON
    const exportBtn = document.getElementById('exportJson');
    exportBtn.addEventListener('click', () => {
        const data = canvasManager.toJSON();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grasshopper_${new Date().toISOString().slice(0,19)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        const status = document.getElementById('status');
        status.textContent = '已导出 JSON 文件';
        setTimeout(() => {
            if (status.textContent === '已导出 JSON 文件') {
                status.textContent = '就绪';
            }
        }, 2000);
    });
    
    // 导入 JSON
    const importBtn = document.getElementById('importJson');
    const importFile = document.getElementById('importFile');
    
    importBtn.addEventListener('click', () => {
        importFile.click();
    });
    
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                canvasManager.fromJSON(data);
                
                const status = document.getElementById('status');
                status.textContent = `已导入: ${file.name}`;
                setTimeout(() => {
                    if (status.textContent === `已导入: ${file.name}`) {
                        status.textContent = '就绪';
                    }
                }, 2000);
            } catch (err) {
                alert('解析 JSON 文件失败: ' + err.message);
            }
        };
        reader.readAsText(file);
        
        // 清空 input，允许重复导入同一文件
        importFile.value = '';
    });
}

// ========== 清空画布 ==========
function setupClearCanvas() {
    const clearBtn = document.getElementById('clearCanvas');
    clearBtn.addEventListener('click', () => {
        if (confirm('确定要清空整个画布吗？')) {
            canvasManager.components.clear();
            canvasManager.connections = [];
            canvasManager.selectedComponent = null;
            canvasManager.draw();
            
            const status = document.getElementById('status');
            status.textContent = '画布已清空';
            setTimeout(() => {
                if (status.textContent === '画布已清空') {
                    status.textContent = '就绪';
                }
            }, 2000);
        }
    });
}

// ========== 键盘快捷键 ==========
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Delete 键删除选中的电池
        if (e.key === 'Delete' && canvasManager.selectedComponent) {
            canvasManager.deleteComponent(canvasManager.selectedComponent.id);
            const status = document.getElementById('status');
            status.textContent = '已删除电池';
            setTimeout(() => {
                if (status.textContent === '已删除电池') {
                    status.textContent = '就绪';
                }
            }, 1000);
        }
        
        // Ctrl+D 复制选中的电池
        if ((e.ctrlKey || e.metaKey) && e.key === 'd' && canvasManager.selectedComponent) {
            e.preventDefault();
            canvasManager.duplicateComponent(canvasManager.selectedComponent);
            const status = document.getElementById('status');
            status.textContent = `已复制: ${canvasManager.selectedComponent.name}`;
            setTimeout(() => {
                if (status.textContent === `已复制: ${canvasManager.selectedComponent.name}`) {
                    status.textContent = '就绪';
                }
            }, 1000);
        }
        
        // Ctrl+Z 撤销 (基础版 - 需要实现历史记录)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            // TODO: 实现撤销功能
            const status = document.getElementById('status');
            status.textContent = '撤销功能待实现';
            setTimeout(() => {
                if (status.textContent === '撤销功能待实现') {
                    status.textContent = '就绪';
                }
            }, 1000);
        }
    });
}

// ========== 初始化所有功能 ==========
function init() {
    initComponentLibrary();
    setupCanvasDrop();
    setupCustomComponent();
    setupImportExport();
    setupClearCanvas();
    setupKeyboardShortcuts();
}

// 启动初始化
init();
