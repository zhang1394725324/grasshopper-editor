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
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ========== 雪碧图配置 ==========
const SPRITE_URL = 'https://raw.githubusercontent.com/zhang1394725324/Rhino-gh-kangaroo-docs/main/img/sprites/kangaroo_icons.png';

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
        spriteImage.crossOrigin = 'Anonymous';
        spriteImage.onload = () => {
            spriteImageLoaded = true;
            spriteImageCallbacks.forEach(cb => cb(spriteImage));
            spriteImageCallbacks = [];
            console.log('✅ 雪碧图加载成功');
        };
        spriteImage.onerror = () => {
            console.warn('⚠️ 雪碧图加载失败，将使用默认图标');
            spriteImageLoaded = true;
            spriteImageCallbacks.forEach(cb => cb(null));
            spriteImageCallbacks = [];
        };
        spriteImage.src = SPRITE_URL;
    }
}

function getSpriteImage() {
    return spriteImage;
}

// ========== 电池组件类 ==========
class Component {
    constructor(id, name, x, y, inputs = [], outputs = []) {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = y;
        this.width = 150;
        // 根据端口数量动态计算高度：基础高度70 + 每个端口增加10px间距
        const maxPorts = Math.max(inputs.length, outputs.length);
        this.height = Math.min(160, Math.max(80, 70 + maxPorts * 10));
        this.color = '#3a6ea5'; // 统一蓝色主题
        this.spriteX = null;
        this.spriteY = null;
        
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
        
        console.log(`创建电池: ${name}, 输入: ${inputs.length}, 输出: ${outputs.length}, 高度: ${this.height}`);
    }

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

    updateHeight() {
        const maxPorts = Math.max(this.inputs.length, this.outputs.length);
        this.height = Math.min(160, Math.max(80, 70 + maxPorts * 10));
    }

    getPortPosition(port) {
        const totalPorts = port.position === 'left' ? this.inputs.length : this.outputs.length;
        // 端口间距加大：使用 height - 30 作为可用空间
        const availableHeight = this.height - 30;
        const portSpacing = availableHeight / (totalPorts + 1);
        const yOffset = 18 + portSpacing * (port.index + 1);
        
        return {
            x: this.x + (port.position === 'left' ? 0 : this.width),
            y: this.y + yOffset
        };
    }
    
    getIconPosition() {
        return {
            x: this.x + this.width / 2,
            y: this.y + 32
        };
    }
    
    getNamePosition() {
        // 名称居中
        const textWidth = this.name.length * 6; // 估算宽度
        return {
            x: this.x + (this.width - Math.min(textWidth, this.width - 10)) / 2,
            y: this.y + 16
        };
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
}

// ========== 预设颜色（统一使用蓝色）==========
const presetColors = [
    '#3a6ea5',  // 默认蓝色
    '#4a7eb5',
    '#5a8ec5',
    '#2a5e95'
];

// 所有电池统一颜色
function getComponentColorByName(name) {
    return '#3a6ea5'; // 统一返回蓝色
}
