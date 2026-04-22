// 主程序 - 多菜单架构（支持独立雪碧图和详情）
let canvasManager;
let dragData = null;
let lang = 'cn';
let activeMenuId = 'kangaroo';

// 雪碧图缓存
let spriteImages = {};

// ========== 菜单配置 - 在这里添加新菜单 ==========
const MENU_CONFIG = {
    kangaroo: {
        id: 'kangaroo',
        nameCn: '🦘 Kangaroo2',
        nameEn: '🦘 Kangaroo2',
        icon: 'fa-puzzle-piece',
        // 数据文件路径
        dataUrl: 'https://raw.githubusercontent.com/zhang1394725324/Rhino-gh-kangaroo-docs/main/data/kangaroo.json',
        // 雪碧图路径
        spriteUrl: 'https://raw.githubusercontent.com/zhang1394725324/Rhino-gh-kangaroo-docs/main/img/sprites/kangaroo_icons.png',
        // 详情文件基础路径
        detailsBaseUrl: 'https://raw.githubusercontent.com/zhang1394725324/Rhino-gh-kangaroo-docs/main/data/details/kangaroo/',
        // 分组配置
        groupOrder: ['Goals-6dof', 'Goals-Angle', 'Goals-Co', 'Goals-Col', 'Goals-Lin',
                     'Goals-Mesh', 'Goals-On', 'Goals-Pt', 'Main', 'Mesh'],
        groupNames: {
            'Goals-6dof': '六自由度约束',
            'Goals-Angle': '角度约束',
            'Goals-Co': '重合/共线/共面',
            'Goals-Col': '碰撞约束',
            'Goals-Lin': '长度/弹簧约束',
            'Goals-Mesh': '网格曲面约束',
            'Goals-On': '在几何体上',
            'Goals-Pt': '点/锚点约束',
            'Main': '求解器与核心',
            'Mesh': '网格工具'
        },
        groupNamesEn: {
            'Goals-6dof': '6-DOF Constraints',
            'Goals-Angle': 'Angle Constraints',
            'Goals-Co': 'Coincident/Collinear/Coplanar',
            'Goals-Col': 'Collision Constraints',
            'Goals-Lin': 'Length/Spring Constraints',
            'Goals-Mesh': 'Mesh/Surface Constraints',
            'Goals-On': 'On Geometry',
            'Goals-Pt': 'Point/Anchor Constraints',
            'Main': 'Solver & Core',
            'Mesh': 'Mesh Tools'
        }
    },
    params: {
        id: 'params',
        nameCn: '📊 Params',
        nameEn: '📊 Params',
        icon: 'fa-sliders-h',
        dataUrl: 'https://raw.githubusercontent.com/zhang1394725324/Rhino-gh-kangaroo-docs/main/data/params.json',
        spriteUrl: 'https://raw.githubusercontent.com/zhang1394725324/Rhino-gh-kangaroo-docs/main/img/sprites/params_icons.png',
        detailsBaseUrl: 'https://raw.githubusercontent.com/zhang1394725324/Rhino-gh-kangaroo-docs/main/data/details/params/',
        groupOrder: ['Primitive', 'Input', 'Output', 'File', 'Annotation', 'Model', 'Special', 'Get'],
        groupNames: {
            'Primitive': '基本类型',
            'Input': '输入组件',
            'Output': '输出组件',
            'File': '文件操作',
            'Annotation': '标注工具',
            'Model': '模型对象',
            'Special': '特殊工具',
            'Get': '获取器'
        },
        groupNamesEn: {
            'Primitive': 'Primitive',
            'Input': 'Input',
            'Output': 'Output',
            'File': 'File',
            'Annotation': 'Annotation',
            'Model': 'Model',
            'Special': 'Special',
            'Get': 'Getter'
        }
    }
    utility: {
        id: 'utility',
        nameCn: '🔧 工具',
        nameEn: '🔧 Utility',
        icon: 'fa-tools',
        dataUrl: 'https://raw.githubusercontent.com/zhang1394725324/Rhino-gh-kangaroo-docs/main/data/utility.json',
        spriteUrl: 'https://raw.githubusercontent.com/zhang1394725324/Rhino-gh-kangaroo-docs/main/img/sprites/utility_icons.png',
        detailsBaseUrl: 'https://raw.githubusercontent.com/zhang1394725324/Rhino-gh-kangaroo-docs/main/data/details/utility/',
        groupOrder: ['Utility'],
        groupNames: {
            'Utility': '工具/实用'
        },
        groupNamesEn: {
            'Utility': 'Utility'
        }
    }
    // ========== 添加新菜单示例 ==========
    // mesh: {
    //     id: 'mesh',
    //     nameCn: '🔷 网格',
    //     nameEn: '🔷 Mesh',
    //     icon: 'fa-cube',
    //     dataUrl: 'https://.../data/mesh.json',
    //     spriteUrl: 'https://.../img/sprites/mesh_icons.png',
    //     detailsBaseUrl: 'https://.../data/details/mesh/',
    //     groupOrder: ['MeshTools', 'SubD'],
    //     groupNames: {
    //         'MeshTools': '网格工具',
    //         'SubD': '细分曲面'
    //     },
    //     groupNamesEn: {
    //         'MeshTools': 'Mesh Tools',
    //         'SubD': 'Subdivision'
    //     }
    // }
};

