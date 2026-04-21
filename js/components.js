// 电池组件定义
class Component {
    constructor(id, name, x, y, inputs = [], outputs = []) {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = y;
        this.width = 120;
        this.height = 60;
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
        }
    }

    // 获取端口位置
    getPortPosition(port) {
        const portIndex = port.index;
        const totalPorts = port.position === 'left' ? this.inputs.length : this.outputs.length;
        const portHeight = this.height / (totalPorts + 1);
        const yOffset = portHeight * (portIndex + 1);
        
        return {
            x: this.x + (port.position === 'left' ? 0 : this.width),
            y: this.y + yOffset
        };
    }
}

// 连接线定义
class Connection {
    constructor(id, fromComponentId, fromPortId, toComponentId, toPortId) {
        this.id = id;
        this.fromComponentId = fromComponentId;
        this.fromPortId = fromPortId;
        this.toComponentId = toComponentId;
        this.toPortId = toPortId;
    }
}

// 预设电池模板
const componentTemplates = [
    { name: 'Number', inputs: [], outputs: ['Result'] },
    { name: 'Addition', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Subtraction', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Multiplication', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Division', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Sine', inputs: ['Value'], outputs: ['Result'] },
    { name: 'Cosine', inputs: ['Value'], outputs: ['Result'] },
    { name: 'Panel', inputs: ['Input'], outputs: [] },
    { name: 'Slider', inputs: [], outputs: ['Value'] },
    { name: 'List', inputs: ['Item'], outputs: ['List'] }
];

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
