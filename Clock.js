/**
 * Created by 80074591 on 2015-08-31.
 */
document.write('<script src="StringUtils.js"> <\/script>');

var Padding = [0.1, 0.1, 0.1, 0.1];
var ClockPannelSize = {
    outerLineWidth:0.04,
    digitalClockTextSize:0.25,
    logoTextSize:0.10,
    digitalClockTextVerticalPosition:0.4,
    logoTextVerticalPosition:0.6,
    markerOuterBorder:0.875,
    markerInnerBorder:0.825,
    markerLineWidth:0.01,
    pannelLEDPosition:0.85,
    pointerLineWidth:0.03,
    hourPointerLength:0.43,
    hourLEDPosition:0.5,
    minutePointerLength:0.7,
    minuteLEDPosition:0.73,
    secondPointerLength:0.79,
    secondLEDPosition:0.85,
    axisStrokeLineWidth:0.03,
    axisRadius:0.05
};

var PannelLEDSize = {
    imageWidth:0.15,
    imageHeight:0.15,
    ledRadius:0.0375,
    blurRadius:0.075,
    startGradientColor:"#499FDC",
    stopGradientColor:"rgba(00, 00, 00, 0.0)",
    strokeColor:"rgba(00, 00, 00, 0.5)",
    strokeLineWidth:0.01
};

var PointerLEDSize = {
    imageWidth:0.25,
    imageHeight:0.25,
    shadowBlur:0.20,
    ledShapeRadius:0.0625,

    secondStartGradientColor:"rgba(255, 000, 000, 0.8)",
    secondStopGradientColor:"rgba(000, 000, 000, 0.0)",
    secondColor:"rgba(255, 000, 000, 0.8)",
    secondLedRadius:0.0625,
    secondBlurRadius:0.125,

    minuteStartGradientColor:"rgba(000, 255, 000, 0.7)",
    minuteStopGradientColor:"rgba(000, 000, 000, 0.0)",
    minuteColor:"rgba(000, 255, 000, 0.8)",
    minuteLedRadius:0.05,
    minuteBlurRadius:0.1,

    hourStartGradientColor:"rgba(000, 000, 255, 0.8)",
    hourStopGradientColor:"rgba(000, 000, 000, 0.0)",
    hourColor:"rgba(000, 000, 255, 0.8)",
    hourLedRadius:0.075,
    hourBlurRadius:0.15,

    strokeColor:"#000000",
    strokeLineWidth:0.01
};

var mClockCanvas            = null;
var mCanvasContext          = null;
var mOffscreenCanvasContext = null;
var mOffscreenCanvas        = null;
var mIsRunning              = false;
var mCurrentTime            = null;
var mLogElement             = null;
var mPannelLEDImage         = null;
var mHourLEDImage           = null;
var mMinuteLEDImage         = null;
var mSecondLEDImage         = null;
var mCurrentTimeString      = "";

function startClock(clockCanvasId) {
    mClockCanvas  = document.getElementById(clockCanvasId);
    mCurrentTime  = new Date();
    initializeClockCanvas();
    onCanvasResize();

    mIsRunning = true;
    updateClockText();
    updateClockCanvas();
    setInterval(updateClockText, 500);
}

function updateClockText() {
    mCurrentTime  = new Date();
    mCurrentTimeString = sprintf("%02d:%02d:%02d",
        mCurrentTime.getHours(), mCurrentTime.getMinutes(), mCurrentTime.getSeconds());
    updateClockCanvas();
}

