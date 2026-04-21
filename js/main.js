// 主程序
let canvasManager;
let dragData = null;
let lang = 'cn';
let componentsData = {};
let groupsList = [];

// 挂载到 window 对象，确保全局可访问
window.dragData = dragData;

// 跨项目引用 JSON 数据（使用 GitHub Raw，已验证可用）
const JSON_URL = 'https://raw.githubusercontent.com/zhang1394725324/Rhino-gh-kangaroo-docs/main/data/kangaroo.json';

// 分组配置
const GROUP_ORDER = [
    'Goals-6dof', 'Goals-Angle', 'Goals-Co', 'Goals-Col', 'Goals-Lin',
    'Goals-Mesh', 'Goals-On', 'Goals-Pt', 'Main', 'Mesh', 'Utility'
];

const groupDisplayNames = {
    'Goals-6dof': '六自由度约束',
    'Goals-Angle': '角度约束',
    'Goals-Co': '重合/共线/共面',
    'Goals-Col': '碰撞约束',
    'Goals-Lin': '长度/弹簧约束',
    'Goals-Mesh': '网格曲面约束',
    'Goals-On': '在几何体上',
    'Goals-Pt': '点/锚点约束',
    'Main': '求解器与核心',
    'Mesh': '网格工具',
    'Utility': '实用工具'
};

const groupDisplayNamesEn = {
    'Goals-6dof': '6-DOF Constraints',
    'Goals-Angle': 'Angle Constraints',
    'Goals-Co': 'Coincident/Collinear/Coplanar',
    'Goals-Col': 'Collision Constraints',
    'Goals-Lin': 'Length/Spring Constraints',
    'Goals-Mesh': 'Mesh/Surface Constraints',
    'Goals-On': 'On Geometry',
    'Goals-Pt': 'Point/Anchor Constraints',
    'Main': 'Solver & Core',
    'Mesh': 'Mesh Tools',
    'Utility': 'Utilities'
};

// ========== 辅助函数：从 JSON 组件中提取输入端口名称 ==========
function extractInputs(item) {
    // 优先使用 parameters 字段
    if (item.parameters && Array.isArray(item.parameters)) {
        return item.parameters.map(p => p.name || p);
    }
    // 兼容旧格式 inputs
    if (item.inputs && Array.isArray(item.inputs)) {
        return item.inputs;
    }
    return [];
}

// ========== 辅助函数：从 JSON 组件中提取输出端口名称 ==========
function extractOutputs(item) {
    // 优先使用 outputs 字段
    if (item.outputs && Array.isArray(item.outputs)) {
        return item.outputs.map(o => o.name || o);
    }
    return [];
}

// ========== 数据加载 ==========
function loadComponentsData() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="color: #888; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-pulse"></i> 加载组件数据中...</div>';
    
    fetch(JSON_URL + '?t=' + Date.now())
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log('✅ 组件数据加载成功', data);
            componentsData = data;
            
            groupsList = GROUP_ORDER.filter(group => 
                componentsData[group] && componentsData[group].length > 0
            );
            
            renderCategories();
        })
        .catch(err => {
            console.error('❌ 数据加载失败:', err);
            container.innerHTML = `<div style="color:#dc2626;text-align:center;padding:40px;">
                <i class="fas fa-exclamation-triangle"></i> 数据加载失败: ${err.message}<br>
                <small>请检查网络连接</small>
            </div>`;
        });
}

// ========== 渲染分类卡片 ==========
function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const grid = document.createElement('div');
    grid.className = 'categories-grid';
    
    groupsList.forEach(groupKey => {
        const items = componentsData[groupKey];
        if (!items || items.length === 0) return;
        
        const itemCount = items.length;
        
        // 计算列数
        let columns = 2;
        if (itemCount <= 8) columns = 2;
        else if (itemCount <= 12) columns = 3;
        else if (itemCount <= 16) columns = 4;
        else if (itemCount <= 20) columns = 5;
        else columns = 6;
        
        const card = document.createElement('div');
        card.className = 'category-card';
        
        const iconsArea = document.createElement('div');
        iconsArea.className = 'card-icons-area';
        
        const iconsGrid = document.createElement('div');
        iconsGrid.className = 'card-icons-grid';
        iconsGrid.setAttribute('data-columns', columns);
        
        // 填充图标（4行 x columns列）
        const totalSlots = 4 * columns;
        for (let i = 0; i < totalSlots; i++) {
            if (i < items.length) {
                const item = items[i];
                const iconItem = createIconItem(item);
                iconsGrid.appendChild(iconItem);
            } else {
                const emptyItem = document.createElement('div');
                emptyItem.style.visibility = 'hidden';
                iconsGrid.appendChild(emptyItem);
            }
        }
        
        iconsArea.appendChild(iconsGrid);
        
        const titleArea = document.createElement('div');
        titleArea.className = 'category-title';
        const titleSpan = document.createElement('span');
        const displayName = lang === 'cn' ? groupDisplayNames[groupKey] : groupDisplayNamesEn[groupKey];
        titleSpan.textContent = displayName || groupKey;
        titleArea.appendChild(titleSpan);
        
        card.appendChild(iconsArea);
        card.appendChild(titleArea);
        grid.appendChild(card);
    });
    
    container.appendChild(grid);
    console.log(`✅ 已渲染 ${groupsList.length} 个分类卡片`);
}

