////////////////// 带入私有库 ///////////////////
document.write("<script src='ImageGenerator.js'></script>");
document.write("<script src='RouletteRenderer.js'></script>");

////////////////// 公开方法 ///////////////////

let resources = {
    resourceMaker: null,
    taskIdCounter: 0,
    outer: {
        image: null,
        texture: null,
        taskId: 0,
        isDirty: true
    },
    middle: {
        image: null,
        texture: null,
        taskId: 0,
        isDirty: true
    },
    inner: {
        image: null,
        texture: null,
        taskId: 0,
        isDirty: true
    },
    forDimension: {
        width: 0,
        height: 0
    }
};

let env = {
    canvasWidth: 0,
    canvasHeight: 0,
    frames: 0,
    fps: 0
};

let references = {
    canvas: null,
    canvasContext: null,
    timer:null,
    updatedTime: null,
    logView: null
};

function startClock(canvasElementId) {
    references.canvas = document.getElementById(canvasElementId);
    references.timer = setInterval(onTimeIntervalChanged, 500);
    initializeClockCanvas();
    extractShaderSourceFromScript();
    onCanvasCreated(references.canvasContext);
    onCanvasResize();
    onDraw();
}

function stopClock() {
    clearInterval(references.timer);
    onCanvasDestroyed(references.canvasContext);
    resources.resourceMaker.terminate();
    resources.resourceMaker = null;
}

function onCanvasResize() {
    env.canvasWidth = window.innerWidth;
    env.canvasHeight = window.innerHeight;
    references.canvas.width = window.innerWidth;
    references.canvas.height = window.innerHeight;
    makeResourcesIfNeed(env.canvasWidth, env.canvasHeight);
    onCanvasSizeChanged(references.canvasContext, env.canvasWidth, env.canvasHeight);
}

let firstFrameTime = null;
let lastFrameTime = null;
function onDraw() {
    let current = Date.now();
    let deltaTime = (lastFrameTime == null) ? 0 : (current - lastFrameTime);

    env.fps = 1000.0 / deltaTime;
    env.frames ++;
    lastFrameTime = current;
    firstFrameTime = firstFrameTime || current;
    onCanvasDrawFrame(references.canvasContext, current - firstFrameTime, deltaTime);
    requestRender()

    // console.log("fps: " + env.fps + ", frames: " + env.frames);
}

function requestRender() {
    window.requestAnimationFrame(onDraw)
}

function setLogView(logViewElementId) {
    references.logView = document.getElementById(logViewElementId);
}

////////////////// 内部逻辑 ///////////////////

Date.prototype.format = function dateFormat(fmt) {
    let o = {
        "M+" : this.getMonth() + 1,                     // 月
        "d+" : this.getDate(),                          // 日
        "h+" : this.getHours(),                         // 时
        "m+" : this.getMinutes(),                       // 分
        "s+" : this.getSeconds(),                       // 秒
        "q+" : Math.floor((this.getMonth() + 3) / 3),   // 季
        "S"  : this.getMilliseconds()                   // 毫秒
    };
    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
    }
    for (const k in o) {
        if (new RegExp("("+ k +")").test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        }
    }
    return fmt;
};

function initializeClockCanvas() {
    try {
        references.canvasContext = references.canvas.getContext("webgl2", { alpha: true, antialias: true});
    } catch (exp) {
        references.canvasContext = null;
        references.canvas.innerHTML = "浏览器不支持Html5!" + "\n" + exp.message;
    }
}

function extractShaderSourceFromScript() {
    setMaterial("vertexShader", shaderSourceFromScript("shader-vs"));
    setMaterial("fragmentShader", shaderSourceFromScript("shader-fs"));
}