function updateClockCanvas() {
    var hasMoreFrames = false;
    var hour = mCurrentTime.getHours();
    var minute = mCurrentTime.getMinutes();
    var second = mCurrentTime.getSeconds();
    var canvasWidth = mClockCanvas.width;
    var canvasHeight = mClockCanvas.height;
    var clientWidth = canvasWidth * (1.0 - Padding[0] - Padding[2]);
    var clientHeight = canvasHeight * (1.0 - Padding[1] - Padding[3]);
    var clockRadius = Math.min(clientWidth, clientHeight) * 0.5;
    var paddingLeft = canvasWidth * Padding[0];
    var paddingTop = canvasHeight * Padding[1];
    var paddingRight = canvasWidth * Padding[2];
    var paddingBottom = canvasHeight * Padding[3];
    var centerPoint = [
        canvasWidth * Padding[0] + clientWidth * 0.5,
        canvasHeight * Padding[1] + clientHeight * 0.5
    ];

    // TODO
    try {
        // 表盘
        var pannelGradient = mOffscreenCanvasContext.createRadialGradient(
            centerPoint[0], centerPoint[1], clockRadius * 0.5, centerPoint[0], centerPoint[1], clockRadius);
        pannelGradient.addColorStop(0, "#131313");
        pannelGradient.addColorStop(1, "#070707");
        mOffscreenCanvasContext.fillStyle = pannelGradient;
        mOffscreenCanvasContext.strokeStyle = "#2E2E2E";
        mOffscreenCanvasContext.lineWidth = ClockPannelSize.outerLineWidth * clockRadius;
        mOffscreenCanvasContext.beginPath();
        mOffscreenCanvasContext.arc(centerPoint[0], centerPoint[1], clockRadius, 0, 2 * Math.PI, true);
        mOffscreenCanvasContext.fill();
        mOffscreenCanvasContext.stroke();
        mOffscreenCanvasContext.closePath();

        // 数字时钟
        mOffscreenCanvasContext.textAlign = "center";
        mOffscreenCanvasContext.fillStyle = "aqua";
        mOffscreenCanvasContext.strokeStyle = "#000000";
        mOffscreenCanvasContext.font = (ClockPannelSize.digitalClockTextSize * clockRadius) + "px LiquidCrystal";
        mOffscreenCanvasContext.fillText(mCurrentTimeString, centerPoint[0], centerPoint[1] + clockRadius * ClockPannelSize.digitalClockTextVerticalPosition);

        // Logo
        mOffscreenCanvasContext.textAlign = "center";
        mOffscreenCanvasContext.fillStyle = "aqua";
        mOffscreenCanvasContext.strokeStyle = "#000000";
        mOffscreenCanvasContext.font = (ClockPannelSize.logoTextSize * clockRadius) + "px LiquidCrystal";
        mOffscreenCanvasContext.fillText("Cocoonshu", centerPoint[0], centerPoint[1] + clockRadius * ClockPannelSize.logoTextVerticalPosition);

        // 表盘刻度
        mOffscreenCanvasContext.beginPath();
        for (var sec = 0; sec < 60; sec++) {
            if (sec % 5 == 0)
                continue;

            var positionFactor = 2 * Math.PI / 60 * sec;
            mOffscreenCanvasContext.strokeStyle = "#5B5B5B";
            mOffscreenCanvasContext.lineWidth = ClockPannelSize.markerLineWidth * clockRadius;

            var outerX = centerPoint[0] + clockRadius * Math.sin(positionFactor) * ClockPannelSize.markerOuterBorder;
            var outerY = centerPoint[1] - clockRadius * Math.cos(positionFactor) * ClockPannelSize.markerOuterBorder;
            mOffscreenCanvasContext.moveTo(outerX, outerY);

            var innerX = centerPoint[0] + clockRadius * Math.sin(positionFactor) * ClockPannelSize.markerInnerBorder;
            var innerY = centerPoint[1] - clockRadius * Math.cos(positionFactor) * ClockPannelSize.markerInnerBorder;
            mOffscreenCanvasContext.lineTo(innerX, innerY);
        }
        mOffscreenCanvasContext.stroke();
        mOffscreenCanvasContext.closePath();

        // 表盘灯光
        for (var led = 0; led < 60; led += 5) {
            var positionFactor = 2 * Math.PI / 60 * led;
            var ledX = centerPoint[0] + clockRadius * Math.sin(positionFactor) * ClockPannelSize.pannelLEDPosition;
            var ledY = centerPoint[1] - clockRadius * Math.cos(positionFactor) * ClockPannelSize.pannelLEDPosition;
            mOffscreenCanvasContext.drawImage(mPannelLEDImage,
                ledX - PannelLEDSize.imageWidth * clockRadius * 0.5,
                ledY - PannelLEDSize.imageHeight * clockRadius * 0.5);
        }

        // 时针
        var hourFactor = 2 * Math.PI / 12 * (hour + minute / 60 + second / 3600);
        var hourPoint = [
            centerPoint[0] + clockRadius * Math.sin(hourFactor) * ClockPannelSize.hourPointerLength,
            centerPoint[1] - clockRadius * Math.cos(hourFactor) * ClockPannelSize.hourPointerLength
        ];
        var hourRotateCenter = [
            centerPoint[0] + clockRadius * Math.sin(hourFactor) * ClockPannelSize.hourLEDPosition,
            centerPoint[1] - clockRadius * Math.cos(hourFactor) * ClockPannelSize.hourLEDPosition
        ];
        var hourLEDPoint = [
            hourRotateCenter[0] - mHourLEDImage.width * 0.5,
            hourRotateCenter[1] - mHourLEDImage.height * 0.5
        ];
        mOffscreenCanvasContext.strokeStyle = "#222222";
        mOffscreenCanvasContext.lineWidth = ClockPannelSize.pointerLineWidth * clockRadius;
        mOffscreenCanvasContext.save();
        mOffscreenCanvasContext.translate(hourRotateCenter[0], hourRotateCenter[1]);
        mOffscreenCanvasContext.rotate(hourFactor);
        mOffscreenCanvasContext.translate(-hourRotateCenter[0], -hourRotateCenter[1]);
        mOffscreenCanvasContext.drawImage(mHourLEDImage, hourLEDPoint[0], hourLEDPoint[1]);
        mOffscreenCanvasContext.restore();
        mOffscreenCanvasContext.beginPath();
        mOffscreenCanvasContext.moveTo(centerPoint[0], centerPoint[1]);
        mOffscreenCanvasContext.lineTo(hourPoint[0], hourPoint[1]);
        mOffscreenCanvasContext.stroke();
        mOffscreenCanvasContext.closePath();

        // 分针
        var minuteFactor = 2 * Math.PI / 60 * (minute + second / 60);
        var minutePoint = [
            centerPoint[0] + clockRadius * Math.sin(minuteFactor) * ClockPannelSize.minutePointerLength,
            centerPoint[1] - clockRadius * Math.cos(minuteFactor) * ClockPannelSize.minutePointerLength
        ];
        var minuteRotateCenter = [
            centerPoint[0] + clockRadius * Math.sin(minuteFactor) * ClockPannelSize.minuteLEDPosition,
            centerPoint[1] - clockRadius * Math.cos(minuteFactor) * ClockPannelSize.minuteLEDPosition
        ];
        var minuteLEEDPoint = [
            minuteRotateCenter[0] - mMinuteLEDImage.width * 0.5,
            minuteRotateCenter[1] - mMinuteLEDImage.height * 0.5
        ];
        mOffscreenCanvasContext.strokeStyle = "#1D1D1D";
        mOffscreenCanvasContext.lineWidth = ClockPannelSize.pointerLineWidth * clockRadius;
        mOffscreenCanvasContext.save();
        mOffscreenCanvasContext.translate(minuteRotateCenter[0], minuteRotateCenter[1]);
        mOffscreenCanvasContext.rotate(minuteFactor);
        mOffscreenCanvasContext.translate(-minuteRotateCenter[0], -minuteRotateCenter[1]);
        mOffscreenCanvasContext.drawImage(mMinuteLEDImage, minuteLEEDPoint[0], minuteLEEDPoint[1]);
        mOffscreenCanvasContext.restore();
        mOffscreenCanvasContext.beginPath();
        mOffscreenCanvasContext.moveTo(centerPoint[0], centerPoint[1]);
        mOffscreenCanvasContext.lineTo(minutePoint[0], minutePoint[1]);
        mOffscreenCanvasContext.stroke();
        mOffscreenCanvasContext.closePath();

        // 秒针
        var secondFactor = 2 * Math.PI / 60 * second;
        var secondPoint = [
            centerPoint[0] + clockRadius * Math.sin(secondFactor) * ClockPannelSize.secondPointerLength,
            centerPoint[1] - clockRadius * Math.cos(secondFactor) * ClockPannelSize.secondPointerLength
        ];
        mOffscreenCanvasContext.strokeStyle = "#222222";
        mOffscreenCanvasContext.lineWidth = 5;
        mOffscreenCanvasContext.drawImage(mSecondLEDImage,
            centerPoint[0] + clockRadius * Math.sin(secondFactor) * ClockPannelSize.secondLEDPosition - mSecondLEDImage.width * 0.5,
            centerPoint[1] - clockRadius * Math.cos(secondFactor) * ClockPannelSize.secondLEDPosition - mSecondLEDImage.height * 0.5);
        mOffscreenCanvasContext.beginPath();
        mOffscreenCanvasContext.moveTo(centerPoint[0], centerPoint[1]);
        mOffscreenCanvasContext.lineTo(secondPoint[0], secondPoint[1]);
        mOffscreenCanvasContext.stroke();
        mOffscreenCanvasContext.closePath();

        // 轴心
        mOffscreenCanvasContext.fillStyle = "#C79615";
        mOffscreenCanvasContext.strokeStyle = "#000000";
        mOffscreenCanvasContext.lineWidth = ClockPannelSize.axisStrokeLineWidth * clockRadius;
        mOffscreenCanvasContext.beginPath();
        mOffscreenCanvasContext.arc(centerPoint[0], centerPoint[1], ClockPannelSize.axisRadius * clockRadius, 0, 2 * Math.PI, true);
        mOffscreenCanvasContext.fill();
        mOffscreenCanvasContext.stroke();
        mOffscreenCanvasContext.closePath();

    } catch (exp) {
        printException(exp);
    }

    // TODO
    mCanvasContext.drawImage(mOffscreenCanvas, 0, 0);

    if (hasMoreFrames) {
        requestAnimationFrame(updateClockCanvas());
    }
}