// ========== 创建图标项（可拖拽）==========
function createIconItem(item) {
    const iconItem = document.createElement('div');
    iconItem.className = 'card-icon-item';
    iconItem.setAttribute('draggable', 'true');
    
    const displayName = lang === 'cn' ? (item.cn || item.name) : (item.en || item.name);
    iconItem.title = displayName;
    
    // 提取输入和输出端口
    const inputs = extractInputs(item);
    const outputs = extractOutputs(item);
    
    // 存储组件数据到 dataset
    iconItem.dataset.componentName = item.name;
    iconItem.dataset.componentInputs = JSON.stringify(inputs);
    iconItem.dataset.componentOutputs = JSON.stringify(outputs);
    iconItem.dataset.spriteX = item.spriteX || 0;
    iconItem.dataset.spriteY = item.spriteY || 0;
    
    const sprite = document.createElement('div');
    sprite.className = 'card-icon-sprite';
    sprite.style.backgroundPosition = `-${item.spriteX || 0}px -${item.spriteY || 0}px`;
    
    const nameSpan = document.createElement('div');
    nameSpan.className = 'card-icon-name';
    let shortName = displayName;
    if (shortName.length > 12) {
        shortName = shortName.substring(0, 10) + '...';
    }
    nameSpan.textContent = shortName;
    nameSpan.title = displayName;
    
    iconItem.appendChild(sprite);
    iconItem.appendChild(nameSpan);
    
    // 拖拽事件
    iconItem.addEventListener('dragstart', (e) => {
        const componentData = {
            name: item.name,
            inputs: inputs,
            outputs: outputs,
            spriteX: item.spriteX || 0,
            spriteY: item.spriteY || 0
        };
        dragData = componentData;
        window.dragData = componentData;
        e.dataTransfer.setData('text/plain', JSON.stringify(componentData));
        e.dataTransfer.effectAllowed = 'copy';
        iconItem.style.opacity = '0.5';
        console.log('拖拽开始:', componentData.name, '输入:', inputs, '输出:', outputs);
    });
    
    iconItem.addEventListener('dragend', (e) => {
        iconItem.style.opacity = '';
        dragData = null;
        window.dragData = null;
    });
    
    return iconItem;
}

// ========== 设置画布拖拽放置 ==========
function setupCanvasDrop() {
    const canvasContainer = document.querySelector('.canvas-container');
    if (!canvasContainer) return;
    
    canvasContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });
    
    canvasContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        
        let componentData = null;
        
        // 尝试从拖拽数据获取
        try {
            const jsonData = e.dataTransfer.getData('text/plain');
            if (jsonData) {
                componentData = JSON.parse(jsonData);
            }
        } catch (err) {
            console.warn('解析拖拽数据失败:', err);
        }
        
        // 也检查全局 dragData
        if (!componentData && window.dragData) {
            componentData = window.dragData;
        }
        if (!componentData && dragData) {
            componentData = dragData;
        }
        
        if (!componentData) {
            console.warn('没有拖拽数据');
            return;
        }
        
        console.log('放置电池:', componentData.name, '输入:', componentData.inputs, '输出:', componentData.outputs);
        
        const rect = document.getElementById('canvas').getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const canvasX = (mouseX - canvasManager.panOffset.x) / canvasManager.zoom;
        const canvasY = (mouseY - canvasManager.panOffset.y) / canvasManager.zoom;
        
        const newComponent = new Component(
            generateId(),
            componentData.name,
            canvasX - 75,
            canvasY - 40,
            componentData.inputs || [],
            componentData.outputs || []
        );
        
        newComponent.spriteX = componentData.spriteX;
        newComponent.spriteY = componentData.spriteY;
        newComponent.color = getComponentColorByName(componentData.name);
        
        canvasManager.addComponent(newComponent);
        canvasManager.updateStatus(`${t('statusAdded')}: ${componentData.name}`);
    });
}

