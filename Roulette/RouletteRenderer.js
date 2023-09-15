let model = {
    outerCircle: {
        mesh: null,
        divideAccuracy: 0,
        glBuffer: null
    },
    middleCircle: {
        mesh: null,
        divideAccuracy: 0,
        glBuffer: null
    },
    innerCircle: {
        mesh: null,
        divideAccuracy: 0,
        glBuffer: null
    }
};

let material = {
    outerDiffuse: {
        image: null,
        texture: null,
        isDirty: false
    },
    middleDiffuse: {
        image: null,
        texture: null,
        isDirty: false
    },
    innerDiffuse: {
        image: null,
        texture: null,
        isDirty: false
    },
    shaderProgram: {
        vertexSource: null,
        fragmentSource: null,
        vertexShader: null,
        fragmentShader: null,
        program: null,
        attributes: {
            position: null,
            uv: null,
            normal: null
        },
        uniforms: {
            mvp: null,
            diffuse: null,
            unitTime: null,
            scale: null,
            ratio: null
        }
    }
};

let renderingArgs = {
    background: [0, 0, 0, 1],
    modelDivideAccuracy: 90,
    ratio: 1.0
};

function setRenderingArguments(argument, value) {
    switch (argument) {
        case "backgroundColor": { renderingArgs.background = value; } break;
        case "modelDivideAccuracy": { renderingArgs.modelDivideAccuracy = value; } break;
    }
}

function setMaterial(materialName, value) {
    switch (materialName) {
        case "outerTexture": {
            material.outerDiffuse.image = value;
            material.outerDiffuse.isDirty = true;
        } break;
        case "middleTexture": {
            material.middleDiffuse.image = value;
            material.middleDiffuse.isDirty = true;
        } break;
        case "innerTexture": {
            material.innerDiffuse.image = value;
            material.innerDiffuse.isDirty = true;
        } break;
        case "vertexShader": material.shaderProgram.vertexSource = value; break;
        case "fragmentShader": material.shaderProgram.fragmentSource = value; break;
    }
}

function onCanvasCreated(gl) {
    gl.clearColor(renderingArgs.background[0], renderingArgs.background[1], renderingArgs.background[2], renderingArgs.background[3]);
    gl.clearDepth(1);
    gl.depthRange(0, 1);
}

function onCanvasSizeChanged(gl, width, height) {
    renderingArgs.ratio = width / height;
    gl.viewport(0, 0, width, height);
}

function onCanvasDrawFrame(gl, current, deltaTime) {
    updateModelsIfNeed(gl);
    updateMaterialsIfNeed(gl);

    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

    if (material.shaderProgram.program) {
        gl.useProgram(material.shaderProgram.program)
        renderCircle(gl, current, deltaTime, model.innerCircle, material.innerDiffuse, 0.0)
        renderCircle(gl, current, deltaTime, model.middleCircle, material.middleDiffuse, 0.1)
        renderCircle(gl, current, deltaTime, model.outerCircle, material.outerDiffuse, 0.2)
    }
}

function onCanvasDestroyed(gl) {
    gl.deleteTexture(material.outerDiffuse.texture)
    gl.deleteTexture(material.middleDiffuse.texture)
    gl.deleteTexture(material.innerDiffuse.texture)
    gl.deleteBuffer(model.outerCircle.glBuffer)
    gl.deleteBuffer(model.middleCircle.glBuffer)
    gl.deleteBuffer(model.innerCircle.glBuffer)
    gl.deleteProgram(material.shaderProgram.program)
    gl.deleteShader(material.shaderProgram.vertexShader)
    gl.deleteShader(material.shaderProgram.fragmentShader)
    material.outerDiffuse.texture = null
    material.middleDiffuse.texture = null
    material.innerDiffuse.texture = null
    model.outerCircle.glBuffer = null
    model.middleCircle.glBuffer = null
    model.innerCircle.glBuffer = null
    material.shaderProgram.program = null
    material.shaderProgram.vertexShader = null
    material.shaderProgram.fragmentShader = null
}

//////////////////////// 内部方法 //////////////////////////

function renderCircle(gl, current, deltaTime, model, diffuse, phase) {
    if (!model.glBuffer) return;

    let mesh = model.mesh;
    gl.bindBuffer(gl.ARRAY_BUFFER, model.glBuffer);
    if (mesh.positionSize > 0) {
        gl.enableVertexAttribArray(material.shaderProgram.attributes.position);
        gl.vertexAttribPointer(material.shaderProgram.attributes.position,
            mesh.positionSize, mesh.positionType, mesh.positionNormalized, mesh.positionStride, mesh.positionOffset
        );
    }
    if (mesh.uvSize > 0) {
        gl.enableVertexAttribArray(material.shaderProgram.attributes.uv);
        gl.vertexAttribPointer(material.shaderProgram.attributes.uv,
            mesh.uvSize, mesh.uvType, mesh.uvNormalized, mesh.uvStride, mesh.uvOffset
        );
    }
    if (mesh.normalSize > 0) {
        gl.enableVertexAttribArray(material.shaderProgram.attributes.normal);
        gl.vertexAttribPointer(material.shaderProgram.attributes.normal,
            mesh.normalSize, mesh.normalType, mesh.normalNormalized, mesh.normalStride, mesh.normalOffset
        );
    }

    if (diffuse.texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, diffuse.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(material.shaderProgram.uniforms.diffuse, 0);
        gl.uniform1f(material.shaderProgram.uniforms.unitTime, calcUnitTime(current, phase));
        gl.uniform1f(material.shaderProgram.uniforms.scale, 1.0);
        gl.uniform1f(material.shaderProgram.uniforms.ratio, renderingArgs.ratio);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, model.mesh.vertexOffset, model.mesh.vertexCount)
}

