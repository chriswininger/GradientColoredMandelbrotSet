/**
 * File: gadient-colored-mandelbrot-gen-thread
 * Author: Chris Wininger
 * Date: 2/24/13
 * Time: 4:55 PM
 * About: This file contains the worker thread which generates the actual image of the mandelbrot to be rendered in a canvas element
 */

/**
 *
 * @param event
 *  event.data
 *      state
 *          startX, endX, startY, endY
 *      ctx
 *      cavasWidth
 *      canvasHeight
 *      gradient
 */
self.onmessage = function(event) {
    var args = event.data;

    var imgData = drawMandelbrotSet(args.startX, args.endX, args.startY, args.endY, args.ctx, args.gradient);
    self.postMessage(imgData);
};


function drawMandelbrotSet(startX, endX, startY, endY, ctx, gradient) {
    // get the image data for the graphics context
    var imageData = ctx.getImageData(0,0, canvasWidth, canvasHeight);

    // Iterate over all pixels in our canvas and paint their value
    for (var x = 0; x < canvasWidth; x++) {
        for (var y = 0; y < canvasHeight; y++) {
            // Map our canvas coordinates onto the complex plane
            var cReal = Math.map(x, 0, canvasWidth, startX, endX);
            var cImaginary = Math.map(y, 0, canvasHeight, startY, endY);

            var escapeVal = mandelbrotSetEscapeRate(cReal, cImaginary);

            imageData.setPixel(gradient[escapeVal], x, y); // color the pixel based on how the rate of escape maps to the chosen color gradient
        }
    }

    ctx.putImageData(imageData,0,0);

    return imageData;
}

function mandelbrotSetEscapeRate(cReal, cImaginary) {
    var zReal = 0, zImaginary = 0, maxCount = 500, nextValReal = 0, nextValImaginary = 0;

    var i;
    for (i = 0; i < maxCount; i++) {
        if (zReal*zReal + zImaginary*zImaginary > 4) {
            break; // Z has escaped the bounds of the circle, we assume it goes to infinity
        }
        // Calculate the next value of z
        nextValReal = zReal*zReal - zImaginary*zImaginary + cReal;
        nextValImaginary = 2 * zReal * zImaginary + cImaginary;

        zReal = nextValReal;
        zImaginary = nextValImaginary;
    }

    return Math.floor(Math.map(i, 0, maxCount, 0, 254));
}
