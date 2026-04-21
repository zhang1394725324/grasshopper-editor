// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 电池组件类
class Component {
    constructor(id, name, x, y, inputs = [], outputs = []) {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = y;
        this.width = 130;
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

// Kangaroo2 风格预设电池
const componentTemplates = [
    // 核心组件
    { name: 'Kangaroo Solver', inputs: ['Goals', 'Points'], outputs: ['Points', 'Lines'] },
    { name: 'Points', inputs: ['X', 'Y', 'Z'], outputs: ['Points'] },
    { name: 'Lines', inputs: ['Start Pts', 'End Pts'], outputs: ['Lines'] },
    
    // 约束
    { name: 'Anchor Point', inputs: ['Points', 'Strength'], outputs: ['Goal'] },
    { name: 'Anchor Line', inputs: ['Line', 'Strength'], outputs: ['Goal'] },
    { name: 'Length', inputs: ['Line', 'Length', 'Strength'], outputs: ['Goal'] },
    { name: 'Angle', inputs: ['Line A', 'Line B', 'Angle', 'Strength'], outputs: ['Goal'] },
    { name: 'Co-linear', inputs: ['Pt A', 'Pt B', 'Strength'], outputs: ['Goal'] },
    { name: 'On Curve', inputs: ['Point', 'Curve', 'Strength'], outputs: ['Goal'] },
    { name: 'On Mesh', inputs: ['Point', 'Mesh', 'Strength'], outputs: ['Goal'] },
    { name: 'Spherical', inputs: ['Point', 'Center', 'Radius', 'Strength'], outputs: ['Goal'] },
    
    // 力
    { name: 'Spring', inputs: ['Pt A', 'Pt B', 'Rest Length', 'Stiffness'], outputs: ['Force'] },
    { name: 'Gravity', inputs: ['Points', 'Direction', 'Strength'], outputs: ['Force'] },
    { name: 'Wind', inputs: ['Points', 'Direction', 'Strength'], outputs: ['Force'] },
    { name: 'Repulsion', inputs: ['Points', 'Radius', 'Strength'], outputs: ['Force'] },
    
    // 碰撞
    { name: 'Collide Points', inputs: ['Points', 'Radius', 'Strength'], outputs: ['Goal'] },
    { name: 'Collide Mesh', inputs: ['Points', 'Mesh', 'Offset'], outputs: ['Goal'] },
    
    // 数学
    { name: 'Addition', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Subtraction', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Multiplication', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Division', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Distance', inputs: ['Pt A', 'Pt B'], outputs: ['Distance'] },
    { name: 'Dot Product', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Cross Product', inputs: ['A', 'B'], outputs: ['Result'] },
    
    // 参数
    { name: 'Number Slider', inputs: [], outputs: ['Value'] },
    { name: 'Boolean Toggle', inputs: [], outputs: ['Value'] },
    { name: 'Panel', inputs: ['Input'], outputs: ['Output'] },
    
    // 列表
    { name: 'List Length', inputs: ['List'], outputs: ['Length'] },
    { name: 'List Item', inputs: ['List', 'Index'], outputs: ['Item'] },
    { name: 'Dispatch', inputs: ['List', 'Pattern'], outputs: ['A', 'B'] },
    
    // 曲线
    { name: 'Line', inputs: ['Start', 'End'], outputs: ['Line'] },
    { name: 'Polyline', inputs: ['Points'], outputs: ['Curve'] },
    { name: 'Bezier', inputs: ['Points'], outputs: ['Curve'] },
    
    // 变换
    { name: 'Move', inputs: ['Geo', 'Vector'], outputs: ['Geo'] },
    { name: 'Rotate', inputs: ['Geo', 'Angle', 'Axis'], outputs: ['Geo'] },
    { name: 'Scale', inputs: ['Geo', 'Factor'], outputs: ['Geo'] },
    
    // 显示
    { name: 'Display Points', inputs: ['Points', 'Size', 'Color'], outputs: [] },
    { name: 'Display Lines', inputs: ['Lines', 'Color'], outputs: [] },
    
    // Kangaroo2 特有
    { name: 'Load', inputs: ['Points', 'Force', 'Dir'], outputs: ['Goal'] },
    { name: 'Bend', inputs: ['Points', 'Angle', 'Stiffness'], outputs: ['Goal'] },
    { name: 'Hinge', inputs: ['Line', 'Angle', 'Strength'], outputs: ['Goal'] },
    { name: 'Rigid Body', inputs: ['Points', 'Mesh'], outputs: ['Goal'] },
    { name: 'Pressure', inputs: ['Mesh', 'Pressure'], outputs: ['Goal'] }
];
