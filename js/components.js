// 语言配置
let currentLanguage = 'zh';

const translations = {
    zh: {
        statusReady: '✅ 就绪',
        statusSelected: '已选中',
        statusAdded: '已添加',
        statusDeleted: '已删除',
        statusCopied: '已复制',
        statusCleared: '画布已清空',
        statusImported: '已导入',
        statusExported: '已导出',
        statusUndo: '撤销',
        statusRedo: '重做',
        confirmClear: '确定要清空整个画布吗？',
        renamePrompt: '输入新的电池名称:',
        addInputPrompt: '输入端口名称:',
        addOutputPrompt: '输入端口名称:',
        colorTitle: '选择电池颜色'
    },
    en: {
        statusReady: '✅ Ready',
        statusSelected: 'Selected',
        statusAdded: 'Added',
        statusDeleted: 'Deleted',
        statusCopied: 'Copied',
        statusCleared: 'Canvas cleared',
        statusImported: 'Imported',
        statusExported: 'Exported',
        statusUndo: 'Undo',
        statusRedo: 'Redo',
        confirmClear: 'Clear entire canvas?',
        renamePrompt: 'Enter new component name:',
        addInputPrompt: 'Enter input port name:',
        addOutputPrompt: 'Enter output port name:',
        colorTitle: 'Select component color'
    }
};

function t(key) {
    return translations[currentLanguage][key] || key;
}

function setLanguage(lang) {
    currentLanguage = lang;
    // 更新所有带 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLanguage][key]) {
            el.textContent = translations[currentLanguage][key];
        }
    });
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ========== 雪碧图缓存（多菜单支持）==========
let spriteImages = {};

function loadSpriteForMenu(menuId, spriteUrl, callback) {
    if (!spriteUrl) {
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
        console.warn(`⚠️ 雪碧图加载失败: ${menuId}`, spriteUrl);
        spriteImages[menuId] = null;
        if (callback) callback(null);
    };
    img.src = spriteUrl;
}

function getSpriteForMenu(menuId) {
    return spriteImages[menuId] || null;
}

// ========== 电池组件类（支持调整大小）==========
class Component {
    constructor(id, name, x, y, inputs = [], outputs = []) {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = y;
        this.width = 160;
        // 根据端口数量动态计算高度
        const maxPorts = Math.max(inputs.length, outputs.length);
        this.height = Math.min(200, Math.max(80, 70 + maxPorts * 12));
        
        // 尺寸限制
        this.minWidth = 120;
        this.minHeight = 70;
        this.maxWidth = 350;
        this.maxHeight = 280;
        
        this.color = '#3a6ea5';
        this.spriteX = null;
        this.spriteY = null;
        this.menuId = 'kangaroo'; // 所属菜单，用于加载对应雪碧图
        
        // 调整大小状态
        this.isResizing = false;
        this.resizeEdge = null;
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.resizeStartWidth = 0;
        this.resizeStartHeight = 0;
        this.resizeStartXPos = 0;
        this.resizeStartYPos = 0;
        
        // 输入端口
        this.inputs = [];
        if (inputs && Array.isArray(inputs)) {
            this.inputs = inputs.map((input, idx) => ({
                id: `${id}_input_${idx}`,
                name: input,
                index: idx,
                position: 'left',
                connectedTo: null
            }));
        }
        
        // 输出端口
        this.outputs = [];
        if (outputs && Array.isArray(outputs)) {
            this.outputs = outputs.map((output, idx) => ({
                id: `${id}_output_${idx}`,
                name: output,
                index: idx,
                position: 'right',
                connectedTo: null
            }));
        }
        
        this.isDragging = false;
        this.isSelected = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        console.log(`创建电池: ${name}, 输入: ${inputs.length}, 输出: ${outputs.length}, 尺寸: ${this.width}x${this.height}`);
    }

    // 添加输入端口
    addInput(name) {
        const newInput = {
            id: `${this.id}_input_${this.inputs.length}`,
            name: name,
            index: this.inputs.length,
            position: 'left',
            connectedTo: null
        };
        this.inputs.push(newInput);
        this.updateHeight();
        return newInput;
    }

    // 添加输出端口
    addOutput(name) {
        const newOutput = {
            id: `${this.id}_output_${this.outputs.length}`,
            name: name,
            index: this.outputs.length,
            position: 'right',
            connectedTo: null
        };
        this.outputs.push(newOutput);
        this.updateHeight();
        return newOutput;
    }

