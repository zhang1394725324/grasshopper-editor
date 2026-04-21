// 主程序
let canvasManager;
let dragData = null;

// 获取电池类型对应的颜色
function getComponentColor(name) {
    if (name.includes('Solver')) return '#ff6b6b';
    if (name.includes('Anchor')) return '#4ecdc4';
    if (name.includes('Spring') || name.includes('Gravity') || name.includes('Wind')) return '#45b7d1';
    if (name.includes('Collide')) return '#f9ca24';
    if (name.includes('Display')) return '#ff8b94';
    if (name.includes('Slider') || name.includes('Toggle')) return '#ffd3b6';
    if (name.includes('List')) return '#ffaaa5';
    return '#ffaa00';
}

// 创建库中的电池项
function createLibraryItem(template) {
    const div = document.createElement('div');
    div.className = 'component-item';
    div.setAttribute('data-component-name', template.name);
    div.setAttribute('data-inputs', JSON.stringify(template.inputs));
    div.setAttribute('data-outputs', JSON.stringify(template.outputs));
    
    const color = getComponentColor(template.name);
    
    const nameSpan = document.createElement('div');
    nameSpan.className = 'component-name';
    nameSpan.style.borderLeft = `3px solid ${color}`;
    nameSpan.style.paddingLeft = '8px';
    nameSpan.textContent = template.name;
    
    const portsDiv = document.createElement('div');
    portsDiv.className = 'component-ports';
    
    const inputsSpan = document.createElement('span');
    inputsSpan.className = 'component-inputs';
    inputsSpan.innerHTML = template.inputs.map(i => `▶ ${i}`).join(' ') || '⚡ 无输入';
    
    const outputsSpan = document.createElement('span');
    outputsSpan.className = 'component-outputs';
    outputsSpan.innerHTML = template.outputs.map(o => `${o} ▶`).join(' ') || '⚡ 无输出';
    
    portsDiv.appendChild(inputsSpan);
    portsDiv.appendChild(outputsSpan);
    
    div.appendChild(nameSpan);
    div.appendChild(portsDiv);
    
    div.setAttribute('draggable', 'true');
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);
    
    return div;
}

// 拖拽事件
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
    target.style.opacity = '0.5';
}

function handleDragEnd(e) {
    const target = e.target.closest('.component-item');
    if (target) target.style.opacity = '';
    dragData = null;
}

// 初始化组件库
function initComponentLibrary() {
    const libraryContainer = document.getElementById('componentLibrary');
    if (!libraryContainer) {
        console.error('找不到 componentLibrary 元素');
        return;
    }
    
    libraryContainer.innerHTML = '';
    
    componentTemplates.forEach(template => {
        const componentDiv = createLibraryItem(template);
        libraryContainer.appendChild(componentDiv);
    });
    
    console.log(`已加载 ${componentTemplates.length} 个电池`);
}

// 设置画布拖拽放置
function setupCanvasDrop() {
    const canvasContainer = document.querySelector('.canvas-container');
    if (!canvasContainer) return;
    
    canvasContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });
    
    canvasContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        
        let componentData = dragData;
        if (!componentData) {
            try {
                const jsonData = e.dataTransfer.getData('text/plain');
                if (jsonData) componentData = JSON.parse(jsonData);
            } catch (err) {}
        }
        
        if (!componentData) return;
        
        const rect = document.getElementById('canvas').getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const canvasX = (mouseX - canvasManager.panOffset.x) / canvasManager.zoom;
        const canvasY = (mouseY - canvasManager.panOffset.y) / canvasManager.zoom;
        
        const newComponent = new Component(
            generateId(),
            componentData.name,
            canvasX - 65,
            canvasY - 30,
            componentData.inputs,
            componentData.outputs
        );
        
        canvasManager.addComponent(newComponent);
        
        const status = document.getElementById('status');
        if (status) status.textContent = `已添加: ${componentData.name}`;
    });
}

// 自定义电池对话框
function showCustomComponentDialog() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>创建自定义电池</h3>
            <input type="text" id="compName" placeholder="电池名称" value="MyComponent">
            <input type="text" id="compInputs" placeholder="输入端口 (逗号分隔)" value="A,B">
            <input type="text" id="compOutputs" placeholder="输出端口 (逗号分隔)" value="Result">
            <div class="modal-buttons">
                <button id="confirmBtn">创建</button>
                <button id="cancelBtn">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('confirmBtn').onclick = () => {
        const name = document.getElementById('compName').value.trim();
        const inputsStr = document.getElementById('compInputs').value.trim();
        const outputsStr = document.getElementById('compOutputs').value.trim();
        
        if (name) {
            const inputs = inputsStr ? inputsStr.split(',').map(s => s.trim()) : [];
            const outputs = outputsStr ? outputsStr.split(',').map(s => s.trim()) : [];
            
            componentTemplates.push({ name, inputs, outputs });
            initComponentLibrary();
            
            const status = document.getElementById('status');
            if (status) status.textContent = `已添加: ${name}`;
        }
        modal.remove();
    };
    
    document.getElementById('cancelBtn').onclick = () => modal.remove();
}

// 导入导出功能
function setupImportExport() {
    const exportBtn = document.getElementById('exportJson');
    const importBtn = document.getElementById('importJson');
    const importFile = document.getElementById('importFile');
    const clearBtn = document.getElementById('clearCanvas');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = canvasManager.toJSON();
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `grasshopper_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
    
    if (importBtn && importFile) {
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    canvasManager.fromJSON(data);
                    const status = document.getElementById('status');
                    if (status) status.textContent = `已导入: ${file.name}`;
                } catch (err) {
                    alert('解析失败: ' + err.message);
                }
            };
            reader.readAsText(file);
            importFile.value = '';
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('确定清空画布？')) {
                canvasManager.components.clear();
                canvasManager.connections = [];
                canvasManager.draw();
            }
        });
    }
}

// 键盘快捷键
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && canvasManager.selectedComponent) {
            canvasManager.deleteComponent(canvasManager.selectedComponent.id);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'd' && canvasManager.selectedComponent) {
            e.preventDefault();
            canvasManager.duplicateComponent(canvasManager.selectedComponent);
        }
    });
}

// 添加自定义电池按钮
function setupCustomButton() {
    const addBtn = document.getElementById('addCustomComponent');
    if (addBtn) addBtn.addEventListener('click', showCustomComponentDialog);
}

// 添加搜索功能
function setupSearch() {
    const libraryHeader = document.querySelector('.library-header');
    if (!libraryHeader) return;
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '🔍 搜索电池...';
    searchInput.style.cssText = 'width: calc(100% - 24px); margin: 8px 12px; padding: 6px 10px; background: #4a4a4a; border: 1px solid #666; color: #ddd; border-radius: 4px;';
    libraryHeader.parentElement.insertBefore(searchInput, libraryHeader.nextSibling);
    
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.component-item').forEach(item => {
            const name = item.querySelector('.component-name')?.textContent.toLowerCase() || '';
            item.style.display = name.includes(term) ? '' : 'none';
        });
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，初始化...');
    
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('找不到 canvas 元素');
        return;
    }
    
    canvasManager = new CanvasManager(canvas, componentTemplates, (component) => {
        const status = document.getElementById('status');
        if (status) status.textContent = component ? `已选中: ${component.name}` : '就绪';
    });
    
    initComponentLibrary();
    setupSearch();
    setupCanvasDrop();
    setupCustomButton();
    setupImportExport();
    setupKeyboardShortcuts();
    
    console.log('初始化完成');
});
