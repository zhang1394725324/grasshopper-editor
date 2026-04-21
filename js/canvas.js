// 画布管理类
class CanvasManager {
    constructor(canvasElement, componentLibrary, onSelectionChange) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.componentLibrary = componentLibrary;
        this.onSelectionChange = onSelectionChange;
        
        // 画布状态
        this.components = new Map();
        this.connections = [];
        this.selectedComponent = null;
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        
        // 连接状态
        this.isConnecting = false;
        this.connectingFrom = null;
        this.connectingTo = null;
        this.currentMousePos = { x: 0, y: 0 };
        
        // 初始化
        this.initEvents();
        this.resize();
        this.animate();
    }
    
    initEvents() {
        // 鼠标事件
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
        
        // 窗口大小改变
        window.addEventListener('resize', this.resize.bind(this));
    }
    
    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.draw();
    }
    
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
        const mouseY = (e.clientY - rect.top - this.panOffset.y) / this.zoom;
        
        // 检查是否点击端口
        const portClick = this.checkPortClick(mouseX, mouseY);
        if (portClick) {
            this.startConnecting(portClick);
            e.preventDefault();
            return;
        }
        
        // 检查是否点击组件
        const clickedComponent = this.findComponentAt(mouseX, mouseY);
        if (clickedComponent) {
            this.selectedComponent = clickedComponent;
            this.onSelectionChange && this.onSelectionChange(clickedComponent);
            
            // 开始拖动
            clickedComponent.isDragging = true;
            clickedComponent.dragOffsetX = mouseX - clickedComponent.x;
            clickedComponent.dragOffsetY = mouseY - clickedComponent.y;
            e.preventDefault();
            return;
        }
        
        // 空白区域点击，开始平移
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.selectedComponent = null;
        this.onSelectionChange && this.onSelectionChange(null);
        this.canvas.style.cursor = 'grabbing';
    }
    
    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
        const mouseY = (e.clientY - rect.top - this.panOffset.y) / this.zoom;
        
        if (this.isPanning) {
            const dx = e.clientX - this.panStart.x;
            const dy = e.clientY - this.panStart.y;
            this.panOffset.x += dx;
            this.panOffset.y += dy;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.draw();
            return;
        }
        
        // 拖动组件
        let draggingComponent = null;
        for (const component of this.components.values()) {
            if (component.isDragging) {
                component.x = mouseX - component.dragOffsetX;
                component.y = mouseY - component.dragOffsetY;
                draggingComponent = component;
                break;
            }
        }
        
        if (draggingComponent) {
            this.draw();
            return;
        }
        
        // 正在连接
        if (this.isConnecting) {
            this.currentMousePos = { x: mouseX, y: mouseY };
            this.draw();
            
            // 高亮可连接的端口
            const hoverPort = this.checkPortClick(mouseX, mouseY);
            this.hoverPort = hoverPort;
        }
        
        this.draw();
    }
    
    onMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
        }
        
        // 停止拖动所有组件
        for (const component of this.components.values()) {
            component.isDragging = false;
        }
        
        // 完成连接
        if (this.isConnecting) {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
            const mouseY = (e.clientY - rect.top - this.panOffset.y) / this.zoom;
            const portClick = this.checkPortClick(mouseX, mouseY);
            
            if (portClick && this.connectingFrom && 
                portClick.componentId !== this.connectingFrom.componentId) {
                this.createConnection(this.connectingFrom, portClick);
            }
            
            this.stopConnecting();
        }
    }
    
    onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(2, Math.max(0.5, this.zoom * delta));
        
        if (newZoom !== this.zoom) {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const zoomFactor = newZoom / this.zoom;
            this.panOffset.x = mouseX - (mouseX - this.panOffset.x) * zoomFactor;
            this.panOffset.y = mouseY - (mouseY - this.panOffset.y) * zoomFactor;
            this.zoom = newZoom;
            
            document.getElementById('zoomLevel').textContent = Math.round(this.zoom * 100);
            this.draw();
        }
    }
    
    onContextMenu(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
        const mouseY = (e.clientY - rect.top - this.panOffset.y) / this.zoom;
        
        const clickedComponent = this.findComponentAt(mouseX, mouseY);
        if (clickedComponent) {
            this.selectedComponent = clickedComponent;
            this.onSelectionChange && this.onSelectionChange(clickedComponent);
            this.showContextMenu(e.clientX, e.clientY, clickedComponent);
        }
    }
    
    checkPortClick(x, y) {
        for (const component of this.components.values()) {
            // 检查输入端口
            for (const input of component.inputs) {
                const pos = component.getPortPosition(input);
                const distance = Math.hypot(x - pos.x, y - pos.y);
                if (distance < 8) {
                    return {
                        componentId: component.id,
                        portId: input.id,
                        port: input,
                        type: 'input'
                    };
                }
            }
            
            // 检查输出端口
            for (const output of component.outputs) {
                const pos = component.getPortPosition(output);
                const distance = Math.hypot(x - pos.x, y - pos.y);
                if (distance < 8) {
                    return {
                        componentId: component.id,
                        portId: output.id,
                        port: output,
                        type: 'output'
                    };
                }
            }
        }
        return null;
    }
    
    findComponentAt(x, y) {
        for (const component of this.components.values()) {
            if (x >= component.x && x <= component.x + component.width &&
                y >= component.y && y <= component.y + component.height) {
                return component;
            }
        }
        return null;
    }
    
    startConnecting(portInfo) {
        this.isConnecting = true;
        this.connectingFrom = portInfo;
    }
    
    stopConnecting() {
        this.isConnecting = false;
        this.connectingFrom = null;
        this.hoverPort = null;
        this.draw();
    }
    
    createConnection(from, to) {
        // 确保连接方向正确（输出到输入）
        let outputPort, inputPort;
        if (from.type === 'output' && to.type === 'input') {
            outputPort = from;
            inputPort = to;
        } else if (from.type === 'input' && to.type === 'output') {
            outputPort = to;
            inputPort = from;
        } else {
            return; // 只能连接输出到输入
        }
        
        // 检查是否已存在连接
        const existingConnection = this.connections.find(conn => 
            conn.fromPortId === outputPort.portId && conn.toPortId === inputPort.portId
        );
        
        if (existingConnection) return;
        
        // 创建新连接
        const connection = new Connection(
            generateId(),
            outputPort.componentId,
            outputPort.portId,
            inputPort.componentId,
            inputPort.portId
        );
        
        this.connections.push(connection);
        
        // 更新端口的连接状态
        const fromComponent = this.components.get(outputPort.componentId);
        const toComponent = this.components.get(inputPort.componentId);
        
        const fromPort = fromComponent.outputs.find(p => p.id === outputPort.portId);
        const toPort = toComponent.inputs.find(p => p.id === inputPort.portId);
        
        if (fromPort) fromPort.connectedTo = connection.id;
        if (toPort) toPort.connectedTo = connection.id;
        
        this.draw();
    }
    
    deleteConnection(connectionId) {
        const index = this.connections.findIndex(conn => conn.id === connectionId);
        if (index !== -1) {
            this.connections.splice(index, 1);
            this.draw();
        }
    }
    
    addComponent(component) {
        this.components.set(component.id, component);
        this.draw();
        return component;
    }
    
    deleteComponent(componentId) {
        const component = this.components.get(componentId);
        if (component) {
            // 删除相关连接
            this.connections = this.connections.filter(conn => 
                conn.fromComponentId !== componentId && conn.toComponentId !== componentId
            );
            this.components.delete(componentId);
            if (this.selectedComponent?.id === componentId) {
                this.selectedComponent = null;
                this.onSelectionChange && this.onSelectionChange(null);
            }
            this.draw();
        }
    }
    
    duplicateComponent(component) {
        const newComponent = new Component(
            generateId(),
            component.name,
            component.x + 20,
            component.y + 20,
            component.inputs.map(i => i.name),
            component.outputs.map(o => o.name)
        );
        this.addComponent(newComponent);
        return newComponent;
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);
        
        // 绘制网格
        this.drawGrid();
        
        // 绘制连接线
        this.drawConnections();
        
        // 绘制组件
        for (const component of this.components.values()) {
            this.drawComponent(component);
        }
        
        // 绘制临时连接线
        if (this.isConnecting && this.connectingFrom) {
            this.drawTempConnection();
        }
        
        this.ctx.restore();
    }
    
    drawGrid() {
        const gridSize = 20;
        const width = this.canvas.width / this.zoom;
        const height = this.canvas.height / this.zoom;
        const startX = -this.panOffset.x / this.zoom;
        const startY = -this.panOffset.y / this.zoom;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#2a2a2a';
        this.ctx.lineWidth = 1;
        
        for (let x = startX % gridSize; x < width; x += gridSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
        }
        
        for (let y = startY % gridSize; y < height; y += gridSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
        }
        
        this.ctx.stroke();
    }
    
    drawComponent(component) {
        // 绘制主体
        const isSelected = this.selectedComponent === component;
        this.ctx.fillStyle = isSelected ? '#3a3a3a' : '#2d2d2d';
        this.ctx.strokeStyle = isSelected ? '#ffaa00' : '#555555';
        this.ctx.lineWidth = 2;
        
        this.ctx.fillRect(component.x, component.y, component.width, component.height);
        this.ctx.strokeRect(component.x, component.y, component.width, component.height);
        
        // 绘制名称
        this.ctx.fillStyle = '#ffaa00';
        this.ctx.font = 'bold 12px "Segoe UI"';
        this.ctx.fillText(component.name, component.x + 8, component.y + 20);
        
        // 绘制输入端口
        component.inputs.forEach((input, index) => {
            const pos = component.getPortPosition(input);
            this.drawPort(pos.x, pos.y, '#4caf50', input.connectedTo ? '#8bc34a' : '#4caf50');
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '10px "Segoe UI"';
            this.ctx.fillText(input.name, pos.x + 6, pos.y + 3);
        });
        
        // 绘制输出端口
        component.outputs.forEach((output, index) => {
            const pos = component.getPortPosition(output);
            this.drawPort(pos.x, pos.y, '#ff9800', output.connectedTo ? '#ffc107' : '#ff9800');
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '10px "Segoe UI"';
            this.ctx.fillText(output.name, pos.x - 6 - this.ctx.measureText(output.name).width, pos.y + 3);
        });
    }
    
    drawPort(x, y, color, fillColor) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        
        // 内圈
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#2d2d2d';
        this.ctx.fill();
    }
    
    drawConnections() {
        this.connections.forEach(connection => {
            const fromComponent = this.components.get(connection.fromComponentId);
            const toComponent = this.components.get(connection.toComponentId);
            
            if (fromComponent && toComponent) {
                const fromPort = fromComponent.outputs.find(p => p.id === connection.fromPortId) ||
                                fromComponent.inputs.find(p => p.id === connection.fromPortId);
                const toPort = toComponent.inputs.find(p => p.id === connection.toPortId) ||
                              toComponent.outputs.find(p => p.id === connection.toPortId);
                
                if (fromPort && toPort) {
                    const fromPos = fromComponent.getPortPosition(fromPort);
                    const toPos = toComponent.getPortPosition(toPort);
                    
                    this.drawCurve(fromPos.x, fromPos.y, toPos.x, toPos.y);
                }
            }
        });
    }
    
    drawTempConnection() {
        if (!this.connectingFrom) return;
        
        const fromComponent = this.components.get(this.connectingFrom.componentId);
        if (fromComponent) {
            const fromPort = this.connectingFrom.port;
            const fromPos = fromComponent.getPortPosition(fromPort);
            
            let toPos = this.currentMousePos;
            if (this.hoverPort) {
                const hoverComponent = this.components.get(this.hoverPort.componentId);
                if (hoverComponent) {
                    toPos = hoverComponent.getPortPosition(this.hoverPort.port);
                }
            }
            
            this.drawCurve(fromPos.x, fromPos.y, toPos.x, toPos.y, true);
        }
    }
    
    drawCurve(fromX, fromY, toX, toY, isTemp = false) {
        const controlPointOffset = Math.min(100, Math.abs(toX - fromX) / 2);
        const cp1x = fromX + controlPointOffset;
        const cp1y = fromY;
        const cp2x = toX - controlPointOffset;
        const cp2y = toY;
        
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, toX, toY);
        this.ctx.strokeStyle = isTemp ? '#aaa' : '#ffaa00';
        this.ctx.lineWidth = isTemp ? 1.5 : 2;
        this.ctx.stroke();
    }
    
    showContextMenu(x, y, component) {
        const menu = document.getElementById('contextMenu');
        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        const handleClick = (e) => {
            const action = e.target.dataset.action;
            if (action) {
                switch(action) {
                    case 'delete':
                        this.deleteComponent(component.id);
                        break;
                    case 'rename':
                        this.showRenameDialog(component);
                        break;
                    case 'addInput':
                        this.showAddPortDialog(component, 'input');
                        break;
                    case 'addOutput':
                        this.showAddPortDialog(component, 'output');
                        break;
                    case 'duplicate':
                        this.duplicateComponent(component);
                        break;
                }
            }
            menu.style.display = 'none';
            document.removeEventListener('click', handleClick);
        };
        
        setTimeout(() => document.addEventListener('click', handleClick), 0);
    }
    
    showRenameDialog(component) {
        const newName = prompt('输入新的电池名称:', component.name);
        if (newName && newName.trim()) {
            component.name = newName.trim();
            this.draw();
        }
    }
    
    showAddPortDialog(component, type) {
        const portName = prompt(`输入${type === 'input' ? '输入' : '输出'}端口名称:`);
        if (portName && portName.trim()) {
            if (type === 'input') {
                component.addInput(portName.trim());
            } else {
                component.addOutput(portName.trim());
            }
            this.draw();
        }
    }
    
    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
    
    toJSON() {
        const componentsData = Array.from(this.components.values()).map(comp => ({
            id: comp.id,
            name: comp.name,
            x: comp.x,
            y: comp.y,
            inputs: comp.inputs.map(i => i.name),
            outputs: comp.outputs.map(o => o.name)
        }));
        
        const connectionsData = this.connections.map(conn => ({
            id: conn.id,
            fromComponentId: conn.fromComponentId,
            fromPortId: conn.fromPortId,
            toComponentId: conn.toComponentId,
            toPortId: conn.toPortId
        }));
        
        return {
            version: '1.0',
            components: componentsData,
            connections: connectionsData
        };
    }
    
    fromJSON(data) {
        this.components.clear();
        this.connections = [];
        
        // 重建组件
        data.components.forEach(compData => {
            const component = new Component(
                compData.id,
                compData.name,
                compData.x,
                compData.y,
                compData.inputs,
                compData.outputs
            );
            this.components.set(component.id, component);
        });
        
        // 重建连接
        data.connections.forEach(connData => {
            const connection = new Connection(
                connData.id,
                connData.fromComponentId,
                connData.fromPortId,
                connData.toComponentId,
                connData.toPortId
            );
            this.connections.push(connection);
            
            // 恢复端口连接状态
            const fromComp = this.components.get(connData.fromComponentId);
            const toComp = this.components.get(connData.toComponentId);
            if (fromComp && toComp) {
                const fromPort = [...fromComp.outputs, ...fromComp.inputs].find(p => p.id === connData.fromPortId);
                const toPort = [...toComp.outputs, ...toComp.inputs].find(p => p.id === connData.toPortId);
                if (fromPort) fromPort.connectedTo = connection.id;
                if (toPort) toPort.connectedTo = connection.id;
            }
        });
        
        this.draw();
    }
}