    // 删除输入端口
    removeInput(index) {
        if (index >= 0 && index < this.inputs.length) {
            this.inputs.splice(index, 1);
            this.inputs.forEach((input, idx) => {
                input.index = idx;
                input.id = `${this.id}_input_${idx}`;
            });
            this.updateHeight();
        }
    }

    // 删除输出端口
    removeOutput(index) {
        if (index >= 0 && index < this.outputs.length) {
            this.outputs.splice(index, 1);
            this.outputs.forEach((output, idx) => {
                output.index = idx;
                output.id = `${this.id}_output_${idx}`;
            });
            this.updateHeight();
        }
    }

    // 根据端口数量动态调整高度
    updateHeight() {
        const maxPorts = Math.max(this.inputs.length, this.outputs.length);
        const newHeight = Math.min(this.maxHeight, Math.max(this.minHeight, 70 + maxPorts * 12));
        if (newHeight !== this.height) {
            this.height = newHeight;
        }
    }
    
    // 设置宽度
    setWidth(newWidth) {
        this.width = Math.min(this.maxWidth, Math.max(this.minWidth, newWidth));
    }
    
    // 设置高度
    setHeight(newHeight) {
        this.height = Math.min(this.maxHeight, Math.max(this.minHeight, newHeight));
    }
    
    // 检查点击是否在调整大小手柄上
    hitResizeHandle(mouseX, mouseY, handleSize = 8) {
        const handles = [
            { edge: 'nw', x: this.x, y: this.y, cursor: 'nw-resize' },
            { edge: 'n', x: this.x + this.width / 2, y: this.y, cursor: 'n-resize' },
            { edge: 'ne', x: this.x + this.width, y: this.y, cursor: 'ne-resize' },
            { edge: 'e', x: this.x + this.width, y: this.y + this.height / 2, cursor: 'e-resize' },
            { edge: 'se', x: this.x + this.width, y: this.y + this.height, cursor: 'se-resize' },
            { edge: 's', x: this.x + this.width / 2, y: this.y + this.height, cursor: 's-resize' },
            { edge: 'sw', x: this.x, y: this.y + this.height, cursor: 'sw-resize' },
            { edge: 'w', x: this.x, y: this.y + this.height / 2, cursor: 'w-resize' }
        ];
        
        for (const handle of handles) {
            if (Math.abs(mouseX - handle.x) <= handleSize && Math.abs(mouseY - handle.y) <= handleSize) {
                return handle;
            }
        }
        return null;
    }
    
    // 开始调整大小
    startResize(edge, mouseX, mouseY) {
        this.isResizing = true;
        this.resizeEdge = edge;
        this.resizeStartX = mouseX;
        this.resizeStartY = mouseY;
        this.resizeStartWidth = this.width;
        this.resizeStartHeight = this.height;
        this.resizeStartXPos = this.x;
        this.resizeStartYPos = this.y;
    }
    
    // 调整大小
    resize(mouseX, mouseY) {
        if (!this.isResizing) return;
        
        const dx = mouseX - this.resizeStartX;
        const dy = mouseY - this.resizeStartY;
        let newWidth = this.resizeStartWidth;
        let newHeight = this.resizeStartHeight;
        let newX = this.resizeStartXPos;
        let newY = this.resizeStartYPos;
        
        switch (this.resizeEdge) {
            case 'nw':
                newWidth = this.resizeStartWidth - dx;
                newHeight = this.resizeStartHeight - dy;
                newX = this.resizeStartXPos + dx;
                newY = this.resizeStartYPos + dy;
                break;
            case 'n':
                newHeight = this.resizeStartHeight - dy;
                newY = this.resizeStartYPos + dy;
                break;
            case 'ne':
                newWidth = this.resizeStartWidth + dx;
                newHeight = this.resizeStartHeight - dy;
                newY = this.resizeStartYPos + dy;
                break;
            case 'e':
                newWidth = this.resizeStartWidth + dx;
                break;
            case 'se':
                newWidth = this.resizeStartWidth + dx;
                newHeight = this.resizeStartHeight + dy;
                break;
            case 's':
                newHeight = this.resizeStartHeight + dy;
                break;
            case 'sw':
                newWidth = this.resizeStartWidth - dx;
                newHeight = this.resizeStartHeight + dy;
                newX = this.resizeStartXPos + dx;
                break;
            case 'w':
                newWidth = this.resizeStartWidth - dx;
                newX = this.resizeStartXPos + dx;
                break;
        }
        
        // 应用边界限制
        newWidth = Math.min(this.maxWidth, Math.max(this.minWidth, newWidth));
        newHeight = Math.min(this.maxHeight, Math.max(this.minHeight, newHeight));
        
        // 防止位置超出边界（确保电池不超出画布可视区域）
        if (newX !== this.x) this.x = newX;
        if (newY !== this.y) this.y = newY;
        if (newWidth !== this.width) this.width = newWidth;
        if (newHeight !== this.height) this.height = newHeight;
    }
    