function updateModelsIfNeed(gl) {
    let updateModel = function (model, innerRadius, outerRadius) {
        if (model.divideAccuracy !== renderingArgs.modelDivideAccuracy) {
            model.mesh = makeCircleMesh(renderingArgs.modelDivideAccuracy, innerRadius, outerRadius);
            model.divideAccuracy = renderingArgs.modelDivideAccuracy;
            model.glBuffer = uploadModel(gl, model.mesh.vertex);
            if (model.glBuffer) {
                console.log("[updateModelsIfNeed] uploaded circle model to GPU");
            } else {
                console.error("[updateModelsIfNeed] uploaded circle model to GPU failed: " + gl.getError());
            }
        }
    }

    updateModel(model.outerCircle, 0.80, 0.90);
    updateModel(model.middleCircle, 0.65, 0.775);
    updateModel(model.innerCircle, 0.525, 0.625);
}

function uploadModel(gl, vertex) {
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex), gl.STATIC_DRAW);
    return buffer;
}

function makeCircleMesh(accuracy, innerRadius, outerRadius) {
    let elems = (3 + 2 + 3);
    let stride = elems * 2; // (pos.xyz + coords.uv + normal.xyz) * (inner + outer)
    let loopSize = (accuracy < 3) ? 3 : accuracy;
    let unitRadian = 2 * Math.PI / loopSize;
    let unitU = 1.0 / loopSize;

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

function updateMaterialsIfNeed(gl) {
    let shaderProgram = material.shaderProgram;
    if (shaderProgram.program == null) {
        if (!shaderProgram.vertexShader && shaderProgram.vertexSource) {
            shaderProgram.vertexShader = assembleShader(gl, gl.VERTEX_SHADER, shaderProgram.vertexSource);
        }
        if (!shaderProgram.fragmentShader && shaderProgram.fragmentSource) {
            shaderProgram.fragmentShader = assembleShader(gl, gl.FRAGMENT_SHADER, shaderProgram.fragmentSource);
        }
        if (shaderProgram.vertexShader || shaderProgram.fragmentShader) {
            shaderProgram.program = compileProgram(gl, shaderProgram.vertexShader, shaderProgram.fragmentShader);
            if (shaderProgram.program) {
                shaderProgram.attributes.position = gl.getAttribLocation(shaderProgram.program, "aPos");
                shaderProgram.attributes.uv = gl.getAttribLocation(shaderProgram.program, "aUv");
                shaderProgram.attributes.normal = gl.getAttribLocation(shaderProgram.program, "aNormal");
                shaderProgram.uniforms.mvp = gl.getUniformLocation(shaderProgram.program, "uMvp");
                shaderProgram.uniforms.diffuse = gl.getUniformLocation(shaderProgram.program, "uDiffuse");
                shaderProgram.uniforms.unitTime = gl.getUniformLocation(shaderProgram.program, "uUnitTime");
                shaderProgram.uniforms.scale = gl.getUniformLocation(shaderProgram.program, "uScale");
                shaderProgram.uniforms.ratio = gl.getUniformLocation(shaderProgram.program, "uRatio");

                console.log("[updateMaterialsIfNeed] compiled shader program");
                console.log("[updateMaterialsIfNeed]  - [attribute] position: " + shaderProgram.attributes.position);
                console.log("[updateMaterialsIfNeed]  - [attribute] uv: " + shaderProgram.attributes.uv);
                console.log("[updateMaterialsIfNeed]  - [attribute] normal: " + shaderProgram.attributes.normal);
                console.log("[updateMaterialsIfNeed]  - [uniform] mvp: " + shaderProgram.uniforms.mvp);
                console.log("[updateMaterialsIfNeed]  - [uniform] diffuse: " + shaderProgram.uniforms.diffuse);
                console.log("[updateMaterialsIfNeed]  - [uniform] unitTime: " + shaderProgram.uniforms.unitTime);
                console.log("[updateMaterialsIfNeed]  - [uniform] scale: " + shaderProgram.uniforms.scale);
                console.log("[updateMaterialsIfNeed]  - [uniform] ratio: " + shaderProgram.uniforms.ratio);
            }
        }
    }

    if (material.outerDiffuse.isDirty && material.outerDiffuse.image) {
        material.outerDiffuse.texture = uploadTexture(gl, material.outerDiffuse.image);
        material.outerDiffuse.isDirty = false;
    }

    if (material.middleDiffuse.isDirty && material.middleDiffuse.image) {
        material.middleDiffuse.texture = uploadTexture(gl, material.middleDiffuse.image);
        material.middleDiffuse.isDirty = false;
    }

    if (material.innerDiffuse.isDirty && material.innerDiffuse.image) {
        material.innerDiffuse.texture = uploadTexture(gl, material.innerDiffuse.image);
        material.innerDiffuse.isDirty = false;
    }
}

function assembleShader(gl, type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("[assembleShader] compile shader error: \n" + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    } else {
        return shader;
    }
}

function compileProgram(gl, vertexShader, fragmentShader) {
    let program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("[compileProgram] link shader program error: \n" + gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    } else {
        return program;
    }
}

function uploadTexture(gl, image) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    return texture;
}

/**
 * 把sin周期对齐到2s周期上
 */
function calcUnitTime(time, phase) {
    const duration = 2; // 2s
    return time / 1000.0 * ((1 / duration) * Math.PI) + phase;
}