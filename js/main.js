// 主程序
let canvasManager;
let dragData = null;

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

function initComponentLibrary() {
    const libraryContainer = document.getElementById('componentLibrary');
    if (!libraryContainer) return;
    
    libraryContainer.innerHTML = '';
    
    componentTemplates.forEach(template => {
        libraryContainer.appendChild(createLibraryItem(template));
    });
}

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
        
        const newComponent = new Component(generateId(), componentData.name,
            canvasX - 70, canvasY - 35,
            componentData.inputs, componentData.outputs);
        newComponent.color = getComponentColor(componentData.name);
        
        canvasManager.addComponent(newComponent);
        canvasManager.updateStatus(`${t('statusAdded')}: ${componentData.name}`);
    });
}

function setupLibrarySearch() {
    const searchInput = document.getElementById('librarySearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.component-item').forEach(item => {
            const name = item.querySelector('.component-name')?.textContent.toLowerCase() || '';
            item.style.display = name.includes(term) ? '' : 'none';
        });
    });
}

function setupCustomComponent() {
    const addBtn = document.getElementById('addCustomComponent');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const name = prompt('电池名称:', 'MyComponent');
            if (!name) return;
            const inputs = prompt('输入端口 (逗号分隔):', 'A,B');
            const outputs = prompt('输出端口 (逗号分隔):', 'Result');
            
            const newTemplate = {
                name: name,
                inputs: inputs ? inputs.split(',').map(s => s.trim()) : [],
                outputs: outputs ? outputs.split(',').map(s => s.trim()) : []
            };
            componentTemplates.push(newTemplate);
            initComponentLibrary();
            setupLibrarySearch();
            canvasManager.updateStatus(`${t('statusAdded')}: ${name}`);
        });
    }
}

function setupImportExport() {
    const exportBtn = document.getElementById('exportJson');
    const importBtn = document.getElementById('importJson');
    const importFile = document.getElementById('importFile');
    
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
            canvasManager.updateStatus(t('statusExported'));
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
                    canvasManager.updateStatus(`${t('statusImported')}: ${file.name}`);
                } catch (err) {
                    alert('解析失败: ' + err.message);
                }
            };
            reader.readAsText(file);
            importFile.value = '';
        });
    }
}

function setupClearCanvas() {
    const clearBtn = document.getElementById('clearCanvas');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => canvasManager.clearCanvas());
    }
}

function setupZoomFit() {
    const zoomFitBtn = document.getElementById('zoomFit');
    if (zoomFitBtn) {
        zoomFitBtn.addEventListener('click', () => canvasManager.fitToView());
    }
}

function setupUndoRedo() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn) undoBtn.addEventListener('click', () => canvasManager.undo());
    if (redoBtn) redoBtn.addEventListener('click', () => canvasManager.redo());
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) canvasManager.redo();
            else canvasManager.undo();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            canvasManager.redo();
        } else if (e.key === 'Delete') {
            canvasManager.deleteSelectedComponents();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            canvasManager.duplicateSelectedComponents();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            canvasManager.selectAll();
        } else if (e.key === 'Escape') {
            canvasManager.clearSelection();
        }
    });
}

function setupHelpModal() {
    const showHelpBtn = document.getElementById('showHelp');
    const helpModal = document.getElementById('helpModal');
    const closeHelpBtn = document.getElementById('closeHelpBtn');
    
    if (showHelpBtn) {
        showHelpBtn.addEventListener('click', () => {
            if (helpModal) helpModal.style.display = 'flex';
        });
    }
    
    if (closeHelpBtn && helpModal) {
        closeHelpBtn.addEventListener('click', () => {
            helpModal.style.display = 'none';
        });
        
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) helpModal.style.display = 'none';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    
    canvasManager = new CanvasManager(canvas, componentTemplates, (component) => {
        if (component) {
            canvasManager.updateStatus(`${t('statusSelected')}: ${component.name}`);
        }
    });
    
    initComponentLibrary();
    setupLibrarySearch();
    setupCanvasDrop();
    setupCustomComponent();
    setupImportExport();
    setupClearCanvas();
    setupZoomFit();
    setupUndoRedo();
    setupKeyboardShortcuts();
    setupHelpModal();
});