    // 结束调整大小
    endResize() {
        this.isResizing = false;
        this.resizeEdge = null;
    }

    // 获取端口位置
    getPortPosition(port) {
        const totalPorts = port.position === 'left' ? this.inputs.length : this.outputs.length;
        const availableHeight = this.height - 30;
        const portSpacing = availableHeight / (totalPorts + 1);
        const yOffset = 18 + portSpacing * (port.index + 1);
        
        return {
            x: this.x + (port.position === 'left' ? 0 : this.width),
            y: this.y + yOffset
        };
    }
    
    // 获取图标位置
    getIconPosition() {
        return {
            x: this.x + this.width / 2,
            y: this.y + 32
        };
    }
    
    // 获取名称位置（居中）
    getNamePosition() {
        return {
            x: this.x + this.width / 2,
            y: this.y + 16
        };
    }
    
    // 转换为 JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            color: this.color,
            spriteX: this.spriteX,
            spriteY: this.spriteY,
            menuId: this.menuId,
            inputs: this.inputs.map(i => i.name),
            outputs: this.outputs.map(o => o.name)
        };
    }
    
    // 从 JSON 恢复
    static fromJSON(data) {
        const comp = new Component(
            data.id, data.name, data.x, data.y,
            data.inputs || [], data.outputs || []
        );
        if (data.width) comp.width = data.width;
        if (data.height) comp.height = data.height;
        if (data.color) comp.color = data.color;
        if (data.spriteX) comp.spriteX = data.spriteX;
        if (data.spriteY) comp.spriteY = data.spriteY;
        if (data.menuId) comp.menuId = data.menuId;
        return comp;
    }
}

// ========== 连接线类 ==========
class Connection {
    constructor(id, fromComponentId, fromPortId, toComponentId, toPortId) {
        this.id = id;
        this.fromComponentId = fromComponentId;
        this.fromPortId = fromPortId;
        this.toComponentId = toComponentId;
        this.toPortId = toPortId;
    }
    
    toJSON() {
        return {
            id: this.id,
            fromComponentId: this.fromComponentId,
            fromPortId: this.fromPortId,
            toComponentId: this.toComponentId,
            toPortId: this.toPortId
        };
    }
    
    static fromJSON(data) {
        return new Connection(
            data.id, data.fromComponentId, data.fromPortId,
            data.toComponentId, data.toPortId
        );
    }
}

// ========== 历史记录条目 ==========
class HistoryEntry {
    constructor(components, connections, action) {
        this.components = JSON.parse(JSON.stringify(components));
        this.connections = JSON.parse(JSON.stringify(connections));
        this.action = action;
        this.timestamp = Date.now();
    }
}

// ========== 预设颜色 ==========
const presetColors = [
    '#3a6ea5',  // 默认蓝色
    '#4a7eb5',
    '#5a8ec5',
    '#2a5e95',
    '#4caf50',  // 绿色
    '#2196f3',  // 亮蓝
    '#ff9800',  // 橙色
    '#9c27b0',  // 紫色
    '#f44336',  // 红色
    '#00bcd4'   // 青色
];

// 获取电池类型对应的默认颜色（统一使用蓝色）
function getComponentColorByName(name) {
    // 所有电池统一使用蓝色主题
    return '#3a6ea5';
}

// ========== 导出全局函数 ==========
// 预加载雪碧图（供外部调用）
function preloadSpriteForMenu(menuId, spriteUrl) {
    loadSpriteForMenu(menuId, spriteUrl);
}

// 获取雪碧图
function getSpriteImage(menuId) {
    return getSpriteForMenu(menuId);
}

// 初始化组件模块
function initComponents() {
    console.log('🔧 组件模块初始化完成');
}

// 页面加载时自动初始化
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        initComponents();
    });
}
