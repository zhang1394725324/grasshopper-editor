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
// Kangaroo2 风格预设电池模板
const componentTemplates = [
    // ========== 核心组件 ==========
    { name: 'Kangaroo Solver', inputs: ['Goals', 'Points'], outputs: ['Points', 'Lines'] },
    { name: 'Points', inputs: ['X', 'Y', 'Z'], outputs: ['Points'] },
    { name: 'Lines', inputs: ['Start Points', 'End Points'], outputs: ['Lines'] },
    
    // ========== 约束 (Constraints) ==========
    { name: 'Anchor Point', inputs: ['Points', 'Strength'], outputs: ['Goal'] },
    { name: 'Anchor Line', inputs: ['Line', 'Strength'], outputs: ['Goal'] },
    { name: 'Anchor Plane', inputs: ['Plane', 'Strength'], outputs: ['Goal'] },
    { name: 'Length', inputs: ['Line', 'Length', 'Strength'], outputs: ['Goal'] },
    { name: 'Length (Clash)', inputs: ['Line A', 'Line B', 'Strength'], outputs: ['Goal'] },
    { name: 'Angle', inputs: ['Line A', 'Line B', 'Angle', 'Strength'], outputs: ['Goal'] },
    { name: 'Co-linear', inputs: ['Point A', 'Point B', 'Strength'], outputs: ['Goal'] },
    { name: 'Co-planar', inputs: ['Point A', 'Point B', 'Point C', 'Strength'], outputs: ['Goal'] },
    { name: 'On Curve', inputs: ['Point', 'Curve', 'Strength'], outputs: ['Goal'] },
    { name: 'On Mesh', inputs: ['Point', 'Mesh', 'Strength'], outputs: ['Goal'] },
    { name: 'On Surface', inputs: ['Point', 'Surface', 'Strength'], outputs: ['Goal'] },
    { name: 'Spherical', inputs: ['Point', 'Center', 'Radius', 'Strength'], outputs: ['Goal'] },
    { name: 'Circular', inputs: ['Point', 'Center', 'Radius', 'Strength'], outputs: ['Goal'] },
    
    // ========== 目标 (Goals) ==========
    { name: 'Point Goal', inputs: ['Points', 'Target Position', 'Strength'], outputs: ['Goal'] },
    { name: 'Line Goal', inputs: ['Line', 'Target Line', 'Strength'], outputs: ['Goal'] },
    { name: 'Plane Goal', inputs: ['Plane', 'Target Plane', 'Strength'], outputs: ['Goal'] },
    { name: 'Pull to Point', inputs: ['Points', 'Pull Point', 'Strength'], outputs: ['Goal'] },
    { name: 'Pull to Curve', inputs: ['Points', 'Curve', 'Strength'], outputs: ['Goal'] },
    { name: 'Pull to Mesh', inputs: ['Points', 'Mesh', 'Strength'], outputs: ['Goal'] },
    
    // ========== 力 (Forces) ==========
    { name: 'Spring Force', inputs: ['Point A', 'Point B', 'Rest Length', 'Stiffness'], outputs: ['Force'] },
    { name: 'Gravity', inputs: ['Points', 'Direction', 'Strength'], outputs: ['Force'] },
    { name: 'Wind', inputs: ['Points', 'Direction', 'Strength', 'Turbulence'], outputs: ['Force'] },
    { name: 'Repulsion', inputs: ['Points', 'Radius', 'Strength'], outputs: ['Force'] },
    { name: 'Attraction', inputs: ['Points', 'Target', 'Strength'], outputs: ['Force'] },
    
    // ========== 碰撞 (Collisions) ==========
    { name: 'Collide Points', inputs: ['Points', 'Radius', 'Strength'], outputs: ['Goal'] },
    { name: 'Collide Lines', inputs: ['Lines', 'Radius', 'Strength'], outputs: ['Goal'] },
    { name: 'Collide Mesh', inputs: ['Points', 'Mesh', 'Offset', 'Strength'], outputs: ['Goal'] },
    { name: 'Self Collision', inputs: ['Points', 'Radius', 'Strength'], outputs: ['Goal'] },
    
    // ========== 几何处理 ==========
    { name: 'Mesh from Points', inputs: ['Points', 'Connectivity'], outputs: ['Mesh'] },
    { name: 'Triangulate', inputs: ['Points', 'Boundary'], outputs: ['Mesh'] },
    { name: 'Relax Mesh', inputs: ['Mesh', 'Iterations'], outputs: ['Mesh'] },
    { name: 'Smooth', inputs: ['Points', 'Strength', 'Iterations'], outputs: ['Points'] },
    { name: 'Laplacian Smooth', inputs: ['Mesh', 'Strength', 'Iterations'], outputs: ['Mesh'] },
    
    // ========== 数学运算 ==========
    { name: 'Vector Add', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Vector Subtract', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Vector Multiply', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Dot Product', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Cross Product', inputs: ['A', 'B'], outputs: ['Result'] },
    { name: 'Normalize', inputs: ['Vector'], outputs: ['Result'] },
    { name: 'Distance', inputs: ['Point A', 'Point B'], outputs: ['Distance'] },
    
    // ========== 参数输入 ==========
    { name: 'Number Slider', inputs: [], outputs: ['Value'] },
    { name: 'Integer Slider', inputs: [], outputs: ['Value'] },
    { name: 'Angle Slider', inputs: [], outputs: ['Angle'] },
    { name: 'Boolean Toggle', inputs: [], outputs: ['True/False'] },
    { name: 'Panel', inputs: ['Input'], outputs: ['Output'] },
    
    // ========== 列表操作 ==========
    { name: 'List Length', inputs: ['List'], outputs: ['Length'] },
    { name: 'List Item', inputs: ['List', 'Index'], outputs: ['Item'] },
    { name: 'List Reverse', inputs: ['List'], outputs: ['List'] },
    { name: 'List Sort', inputs: ['List', 'Values'], outputs: ['List'] },
    { name: 'Dispatch', inputs: ['List', 'Pattern'], outputs: ['List A', 'List B'] },
    { name: 'Weave', inputs: ['List A', 'List B', 'Pattern'], outputs: ['List'] },
    
    // ========== 曲线 (Curves) ==========
    { name: 'Line', inputs: ['Start', 'End'], outputs: ['Line'] },
    { name: 'Polyline', inputs: ['Points'], outputs: ['Polyline'] },
    { name: 'Bezier', inputs: ['Points'], outputs: ['Curve'] },
    { name: 'Nurbs Curve', inputs: ['Points', 'Degree'], outputs: ['Curve'] },
    { name: 'Curve Divide', inputs: ['Curve', 'Count'], outputs: ['Points'] },
    { name: 'Curve Length', inputs: ['Curve'], outputs: ['Length'] },
    { name: 'Curve Closest Point', inputs: ['Curve', 'Point'], outputs: ['Parameter', 'Point'] },
    
    // ========== 曲面 (Surfaces) ==========
    { name: 'Plane', inputs: ['Origin', 'Normal'], outputs: ['Plane'] },
    { name: 'Surface from Points', inputs: ['Points', 'U Count', 'V Count'], outputs: ['Surface'] },
    { name: 'Surface Evaluate', inputs: ['Surface', 'U', 'V'], outputs: ['Point', 'Normal'] },
    
    // ========== 网格 (Meshes) ==========
    { name: 'Mesh Quad', inputs: ['Points'], outputs: ['Mesh'] },
    { name: 'Mesh Face Normals', inputs: ['Mesh'], outputs: ['Normals'] },
    { name: 'Mesh Vertex Normals', inputs: ['Mesh'], outputs: ['Normals'] },
    { name: 'Mesh Area', inputs: ['Mesh'], outputs: ['Area'] },
    
    // ========== 变换 (Transformations) ==========
    { name: 'Move', inputs: ['Geometry', 'Vector'], outputs: ['Geometry'] },
    { name: 'Rotate', inputs: ['Geometry', 'Angle', 'Axis', 'Point'], outputs: ['Geometry'] },
    { name: 'Scale', inputs: ['Geometry', 'Factor', 'Center'], outputs: ['Geometry'] },
    { name: 'Mirror', inputs: ['Geometry', 'Plane'], outputs: ['Geometry'] },
    
    // ========== 显示/可视化 ==========
    { name: 'Display Points', inputs: ['Points', 'Size', 'Color'], outputs: [] },
    { name: 'Display Lines', inputs: ['Lines', 'Thickness', 'Color'], outputs: [] },
    { name: 'Display Mesh', inputs: ['Mesh', 'Color', 'Opacity'], outputs: [] },
    { name: 'Colour by Value', inputs: ['Values', 'Gradient'], outputs: ['Colors'] },
    
    // ========== Kangaroo2 特有 ==========
    { name: 'Load', inputs: ['Points', 'Force', 'Direction'], outputs: ['Goal'] },
    { name: 'Bend', inputs: ['Points', 'Angle', 'Stiffness'], outputs: ['Goal'] },
    { name: 'Hinge', inputs: ['Line', 'Angle', 'Strength'], outputs: ['Goal'] },
    { name: 'Rigid Body', inputs: ['Points', 'Mesh'], outputs: ['Goal'] },
    { name: 'Volume', inputs: ['Points', 'Mesh', 'Target Volume', 'Strength'], outputs: ['Goal'] },
    { name: 'Pressure', inputs: ['Mesh', 'Pressure', 'Strength'], outputs: ['Goal'] }
];
// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
