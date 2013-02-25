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
    // Defaults
    var defaultStartX = -2.00, defaultEndX = 1.00, defaultStartY = -1.00, defaultEndY = 1.00;
    // Mandelbrot state information
    var startX = defaultStartX, endX = defaultEndX, startY = defaultStartY, endY = defaultEndY;
    var canvasWidth = 500, canvasHeight = 400;
    // Cached controls
    var txtX1 = false, txtX2 = false, txtY1 = false, txtY2 = false, lblStatus = false;
    // UI state information
    var lblMouseStatus = false, currentCoordinate = false, mouseDown = false, downCoordinate = false;
    var stateHistory = [/* {startX, endX, startY, endY } */], keyFrames = [/* {startX, endX, startY, endY } */];
    // Rendering Elements
    var canvas = false, ctx = false, imgGradient = false, imgData, gradient;

    window.onload = function() {
        // Cache form queries
        txtX1 = $('#inputX1');
        txtX2 = $('#inputX2');
        txtY1 = $('#inputY1');
        txtY2 = $('#inputY2');
        lblStatus = $('#lblStatus');
        lblMouseStatus = $('#lblMouseStatus');

        canvas = $('#cvsMandelbrot'); // Find the canvas
        canvasWidth = canvas.width();
        canvasHeight = canvas.height();

        ctx = canvas[0].getContext('2d');
        imgGradient = $('#imgGradient');

        // Draw the figure on load
        //args.startX, args.endX, args.startY, args.endY, args.ctx, args.gradient
        gradient = loadGradientLine(imgGradient[0]);
        imgData = renderApplication(startX, endX, startY, endY, ctx, gradient);

        // ---- Wire update button clicked ----
        $('#btnUpdateMandelbrot').click(function(){
            updateState(getRangeValuesFromForm());
            return false;
        });

        // ---- Default Button Clicked ----
        $('#btnDefault').click(function(){
            updateState({'startX': defaultStartX, 'endX': defaultEndX, 'startY': defaultStartY, 'endY': defaultEndY });
        });

        // ---- Wire Gradient File picker event ----
        $('#fileGradientPicker').change(fileGradientPicker_change);

        // ---- Wire Mouse Events ----
        canvas.mousedown(cvsMandelbrot_mousedown);
        canvas.mouseup(cvsMandelbrot_mouseup);
        canvas.mousemove(cvsMandelbrot_mousemove);
        canvas.contextmenu(function(event) {
            return false; // prevent menu from showing on right click
        });

        // ---- Track Mouse Movements on the canvas ----
        function cvsMandelbrot_mousemove (event) {
            var x =  event.pageX - this.offsetLeft;
            var y =  event.pageY - this.offsetTop;
            // Store the current coordinates
            currentCoordinate = {'x': x, 'y': y};
            // Translate the current coordinates into the components of a complex number
            var real = Math.map(x, 0, canvasWidth, startX, endX);
            var imaginary = Math.map(y, 0, canvasHeight, startY, endY);

            if (mouseDown) {
                draw();
            }

            // Display the mouse coordinates as translated onto the complex number plane
            lblMouseStatus.text(real + ' X ' + imaginary);
        }

        // ---- Mouse Down on Canvas ----
        function cvsMandelbrot_mousedown (event) {
            switch (event.which) {
                case 1:
                    downCoordinate = {'x': event.pageX - this.offsetLeft, 'y': event.pageY - this.offsetTop};
                    mouseDown = true;
                    break;
                case 3:
                    history_stepBack();
                    break
            }
        }

        // ---- Mouse Released on Canvas ----
        function cvsMandelbrot_mouseup (event) {

            if (event.which === 1) {
                var new_startX = Math.map(downCoordinate.x, 0, canvasWidth, startX, endX);
                var new_endX = Math.map(currentCoordinate.x , 0, canvasWidth, startX, endX);
                var new_startY = Math.map(downCoordinate.y, 0, canvasHeight, startY, endY);
                var new_endY = Math.map(currentCoordinate.y, 0, canvasHeight, startY, endY);

                updateState({startX: new_startX, startY: new_startY, endX: new_endX, endY: new_endY});
                mouseDown = false;
            }

        }

        // ---- Gradient File Chosen ----
        function fileGradientPicker_change(e) {
            var files = e.target.files; // FileList object

            // files is a FileList of File objects. List some properties.
            //var output = [];
            for (var i = 0, f; f = files[i]; i++) {
                // Only process image files.
                if (!f.type.match('image.*')) {
                    continue;
                }

                var reader = new FileReader();

                // Closure to capture the file information.
                reader.onload = function(event) {
                    // Update gradient preview
                    $('#gradient-preview').css({
                        backgroundImage: 'url("' + event.target.result + '")'
                    });
                    // Update Gradient image
                    $('#imgGradient').attr('src', event.target.result);

                    // refresh gradient and fractal
                    gradient = loadGradientLine(imgGradient[0]);
                    imgData = renderApplication(startX, endX, startY, endY, ctx, gradient);
                };

                // Read in the image file as a data URL.
                reader.readAsDataURL(f);
            }
        }

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

    /**
     * Retrieve values from the text box on the form and use them to update the state of the mandelbrot
     */
    function getRangeValuesFromForm() {
        return {
            'startX': parseFloat(txtX1.val()),
            'endX': parseFloat(txtX2.val()),
            'startY': parseFloat(txtY1.val()),
            'endY': parseFloat(txtY2.val())
        };
    }

    /**
     * Set the values in the text boxes on the form to represent the current state of the mandelbrot
     */
    function setRangeValuesOnForm() {
        txtX1.val(startX);
        txtX2.val(endX);
        txtY1.val(startY);
        txtY2.val(endY);
    }

    function updateState(new_values, omitHistory /* Optional bool */) {
        if (!omitHistory) {
            // commit current state to history
            stateHistory.push({'startX': startX, 'endX': endX, 'startY': startY, 'endY': endY });
        }

        // Store the path taken by the user for generation of zoom video
        keyFrames.push({'startX': startX, 'endX': endX, 'startY': startY, 'endY': endY });

        // Update the current state
        startX = new_values.startX;
        startY = new_values.startY;
        endX = new_values.endX;
        endY = new_values.endY;

        imgData = renderApplication(startX, endX, startY, endY, ctx, gradient);
    }

    function history_stepBack() {
        if (stateHistory.length > 0) {
            updateState(stateHistory.pop(), true);
        }
    }

    /**
     * Generate the mandelbrot image based on the current state and render it on the form, along with data for text fields
     * @param startX
     * @param endX
     * @param startY
     * @param endY
     * @param ctx
     * @param gradient
     * @return {*}
     */
    function renderApplication(startX, endX, startY, endY, ctx, gradient) {
        // Display the current mandelbrot state on the form
        setRangeValuesOnForm();

        lblStatus.html('Loading...');
        lblMouseStatus.text('');

        var startTime = new Date().getTime();

        var imgData = drawMandelbrotSet(startX, endX, startY, endY, ctx, gradient); // Draw the set

        var endTime = new Date().getTime();
        var timeTaken = endTime - startTime;

        // Update the UI, indicating that processing is complete
        lblStatus.text('Done ');
        $('#lblSetInfo').text('Showing [' + startX + ' - ' + endX + '] x [' + startY + ' x ' + endY + '] Completed in: ' + timeTaken + ' ms');

        return imgData;
    }

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