const liquidCrystal = new FontFace("LiquidCrystal", "url('fonts/LiquidCrystal-Normal.otf')");

function ensureExternalFont(callback) {
    if (self.FontFace) {
        if (self.fonts.has(liquidCrystal)) {
            callback()
        } else {
            liquidCrystal.load().then(() => {
                console.log("[ensureExternalFont] has load LiquidCrystal font")
                self.fonts.add(liquidCrystal);
                callback()
            })
        }
    } else {
        console.error("[ensureExternalFont] broswer doesn't support FontFace API from WebWorker")
        callback()
    }
}

self.addEventListener('message', function (msg) {
    let args = msg.data;
    console.log("[ImageGenerator][onmessage] " + msg.data.method);
    switch (args.method) {
        case 'genTextImage': { // { method, taskId, boundWidth, boundHeight, text, textColor, textSize }
            ensureExternalFont(() => {
                let result = makeTextImage(args.boundWidth, args.boundHeight, args.text, args.textColor, args.textSize);
                postMessage({ taskId: args.taskId, result: result }, [result]);
            })
        } break;

        case 'genCircleMesh': { // { method, taskId, outerRadius, innerRadius, divide }
            ensureExternalFont(() => {
                let result = makeCircleMesh(args.divide, args.innerRadius, args.outerRadius);
                postMessage({taskId: args.taskId, result: result});
            })
        } break;
    }
}, false)

function makeTextImage(boundWidth, boundHeight, text, textColor, textSize) {
    let fontSize = textSize;
    let fontColor = textColor;
    let padding = 5;
    let canvas = new OffscreenCanvas(0, 0);

    let metrics = null;
    {// measure
        let context = canvas.getContext("2d", { alpha: true, antialias: true});
        context.font = fontSize + " LiquidCrystal";
        context.textAlign = "left";
        context.fillStyle = fontColor;
        context.textBaseline = "top";
        metrics = context.measureText(text);
    }

    {// draw text
        canvas.width = (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) + padding;
        canvas.height = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + padding;
        let context = canvas.getContext("2d", { alpha: true, antialias: true});
        context.font = fontSize + " LiquidCrystal";
        context.textAlign = "left";
        context.fillStyle = fontColor;
        context.textBaseline = "top";
        context.fillText(text, 0, 0);
    }

    let result = canvas.transferToImageBitmap();
    console.log("[makeTextImage] make " + result.width + "x" + result.height + " image bitmap for '" + text + "'")
    return result
}

function makeCircleMesh(accuracy, innerRadius, outerRadius) {
    let elems = (3 + 2 + 3);
    let stride = elems * 2; // (pos.xyz + coords.uv + normal.xyz) * (inner + outer)
    let loopSize = (accuracy < 3) ? 3 : accuracy;
    let unitRadian = 2 * Math.PI / loopSize;
    let unitU = 1.0 / (loopSize - 1);

    let meshData = new Float32Array(stride * (loopSize + 1)); // (xyz + uv + xyz) * (inner + outer) * accuracy
    for (let i = 0; i <= (loopSize + 1); i++) {
        let angle = i * unitRadian;
        let x     = Math.cos(angle);
        let y     = Math.sin(angle);
        let u     = i * unitU;
        let skip  = i * stride;

        {// inner
            meshData[skip + 0] = x * innerRadius; // pos.x
            meshData[skip + 1] = y * innerRadius; // pos.y
            meshData[skip + 2] = 0;               // pos.z

            meshData[skip + 3] = u;               // coords.u
            meshData[skip + 4] = 0.0;             // coords.v

            meshData[skip + 5] = 0.0;             // normal.x
            meshData[skip + 6] = 0.0;             // normal.y
            meshData[skip + 7] = 1.0;             // normal.z
        }

        {// outer
            meshData[skip + 8] = x * outerRadius; // pos.x
            meshData[skip + 9] = y * outerRadius; // pos.y
            meshData[skip + 10] = 0;               // pos.z

            meshData[skip + 11] = u;               // coords.u
            meshData[skip + 12] = 1.0;             // coords.v

            meshData[skip + 13] = 0.0;             // normal.x
            meshData[skip + 14] = 0.0;             // normal.y
            meshData[skip + 15] = 1.0;             // normal.z
        }
    }

    return {
        vertex: meshData,
        vertexOffset: 0,
        vertexCount: meshData.length,

        positionSize: 3,
        positionType: WebGL2RenderingContext.FLOAT,
        positionNormalized: false,
        positionStride: 8 * meshData.BYTES_PER_ELEMENT,
        positionOffset: 0 * meshData.BYTES_PER_ELEMENT,

        uvSize: 2,
        uvType: WebGL2RenderingContext.FLOAT,
        uvNormalized: false,
        uvStride: 8 * meshData.BYTES_PER_ELEMENT,
        uvOffset: 3 * meshData.BYTES_PER_ELEMENT,

        normalSize: 3,
        normalType: WebGL2RenderingContext.FLOAT,
        normalNormalized: false,
        normalStride: 8 * meshData.BYTES_PER_ELEMENT,
        normalOffset: 5 * meshData.BYTES_PER_ELEMENT
    };
}