function stopClock() {
    clearInterval(updateClockText);
}

function initializeClockCanvas() {
    try {
        mCanvasContext          = mClockCanvas.getContext("2d");
        mOffscreenCanvas        = document.createElement("Canvas");
        mPannelLEDImage         = document.createElement("Canvas");
        mHourLEDImage           = document.createElement("Canvas");
        mMinuteLEDImage         = document.createElement("Canvas");
        mSecondLEDImage         = document.createElement("Canvas");
        mOffscreenCanvasContext = mOffscreenCanvas.getContext("2d");
    } catch (exp) {
        mCanvasContext = null;
        mClockCanvas.innerHTML = "浏览器不支持Html5!" + "\n" + exp.message;
    }
}

function createPannelLEDImage() {
    var canvasWidth  = mClockCanvas.width;
    var canvasHeight = mClockCanvas.height;
    var clientWidth  = canvasWidth * (1.0 - Padding[0] - Padding[2]);
    var clientHeight = canvasHeight * (1.0 - Padding[1] - Padding[3]);
    var clockRadius  = Math.min(clientWidth, clientHeight) * 0.5;

    // 创建表盘灯光
    mPannelLEDImage.width  = PannelLEDSize.imageWidth * clockRadius;
    mPannelLEDImage.height = PannelLEDSize.imageHeight * clockRadius;

    var pannelWidth  = PannelLEDSize.imageWidth * clockRadius;
    var pannelHeight = PannelLEDSize.imageHeight * clockRadius;
    var ledRadius    = PannelLEDSize.ledRadius * clockRadius;
    var blurRadius   = PannelLEDSize.blurRadius * clockRadius;

    var pannelLEDImageCanvas = mPannelLEDImage.getContext("2d");
    var pannelLEDGradient = pannelLEDImageCanvas.createRadialGradient(
        pannelWidth / 2.0, pannelHeight / 2.0, ledRadius,
        pannelWidth / 2.0, pannelHeight / 2.0, blurRadius);
    pannelLEDGradient.addColorStop(0, PannelLEDSize.startGradientColor);
    pannelLEDGradient.addColorStop(1, PannelLEDSize.stopGradientColor);
    pannelLEDImageCanvas.fillStyle = pannelLEDGradient;
    pannelLEDImageCanvas.strokeStyle = PannelLEDSize.strokeColor;
    pannelLEDImageCanvas.lineWidth = PannelLEDSize.strokeLineWidth * clockRadius;

    // 表盘灯光
    pannelLEDImageCanvas.beginPath();
    pannelLEDImageCanvas.arc(pannelWidth / 2.0, pannelHeight / 2.0, blurRadius, 0, Math.PI * 2, true);
    pannelLEDImageCanvas.closePath();
    pannelLEDImageCanvas.fill();

    // 表盘灯光外圈
    pannelLEDImageCanvas.beginPath();
    pannelLEDImageCanvas.arc(pannelWidth / 2.0, pannelHeight / 2.0, ledRadius, 0, Math.PI * 2, true);
    pannelLEDImageCanvas.closePath();
    pannelLEDImageCanvas.stroke();
}

