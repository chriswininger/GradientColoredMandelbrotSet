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
        };

        ImageData.prototype.getPixel = function (x, y) {
            var data = this.data;
            var r = 4 * (x + y * this.width);
            return [data[r], data[r + 1], data[r + 2], data[r + 3]];
        };
    }


    String.prototype.padRight = function(c, padWidth) {
        var len = padWidth - this.length, padding = '';
        for (var i = 0; i < len; i++) {
            padding += c;
        }

        return this + padding;
    };

    String.prototype.padLeft = function(c, padWidth) {
        var len = padWidth - this.length, padding = '';
        for (var i = 0; i < len; i++) {
            padding += c;
        }

        return padding + this;
    };

})();

// Mandelbrot Set Code
(function(){

    if (typeof window.GradientColoredMandelbrot == 'undefined'){
        window.GradientColoredMandelbrot = {};
    }

    // Options:
    //  urlWorkerThread (https://raw.github.com/chriswininger/GradientColoredMandelbrotSet/master/gradient-colored-mandelbrot.min.js)
    window.GradientColoredMandelbrot.load_mandelbrot = function(options) {
        // Defaults
        var defaultStartX = -2.00, defaultEndX = 1.00, defaultStartY = -1.00, defaultEndY = 1.00;
        // Mandelbrot state information
        var startX = defaultStartX, endX = defaultEndX, startY = defaultStartY, endY = defaultEndY;
        var canvasWidth = 500, canvasHeight = 400;
        // Cached controls
        var txtX1 = false, txtX2 = false, txtY1 = false, txtY2 = false, lblStatus = false, chkMandelbrotColorMaintainRatio = false,
            mandelbrotColorVideoProgress = false, divLongLoad = false, lblLongLoadMessage = false, lblDisplayInfo = false, btnDownloadTar = false;
        // UI state information
        var lblMouseStatus = false, currentCoordinate = false, mouseDown = false, downCoordinate = false, keepProportions = true, playingBack = false;
        var stateHistory = [/* {startX, endX, startY, endY } */], keyFrames = [/* {startX, endX, startY, endY } */];
        // Rendering Elements
        var canvas = false, ctx = false, imgGradient = false, imgData = false, gradient = false;
        // Cache rendered frames for replay
        var renderedFrames = [];
        // Worker threads
        var workerFractal = false;

        window.onload = function() {
            // Cache form queries
            txtX1 = $('#inputX1');
            txtX2 = $('#inputX2');
            txtY1 = $('#inputY1');
            txtY2 = $('#inputY2');
            mandelbrotColorVideoProgress = $('#mandelbrot-color-video-progress');
            lblStatus = $('#lblStatus');
            chkMandelbrotColorMaintainRatio = $('#chkMandelbrotColorMaintainRatio');
            //lblMouseStatus = $('#lblMouseStatus');
            divLongLoad = $('#long-load-display');
            lblLongLoadMessage = $('#long-load-message');
            lblDisplayInfo = $('#lblSetInfo');
            btnDownloadTar = $('#mandelbrot-color-download-tar');

            // update keep proportions
            keepProportions = chkMandelbrotColorMaintainRatio.is(':checked');

            canvas = $('#cvsMandelbrot'); // Find the canvas
            canvasWidth = canvas.width();
            canvasHeight = canvas.height();

            ctx = canvas[0].getContext('2d');
            imgGradient = $('#imgGradient');

            // Draw the figure on load
            //args.startX, args.endX, args.startY, args.endY, args.ctx, args.gradient
            gradient = loadGradientLine(imgGradient[0]);

            // Create the worker thread and wire a function to handel the rendering completion
            workerFractal = new Worker(options.urlWorkerThread);
            workerFractal.onmessage = renderThreadMessage;

            // render the fractal
            renderApplication(startX, endX, startY, endY, ctx, gradient);

            // ---- Wire update button clicked ----
            $('#btnUpdateMandelbrot').click(function(event){
                updateState(getRangeValuesFromForm());
                return false;
            });

            // ---- Wire up playback button ----
            $('#play-long-video').click(function(event){
                animation_loop();
            });

            // ---- Wire playback button click ----
            $('#btnMandelbrotColorPlay').click(function(event){
                // Simple Playback
                playingBack = true;

                // temporarily push current key frame to stack
                keyFrames.push({'startX': startX, 'endX': endX, 'startY': startY, 'endY': endY});

                for (var i = 0; i < keyFrames.length; i++){
                    var keyFrame = keyFrames[i];

                    updateState(keyFrame);
                }

                playingBack = false;


                // pull current frame back off stack
                keyFrames.pop();
            });

            /* ---- Wire up frame download button ----- */
            btnDownloadTar.click(function(event){

                // Show loading section with progress bar
                divLongLoad.show();

                // loop through each frame and create an image
                var arrFiles = new Array();

                // convert each frame to an image file and store in array using batch processing to allow event queue to be handled
                var frameCount = 0;
                var batch = function()
                {
                    if (frameCount < renderedFrames.length)  {
                        lblLongLoadMessage.text('Processing Frames...');

                        var canvBuffer = $('<canvas>').attr('width', canvasWidth).attr('height', canvasHeight);
                        var ctxBuffer = canvBuffer[0].getContext('2d');

                        imgData.data.set(renderedFrames[frameCount]);
                        ctxBuffer.putImageData(imgData,0,0);

                        var strURI = canvBuffer[0].toDataURL('image/jpeg', 1.0); //("image/png");
                        var byteString = atob(strURI.substring(strURI.indexOf(',')+1));
                        // add compressed image file to array
                        arrFiles.push({'name': 'p' + (frameCount.toString()).padLeft('0', 10) + '.jpeg', 'data': byteString});

                        // log progress
                        mandelbrotColorVideoProgress.attr('value', Math.round((frameCount/renderedFrames.length) * 100));

                        // process the next batch
                        frameCount++;
                        window.setTimeout(batch, 0);
                    } else {
                        lblLongLoadMessage.text('Building Tar File...');

                        // array complete, convert to tar
                        jsTar.toTar(arrFiles, {
                            'complete': tarComplete,
                            'error': tarError,
                            'progress': tarProgress
                        });
                    }
                }

                window.setTimeout(batch, 0);
            });

            function tarComplete(info) {
                divLongLoad.hide();

                if (info.status === 'success') {
                    // Save the blob to disk
                    window.location.href =  window.URL.createObjectURL(info.data);
                } else {
                    alert(info.message);
                }
            }

            function tarError (info) {
                divLongLoad.hide();
                alert(info.message);
            }

            function tarProgress(info) {
                var progress = Math.round((info.count/info.total) * 100);
                mandelbrotColorVideoProgress.attr('value', progress);
            }

            function toTar(files /* array of blobs to convert */){
                var tar = '';

                for (var file_count = 0, f = false, chkSumString, totalChkSum, out; file_count < files.length; file_count++) {

                    f = files[file_count];
                    chkSumString = '';

                    var content = f;

                    var name = ('p' + (file_count.toString()).padLeft('0', 10) + '.png').padRight('\0', 100);
                    var mode = '0000664'.padRight('\0', 8);
                    var uid = (1000).toString(8).padLeft('0', 7).padRight('\0',8);
                    var gid = (1000).toString(8).padLeft('0', 7).padRight('\0',8);
                    var size = (f.length).toString(8).padLeft('0', 11).padRight('\0',12);
                    //alert((new Date()/1000)  + '');
                    var mtime = '12123623701'.padRight('\0', 12); // modification time
                    var chksum = '        '; // enter all spaces to calculate chksum
                    var typeflag = '0';
                    var linkname = ''.padRight('\0',100);
                    var ustar = 'ustar  \0';
                    var uname = 'chris'.padRight('\0', 32);
                    var gname = 'chris'.padRight('\0', 32);

                    // Construct header with spaces filling in for chksum value
                    chkSumString = (name + mode + uid + gid + size + mtime + chksum + typeflag + linkname + ustar + uname + gname).padRight('\0', 512);


                    // Calculate chksum for header
                    totalChkSum = 0;
                    for (var i = 0, ch; i < chkSumString.length; i++){
                        ch =  chkSumString.charCodeAt(i);
                        totalChkSum += ch;
                    }

                    // reconstruct header plus content with chksum inserted
                    chksum = (totalChkSum).toString(8).padLeft('0', 6) + '\0 ';
                    out = (name + mode + uid + gid + size + mtime + chksum + typeflag + linkname + ustar + uname + gname).padRight('\0', 512);
                    out += content.padRight('\0', (512 + Math.floor(content.length/512) * 512)); // pad out to a multiple of 512

                    tar += out;
                }

                tar += ''.padRight('\0', 1024); // two 512 blocks to terminate the file

                var byteArray = new Uint8Array(tar.length);
                for (var byte_count = 0; byte_count < tar.length; byte_count++) {
                    byteArray[byte_count] = tar.charCodeAt(byte_count);
                }

                var b = new Blob([byteArray.buffer], {'type': 'application/tar'});
                window.location.href =  window.URL.createObjectURL(b);

            }

            /* ---- Wire Up Video Generation Button ---- */
            $('#btnMandelbrotColorGenerateVideo').click(function(event){
                // temporarily push current key frame to stack
                keyFrames.push({'startX': startX, 'endX': endX, 'startY': startY, 'endY': endY});

                // Generate video
                var interpolatedStates = [];
                var lastKeyFrame = false;
                for (var i = 0; i < keyFrames.length; i++){
                    var keyFrame = keyFrames[i];
                    if (lastKeyFrame === false) {
                        interpolatedStates.push(keyFrame); // copy first frame
                    } else {
                        // interpolate between frames
                        var spanStartX = keyFrame.startX - lastKeyFrame.startX;
                        var spanStartY = keyFrame.startY - lastKeyFrame.startY;
                        var spanEndX = keyFrame.endX - lastKeyFrame.endX ;
                        var spanEndY = keyFrame.endY - lastKeyFrame.endY;


                        var incStartX = spanStartX/30;
                        var incStartY = spanStartY/30;
                        var incEndX = spanEndX/30;
                        var incEndY = spanEndY/30;


                        for (var j = 1; j <= 30; j++) {
                            interpolatedStates.push({
                                'startX': lastKeyFrame.startX + incStartX * j,
                                'endX': lastKeyFrame.endX + incEndX * j,
                                'startY': lastKeyFrame.startY + incStartY * j,
                                'endY': lastKeyFrame.endY + incEndY * j
                            });
                        }
                    }

                    lastKeyFrame = keyFrame;
                }

                // pull current frame back off stack
                keyFrames.pop();
                workerFractal.postMessage({
                    'message': 'generateVideo',
                    'generateVideo': true,
                    'frameStates': interpolatedStates,
                    'imageData': imgData,
                    'gradient': gradient,
                    'canvasWidth': canvasWidth,
                    'canvasHeight': canvasHeight
                });

                divLongLoad.show();

            });

            /* ---- Wire button to export a set of key frames / path through the fractal ---- */
            $('#btnExportPath').click(function(event){
                var fileContent = $.toJSON(keyFrames);

                var blob = new Blob([fileContent], {type: "text/plain;charset=utf-8"});
                saveAs(blob, "MandelBrotPath.txt");

                //uriContent = "data:application/octet-stream,text/plain," + encodeURIComponent(fileContent);
                //window.location.href = uriContent;
            });

            // ---- Wire up keep proportions check box ----
            chkMandelbrotColorMaintainRatio.change(function(event){
                keepProportions = $(this).is(':checked');
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
                var x =  event.pageX - $(this).position().left;
                var y =  event.pageY - $(this).position().top;
                // Store the current coordinates
                currentCoordinate = {'x': x, 'y': y};
                // Translate the current coordinates into the components of a complex number
                var real = Math.map(x, 0, canvasWidth, startX, endX);
                var imaginary = Math.map(y, 0, canvasHeight, startY, endY);

                if (mouseDown) {
                    // Update  selection box coordinates
                    selectionRect.x1 = downCoordinate.x;
                    selectionRect.y1 = downCoordinate.y;
                    selectionRect.x2 = currentCoordinate.x;
                    if (keepProportions) {
                        selectionRect.y2 = downCoordinate.y + (currentCoordinate.x - downCoordinate.x) * 0.8; // calculate y2 as a proportion of xx
                    } else {
                        selectionRect.y2 = currentCoordinate.y; // just use the current mouse coordinate for y2
                    }

                    draw(); // Update the rendering
                }

                // Display the mouse coordinates as translated onto the complex number plane
                //lblMouseStatus.text(real + ' X ' + imaginary);
            }

            // ---- Mouse Down on Canvas ----
            function cvsMandelbrot_mousedown (event) {
                switch (event.which) {
                    case 1:
                        downCoordinate = {'x': event.pageX - $(this).position().left, 'y': event.pageY - $(this).position().top };
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

                    if (selectionRect.x2 - selectionRect.x1 >= 0) {
                        var new_startX = Math.map(selectionRect.x1, 0, canvasWidth, startX, endX);
                        var new_endX = Math.map(selectionRect.x2 , 0, canvasWidth, startX, endX);
                    } else { // The rectangle is being drawn in the negative direction
                        var new_startX = Math.map(selectionRect.x2 , 0, canvasWidth, startX, endX);
                        var new_endX =  Math.map(selectionRect.x1, 0, canvasWidth, startX, endX);
                    }

                    if (selectionRect.y2 - selectionRect.y1 >= 0) {
                        var new_startY = Math.map(selectionRect.y1, 0, canvasHeight, startY, endY);
                        var new_endY = Math.map(selectionRect.y2, 0, canvasHeight, startY, endY);
                    } else { // The rectangle is being drawn in the negative direction
                        var new_startY = Math.map(selectionRect.y2, 0, canvasHeight, startY, endY);
                        var new_endY = Math.map(selectionRect.y1, 0, canvasHeight, startY, endY);
                    }


                    // Update the application -- will cause redraw
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
                        renderApplication(startX, endX, startY, endY, ctx, gradient);
                    };

                    // Read in the image file as a data URL.
                    reader.readAsDataURL(f);
                }
            }

            var selectionRect = {'x1': 0, 'y1': 0, 'x2': 0, 'y2': 0};
            function draw() {
                ctx.clearRect(0, 0, canvasWidth, canvasHeight); // clear the frame

                ctx.putImageData(imgData,0,0); // Repaint the fractal

                if (currentCoordinate && downCoordinate) {
                    // draw the rectangle
                    ctx.lineWidth = 5;
                    ctx.strokeStyle = 'rgb(255,0,0)';

                    // draw rectangle that maintains the original ratio based current x coordinate
                    ctx.strokeRect(
                        selectionRect.x1,
                        selectionRect.y1,
                        selectionRect.x2 - selectionRect.x1,
                        selectionRect.y2 - selectionRect.y1
                    );

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
            if (!omitHistory && !playingBack) {
                // commit current state to history
                stateHistory.push({'startX': startX, 'endX': endX, 'startY': startY, 'endY': endY });
            }

            if (!playingBack) {
                // Store the path taken by the user for generation of zoom video
                keyFrames.push({'startX': startX, 'endX': endX, 'startY': startY, 'endY': endY });
            }

            // Update the current state
            startX = new_values.startX;
            startY = new_values.startY;
            endX = new_values.endX;
            endY = new_values.endY;

            renderApplication(startX, endX, startY, endY, ctx, gradient);
        }

        function history_stepBack() {
            if (stateHistory.length > 0) {
                updateState(stateHistory.pop(), true);
            }
        }

        /**
         * Passes data to the rendering thread through a post message, the results when the be posted back by this thread and handled in renderComplete
         * @param startX
         * @param endX
         * @param startY
         * @param endY
         * @param ctx
         * @param gradient
         */
        function renderApplication(startX, endX, startY, endY, ctx, gradient) {
            // Display the current mandelbrot state on the form
            setRangeValuesOnForm();

            //lblStatus.html('Loading...');
            //lblMouseStatus.text('');

            if (!imgData) {
                imgData = ctx.getImageData(0,0, canvasWidth, canvasHeight);
            }
            workerFractal.postMessage({
                'message': 'generateFrame',
                'generateFrame': true,
                'startX': startX,
                'endX': endX,
                'startY': startY,
                'endY': endY,
                'imageData': imgData,
                'gradient': gradient,
                'canvasWidth': canvasWidth,
                'canvasHeight': canvasHeight
            });
        }

        function renderThreadMessage(event) {

            switch (event.data.message) {
                case 'videoGenerationComplete':
                    $('.long-load-playback').show();
                    divLongLoad.hide();

                    // save for future replace
                    renderedFrames = event.data.renderedFrames;

                    var i = 0, frame_pause = 50;
                    var animation_loop = function() {
                        if (i < renderedFrames.length) {
                            imgData.data.set(renderedFrames[i]);
                            ctx.putImageData(imgData,0,0);
                            setTimeout(animation_loop, frame_pause);
                        }

                        i++;
                    };

                    setTimeout(animation_loop, frame_pause);

                    break;
                case 'frameGenerationComplete':
                    // Paint the image
                    imgData = event.data.imageData; // cache image for repainting the screen
                    ctx.putImageData(event.data.imageData,0,0); // paint the image

                    // Update the UI, indicating that processing is complete
                    //lblStatus.text('Done');
                    lblDisplayInfo.text('Showing [' + startX + ' to ' + endX + '] x [' + startY + ' to ' + endY + '] Completed in: ' + event.data.timeTaken + ' ms');

                    break;
                case 'generateZipComplete':
                    // var content = zip.generate();
                    location.href = "data:application/zip;base64," + event.data.content;
                    break;
                case 'progressUpdate':
                    var percent = Math.round((event.data.frameCount/event.data.frameTotal)*100);
                    mandelbrotColorVideoProgress.attr('value', percent);
                    break;
            }
        }

        function sleep(millis)
        {
            var date = new Date();
            var curDate = null;
            do { curDate = new Date(); }
            while(curDate-date < millis);
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

        var i_frame = 0, frame_pause = 50;
        function animation_loop () {
            if (i_frame < renderedFrames.length) {
                imgData.data.set(renderedFrames[i_frame]);
                ctx.putImageData(imgData,0,0);
                setTimeout(animation_loop, frame_pause);
            } else {
                i_frame = 0; // reset for next loop
            }

            i_frame++;
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

        function base64_decode (data) {
            // http://kevin.vanzonneveld.net
            // +   original by: Tyler Akins (http://rumkin.com)
            // +   improved by: Thunder.m
            // +      input by: Aman Gupta
            // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
            // +   bugfixed by: Onno Marsman
            // +   bugfixed by: Pellentesque Malesuada
            // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
            // +      input by: Brett Zamir (http://brett-zamir.me)
            // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
            // *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
            // *     returns 1: 'Kevin van Zonneveld'
            // mozilla has this native
            // - but breaks in 2.0.0.12!
            //if (typeof this.window['atob'] == 'function') {
            //    return atob(data);
            //}
            var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
                ac = 0,
                dec = "",
                tmp_arr = [];

            if (!data) {
                return data;
            }

            data += '';

            do { // unpack four hexets into three octets using index points in b64
                h1 = b64.indexOf(data.charAt(i++));
                h2 = b64.indexOf(data.charAt(i++));
                h3 = b64.indexOf(data.charAt(i++));
                h4 = b64.indexOf(data.charAt(i++));

                bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

                o1 = bits >> 16 & 0xff;
                o2 = bits >> 8 & 0xff;
                o3 = bits & 0xff;

                if (h3 == 64) {
                    tmp_arr[ac++] = String.fromCharCode(o1);
                } else if (h4 == 64) {
                    tmp_arr[ac++] = String.fromCharCode(o1, o2);
                } else {
                    tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
                }
            } while (i < data.length);

            dec = tmp_arr.join('');

            return dec;
        }

    };

})();