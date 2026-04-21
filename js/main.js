// 主程序
let canvasManager;
let dragData = null;
let lang = 'cn';
let componentsData = {};
let groupsList = [];

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

// 加载组件数据
function loadComponentsData() {
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = '<div style="color: #888; text-align: center; padding: 40px;">📦 加载组件数据中...</div>';
    
    fetch('data/kangaroo.json?' + Date.now())
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
            container.innerHTML = `<div style="color:#dc2626;text-align:center;padding:40px;">数据加载失败: ${err.message}<br>请确保 data/kangaroo.json 文件存在</div>`;
        });
}

// 渲染分类卡片
function renderCategories() {
    const container = document.getElementById('categoriesContainer');
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
        
        // 填充图标
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
        titleSpan.textContent = lang === 'cn' ? groupDisplayNames[groupKey] : groupKey;
        titleArea.appendChild(titleSpan);
        
        card.appendChild(iconsArea);
        card.appendChild(titleArea);
        grid.appendChild(card);
    });
    
    container.appendChild(grid);
    console.log(`✅ 已渲染 ${groupsList.length} 个分类卡片`);
}

// 创建图标项（可拖拽）
function createIconItem(item) {
    const iconItem = document.createElement('div');
    iconItem.className = 'card-icon-item';
    iconItem.setAttribute('draggable', 'true');
    
    const displayName = lang === 'cn' ? (item.cn || item.name) : (item.en || item.name);
    iconItem.title = displayName;
    
    // 存储组件数据
    iconItem.dataset.componentName = item.name;
    iconItem.dataset.componentInputs = JSON.stringify(item.inputs || []);
    iconItem.dataset.componentOutputs = JSON.stringify(item.outputs || []);
    iconItem.dataset.spriteX = item.spriteX;
    iconItem.dataset.spriteY = item.spriteY;
    
    const sprite = document.createElement('div');
    sprite.className = 'card-icon-sprite';
    sprite.style.backgroundPosition = `-${item.spriteX}px -${item.spriteY}px`;
    
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
        dragData = {
            name: item.name,
            inputs: item.inputs || [],
            outputs: item.outputs || [],
            spriteX: item.spriteX,
            spriteY: item.spriteY
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'copy';
        iconItem.style.opacity = '0.5';
    });
    
    iconItem.addEventListener('dragend', (e) => {
        iconItem.style.opacity = '';
        dragData = null;
    });
    
    return iconItem;
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
            canvasX - 70,
            canvasY - 35,
            componentData.inputs || [],
            componentData.outputs || []
        );
        
        // 设置图标位置（雪碧图坐标）
        newComponent.spriteX = componentData.spriteX;
        newComponent.spriteY = componentData.spriteY;
        
        canvasManager.addComponent(newComponent);
        canvasManager.updateStatus(`${t('statusAdded')}: ${componentData.name}`);
    });
}

// 语言切换
function setupLanguage() {
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            lang = lang === 'cn' ? 'en' : 'cn';
            langBtn.textContent = lang === 'cn' ? 'EN' : '中';
            renderCategories();
        });
    }
}

// 搜索功能
function setupLibrarySearch() {
    const searchInput = document.getElementById('librarySearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.card-icon-item').forEach(item => {
            const name = item.title?.toLowerCase() || '';
            const parentCard = item.closest('.category-card');
            if (parentCard) {
                const hasMatch = name.includes(term);
                item.style.display = hasMatch ? '' : 'none';
                // 如果卡片内所有项都隐藏，则隐藏卡片
                const visibleItems = parentCard.querySelectorAll('.card-icon-item[style=""]');
                parentCard.style.display = visibleItems.length === 0 ? 'none' : '';
            }
        });
    });
}

// 其他辅助函数
function setupCustomComponent() {
    const addBtn = document.getElementById('addCustomComponent');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const name = prompt('电池名称:', 'MyComponent');
            if (!name) return;
            const inputs = prompt('输入端口 (逗号分隔):', 'A,B');
            const outputs = prompt('输出端口 (逗号分隔):', 'Result');
            
            // 添加到临时模板（不保存到文件）
            if (canvasManager) {
                const newComp = new Component(
                    generateId(),
                    name,
                    200, 200,
                    inputs ? inputs.split(',').map(s => s.trim()) : [],
                    outputs ? outputs.split(',').map(s => s.trim()) : []
                );
                canvasManager.addComponent(newComp);
                canvasManager.updateStatus(`已添加: ${name}`);
            }
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
            a.download = `kangaroo2_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            canvasManager.updateStatus('已导出');
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
                    canvasManager.updateStatus(`已导入: ${file.name}`);
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

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    
    canvasManager = new CanvasManager(canvas, null, (component) => {
        if (component) {
            canvasManager.updateStatus(`已选中: ${component.name}`);
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
});
