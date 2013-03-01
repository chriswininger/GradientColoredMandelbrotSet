/**
 * File: gadient-colored-mandelbrot-gen-thread
 * Author: Chris Wininger
 * Date: 2/24/13
 * Time: 4:55 PM
 * About: This file contains the worker thread which generates the actual image of the mandelbrot to be rendered in a canvas element
 */

// Extend JavaScript API with useful functions
(function() {
    "use strict";

    if (typeof Math !== 'undefined') {
        // Map val from a coordinate plane bounded by x1, x2 onto a coordinate plane bounded by y1, y2
            Math.map = function(val, x1, x2, y1, y2) {
            return (val -x1)/(Math.abs(x2-x1)) * Math.abs(y2 -y1) + y1;
        }
    }

    if (typeof ImageData !== 'undefined') {
        /**
         * Set the color values for the pixel at the specified x, y index
         * @param c [r,g,b,a]
         * @param x
         * @param y
         */
        ImageData.prototype.setPixel = function (c, x, y) {
            var data = this.data;
            var r = 4 * (x + y * this.width);

            data[r] = c[0];
            data[r + 1] = c[1];
            data[r + 2] = c[2];
            data[r + 3] = c[3];
        };

        ImageData.prototype.getPixel = function (x, y) {
            var data = this.data;
            var r = 4 * (x + y * this.width);
            return [data[r], data[r + 1], data[r + 2], data[r + 3]];
        };
    }
})();

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


    var startTime = new Date().getTime();
    // generate the figure
    drawMandelbrotSet(args.startX, args.endX, args.startY, args.endY, args.imageData, args.gradient, args.canvasWidth, args.canvasHeight);
    // Calculate time taken
    var endTime = new Date().getTime();
    var timeTaken = endTime - startTime;

    // post back figure to main thread
    self.postMessage({'imageData': args.imageData, 'timeTaken': timeTaken });
};


function drawMandelbrotSet(startX, endX, startY, endY, imageData, gradient, canvasWidth, canvasHeight) {
    // get the image data for the graphics context
    //var imageData = ctx.getImageData(0,0, canvasWidth, canvasHeight);

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

    //ctx.putImageData(imageData,0,0);

    //return imageData;
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