// ========== 语言切换 ==========
function setupLanguage() {
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            lang = lang === 'cn' ? 'en' : 'cn';
            langBtn.textContent = lang === 'cn' ? 'EN' : '中';
            renderCategories();
            
            if (window.currentDetailItem) {
                showComponentDetail(window.currentDetailItem);
            }
        });
    }
}

// ========== 搜索功能 ==========
function setupLibrarySearch() {
    const searchInput = document.getElementById('librarySearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const iconItems = document.querySelectorAll('.card-icon-item');
        
        iconItems.forEach(item => {
            const name = item.title?.toLowerCase() || '';
            const matches = term === '' || name.includes(term);
            item.style.display = matches ? '' : 'none';
        });
        
        const cards = document.querySelectorAll('.category-card');
        cards.forEach(card => {
            const visibleItems = card.querySelectorAll('.card-icon-item[style=""]');
            card.style.display = visibleItems.length === 0 && term !== '' ? 'none' : '';
        });
    });
}

// ========== 自定义电池 ==========
function setupCustomComponent() {
    const addBtn = document.getElementById('addCustomComponent');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const name = prompt('电池名称:', 'MyComponent');
            if (!name) return;
            const inputs = prompt('输入端口 (逗号分隔):', 'A,B');
            const outputs = prompt('输出端口 (逗号分隔):', 'Result');
            
            if (canvasManager) {
                const newComp = new Component(
                    generateId(),
                    name,
                    200, 200,
                    inputs ? inputs.split(',').map(s => s.trim()) : [],
                    outputs ? outputs.split(',').map(s => s.trim()) : []
                );
                newComp.color = getComponentColorByName(name);
                canvasManager.addComponent(newComp);
                canvasManager.updateStatus(`已添加: ${name}`);
            }
        });
    }
}

// ========== 导入导出 ==========
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
            a.download = `kangaroo2_${Date.now()}.json`;
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

// ========== 清空画布 ==========
function setupClearCanvas() {
    const clearBtn = document.getElementById('clearCanvas');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => canvasManager.clearCanvas());
    }
}

// ========== 适应画布 ==========
function setupZoomFit() {
    const zoomFitBtn = document.getElementById('zoomFit');
    if (zoomFitBtn) {
        zoomFitBtn.addEventListener('click', () => canvasManager.fitToView());
    }
}

// ========== 撤销重做 ==========
function setupUndoRedo() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            canvasManager.undo();
            canvasManager.updateStatus(t('statusUndo'));
        });
    }
    if (redoBtn) {
        redoBtn.addEventListener('click', () => {
            canvasManager.redo();
            canvasManager.updateStatus(t('statusRedo'));
        });
    }
}

// ========== 键盘快捷键 ==========
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                canvasManager.redo();
                canvasManager.updateStatus(t('statusRedo'));
            } else {
                canvasManager.undo();
                canvasManager.updateStatus(t('statusUndo'));
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            canvasManager.redo();
            canvasManager.updateStatus(t('statusRedo'));
        } else if (e.key === 'Delete') {
            canvasManager.deleteSelectedComponents();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            canvasManager.duplicateSelectedComponents();
            canvasManager.updateStatus(t('statusCopied'));
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            canvasManager.selectAll();
        } else if (e.key === 'Escape') {
            canvasManager.clearSelection();
        }
    });
}

// ========== 帮助模态框 ==========
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

// ========== 组件详情（可选）==========
async function showComponentDetail(item) {
    console.log('组件详情:', item.name);
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 初始化 Kangaroo2 电池编辑器...');
    
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('❌ 找不到 canvas 元素');
        return;
    }
    
    canvasManager = new CanvasManager(canvas, null, (component) => {
        if (component) {
            canvasManager.updateStatus(`${t('statusSelected')}: ${component.name}`);
        } else {
            canvasManager.updateStatus(t('statusReady'));
        }
    });
    
    loadComponentsData();
    setupCanvasDrop();
    setupLanguage();
    setupLibrarySearch();
    setupCustomComponent();
    setupImportExport();
    setupClearCanvas();
    setupZoomFit();
    setupUndoRedo();
    setupKeyboardShortcuts();
    setupHelpModal();
    
    // 预加载雪碧图
    if (typeof loadSpriteImage === 'function') {
        loadSpriteImage(() => {
            console.log('雪碧图已加载，刷新画布');
            if (canvasManager) canvasManager.draw();
        });
    }
    
    console.log('✅ 初始化完成');
});