let menuData = {};      // 存储各菜单的原始数据
let currentData = {};   // 当前显示的数据
let currentGroupOrder = [];
let currentGroupNames = {};
let currentGroupNamesEn = {};
let currentConfig = null;

window.dragData = dragData;

// ========== 雪碧图加载 ==========
function loadSpriteForMenu(menuId, callback) {
    const config = MENU_CONFIG[menuId];
    if (!config || !config.spriteUrl) {
        if (callback) callback(null);
        return;
    }
    
    // 检查缓存
    if (spriteImages[menuId] && spriteImages[menuId].complete) {
        if (callback) callback(spriteImages[menuId]);
        return;
    }
    
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
        console.log(`✅ 雪碧图加载成功: ${menuId}`);
        spriteImages[menuId] = img;
        if (callback) callback(img);
    };
    img.onerror = () => {
        console.warn(`⚠️ 雪碧图加载失败: ${menuId}`, config.spriteUrl);
        spriteImages[menuId] = null;
        if (callback) callback(null);
    };
    img.src = config.spriteUrl;
}

function getSpriteForMenu(menuId) {
    return spriteImages[menuId] || null;
}

// ========== 加载组件详情（从独立文件夹）==========
async function loadComponentDetails(menuId, componentName) {
    const config = MENU_CONFIG[menuId];
    if (!config) return { inputs: [], outputs: [] };
    
    // 检查缓存（使用 menuId + componentName 作为缓存键）
    const cacheKey = `${menuId}_${componentName}`;
    if (window.detailsCache && window.detailsCache[cacheKey]) {
        return window.detailsCache[cacheKey];
    }
    if (!window.detailsCache) window.detailsCache = {};
    
    try {
        const url = `${config.detailsBaseUrl}${componentName}.json?t=${Date.now()}`;
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
        window.detailsCache[cacheKey] = result;
        
        console.log(`✅ 加载 ${componentName} 完成: 输入${inputs.length}, 输出${outputs.length}`);
        return result;
    } catch (err) {
        console.error(`❌ 加载 ${componentName} 失败:`, err);
        return { inputs: [], outputs: [] };
    }
}

// 提取输入端口名称（从索引数据）
function extractInputsFromIndex(item) {
    if (!item) return null;
    if (item.parameters && Array.isArray(item.parameters)) {
        return item.parameters.map(p => p.name || p);
    }
    if (item.inputs && Array.isArray(item.inputs)) {
        return item.inputs;
    }
    return null;
}

function extractOutputsFromIndex(item) {
    if (!item) return null;
    if (item.outputs && Array.isArray(item.outputs)) {
        return item.outputs.map(o => o.name || o);
    }
    return null;
}

// 加载单个菜单数据
function loadMenuData(menuId) {
    const config = MENU_CONFIG[menuId];
    if (!config) return Promise.reject(`菜单 ${menuId} 不存在`);
    
    console.log(`📡 加载 ${menuId} 数据:`, config.dataUrl);
    
    // 同时预加载雪碧图
    loadSpriteForMenu(menuId);
    
    return fetch(config.dataUrl + '?t=' + Date.now())
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log(`✅ ${menuId} 数据加载成功`);
            menuData[menuId] = data;
            return true;
        })
        .catch(err => {
            console.error(`❌ ${menuId} 数据加载失败:`, err);
            menuData[menuId] = {};
            return false;
        });
}

// 加载所有菜单数据
function loadAllMenusData() {
    const container = document.getElementById('categoriesContainer');
    if (container) {
        container.innerHTML = '<div style="color: #888; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-pulse"></i> 加载组件数据中...</div>';
    }
    
    const promises = Object.keys(MENU_CONFIG).map(menuId => loadMenuData(menuId));
    
    Promise.all(promises)
        .then(() => {
            renderMenuTabs();
            switchMenu(activeMenuId);
        })
        .catch(err => {
            console.error('数据加载出错:', err);
            if (container) {
                container.innerHTML = `<div style="color:#dc2626;text-align:center;padding:40px;">
                    <i class="fas fa-exclamation-triangle"></i> 数据加载失败
                </div>`;
            }
        });
}

