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
    // 更新界面文本
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = translations[currentLanguage][key] || key;
    });
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 电池组件类（带图标预留位）
class Component {
    constructor(id, name, x, y, inputs = [], outputs = []) {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = y;
        this.width = 140;
        this.height = 70;
        this.color = '#ffaa00'; // 默认颜色
        this.icon = null; // 预留图标位置
        this.inputs = inputs.map((input, idx) => ({
            id: `${id}_input_${idx}`,
            name: input,
            index: idx,
            position: 'left',
            connectedTo: null
        }));
        this.outputs = outputs.map((output, idx) => ({
            id: `${id}_output_${idx}`,
            name: output,
            index: idx,
            position: 'right',
            connectedTo: null
        }));
        this.isDragging = false;
        this.isSelected = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
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
        return newOutput;
    }

    removeInput(index) {
        if (index >= 0 && index < this.inputs.length) {
            this.inputs.splice(index, 1);
            this.inputs.forEach((input, idx) => {
                input.index = idx;
                input.id = `${this.id}_input_${idx}`;
            });
        }
    }

    removeOutput(index) {
        if (index >= 0 && index < this.outputs.length) {
            this.outputs.splice(index, 1);
            this.outputs.forEach((output, idx) => {
                output.index = idx;
                output.id = `${this.id}_output_${idx}`;
            });
        }
    }

    getPortPosition(port) {
        const totalPorts = port.position === 'left' ? this.inputs.length : this.outputs.length;
        const portHeight = this.height / (totalPorts + 1);
        const yOffset = portHeight * (port.index + 1);
        
        return {
            x: this.x + (port.position === 'left' ? 0 : this.width),
            y: this.y + yOffset
        };
    }
    
    // 获取图标位置（电池名称和端口之间的中间区域）
    getIconPosition() {
        return {
            x: this.x + this.width / 2,
            y: this.y + 25
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

// Kangaroo2 风格预设电池
const componentTemplates = [
    { name: 'Kangaroo Solver', inputs: ['Goals', 'Points'], outputs: ['Points', 'Lines'] },
    { name: 'Points', inputs: ['X', 'Y', 'Z'], outputs: ['Points'] },
    { name: 'Lines', inputs: ['Start', 'End'], outputs: ['Lines'] },
    { name: 'Anchor Point', inputs: ['Points', 'Strength'], outputs: ['Goal'] },
    { name: 'Anchor Line', inputs: ['Line', 'Strength'], outputs: ['Goal'] },
    { name: 'Length', inputs: ['Line', 'Length', 'Strength'], outputs: ['Goal'] },
    { name: 'Angle', inputs: ['Line A', 'Line B', 'Angle', 'Strength'], outputs: ['Goal'] },
    { name: 'On Curve', inputs: ['Point', 'Curve', 'Strength'], outputs: ['Goal'] },
    { name: 'On Mesh', inputs: ['Point', 'Mesh', 'Strength'], outputs: ['Goal'] },
    { name: 'Spring', inputs: ['Pt A', 'Pt B', 'Rest', 'Stiff'], outputs: ['Force'] },
    { name: 'Gravity', inputs: ['Points', 'Dir', 'Strength'], outputs: ['Force'] },
    { name: 'Wind', inputs: ['Points', 'Dir', 'Strength'], outputs: ['Force'] },
    { name: 'Repulsion', inputs: ['Points', 'Radius', 'Strength'], outputs: ['Force'] },
    { name: 'Collide Points', inputs: ['Points', 'Radius'], outputs: ['Goal'] },
    { name: 'Collide Mesh', inputs: ['Points', 'Mesh'], outputs: ['Goal'] },
    { name: 'Addition', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Multiplication', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Distance', inputs: ['Pt A', 'Pt B'], outputs: ['Dist'] },
    { name: 'Number Slider', inputs: [], outputs: ['Value'] },
    { name: 'Boolean Toggle', inputs: [], outputs: ['Bool'] },
    { name: 'Panel', inputs: ['In'], outputs: ['Out'] },
    { name: 'List Length', inputs: ['List'], outputs: ['Len'] },
    { name: 'Dispatch', inputs: ['List', 'Pattern'], outputs: ['A', 'B'] },
    { name: 'Line', inputs: ['Start', 'End'], outputs: ['Line'] },
    { name: 'Move', inputs: ['Geo', 'Vector'], outputs: ['Geo'] },
    { name: 'Display Points', inputs: ['Points', 'Size'], outputs: [] },
    { name: 'Load', inputs: ['Points', 'Force'], outputs: ['Goal'] },
    { name: 'Bend', inputs: ['Points', 'Angle'], outputs: ['Goal'] },
    { name: 'Pressure', inputs: ['Mesh', 'Pressure'], outputs: ['Goal'] }
];

// 预设颜色
const presetColors = ['#ffaa00', '#4caf50', '#2196f3', '#f44336', '#9c27b0', '#ff9800', '#00bcd4', '#e91e63'];
