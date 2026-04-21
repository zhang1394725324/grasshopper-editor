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

// 电池组件类（带图标支持）
class Component {
    constructor(id, name, x, y, inputs = [], outputs = []) {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = y;
        this.width = 150;
        this.height = 80;
        this.color = '#2d2d2d'; // 默认颜色
        this.spriteX = null;     // 雪碧图 X 坐标
        this.spriteY = null;     // 雪碧图 Y 坐标
        this.icon = null;        // 预留图标位置（emoji或文字）
        
        // 输入端口
        this.inputs = inputs.map((input, idx) => ({
            id: `${id}_input_${idx}`,
            name: input,
            index: idx,
            position: 'left',
            connectedTo: null
        }));
        
        // 输出端口
        this.outputs = outputs.map((output, idx) => ({
            id: `${id}_output_${idx}`,
            name: output,
            index: idx,
            position: 'right',
            connectedTo: null
        }));
        
        // 拖拽状态
        this.isDragging = false;
        this.isSelected = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
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
        // 重新计算高度（可选）
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
            // 重新索引
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
        // 基础高度60 + 每个端口增加6px，最小70，最大140
        this.height = Math.min(140, Math.max(70, 60 + maxPorts * 6));
    }

    // 获取端口位置
    getPortPosition(port) {
        const totalPorts = port.position === 'left' ? this.inputs.length : this.outputs.length;
        const portSpacing = (this.height - 20) / (totalPorts + 1);
        const yOffset = 15 + portSpacing * (port.index + 1);
        
        return {
            x: this.x + (port.position === 'left' ? 0 : this.width),
            y: this.y + yOffset
        };
    }
    
    // 获取图标位置（电池名称和端口之间的中间区域）
    getIconPosition() {
        return {
            x: this.x + this.width / 2,
            y: this.y + 28
        };
    }
    
    // 获取电池名称位置
    getNamePosition() {
        return {
            x: this.x + 8,
            y: this.y + 16
        };
    }
}

// 连接线类
class Connection {
    constructor(id, fromComponentId, fromPortId, toComponentId, toPortId) {
        this.id = id;
        this.fromComponentId = fromComponentId;
        this.fromPortId = fromPortId;
        this.toComponentId = toComponentId;
        this.toPortId = toPortId;
    }
}

// 历史记录条目
class HistoryEntry {
    constructor(components, connections, action) {
        this.components = JSON.parse(JSON.stringify(components));
        this.connections = JSON.parse(JSON.stringify(connections));
        this.action = action;
        this.timestamp = Date.now();
    }
}

// 预设颜色
const presetColors = [
    '#2d2d2d',  // 默认灰
    '#4caf50',  // 绿色
    '#2196f3',  // 蓝色
    '#f44336',  // 红色
    '#9c27b0',  // 紫色
    '#ff9800',  // 橙色
    '#00bcd4',  // 青色
    '#e91e63',  // 粉色
    '#ffc107',  // 黄色
    '#607d8b'   // 蓝灰色
];

// 获取电池类型对应的默认颜色
function getComponentColorByName(name) {
    if (name.includes('Solver') || name.includes('solver')) return '#4caf50';
    if (name.includes('Anchor') || name.includes('anchor')) return '#2196f3';
    if (name.includes('Spring') || name.includes('spring')) return '#ff9800';
    if (name.includes('Gravity') || name.includes('gravity')) return '#9c27b0';
    if (name.includes('Wind') || name.includes('wind')) return '#00bcd4';
    if (name.includes('Collide') || name.includes('collide')) return '#f44336';
    if (name.includes('Display') || name.includes('display')) return '#e91e63';
    if (name.includes('Slider') || name.includes('slider')) return '#ffc107';
    if (name.includes('List') || name.includes('list')) return '#607d8b';
    return '#2d2d2d';
}

// 加载雪碧图（单例模式）
let spriteImage = null;
let spriteImageLoaded = false;
let spriteImageCallbacks = [];

function loadSpriteImage(callback) {
    if (spriteImageLoaded && spriteImage) {
        if (callback) callback(spriteImage);
        return;
    }
    
    if (callback) spriteImageCallbacks.push(callback);
    
    if (!spriteImage) {
        spriteImage = new Image();
        spriteImage.onload = () => {
            spriteImageLoaded = true;
            spriteImageCallbacks.forEach(cb => cb(spriteImage));
            spriteImageCallbacks = [];
        };
        spriteImage.onerror = () => {
            console.warn('雪碧图加载失败，将使用默认图标');
            spriteImageLoaded = true;
            spriteImageCallbacks.forEach(cb => cb(null));
            spriteImageCallbacks = [];
        };
        // 尝试加载雪碧图
        spriteImage.src = 'https://cdn.jsdelivr.net/gh/zhang1394725324/Rhino-gh-kangaroo-docs@main/img/sprites/kangaroo_icons.png';
    }
}

function getSpriteImage() {
    return spriteImage;
}

function isSpriteLoaded() {
    return spriteImageLoaded && spriteImage && spriteImage.complete;
}
