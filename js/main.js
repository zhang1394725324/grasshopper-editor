// 主程序
let canvasManager;
let currentDragComponent = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    canvasManager = new CanvasManager(canvas, componentTemplates, (component) => {
        // 状态栏更新
        const status = document.getElementById('status');
        if (component) {
            status.textContent = `已选中: ${component.name}`;
        } else {
            status.textContent = '就绪';
        }
    });
    
    // 初始化组件库
    initComponentLibrary