function createHourLEDImage() {
    var canvasWidth  = mClockCanvas.width;
    var canvasHeight = mClockCanvas.height;
    var clientWidth  = canvasWidth * (1.0 - Padding[0] - Padding[2]);
    var clientHeight = canvasHeight * (1.0 - Padding[1] - Padding[3]);
    var clockRadius  = Math.min(clientWidth, clientHeight) * 0.5;

    // 创建时针灯光
    mHourLEDImage.width  = PointerLEDSize.imageWidth * clockRadius;
    mHourLEDImage.height = PointerLEDSize.imageHeight * clockRadius;

    var hourLEDWidth  = PointerLEDSize.imageWidth * clockRadius;
    var hourLEDHeight = PointerLEDSize.imageHeight * clockRadius;
    var ledRadius     = PointerLEDSize.hourLedRadius * clockRadius;
    var blurRadius    = PointerLEDSize.hourBlurRadius * clockRadius;
    var shapeRadius   = PointerLEDSize.ledShapeRadius * clockRadius;
    var hourLEDImageCanvas = mHourLEDImage.getContext("2d");
    var hourLEDGradient = hourLEDImageCanvas.createRadialGradient(
        hourLEDWidth / 2.0, hourLEDHeight / 2.0, ledRadius,
        hourLEDWidth / 2.0, hourLEDHeight / 2.0, blurRadius);
    hourLEDGradient.addColorStop(0, PointerLEDSize.hourStartGradientColor);
    hourLEDGradient.addColorStop(1, PointerLEDSize.hourStopGradientColor);
    hourLEDImageCanvas.fillStyle = hourLEDGradient;
    hourLEDImageCanvas.strokeStyle = PointerLEDSize.strokeColor;
    hourLEDImageCanvas.lineWidth = PointerLEDSize.strokeLineWidth * clockRadius;

    // 时针灯光
    hourLEDImageCanvas.fillRect(
        hourLEDWidth / 2.0 - blurRadius, hourLEDHeight / 2.0 - blurRadius,
        2.0 * blurRadius, 2.0 * blurRadius
    );

    // 时针灯光外圈
    hourLEDImageCanvas.strokeRect(
        hourLEDWidth / 2.0 - shapeRadius, hourLEDHeight / 2.0 - shapeRadius,
        2.0 * shapeRadius, 2.0 * shapeRadius
    );
}

