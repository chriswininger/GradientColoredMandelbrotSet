// Extend JavaScript API with useful functions
(function() {
    "use strict";

    if (typeof window.Math !== 'undefined') {
        // Map val from a coordinate plane bounded by x1, x2 onto a coordinate plane bounded by y1, y2
        window.Math.map = function(val, x1, x2, y1, y2) {
            return (val -x1)/(Math.abs(x2-x1)) * Math.abs(y2 -y1) + y1;
        }
    }

    if (typeof window.ImageData !== 'undefined') {
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
        }

        ImageData.prototype.getPixel = function (x, y) {
            var data = this.data;
            var r = 4 * (x + y * this.width);
            return [data[r], data[r + 1], data[r + 2], data[r + 3]];
        }
    }
})();

// Mandelbrot Set Code
(function(){
    var canvasWidth = 500, canvasHeight = 400, startX = -2.00, endX = 1.00, startY = -1.00, endY = 1.00;
    var txtX1 = false, txtX2 = false, txtY1 = false, txtY2 = false, lblMouseStatus = false;

    window.onload = function() {
        // Cache form queries
        txtX1 = $('#inputX1');
        txtX2 = $('#inputX2');
        txtY1 = $('#inputY1');
        txtY2 = $('#inputY2');
        lblMouseStatus = $('#lblMouseStatus');


        var canvas = $('#cvsMandelbrot'); // Find the canvas
        canvasWidth = canvas.width();
        canvaseHeight = canvas.height();
        //$(canvas).css('width', canvasWidth).css('height', canvasHeight); // Set the canvas height and width


        var ctx = canvas[0].getContext('2d');
        var imgGradient = $('#imgGradient');



        // Display default values
        setRangeValuesOnForm();
        // Draw the figure on load
        var gradient = loadGradientLine(imgGradient[0]);
        var imgData = renderApplication(startX, endX, startY, endY, ctx, canvas, gradient);

        // update the figure on the update button press
        $('#btnUpdateMandelbrot').click(function(){
            getRangeValuesFromForm();
            imgData = renderApplication(startX, endX, startY, endY, ctx, canvas, gradient);
            return false;
        });

        // Track mouse position on the canvas
        var currentCoordinate = false;
        canvas.mousemove(function(event){
            var parentOffset = $(this).parent().offset();

            var x = 0, y = 0;

            x =  event.pageX - this.offsetLeft;
            y =  event.pageY - this.offsetTop;

            currentCoordinate = {'x': x, 'y': y};

            var real = Math.map(x, 0, canvasWidth, startX, endX);
            var imaginary = Math.map(y, 0, canvaseHeight, startY, endY);

            if (mouseDown) {
                draw();
            }

            lblMouseStatus.text(real + ' X ' + imaginary);
        });

        // Track when mouse is down
        var mouseDown = false;
        var downCoordinate = false;
        canvas.mousedown(function(event){
            x =  event.pageX - this.offsetLeft;
            y =  event.pageY - this.offsetTop;

            downCoordinate = {'x': x, 'y': y};

            mouseDown = true;
        });

        canvas.mouseup(function(event) {
            var new_startX = Math.map(downCoordinate.x, 0, canvasWidth, startX, endX);
            var new_endX = Math.map(currentCoordinate.x , 0, canvasWidth, startX, endX);
            var new_startY = Math.map(downCoordinate.y, 0, canvasHeight, startY, endY);
            var new_endY = Math.map(currentCoordinate.y, 0, canvasHeight, startY, endY);

            startX = new_startX;
            startY = new_startY;
            endX = new_endX;
            endY = new_endY;

            setRangeValuesOnForm();

            imgData = renderApplication(startX, endX, startY, endY, ctx, canvas, gradient);

            mouseDown = false;
        });

        function draw() {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight); // clear the frame

            ctx.putImageData(imgData,0,0); // Repaint the fractal

            if (currentCoordinate && downCoordinate) {
                // draw the rectangle
                ctx.strokeStyle = "rgb(255,255,255)";
                ctx.strokeRect(downCoordinate.x, downCoordinate.y, Math.abs(currentCoordinate.x - downCoordinate.x),Math.abs(currentCoordinate.y - downCoordinate.y));
            }
        }
    };

    function getRangeValuesFromForm() {
        startX = parseFloat(txtX1.val());
        endX = parseFloat(txtX2.val());
        startY = parseFloat(txtY1.val());
        endY = parseFloat(txtY2.val());
    }

    function setRangeValuesOnForm() {
        txtX1.val(startX);
        txtX2.val(endX);
        txtY1.val(startY);
        txtY2.val(endY);
    }

    function renderApplication(startX, endX, startY, endY, ctx, canvas, gradient) {
        t_time_escape_calc = 0.0

        $('#lblStatus').text('Loading...');
        var startTime = new Date().getTime();

        var imgData = drawMandelbrotSet(startX, endX, startY, endY, ctx, canvas, gradient); // Draw the set

        var endTime = new Date().getTime();
        var timeTaken = endTime - startTime;

        // Update the UI, indicating that processing is complete
        $('#lblStatus').text('Done ');
        $('#lblSetInfo').text('Showing [' + startX + ' - ' + endX + '] x [' + startY + ' x ' + endY + '] Completed in: ' + timeTaken + ' ms');

        return imgData;
    }

    function drawMandelbrotSet(startX, endX, startY, endY, ctx, canvas, gradient) {
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

    /**
     *
     * @param imgDom
     * @return {Array} Returns an array of array representing the color at each pixel in the first row [[r,g,b,a],[r,g,b,a]]
     */
    function loadGradientLine(imgDom) {
        // Create a temporary canvas in memory
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');

        context.drawImage(imgDom, 0, 0 );
        var imgData = context.getImageData(0, 0, imgDom.width, imgDom.height);
        var gradientLine = new Array();
        for (var x = 0; x < imgDom.width; x++) {
            gradientLine.push(imgData.getPixel(x, 0)); // Get the color at the specified x value in the first row of the image
        }

        return gradientLine;
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
})();