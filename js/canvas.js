// 画布管理类
class CanvasManager {
    constructor(canvasElement, componentLibrary, onSelectionChange) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.componentLibrary = componentLibrary;
        this.onSelectionChange = onSelectionChange;
        
        this.components = new Map();
        this.connections = [];
        this.selectedComponent = null;
        this.panOffset = { x: 0, y: 0 };
        this.zoom = 1;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        
        this.isConnecting = false;
        this.connectingFrom = null;
        this.currentMousePos = { x: 0, y: 0 };
        this.hoverPort = null;
        
        this.initEvents();
        this.resize();
        this.animate();
    }
    
    initEvents() {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this));
        this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
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
        
        const portClick = this.checkPortClick(mouseX, mouseY);
        if (portClick) {
            this.startConnecting(portClick);
            e.preventDefault();
            return;
        }
        
        const clickedComponent = this.findComponentAt(mouseX, mouseY);
        if (clickedComponent) {
            this.selectedComponent = clickedComponent;
            if (this.onSelectionChange) this.onSelectionChange(clickedComponent);
            clickedComponent.isDragging = true;
            clickedComponent.dragOffsetX = mouseX - clickedComponent.x;
            clickedComponent.dragOffsetY = mouseY - clickedComponent.y;
            e.preventDefault();
            return;
        }
        
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.selectedComponent = null;
        if (this.onSelectionChange) this.onSelectionChange(null);
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
        
        let draggingComponent = null;
        for (const comp of this.components.values()) {
            if (comp.isDragging) {
                comp.x = mouseX - comp.dragOffsetX;
                comp.y = mouseY - comp.dragOffsetY;
                draggingComponent = comp;
                break;
            }
        }
        
        if (draggingComponent) {
            this.draw();
            return;
        }
        
        if (this.isConnecting) {
            this.currentMousePos = { x: mouseX, y: mouseY };
            this.hoverPort = this.checkPortClick(mouseX, mouseY);
            this.draw();
        }
        
        this.draw();
    }
    
    onMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
        }
        
        for (const comp of this.components.values()) {
            comp.isDragging = false;
        }
        
        if (this.isConnecting) {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
            const mouseY = (e.clientY - rect.top - this.panOffset.y) / this.zoom;
            const portClick = this.checkPortClick(mouseX, mouseY);
            
            if (portClick && this.connectingFrom && portClick.componentId !== this.connectingFrom.componentId) {
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
            
            const zoomLevel = document.getElementById('zoomLevel');
            if (zoomLevel) zoomLevel.textContent = Math.round(this.zoom * 100);
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
            if (this.onSelectionChange) this.onSelectionChange(clickedComponent);
            this.showContextMenu(e.clientX, e.clientY, clickedComponent);
        }
    }
    
    checkPortClick(x, y) {
        for (const comp of this.components.values()) {
            for (const input of comp.inputs) {
                const pos = comp.getPortPosition(input);
                if (Math.hypot(x - pos.x, y - pos.y) < 8) {
                    return { componentId: comp.id, portId: input.id, port: input, type: 'input' };
                }
            }
            for (const output of comp.outputs) {
                const pos = comp.getPortPosition(output);
                if (Math.hypot(x - pos.x, y - pos.y) < 8) {
                    return { componentId: comp.id, portId: output.id, port: output, type: 'output' };
                }
            }
        }
        return null;
    }
    
    findComponentAt(x, y) {
        for (const comp of this.components.values()) {
            if (x >= comp.x && x <= comp.x + comp.width && y >= comp.y && y <= comp.y + comp.height) {
                return comp;
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
        
        const exists = this.connections.some(conn => conn.fromPortId === outputPort.portId && conn.toPortId === inputPort.portId);
        if (exists) return;
        
        const connection = new Connection(generateId(), outputPort.componentId, outputPort.portId, inputPort.componentId, inputPort.portId);
        this.connections.push(connection);
        
        const fromComp = this.components.get(outputPort.componentId);
        const toComp = this.components.get(inputPort.componentId);
        const fromP = fromComp?.outputs.find(p => p.id === outputPort.portId);
        const toP = toComp?.inputs.find(p => p.id === inputPort.portId);
        if (fromP) fromP.connectedTo = connection.id;
        if (toP) toP.connectedTo = connection.id;
        
        this.draw();
    }
    
    deleteConnection(connectionId) {
        const index = this.connections.findIndex(c => c.id === connectionId);
        if (index !== -1) this.connections.splice(index, 1);
        this.draw();
    }
    
    addComponent(component) {
        this.components.set(component.id, component);
        this.draw();
        return component;
    }
    
    deleteComponent(componentId) {
        this.connections = this.connections.filter(c => c.fromComponentId !== componentId && c.toComponentId !== componentId);
        this.components.delete(componentId);
        if (this.selectedComponent?.id === componentId) {
            this.selectedComponent = null;
            if (this.onSelectionChange) this.onSelectionChange(null);
        }
        this.draw();
    }
    
    duplicateComponent(component) {
        const newComp = new Component(generateId(), component.name, component.x + 20, component.y + 20,
            component.inputs.map(i => i.name), component.outputs.map(o => o.name));
        this.addComponent(newComp);
        return newComp;
    }
    
    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);
        
        // 网格
        const gridSize = 20;
        const w = this.canvas.width / this.zoom;
        const h = this.canvas.height / this.zoom;
        const sx = -this.panOffset.x / this.zoom;
        const sy = -this.panOffset.y / this.zoom;
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#2a2a2a';
        for (let x = sx % gridSize; x < w; x += gridSize) { this.ctx.moveTo(x, 0); this.ctx.lineTo(x, h); }
        for (let y = sy % gridSize; y < h; y += gridSize) { this.ctx.moveTo(0, y); this.ctx.lineTo(w, y); }
        this.ctx.stroke();
        
        // 连接线
        for (const conn of this.connections) {
            const fromComp = this.components.get(conn.fromComponentId);
            const toComp = this.components.get(conn.toComponentId);
            if (fromComp && toComp) {
                const fromPort = [...fromComp.outputs, ...fromComp.inputs].find(p => p.id === conn.fromPortId);
                const toPort = [...toComp.outputs, ...toComp.inputs].find(p => p.id === conn.toPortId);
                if (fromPort && toPort) {
                    const fp = fromComp.getPortPosition(fromPort);
                    const tp = toComp.getPortPosition(toPort);
                    const off = Math.min(100, Math.abs(tp.x - fp.x) / 2);
                    this.ctx.beginPath();
                    this.ctx.moveTo(fp.x, fp.y);
                    this.ctx.bezierCurveTo(fp.x + off, fp.y, tp.x - off, tp.y, tp.x, tp.y);
                    this.ctx.strokeStyle = '#ffaa00';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                }
            }
        }
        
        // 临时连线
        if (this.isConnecting && this.connectingFrom) {
            const fromComp = this.components.get(this.connectingFrom.componentId);
            if (fromComp) {
                const fp = fromComp.getPortPosition(this.connectingFrom.port);
                let tp = this.currentMousePos;
                if (this.hoverPort) {
                    const hoverComp = this.components.get(this.hoverPort.componentId);
                    if (hoverComp) tp = hoverComp.getPortPosition(this.hoverPort.port);
                }
                const off = Math.min(100, Math.abs(tp.x - fp.x) / 2);
                this.ctx.beginPath();
                this.ctx.moveTo(fp.x, fp.y);
                this.ctx.bezierCurveTo(fp.x + off, fp.y, tp.x - off, tp.y, tp.x, tp.y);
                this.ctx.strokeStyle = '#aaa';
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
            }
        }
        
        // 电池
        for (const comp of this.components.values()) {
            const isSel = this.selectedComponent === comp;
            this.ctx.fillStyle = isSel ? '#3a3a3a' : '#2d2d2d';
            this.ctx.strokeStyle = isSel ? '#ffaa00' : '#555';
            this.ctx.lineWidth = 2;
            this.ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
            this.ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.font = 'bold 11px "Segoe UI"';
            this.ctx.fillText(comp.name, comp.x + 6, comp.y + 18);
            
            for (const inp of comp.inputs) {
                const p = comp.getPortPosition(inp);
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 5, 0, 2*Math.PI);
                this.ctx.fillStyle = inp.connectedTo ? '#8bc34a' : '#4caf50';
                this.ctx.fill();
                this.ctx.fillStyle = '#aaa';
                this.ctx.font = '9px monospace';
                this.ctx.fillText(inp.name, p.x + 6, p.y + 3);
            }
            for (const out of comp.outputs) {
                const p = comp.getPortPosition(out);
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 5, 0, 2*Math.PI);
                this.ctx.fillStyle = out.connectedTo ? '#ffc107' : '#ff9800';
                this.ctx.fill();
                this.ctx.fillStyle = '#aaa';
                this.ctx.font = '9px monospace';
                const tw = this.ctx.measureText(out.name).width;
                this.ctx.fillText(out.name, p.x - 6 - tw, p.y + 3);
            }
        }
        
        this.ctx.restore();
    }
    
    showContextMenu(x, y, component) {
        const menu = document.getElementById('contextMenu');
        if (!menu) return;
        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        const handler = (e) => {
            const action = e.target.dataset.action;
            if (action === 'delete') this.deleteComponent(component.id);
            else if (action === 'rename') { const n = prompt('新名称:', component.name); if(n) { component.name = n; this.draw(); } }
            else if (action === 'addInput') { const n = prompt('端口名:'); if(n) { component.addInput(n); this.draw(); } }
            else if (action === 'addOutput') { const n = prompt('端口名:'); if(n) { component.addOutput(n); this.draw(); } }
            else if (action === 'duplicate') this.duplicateComponent(component);
            menu.style.display = 'none';
            document.removeEventListener('click', handler);
        };
        setTimeout(() => document.addEventListener('click', handler), 0);
    }
    
    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
    
    toJSON() {
        return {
            components: Array.from(this.components.values()).map(c => ({ id: c.id, name: c.name, x: c.x, y: c.y, inputs: c.inputs.map(i => i.name), outputs: c.outputs.map(o => o.name) })),
            connections: this.connections.map(c => ({ id: c.id, fromComponentId: c.fromComponentId, fromPortId: c.fromPortId, toComponentId: c.toComponentId, toPortId: c.toPortId }))
        };
    }
    
    fromJSON(data) {
        this.components.clear();
        this.connections = [];
        for (const c of data.components) {
            const comp = new Component(c.id, c.name, c.x, c.y, c.inputs, c.outputs);
            this.components.set(comp.id, comp);
        }
        for (const c of data.connections) {
            const conn = new Connection(c.id, c.fromComponentId, c.fromPortId, c.toComponentId, c.toPortId);
            this.connections.push(conn);
            const fc = this.components.get(c.fromComponentId);
            const tc = this.components.get(c.toComponentId);
            const fp = fc?.outputs.find(p => p.id === c.fromPortId) || fc?.inputs.find(p => p.id === c.fromPortId);
            const tp = tc?.inputs.find(p => p.id === c.toPortId) || tc?.outputs.find(p => p.id === c.toPortId);
            if (fp) fp.connectedTo = conn.id;
            if (tp) tp.connectedTo = conn.id;
        }
        this.draw();
    }
}