function makeResourcesIfNeed(currentCanvasWidth, currentCanvasHeight) {
    let dimensionIsDirty = (resources.forDimension.width !== currentCanvasWidth)
                        || (resources.forDimension.height !== currentCanvasHeight);

    if (dimensionIsDirty || resources.outer.isDirty) {
        resources.outer.isDirty = false
        resources.outer.taskId = resources.taskIdCounter++;
        ensureResourceMaker().postMessage({
            method: "genTextImage",
            taskId: resources.outer.taskId,
            boundWidth: currentCanvasWidth,
            boundHeight: currentCanvasHeight,
            text: makeDateText(),
            textColor: "#DE592C",
            textSize: "60px"
        })
    }

    if (dimensionIsDirty || resources.middle.isDirty) {
        resources.middle.isDirty = false;
        resources.middle.taskId = resources.taskIdCounter++;
        ensureResourceMaker().postMessage({
            method: "genTextImage",
            taskId: resources.middle.taskId,
            boundWidth: currentCanvasWidth,
            boundHeight: currentCanvasHeight,
            text: makeCommentText(),
            textColor: "#FFFFFF",
            textSize: "80px"
        })
    }

    if (dimensionIsDirty || resources.inner.isDirty) {
        resources.inner.isDirty = false;
        resources.inner.taskId = resources.taskIdCounter++;
        ensureResourceMaker().postMessage({
            method: "genTextImage",
            taskId: resources.inner.taskId,
            boundWidth: currentCanvasWidth,
            boundHeight: currentCanvasHeight,
            text: makeTimeText(),
            textColor: "#DE592C",
            textSize: "80px"
        })
    }

    resources.forDimension.width = currentCanvasWidth;
    resources.forDimension.height = currentCanvasHeight;
}

function onTimeIntervalChanged() {
    let date = new Date().format("yyyyMMddhhmmss");
    if (date !== references.updatedTime) {
        references.updatedTime = date;
        resources.inner.isDirty = true;
        makeResourcesIfNeed(env.canvasWidth, env.canvasHeight); // <---- 缺失对前一次任务的cancel，会偶尔引起更新纹理延迟
    }
}

function onResourceMakerCallback(event) {
    console.log("[ensureResourceMaker] task: " + event.data.taskId + ", payload: " + event.data.result);
    switch (event.data.taskId) {
        case resources.outer.taskId: setMaterial("outerTexture", event.data.result); break;
        case resources.middle.taskId: setMaterial("middleTexture", event.data.result); break;
        case resources.inner.taskId: setMaterial("innerTexture", event.data.result); break;
    }
}

function onResourceMakerError(error) {

}

function ensureResourceMaker() {
    if (resources.resourceMaker == null) {
        console.log("[ensureResourceMaker] launch ImageGenerator");
        resources.resourceMaker = new Worker("ImageGenerator.js", { name: "[Roulette] ImageGenerator" })
        resources.resourceMaker.onmessage = onResourceMakerCallback;
        resources.resourceMaker.onmessageerror = onResourceMakerError;
    }
    return resources.resourceMaker;
}

function makeDateText() {
    let date = new Date().format("yyyy-MM-dd");
    return date + " DATE " + date + " DATE " + date + " DATE " + date + " DATE " + date + ".";
}

function makeCommentText() {
    return "Copyright @Cocoonshu in 2023-2028. Copyright @Cocoonshu in 2023-2028.";
}

function makeTimeText() {
    let time = new Date().format("hh:mm:ss");
    return time + " TIME " + time + " TIME " + time + " TIME " + time + " TIME " + time + ".";
}

function shaderSourceFromScript(scriptId) {
    const shaderScript = document.getElementById(scriptId);
    if (shaderScript == null) return "";

    let sourceCode = "";
    let child = shaderScript.firstChild;
    while (child) {
        if (child.nodeType === child.TEXT_NODE ) {
            sourceCode += child.textContent;
        }
        child = child.nextSibling;
    }

    return sourceCode;
}

function printException(exception) {
    references.logView && (
        references.logView.innerHTML = "Error: " + exception.message + " (Line:" + exception.lineNumber + ")"
    );
}