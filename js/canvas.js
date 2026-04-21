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
        this.selectedComponents = new Set(); // 多选支持
        this.selectedConnection = null;
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        
        // 连接状态
        this.isConnecting = false;
        this.connectingFrom = null;
        this.currentMousePos = { x: 0, y: 0 };
        this.hoverPort = null;
        this.hoverConnection = null;
        
        // 框选状态
        this.isSelecting = false;
        this.selectStart = { x: 0, y: 0 };
        this.selectEnd = { x: 0, y: 0 };
        
        // 历史记录
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
        // 初始化
        this.initEvents();
        this.resize();
        this.animate();
        this.saveToHistory('init');
    }
    
    initEvents() {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
        
        window.addEventListener('resize', this.resize.bind(this));
    }
    
    // 历史记录
    saveToHistory(action) {
        // 如果当前不在历史末尾，删除之后的历史
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        const componentsData = Array.from(this.components.values()).map(c => ({
            id: c.id, name: c.name, x: c.x, y: c.y, color: c.color,
            inputs: c.inputs.map(i => ({ id: i.id, name: i.name, index: i.index })),
            outputs: c.outputs.map(o => ({ id: o.id, name: o.name, index: o.index }))
        }));
        
        const connectionsData = this.connections.map(c => ({
            id: c.id, fromComponentId: c.fromComponentId, fromPortId: c.fromPortId,
            toComponentId: c.toComponentId, toPortId: c.toPortId
        }));
        
        this.history.push({ components: componentsData, connections: connectionsData, action });
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        this.historyIndex = this.history.length - 1;
        
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreFromHistory(this.history[this.historyIndex]);
            this.updateStatus(t('statusUndo'));
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreFromHistory(this.history[this.historyIndex]);
            this.updateStatus(t('statusRedo'));
        }
    }
    
    restoreFromHistory(entry) {
        this.components.clear();
        this.connections = [];
        this.selectedComponents.clear();
        this.selectedConnection = null;
        
        for (const c of entry.components) {
            const comp = new Component(c.id, c.name, c.x, c.y, 
                c.inputs.map(i => i.name), c.outputs.map(o => o.name));
            comp.color = c.color || '#ffaa00';
            this.components.set(comp.id, comp);
        }
        
        for (const conn of entry.connections) {
            const connection = new Connection(conn.id, conn.fromComponentId, conn.fromPortId,
                conn.toComponentId, conn.toPortId);
            this.connections.push(connection);
            
            const fromComp = this.components.get(conn.fromComponentId);
            const toComp = this.components.get(conn.toComponentId);
            if (fromComp && toComp) {
                const fromPort = fromComp.outputs.find(p => p.id === conn.fromPortId) ||
                                fromComp.inputs.find(p => p.id === conn.fromPortId);
                const toPort = toComp.inputs.find(p => p.id === conn.toPortId) ||
                              toComp.outputs.find(p => p.id === conn.toPortId);
                if (fromPort) fromPort.connectedTo = connection.id;
                if (toPort) toPort.connectedTo = connection.id;
            }
        }
        
        this.draw();
    }
    
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
        if (redoBtn) redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }
    
    updateStatus(message) {
        const status = document.getElementById('status');
        if (status) {
            status.textContent = message;
            setTimeout(() => {
                if (status.textContent === message) {
                    status.textContent = t('statusReady');
                }
            }, 2000);
        }
    }
    
    resize() {
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.draw();
        }
    }
    
    fitToView() {
        if (this.components.size === 0) {
            this.panOffset = { x: 0, y: 0 };
            this.zoom = 1;
            this.draw();
            return;
        }
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const comp of this.components.values()) {
            minX = Math.min(minX, comp.x);
            minY = Math.min(minY, comp.y);
            maxX = Math.max(maxX, comp.x + comp.width);
            maxY = Math.max(maxY, comp.y + comp.height);
        }
        
        const padding = 50;
        const width = maxX - minX + 2 * padding;
        const height = maxY - minY + 2 * padding;
        const scaleX = this.canvas.width / width;
        const scaleY = this.canvas.height / height;
        const newZoom = Math.min(scaleX, scaleY, 1.5);
        
        this.zoom = Math.max(0.5, Math.min(2, newZoom));
        this.panOffset.x = this.canvas.width / 2 - (minX + (maxX - minX) / 2 - padding) * this.zoom;
        this.panOffset.y = this.canvas.height / 2 - (minY + (maxY - minY) / 2 - padding) * this.zoom;
        
        document.getElementById('zoomLevel').textContent = Math.round(this.zoom * 100);
        this.draw();
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.panOffset.x) / this.zoom,
            y: (e.clientY - rect.top - this.panOffset.y) / this.zoom
        };
    }
    
    onMouseDown(e) {
        const { x, y } = this.getMousePos(e);
        
        // 检查是否点击连接线
        const clickedConnection = this.findConnectionAt(x, y);
        if (clickedConnection && e.button === 0) {
            this.selectedConnection = clickedConnection;
            this.selectedComponents.clear();
            this.draw();
            e.preventDefault();
            return;
        }
        
        // 检查是否点击端口
        const portClick = this.checkPortClick(x, y);
        if (portClick) {
            this.startConnecting(portClick);
            e.preventDefault();
            return;
        }
        
        // 检查是否点击组件
        const clickedComponent = this.findComponentAt(x, y);
        if (clickedComponent) {
            if (e.shiftKey) {
                if (this.selectedComponents.has(clickedComponent)) {
                    this.selectedComponents.delete(clickedComponent);
                } else {
                    this.selectedComponents.add(clickedComponent);
                }
            } else if (!this.selectedComponents.has(clickedComponent)) {
                this.selectedComponents.clear();
                this.selectedComponents.add(clickedComponent);
            }
            
            this.selectedConnection = null;
            
            for (const comp of this.selectedComponents) {
                comp.isDragging = true;
                comp.dragOffsetX = x - comp.x;
                comp.dragOffsetY = y - comp.y;
            }
            
            if (this.onSelectionChange && this.selectedComponents.size === 1) {
                this.onSelectionChange(clickedComponent);
            }
            e.preventDefault();
            return;
        }
        
        // 框选
        if (!e.shiftKey) {
            this.selectedComponents.clear();
            this.selectedConnection = null;
            if (this.onSelectionChange) this.onSelectionChange(null);
        }
        
        this.isSelecting = true;
        this.selectStart = { x, y };
        this.selectEnd = { x, y };
        
        // 平移（中键或右键）
        if (e.button === 1 || e.button === 2) {
            this.isSelecting = false;
            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
            e.preventDefault();
        }
    }
    
    onMouseMove(e) {
        const { x, y } = this.getMousePos(e);
        
        if (this.isPanning) {
            const dx = e.clientX - this.panStart.x;
            const dy = e.clientY - this.panStart.y;
            this.panOffset.x += dx;
            this.panOffset.y += dy;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.draw();
            return;
        }
        
        if (this.isSelecting) {
            this.selectEnd = { x, y };
            this.draw();
            return;
        }
        
        // 拖动组件
        let dragging = false;
        for (const comp of this.selectedComponents) {
            if (comp.isDragging) {
                comp.x = x - comp.dragOffsetX;
                comp.y = y - comp.dragOffsetY;
                dragging = true;
            }
        }
        
        if (dragging) {
            this.draw();
            return;
        }
        
        // 连接中
        if (this.isConnecting) {
            this.currentMousePos = { x, y };
            this.hoverPort = this.checkPortClick(x, y);
            this.draw();
            return;
        }
        
        // 悬停检测
        const newHoverConnection = this.findConnectionAt(x, y);
        if (newHoverConnection !== this.hoverConnection) {
            this.hoverConnection = newHoverConnection;
            this.draw();
        }
        
        this.draw();
    }
    
    onMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
        }
        
        if (this.isSelecting) {
            this.finishSelection();
            this.isSelecting = false;
        }
        
        for (const comp of this.components.values()) {
            comp.isDragging = false;
        }
        
        if (this.isConnecting) {
            const { x, y } = this.getMousePos(e);
            const portClick = this.checkPortClick(x, y);
            if (portClick && this.connectingFrom && 
                portClick.componentId !== this.connectingFrom.componentId) {
                this.createConnection(this.connectingFrom, portClick);
            }
            this.stopConnecting();
        }
    }
    
    finishSelection() {
        const minX = Math.min(this.selectStart.x, this.selectEnd.x);
        const minY = Math.min(this.selectStart.y, this.selectEnd.y);
        const maxX = Math.max(this.selectStart.x, this.selectEnd.x);
        const maxY = Math.max(this.selectStart.y, this.selectEnd.y);
        
        for (const comp of this.components.values()) {
            const compCenterX = comp.x + comp.width / 2;
            const compCenterY = comp.y + comp.height / 2;
            if (compCenterX >= minX && compCenterX <= maxX && 
                compCenterY >= minY && compCenterY <= maxY) {
                this.selectedComponents.add(comp);
            }
        }
        
        if (this.selectedComponents.size === 1 && this.onSelectionChange) {
            this.onSelectionChange(Array.from(this.selectedComponents)[0]);
        }
        
        this.draw();
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
            
            const zoomLevel = document.getElementById('zoomLevel');
            if (zoomLevel) zoomLevel.textContent = Math.round(this.zoom * 100);
            this.draw();
        }
    }
    
    onContextMenu(e) {
        e.preventDefault();
        const { x, y } = this.getMousePos(e);
        
        // 检查连接线右键
        const clickedConnection = this.findConnectionAt(x, y);
        if (clickedConnection) {
            this.showConnectionMenu(e.clientX, e.clientY, clickedConnection);
            return;
        }
        
        // 检查电池右键
        const clickedComponent = this.findComponentAt(x, y);
        if (clickedComponent) {
            if (!this.selectedComponents.has(clickedComponent)) {
                this.selectedComponents.clear();
                this.selectedComponents.add(clickedComponent);
                this.draw();
            }
            this.showContextMenu(e.clientX, e.clientY, clickedComponent);
            return;
        }
    }
    
    findConnectionAt(x, y, tolerance = 5) {
        for (const conn of this.connections) {
            const fromComp = this.components.get(conn.fromComponentId);
            const toComp = this.components.get(conn.toComponentId);
            if (!fromComp || !toComp) continue;
            
            const fromPort = fromComp.outputs.find(p => p.id === conn.fromPortId) ||
                            fromComp.inputs.find(p => p.id === conn.fromPortId);
            const toPort = toComp.inputs.find(p => p.id === conn.toPortId) ||
                          toComp.outputs.find(p => p.id === conn.toPortId);
            
            if (fromPort && toPort) {
                const fromPos = fromComp.getPortPosition(fromPort);
                const toPos = toComp.getPortPosition(toPort);
                
                const cp1x = fromPos.x + Math.min(100, Math.abs(toPos.x - fromPos.x) / 2);
                const cp1y = fromPos.y;
                const cp2x = toPos.x - Math.min(100, Math.abs(toPos.x - fromPos.x) / 2);
                const cp2y = toPos.y;
                
                if (this.isPointNearBezier(x, y, fromPos.x, fromPos.y, cp1x, cp1y, cp2x, cp2y, toPos.x, toPos.y, tolerance)) {
                    return conn;
                }
            }
        }
        return null;
    }
    
    isPointNearBezier(px, py, x0, y0, x1, y1, x2, y2, x3, y3, tolerance) {
        for (let t = 0; t <= 1; t += 0.02) {
            const mt = 1 - t;
            const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
            const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
            if (Math.hypot(px - x, py - y) < tolerance) return true;
        }
        return false;
    }
    
    checkPortClick(x, y) {
        for (const component of this.components.values()) {
            for (const input of component.inputs) {
                const pos = component.getPortPosition(input);
                if (Math.hypot(x - pos.x, y - pos.y) < 8) {
                    return { componentId: component.id, portId: input.id, port: input, type: 'input' };
                }
            }
            for (const output of component.outputs) {
                const pos = component.getPortPosition(output);
                if (Math.hypot(x - pos.x, y - pos.y) < 8) {
                    return { componentId: component.id, portId: output.id, port: output, type: 'output' };
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
        let outputPort, inputPort;
        if (from.type === 'output' && to.type === 'input') {
            outputPort = from;
            inputPort = to;
        } else if (from.type === 'input' && to.type === 'output') {
            outputPort = to;
            inputPort = from;
        } else {
            return;
        }
        
        const exists = this.connections.some(conn => 
            conn.fromPortId === outputPort.portId && conn.toPortId === inputPort.portId
        );
        if (exists) return;
        
        const connection = new Connection(generateId(), outputPort.componentId, outputPort.portId,
            inputPort.componentId, inputPort.portId);
        this.connections.push(connection);
        
        const fromComp = this.components.get(outputPort.componentId);
        const toComp = this.components.get(inputPort.componentId);
        const fromPort = fromComp?.outputs.find(p => p.id === outputPort.portId);
        const toPort = toComp?.inputs.find(p => p.id === inputPort.portId);
        if (fromPort) fromPort.connectedTo = connection.id;
        if (toPort) toPort.connectedTo = connection.id;
        
        this.saveToHistory('create_connection');
        this.draw();
    }
    
    deleteConnection(connectionId) {
        const index = this.connections.findIndex(c => c.id === connectionId);
        if (index !== -1) {
            const conn = this.connections[index];
            const fromComp = this.components.get(conn.fromComponentId);
            const toComp = this.components.get(conn.toComponentId);
            const fromPort = fromComp?.outputs.find(p => p.id === conn.fromPortId) ||
                            fromComp?.inputs.find(p => p.id === conn.fromPortId);
            const toPort = toComp?.inputs.find(p => p.id === conn.toPortId) ||
                          toComp?.outputs.find(p => p.id === conn.toPortId);
            if (fromPort) fromPort.connectedTo = null;
            if (toPort) toPort.connectedTo = null;
            
            this.connections.splice(index, 1);
            if (this.selectedConnection === conn) this.selectedConnection = null;
            this.saveToHistory('delete_connection');
            this.draw();
        }
    }
    
    addComponent(component) {
        this.components.set(component.id, component);
        this.saveToHistory('add_component');
        this.draw();
        return component;
    }
    
    deleteSelectedComponents() {
        if (this.selectedComponents.size === 0) return;
        
        const idsToDelete = new Set(Array.from(this.selectedComponents).map(c => c.id));
        this.connections = this.connections.filter(conn => 
            !idsToDelete.has(conn.fromComponentId) && !idsToDelete.has(conn.toComponentId)
        );
        
        for (const id of idsToDelete) {
            this.components.delete(id);
        }
        
        this.selectedComponents.clear();
        this.selectedConnection = null;
        if (this.onSelectionChange) this.onSelectionChange(null);
        this.saveToHistory('delete_components');
        this.draw();
        this.updateStatus(t('statusDeleted'));
    }
    
    duplicateSelectedComponents() {
        if (this.selectedComponents.size === 0) return;
        
        const newComponents = [];
        const oldToNewIds = new Map();
        
        for (const comp of this.selectedComponents) {
            const newId = generateId();
            oldToNewIds.set(comp.id, newId);
            const newComp = new Component(newId, comp.name, comp.x + 30, comp.y + 30,
                comp.inputs.map(i => i.name), comp.outputs.map(o => o.name));
            newComp.color = comp.color;
            newComponents.push(newComp);
        }
        
        for (const comp of newComponents) {
            this.components.set(comp.id, comp);
        }
        
        this.selectedComponents.clear();
        for (const comp of newComponents) {
            this.selectedComponents.add(comp);
        }
        
        this.saveToHistory('duplicate');
        this.draw();
        this.updateStatus(t('statusCopied'));
    }
    
    setComponentColor(component, color) {
        component.color = color;
        this.saveToHistory('change_color');
        this.draw();
    }
    
    selectAll() {
        this.selectedComponents.clear();
        for (const comp of this.components.values()) {
            this.selectedComponents.add(comp);
        }
        if (this.selectedComponents.size === 1 && this.onSelectionChange) {
            this.onSelectionChange(Array.from(this.selectedComponents)[0]);
        }
        this.draw();
    }
    
    clearSelection() {
        this.selectedComponents.clear();
        this.selectedConnection = null;
        if (this.onSelectionChange) this.onSelectionChange(null);
        this.draw();
    }
    
    clearCanvas() {
        if (confirm(t('confirmClear'))) {
            this.components.clear();
            this.connections = [];
            this.selectedComponents.clear();
            this.selectedConnection = null;
            this.saveToHistory('clear');
            this.draw();
            this.updateStatus(t('statusCleared'));
        }
    }
    
    draw() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);
        
        this.drawGrid();
        this.drawConnections();
        
        for (const component of this.components.values()) {
            this.drawComponent(component);
        }
        
        if (this.isConnecting && this.connectingFrom) {
            this.drawTempConnection();
        }
        
        if (this.isSelecting) {
            this.drawSelectionRect();
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
        const isSelected = this.selectedComponents.has(component);
        const borderColor = isSelected ? '#ffaa00' : (this.hoverConnection ? '#888' : '#555');
        
        this.ctx.fillStyle = component.color || '#2d2d2d';
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = isSelected ? 2.5 : 1.5;
        
        this.ctx.fillRect(component.x, component.y, component.width, component.height);
        this.ctx.strokeRect(component.x, component.y, component.width, component.height);
        
        // 电池名称（顶部）
        this.ctx.fillStyle = '#ffaa00';
        this.ctx.font = 'bold 10px "Segoe UI", monospace';
        this.ctx.fillText(component.name, component.x + 6, component.y + 14);
        
        // 预留图标位置（电池名称下方，端口之间）
        const iconPos = component.getIconPosition();
        this.ctx.fillStyle = '#888';
        this.ctx.font = '12px monospace';
        if (component.icon) {
            this.ctx.fillText(component.icon, iconPos.x - 6, iconPos.y + 4);
        } else {
            // 预留图标占位符
            this.ctx.fillStyle = '#555';
            this.ctx.fillRect(iconPos.x - 8, iconPos.y - 6, 16, 16);
            this.ctx.fillStyle = '#888';
            this.ctx.font = '8px monospace';
            this.ctx.fillText('icon', iconPos.x - 5, iconPos.y + 2);
        }
        
        // 输入端口（左侧）
        component.inputs.forEach((input) => {
            const pos = component.getPortPosition(input);
            this.drawPort(pos.x, pos.y, '#4caf50', input.connectedTo ? '#8bc34a' : '#4caf50');
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '8px monospace';
            this.ctx.fillText(input.name, pos.x + 7, pos.y + 3);
        });
        
        // 输出端口（右侧）
        component.outputs.forEach((output) => {
            const pos = component.getPortPosition(output);
            this.drawPort(pos.x, pos.y, '#ff9800', output.connectedTo ? '#ffc107' : '#ff9800');
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '8px monospace';
            const textWidth = this.ctx.measureText(output.name).width;
            this.ctx.fillText(output.name, pos.x - 6 - textWidth, pos.y + 3);
        });
    }
    
    drawPort(x, y, color, fillColor) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
    }
    
    drawConnections() {
        for (const connection of this.connections) {
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
                    const isHovered = this.hoverConnection === connection;
                    this.drawCurve(fromPos.x, fromPos.y, toPos.x, toPos.y, false, isHovered);
                }
            }
        }
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
    
    drawCurve(fromX, fromY, toX, toY, isTemp = false, isHovered = false) {
        const controlPointOffset = Math.min(80, Math.abs(toX - fromX) / 2);
        const cp1x = fromX + controlPointOffset;
        const cp1y = fromY;
        const cp2x = toX - controlPointOffset;
        const cp2y = toY;
        
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, toX, toY);
        
        if (isTemp) {
            this.ctx.strokeStyle = '#aaa';
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([5, 5]);
        } else {
            this.ctx.strokeStyle = isHovered ? '#ffaa00' : '#888';
            this.ctx.lineWidth = isHovered ? 3 : 2;
            this.ctx.setLineDash([]);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    drawSelectionRect() {
        const x = Math.min(this.selectStart.x, this.selectEnd.x);
        const y = Math.min(this.selectStart.y, this.selectEnd.y);
        const width = Math.abs(this.selectEnd.x - this.selectStart.x);
        const height = Math.abs(this.selectEnd.y - this.selectStart.y);
        
        this.ctx.strokeStyle = '#ffaa00';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.fillStyle = 'rgba(255, 170, 0, 0.1)';
        this.ctx.fillRect(x, y, width, height);
        this.ctx.setLineDash([]);
    }
    
    showContextMenu(x, y, component) {
        const menu = document.getElementById('contextMenu');
        if (!menu) return;
        
        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        const handleClick = (e) => {
            const action = e.target.dataset.action;
            if (action === 'delete') this.deleteSelectedComponents();
            else if (action === 'rename') this.showRenameDialog(component);
            else if (action === 'addInput') this.showAddPortDialog(component, 'input');
            else if (action === 'addOutput') this.showAddPortDialog(component, 'output');
            else if (action === 'duplicate') this.duplicateSelectedComponents();
            else if (action === 'color') this.showColorDialog(component);
            
            menu.style.display = 'none';
            document.removeEventListener('click', handleClick);
        };
        
        setTimeout(() => document.addEventListener('click', handleClick), 0);
    }
    
    showConnectionMenu(x, y, connection) {
        const menu = document.getElementById('connectionMenu');
        if (!menu) return;
        
        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        const handleClick = (e) => {
            if (e.target.dataset.action === 'deleteConnection') {
                this.deleteConnection(connection.id);
            }
            menu.style.display = 'none';
            document.removeEventListener('click', handleClick);
        };
        
        setTimeout(() => document.addEventListener('click', handleClick), 0);
    }
    
    showRenameDialog(component) {
        const newName = prompt(t('renamePrompt'), component.name);
        if (newName && newName.trim()) {
            component.name = newName.trim();
            this.saveToHistory('rename');
            this.draw();
        }
    }
    
    showAddPortDialog(component, type) {
        const portName = prompt(t(type === 'input' ? 'addInputPrompt' : 'addOutputPrompt'));
        if (portName && portName.trim()) {
            if (type === 'input') {
                component.addInput(portName.trim());
            } else {
                component.addOutput(portName.trim());
            }
            this.saveToHistory('add_port');
            this.draw();
        }
    }
    
    showColorDialog(component) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${t('colorTitle')}</h3>
                <div class="color-picker" id="colorPicker">
                    ${presetColors.map(c => `<div class="color-option" style="background: ${c};" data-color="${c}"></div>`).join('')}
                </div>
                <div class="modal-buttons">
                    <button id="cancelColorBtn">取消</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const color = opt.dataset.color;
                this.setComponentColor(component, color);
                modal.remove();
            });
        });
        
        document.getElementById('cancelColorBtn').onclick = () => modal.remove();
    }
    
    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
    
    toJSON() {
        const componentsData = Array.from(this.components.values()).map(comp => ({
            id: comp.id, name: comp.name, x: comp.x, y: comp.y, color: comp.color,
            inputs: comp.inputs.map(i => i.name), outputs: comp.outputs.map(o => o.name)
        }));
        
        const connectionsData = this.connections.map(conn => ({
            id: conn.id, fromComponentId: conn.fromComponentId, fromPortId: conn.fromPortId,
            toComponentId: conn.toComponentId, toPortId: conn.toPortId
        }));
        
        return { version: '1.0', components: componentsData, connections: connectionsData };
    }
    
    fromJSON(data) {
        this.components.clear();
        this.connections = [];
        this.selectedComponents.clear();
        
        for (const compData of data.components || []) {
            const component = new Component(compData.id, compData.name, compData.x, compData.y,
                compData.inputs || [], compData.outputs || []);
            component.color = compData.color || '#ffaa00';
            this.components.set(component.id, component);
        }
        
        for (const connData of data.connections || []) {
            const connection = new Connection(connData.id, connData.fromComponentId, connData.fromPortId,
                connData.toComponentId, connData.toPortId);
            this.connections.push(connection);
            
            const fromComp = this.components.get(connData.fromComponentId);
            const toComp = this.components.get(connData.toComponentId);
            if (fromComp && toComp) {
                const fromPort = fromComp.outputs.find(p => p.id === connData.fromPortId) ||
                                fromComp.inputs.find(p => p.id === connData.fromPortId);
                const toPort = toComp.inputs.find(p => p.id === connData.toPortId) ||
                              toComp.outputs.find(p => p.id === connData.toPortId);
                if (fromPort) fromPort.connectedTo = connection.id;
                if (toPort) toPort.connectedTo = connection.id;
            }
        }
        
        this.saveToHistory('import');
        this.draw();
    }
}