function createMinuteLEDImage() {
    var canvasWidth  = mClockCanvas.width;
    var canvasHeight = mClockCanvas.height;
    var clientWidth  = canvasWidth * (1.0 - Padding[0] - Padding[2]);
    var clientHeight = canvasHeight * (1.0 - Padding[1] - Padding[3]);
    var clockRadius  = Math.min(clientWidth, clientHeight) * 0.5;

    // 创建分针灯光
    mMinuteLEDImage.width  = PointerLEDSize.imageWidth * clockRadius;
    mMinuteLEDImage.height = PointerLEDSize.imageHeight * clockRadius;

    var minuteLEDWidth  = PointerLEDSize.imageWidth * clockRadius;
    var minuteLEDHeight = PointerLEDSize.imageHeight * clockRadius;
    var ledRadius       = PointerLEDSize.minuteLedRadius * clockRadius;
    var blurRadius      = PointerLEDSize.minuteBlurRadius * clockRadius;
    var shapeRadius     = PointerLEDSize.ledShapeRadius * clockRadius;

    var minuteLEDImageCanvas = mMinuteLEDImage.getContext("2d");
    var minuteLEDGradient = minuteLEDImageCanvas.createRadialGradient(
        minuteLEDWidth / 2.0, minuteLEDHeight / 2.0, ledRadius,
        minuteLEDWidth / 2.0, minuteLEDHeight / 2.0, blurRadius);
    minuteLEDGradient.addColorStop(0, PointerLEDSize.minuteStartGradientColor);
    minuteLEDGradient.addColorStop(1, PointerLEDSize.minuteStopGradientColor);
    minuteLEDImageCanvas.fillStyle = minuteLEDGradient;
    minuteLEDImageCanvas.strokeStyle = PointerLEDSize.strokeColor;
    minuteLEDImageCanvas.lineWidth = PointerLEDSize.strokeLineWidth * clockRadius;

    // 分针灯光
    minuteLEDImageCanvas.fillRect(
        minuteLEDWidth / 2.0 - blurRadius, minuteLEDHeight / 2.0 - blurRadius,
        2.0 * blurRadius, 2.0 * blurRadius
    );

    // 分针灯光外圈
    minuteLEDImageCanvas.beginPath();
    minuteLEDImageCanvas.moveTo(minuteLEDWidth / 2.0, minuteLEDHeight / 2.0 - shapeRadius);
    minuteLEDImageCanvas.lineTo(minuteLEDWidth / 2.0 + shapeRadius * 0.866 , minuteLEDHeight / 2.0 + shapeRadius * 0.5);
    minuteLEDImageCanvas.lineTo(minuteLEDWidth / 2.0 - shapeRadius * 0.866 , minuteLEDHeight / 2.0 + shapeRadius * 0.5);
    minuteLEDImageCanvas.closePath();
    minuteLEDImageCanvas.stroke();
}