// 渲染菜单标签页
function renderMenuTabs() {
    const tabsContainer = document.getElementById('libraryTabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = '';
    
    Object.keys(MENU_CONFIG).forEach(menuId => {
        const config = MENU_CONFIG[menuId];
        const displayName = lang === 'cn' ? config.nameCn : config.nameEn;
        
        const btn = document.createElement('button');
        btn.className = `tab-btn ${menuId === activeMenuId ? 'active' : ''}`;
        btn.setAttribute('data-menu', menuId);
        btn.innerHTML = `<i class="fas ${config.icon}"></i> ${displayName}`;
        btn.addEventListener('click', () => switchMenu(menuId));
        tabsContainer.appendChild(btn);
    });
}

// 切换菜单
function switchMenu(menuId) {
    const config = MENU_CONFIG[menuId];
    if (!config) return;
    
    activeMenuId = menuId;
    currentConfig = config;
    currentData = menuData[menuId] || {};
    currentGroupOrder = config.groupOrder.filter(group => 
        currentData[group] && currentData[group].length > 0
    );
    currentGroupNames = config.groupNames;
    currentGroupNamesEn = config.groupNamesEn;
    
    // 更新标签页样式
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-menu') === menuId);
    });
    
    renderCategories();
}

function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'categories-grid';
    
    currentGroupOrder.forEach(groupKey => {
        const items = currentData[groupKey];
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
        const displayName = lang === 'cn' ? currentGroupNames[groupKey] : currentGroupNamesEn[groupKey];
        titleSpan.textContent = displayName || groupKey;
        titleArea.appendChild(titleSpan);
        
        card.appendChild(iconsArea);
        card.appendChild(titleArea);
        grid.appendChild(card);
    });
    
    container.appendChild(grid);
    console.log(`✅ 已渲染 ${currentGroupOrder.length} 个分类卡片 (${activeMenuId})`);
}

function createIconItem(item) {
    const iconItem = document.createElement('div');
    iconItem.className = 'card-icon-item';
    iconItem.setAttribute('draggable', 'true');
    
    const displayName = lang === 'cn' ? (item.cn || item.name) : (item.en || item.name);
    iconItem.title = displayName;
    
    // 存储组件信息
    iconItem.dataset.componentName = item.name;
    iconItem.dataset.spriteX = item.spriteX || 0;
    iconItem.dataset.spriteY = item.spriteY || 0;
    iconItem.dataset.menuId = activeMenuId;
    
    // 尝试从索引读取端口
    let indexInputs = extractInputsFromIndex(item);
    let indexOutputs = extractOutputsFromIndex(item);
    
    if (indexInputs !== null && indexOutputs !== null) {
        iconItem.dataset.componentInputs = JSON.stringify(indexInputs);
        iconItem.dataset.componentOutputs = JSON.stringify(indexOutputs);
        iconItem.dataset.detailsLoaded = 'true';
    } else {
        iconItem.dataset.detailsLoaded = 'false';
    }
    
    const sprite = document.createElement('div');
    sprite.className = 'card-icon-sprite';
    // 注意：雪碧图背景在 CSS 中设置，但坐标需要动态设置
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
        e.dataTransfer.setData('text/plain', JSON.stringify({ 
            name: item.name,
            menuId: activeMenuId 
        }));
        e.dataTransfer.effectAllowed = 'copy';
        iconItem.style.opacity = '0.5';
        
        console.log(`🚀 拖拽开始: ${item.name} (${activeMenuId})`);
        
        let inputs = [];
        let outputs = [];
        
        if (iconItem.dataset.detailsLoaded === 'false') {
            console.log(`📥 正在加载 ${item.name} 的端口详情...`);
            const details = await loadComponentDetails(activeMenuId, item.name);
            inputs = details.inputs;
            outputs = details.outputs;
            
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
            spriteY: parseInt(iconItem.dataset.spriteY) || 0,
            menuId: activeMenuId
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
                    if (parsed.name && parsed.menuId) {
                        const details = await loadComponentDetails(parsed.menuId, parsed.name);
                        componentData = {
                            name: parsed.name,
                            inputs: details.inputs,
                            outputs: details.outputs,
                            spriteX: 0,
                            spriteY: 0,
                            menuId: parsed.menuId
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
            canvasX - 80,
            canvasY - 40,
            componentData.inputs || [],
            componentData.outputs || []
        );
        
        newComponent.spriteX = componentData.spriteX;
        newComponent.spriteY = componentData.spriteY;
        newComponent.menuId = componentData.menuId;
        newComponent.color = getComponentColorByName(componentData.name);
        
        canvasManager.addComponent(newComponent);
        canvasManager.updateStatus(`${t('statusAdded')}: ${componentData.name}`);
    });
}

// ========== 其他函数（setupLanguage, setupLibrarySearch 等保持不变）==========
function setupLanguage() {
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            lang = lang === 'cn' ? 'en' : 'cn';
            langBtn.textContent = lang === 'cn' ? 'EN' : '中';
            renderMenuTabs();
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
    
    loadAllMenusData();
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
    
    console.log('✅ 初始化完成');
});
