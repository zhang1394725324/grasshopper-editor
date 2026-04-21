// 主程序
let canvasManager;
let dragData = null;
let lang = 'cn';
let componentsData = {};
let groupsList = [];
let detailsCache = new Map(); // 缓存已加载的详情

window.dragData = dragData;

// JSON 文件路径
const INDEX_URL = 'https://raw.githubusercontent.com/zhang1394725324/Rhino-gh-kangaroo-docs/main/data/kangaroo.json';
const DETAILS_BASE_URL = 'https://raw.githubusercontent.com/zhang1394725324/Rhino-gh-kangaroo-docs/main/data/details/';

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

// 从 details JSON 文件中提取输入端口名称
async function loadComponentDetails(componentName) {
    // 检查缓存
    if (detailsCache.has(componentName)) {
        return detailsCache.get(componentName);
    }
    
    try {
        const url = `${DETAILS_BASE_URL}${componentName}.json?t=${Date.now()}`;
        console.log(`📥 加载详情: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`⚠️ 无法加载 ${componentName}.json`);
            return { inputs: [], outputs: [] };
        }
        
        const detail = await response.json();
        
        // 提取输入端口名称
        const inputs = [];
        if (detail.parameters && Array.isArray(detail.parameters)) {
            detail.parameters.forEach(p => {
                if (p.name) inputs.push(p.name);
            });
        }
        
        // 提取输出端口名称
        const outputs = [];
        if (detail.outputs && Array.isArray(detail.outputs)) {
            detail.outputs.forEach(o => {
                if (o.name) outputs.push(o.name);
            });
        }
        
        const result = { inputs, outputs };
        detailsCache.set(componentName, result);
        
        console.log(`✅ 加载 ${componentName} 完成: 输入${inputs.length}, 输出${outputs.length}`);
        return result;
    } catch (err) {
        console.error(`❌ 加载 ${componentName} 失败:`, err);
        return { inputs: [], outputs: [] };
    }
}

// 从索引数据中提取端口（如果索引中有的话）
function extractInputsFromIndex(item) {
    if (item.parameters && Array.isArray(item.parameters)) {
        return item.parameters.map(p => p.name || p);
    }
    if (item.inputs && Array.isArray(item.inputs)) {
        return item.inputs;
    }
    return null; // 返回 null 表示需要从 details 加载
}

function extractOutputsFromIndex(item) {
    if (item.outputs && Array.isArray(item.outputs)) {
        return item.outputs.map(o => o.name || o);
    }
    return null; // 返回 null 表示需要从 details 加载
}

function loadComponentsData() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="color: #888; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-pulse"></i> 加载组件数据中...</div>';
    
    fetch(INDEX_URL + '?t=' + Date.now())
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log('✅ 索引数据加载成功');
            componentsData = data;
            
            groupsList = GROUP_ORDER.filter(group => 
                componentsData[group] && componentsData[group].length > 0
            );
            
            renderCategories();
        })
        .catch(err => {
            console.error('❌ 数据加载失败:', err);
            container.innerHTML = `<div style="color:#dc2626;text-align:center;padding:40px;">
                <i class="fas fa-exclamation-triangle"></i> 数据加载失败: ${err.message}
            </div>`;
        });
}

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
        
        const totalSlots = 4 * columns;
        for (let i = 0; i < totalSlots; i++) {
            if (i < items.length) {
                const iconItem = createIconItem(items[i]);
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
}

function createIconItem(item) {
    const iconItem = document.createElement('div');
    iconItem.className = 'card-icon-item';
    iconItem.setAttribute('draggable', 'true');
    
    const displayName = lang === 'cn' ? (item.cn || item.name) : (item.en || item.name);
    iconItem.title = displayName;
    
    // 存储组件基本信息
    iconItem.dataset.componentName = item.name;
    iconItem.dataset.spriteX = item.spriteX || 0;
    iconItem.dataset.spriteY = item.spriteY || 0;
    
    // 尝试从索引中读取端口
    let indexInputs = extractInputsFromIndex(item);
    let indexOutputs = extractOutputsFromIndex(item);
    
    // 如果索引中有端口数据，直接存储
    if (indexInputs !== null && indexOutputs !== null) {
        iconItem.dataset.componentInputs = JSON.stringify(indexInputs);
        iconItem.dataset.componentOutputs = JSON.stringify(indexOutputs);
        iconItem.dataset.detailsLoaded = 'true';
    } else {
        // 标记需要从 details 加载
        iconItem.dataset.detailsLoaded = 'false';
    }
    
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
    
    // 拖拽开始 - 异步加载详情
    iconItem.addEventListener('dragstart', async (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ name: item.name }));
        e.dataTransfer.effectAllowed = 'copy';
        iconItem.style.opacity = '0.5';
        
        console.log(`🚀 拖拽开始: ${item.name}`);
        
        // 如果需要从 details 加载
        let inputs = [];
        let outputs = [];
        
        if (iconItem.dataset.detailsLoaded === 'false') {
            console.log(`📥 正在加载 ${item.name} 的端口详情...`);
            const details = await loadComponentDetails(item.name);
            inputs = details.inputs;
            outputs = details.outputs;
            
            // 缓存到 dataset
            iconItem.dataset.componentInputs = JSON.stringify(inputs);
            iconItem.dataset.componentOutputs = JSON.stringify(outputs);
            iconItem.dataset.detailsLoaded = 'true';
        } else {
            inputs = JSON.parse(iconItem.dataset.componentInputs || '[]');
            outputs = JSON.parse(iconItem.dataset.componentOutputs || '[]');
        }
        
        const componentData = {
            name: item.name,
            inputs: inputs,
            outputs: outputs,
            spriteX: parseInt(iconItem.dataset.spriteX) || 0,
            spriteY: parseInt(iconItem.dataset.spriteY) || 0
        };
        
        dragData = componentData;
        window.dragData = componentData;
        
        console.log(`   输入端口:`, componentData.inputs);
        console.log(`   输出端口:`, componentData.outputs);
    });
    
    iconItem.addEventListener('dragend', (e) => {
        iconItem.style.opacity = '';
        dragData = null;
        window.dragData = null;
    });
    
    return iconItem;
}

function setupCanvasDrop() {
    const canvasContainer = document.querySelector('.canvas-container');
    if (!canvasContainer) return;
    
    canvasContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });
    
    canvasContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        
        let componentData = null;
        
        // 从全局变量获取
        if (window.dragData) {
            componentData = window.dragData;
        }
        if (!componentData && dragData) {
            componentData = dragData;
        }
        
        // 尝试从 dataTransfer 获取
        if (!componentData) {
            try {
                const jsonData = e.dataTransfer.getData('text/plain');
                if (jsonData) {
                    const parsed = JSON.parse(jsonData);
                    if (parsed.name) {
                        // 需要重新加载详情
                        const details = await loadComponentDetails(parsed.name);
                        componentData = {
                            name: parsed.name,
                            inputs: details.inputs,
                            outputs: details.outputs,
                            spriteX: 0,
                            spriteY: 0
                        };
                    }
                }
            } catch (err) {}
        }
        
        if (!componentData) {
            console.warn('❌ 没有拖拽数据');
            return;
        }
        
        console.log(`📍 放置电池: ${componentData.name}`);
        console.log(`   输入端口:`, componentData.inputs);
        console.log(`   输出端口:`, componentData.outputs);
        
        const rect = document.getElementById('canvas').getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const canvasX = (mouseX - canvasManager.panOffset.x) / canvasManager.zoom;
        const canvasY = (mouseY - canvasManager.panOffset.y) / canvasManager.zoom;
        
        const newComponent = new Component(
            generateId(),
            componentData.name,
            canvasX - 75,
            canvasY - 35,
            componentData.inputs || [],
            componentData.outputs || []
        );
        
        console.log(`🔋 创建电池完成，输入: ${newComponent.inputs.length}, 输出: ${newComponent.outputs.length}`);
        
        newComponent.spriteX = componentData.spriteX;
        newComponent.spriteY = componentData.spriteY;
        newComponent.color = getComponentColorByName(componentData.name);
        
        canvasManager.addComponent(newComponent);
        canvasManager.updateStatus(`${t('statusAdded')}: ${componentData.name}`);
    });
}

// 其他函数保持不变...
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
    
    if (typeof loadSpriteImage === 'function') {
        loadSpriteImage(() => {
            if (canvasManager) canvasManager.draw();
        });
    }
    
    console.log('✅ 初始化完成');
});