function createSecondLEDImage() {
    var canvasWidth  = mClockCanvas.width;
    var canvasHeight = mClockCanvas.height;
    var clientWidth  = canvasWidth * (1.0 - Padding[0] - Padding[2]);
    var clientHeight = canvasHeight * (1.0 - Padding[1] - Padding[3]);
    var clockRadius  = Math.min(clientWidth, clientHeight) * 0.5;

    // 创建秒针灯光
    mSecondLEDImage.width  = PointerLEDSize.imageWidth * clockRadius;
    mSecondLEDImage.height = PointerLEDSize.imageHeight * clockRadius;

    var secondLEDWidth  = PointerLEDSize.imageWidth * clockRadius;
    var secondLEDHeight = PointerLEDSize.imageHeight * clockRadius;
    var ledRadius       = PointerLEDSize.secondLedRadius * clockRadius;
    var blurRadius      = PointerLEDSize.secondBlurRadius * clockRadius;
    var shapeRadius     = PointerLEDSize.ledShapeRadius * clockRadius;

    var secondLEDImageCanvas = mSecondLEDImage.getContext("2d");
    var secondLEDGradient = secondLEDImageCanvas.createRadialGradient(
        secondLEDWidth / 2.0, secondLEDHeight / 2.0, ledRadius,
        secondLEDWidth / 2.0, secondLEDHeight / 2.0, blurRadius);
    secondLEDGradient.addColorStop(0, PointerLEDSize.secondStartGradientColor);
    secondLEDGradient.addColorStop(1, PointerLEDSize.secondStopGradientColor);
    secondLEDImageCanvas.fillStyle = secondLEDGradient;
    secondLEDImageCanvas.strokeStyle = PointerLEDSize.strokeColor;
    secondLEDImageCanvas.lineWidth = PointerLEDSize.strokeLineWidth * clockRadius;

    // 秒针灯光
    secondLEDImageCanvas.beginPath();
    secondLEDImageCanvas.arc(secondLEDWidth / 2.0, secondLEDHeight / 2.0, blurRadius, 0, Math.PI * 2, true);
    secondLEDImageCanvas.closePath();
    secondLEDImageCanvas.fill();

    // 秒针灯光外圈
    secondLEDImageCanvas.beginPath();
    secondLEDImageCanvas.arc(secondLEDWidth / 2.0, secondLEDHeight / 2.0, shapeRadius, 0, Math.PI * 2, true);
    secondLEDImageCanvas.closePath();
    secondLEDImageCanvas.stroke();
}

function setLogView(logElementId) {
    mLogElement = document.getElementById(logElementId);
}

function onCanvasResize() {
    mClockCanvas.width = window.innerWidth;
    mClockCanvas.height = window.innerHeight;
    mOffscreenCanvas.width = window.innerWidth;
    mOffscreenCanvas.height = window.innerHeight;
    createPannelLEDImage();
    createHourLEDImage();
    createMinuteLEDImage();
    createSecondLEDImage();
    updateClockCanvas();
}

function printException(exception) {
    if (mLogElement != null) {
        mLogElement.innerHTML = "Error: " + exception.message + " (Line:" + exception.lineNumber + ")";
    }
}