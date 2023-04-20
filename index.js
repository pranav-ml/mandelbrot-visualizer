// ----------------- Palette --------------------------

var colorPalette = [];
function Palette(colorType,divisionPoints,colors) {
        this.colorType = colorType || "HSB";
        this.divisionPoints = divisionPoints || [0,1];
        this.divisionColors = colors || (this.colorType == "HSB" ? [ [0,1,1], [1,1,1] ] : [ [1,1,1], [0,0,0] ]);
    }
Palette.prototype.getColor = function(position) {  // 0.0 <= position <= 1.0
        var pt = 1;
        while (position > this.divisionPoints[pt])
            pt++;
        var ratio = (position - this.divisionPoints[pt-1]) /
                    (this.divisionPoints[pt] - this.divisionPoints[pt-1]);
        var c1 = this.divisionColors[pt-1];
        var c2 = this.divisionColors[pt];
        var a = c1[0] + ratio*(c2[0] - c1[0]);
        var b = c1[1] + ratio*(c2[1] - c1[1]);
        var c = c1[2] + ratio*(c2[2] - c1[2]);
        return this.toRGB(a,b,c);
    };
Palette.prototype.toRGB = function(a,b,c) {  // 3 non-clamped color components.
        a = (this.colorType == "HSB")? (a - Math.floor(a)) : clamp(a);
        b = clamp(b);
        c = clamp(c);
        var color;
        if (this.colorType == "HSB")
            color = rgbFromHSV(a, b, c);
        else
            color = [a,b,c];
        color[0] = Math.round(color[0]*255);
        color[1] = Math.round(color[1]*255);
        color[2] = Math.round(color[2]*255);
        return color;
        function clamp(x) {
            x = 2*(x/2 - Math.floor(x/2));
            if (x > 1)
                x = 2 - x;
            return x;
        }
        function rgbFromHSV(h,s,v) {  // all components in range 0 to 1
            h *= 360;
            var r,g,b;
            var c,x;
            c = v*s;
            x = (h < 120)? h/60 : (h < 240)? (h-120)/60 : (h-240)/60;
            x = c * (1-Math.abs(x-1));
            x += (v-c);
            switch (Math.floor(h/60)) {
                case 0: r = v; g = x; b = v-c; break;
                case 1: r = x; g = v; b = v-c; break;
                case 2: r = v-c; g = v; b = x; break;
                case 3: r = v-c; g = x; b = v; break;
                case 4: r = x; g = v-c; b = v; break;
                case 5: r = v; g = v-c; b = x; break;
            }
            return [r,g,b];
        }
    };
function createPalette(){
    palette = new Palette("RGB",[0,0.2,0.4,0.5,0.6,0.8,1],
             [[0,0,0],[1,0,0],[1,1,0],[1,1,1],[1,1,0],[1,0,0],[0,0,0]]);
        // return(palette.getColor(numIterations/maxIterations))
        var paletteLength = 250;
        // var dx = 1.0 / (paletteLength-1);
        for (var i = 0; i < paletteLength; i++) {
            colorPalette[i] = palette.getColor(i/paletteLength);
        }
}

createPalette();

window.onload = function () {

// ---------- canvas variables --------------

    osc = document.createElement('canvas');
    const canvas = document.getElementById('myCanvas');
    // canvasComputedStyle = getComputedStyle(canvas);
    // canvasWidth = parseInt(canvasComputedStyle.width);
    // canvasHeight = parseInt(canvasComputedStyle.height);
    canvasHeight = canvas.height;
    canvasWidth = canvas.width;
    // console.log(canvasWidth);
    // canvas.width = canvasWidth;
    // canvas.height = canvasHeight;
    // console.log(canvasHeight, canvasWidth);
    const ctx = canvas.getContext('2d');
    // canvasWidth = canvas.width;
    // canvasHeight = canvas.height;
    osc.width = canvasWidth;
    osc.height = canvasHeight;
    osg = osc.getContext('2d');
    osg.fillStyle="#BBBBBB";
    osg.fillRect(0,0,canvasWidth,canvasHeight);
    imageData = osg.getImageData(0, 0, canvasWidth, 1);

// ---------- multithreading variables ----------
    
    var jobs;
    var workers;
    var workerCount = 16;
    var running = false;

// ------------ dragbox variables -----------

    var dragbox = null;
    
// ------------ screen limits ------------------

    var posx;
    var posy;
    var negx;
    var negy;

// --------- processing variables --------------

    var maxIterations = 5000;
    stateStack = [];
    var prevstate;
    var hp = false;

    function setLimits(px, py, nx, ny){
        posx = px;
        posy = py;
        negx = nx;
        negy = ny;
        negx = negx.setScale(20,BigDecimal.ROUND_HALF_EVEN);
        posx = posx.setScale(20,BigDecimal.ROUND_HALF_EVEN);
        negy = negy.setScale(20,BigDecimal.ROUND_HALF_EVEN);
        posy = posy.setScale(20,BigDecimal.ROUND_HALF_EVEN);
    }
    
    function handleCanvasMouseDown(e){
        // console.log(e);

        function onDrag(e){
            var x = e.clientX - canvasCoordinates.x;
            var y = e.clientY - canvasCoordinates.y;
            // console.log(x, y);
            var rectwidth =  x - mouseX;
            var rectheight = y - mouseY
            if (rectwidth>=rectheight){
                dragbox.width = rectwidth;
                dragbox.height = 0.8 * dragbox.width;
            }
            else{
                dragbox.height = rectheight;
                dragbox.width = 1.25 * dragbox.height;
            }
            // console.log(dragbox.height, dragbox.width);
            repaint();

            // dragbox.draw();
        }
        
        function onMouseUp(e){
            
            function calculateNewLimits(){
                if (!dragbox) return;
                var up = new BigDecimal("" + math.round(dragbox.y));
                var left = new BigDecimal("" + math.round(dragbox.x));
                var down = new BigDecimal("" + math.round(dragbox.y + dragbox.height));
                var right = new BigDecimal("" + math.round(dragbox.x + dragbox.width));

                up = posy.subtract(posy.subtract(negy).divide(new BigDecimal(""+(canvasHeight)),BigDecimal.ROUND_HALF_EVEN).multiply(up));
                down = posy.subtract(posy.subtract(negy).divide(new BigDecimal(""+(canvasHeight)),BigDecimal.ROUND_HALF_EVEN).multiply(down));
                left = negx.add(posx.subtract(negx).divide(new BigDecimal(""+(canvasWidth)),BigDecimal.ROUND_HALF_EVEN).multiply(left));
                right = negx.add(posx.subtract(negx).divide(new BigDecimal(""+(canvasWidth)),BigDecimal.ROUND_HALF_EVEN).multiply(right));
                setLimits(right,up,left,down);


            }
            
            canvas.removeEventListener("mousemove",onDrag);
            window.removeEventListener("mouseup",onMouseUp);
            // console.log(dragbox.height, dragbox.width);
            if (dragbox.height<0 || dragbox.width<0){
              dragbox.x += dragbox.width;
              dragbox.y += dragbox.height;

              dragbox.width *= -1;
              dragbox.height *= -1;
              
            }
            if (dragbox.height>10 && dragbox.width>10){
                prevstate = [posx, posy, negx, negy];
                stateStack.push(prevstate);
                calculateNewLimits();
                dragbox = null;
                startJob();
            }
            dragbox = null;
            repaint();
            

        }
        
        var canvasCoordinates = canvas.getBoundingClientRect();
        // console.log(canvasCoordinates.x, canvasCoordinates.y);
        var mouseX = e.clientX - canvasCoordinates.x;
        var mouseY = e.clientY - canvasCoordinates.y;
        // console.log(mouseX, mouseY);
        e.target.addEventListener("mousemove", onDrag);
        // e.target.addEventListener("mouseup", onMouseUp);
        window.addEventListener("mouseup",onMouseUp);
        dragbox = new DragBox(mouseX, mouseY);
        // console.log(dragbox);
        // dragbox.draw();
    }

    function repaint() {
        // console.log('hi');
        function dodraw() {
            ctx.drawImage(osc, 0, 0);
            if (dragbox){
                // console.log(dragbox.height, dragbox.width);
                dragbox.draw();
            }
            
        }
        dodraw();
        // if (running){
        //     setTimeout(repaint,1);
        // }          
    }

    function jobFinished(e){

        var job = e.data;
        // console.log(job);
        if (jobs.length>0){
            var worker = workers[job[3]];
            var j = jobs.pop();
            // worker.postMessage(
            //     {rowNumber:currJob.row, columnCount: currJob.columns, 
            //         workerNumber: job.workerNumber, posx: posx, negx: negx, posy: posy, negy: negy, maxIterations:maxIterations});
            worker.postMessage([
            "task", j.row, j.columns,
            j.xmin, j.dx, j.yVal
        ]);
        }
        else{
            running = false;
        }
        var iterationCounts = job[2];
        // console.log(iterationCounts);
        putrow(job[1], iterationCounts);
    }

    function putrow(row, iterationCounts) {
        // console.log(maxIterations);
        for (let j = 0; j < canvasWidth; j++) {

            colors = iterationCounts[j]<0 ? [0,0,0]: getColor(iterationCounts[j]);
            const r = colors[0];
            const g = colors[1];
            const b = colors[2];
            imageData.data[j*4] = r;
            imageData.data[j*4+1] = g;
            imageData.data[j*4+2] = b;
            imageData.data[j*4+3] = 255
            // imageData.data[j*4] = 0;
            // imageData.data[j*4+1] = 0;
            // imageData.data[j*4+2] = 0;
            // imageData.data[j*4+3] = 255
            
        }
        // console.log(imageData);
        osg.putImageData(imageData, 0, row);
        repaint();
    }  

    function getColor(numIterations){
        return colorPalette[numIterations%250];
    }
    
    function newWorkers(count){
        if (workers){
            for (let i = 0; i<workers.length; i++){
                workers[i].terminate();
            }
        }

        workers = [];

        for(let i = 0; i<count; i++){
            // workers[i] = new Worker('worker.js');
            workers[i] = new Worker("mandelbrot-worker.js");
            workers[i].onmessage = jobFinished;
        }
    }
    
    function DragBox(x,y){
        this.x = x;
        this.y = y;
        this.height = 0;
        this.width = 0

        this.draw = () => {
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 4;
            ctx.strokeRect(this.x,this.y,this.width,this.height);
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x,this.y,this.width,this.height);
        }
    }

    function convert( /* int[] */ x, /* BigDecimal */ X, /* int */ count) {
        console.log("____start_____");
        console.log(X.toString());
        var neg = false;
        var twoTo16 = new BigDecimal("65536");
        if (X.signum() == -1) {
            neg = true;
            X = X.negate();
        }
        x[0] = Number(X.setScale(0,BigDecimal.ROUND_DOWN).toString());
        for (var i = 1; i < count; i++) {
            
            X = X.subtract(new BigDecimal(""+x[i-1]));
            X = X.multiply(twoTo16);
            x[i] = Number(X.setScale(0,BigDecimal.ROUND_DOWN).toString());
            console.log(0XFFFF);
        }
        if (neg) {
            negate(x,count);
        }
        function negate( /* int[] */ x, /* int */ chunks) {
            for (var i = 0; i < chunks; i++)
                x[i] = 0xFFFF-x[i];
            ++x[chunks-1];
            for (var i = chunks-1; i > 0 && (x[i] & 0x10000) != 0; i--) {
                x[i] &= 0xFFFF;
                ++x[i-1];
            }
            x[0] &= 0xFFFF;
        }
}

    function startJob() {
        console.log(window.devicePixelRatio);
        // console.log(negx.scale());
        jobs = [];
        ctx.fillRect(0,0,canvasWidth,canvasHeight);
        osg.fillStyle="#BBBBBB";
        osg.fillRect(0,0,canvasWidth,canvasHeight);

        var dx = posx.subtract(negx).divide(new BigDecimal(""+(canvasWidth)),BigDecimal.ROUND_HALF_EVEN);
        var dy = posy.subtract(negy).divide(new BigDecimal(""+(canvasHeight)),BigDecimal.ROUND_HALF_EVEN);
        var yVal = posy.add(new BigDecimal("0"));
        var xmin_d = Number(negx.toString());
        var ymax_d = Number(posy.toString());
        var dx_d = Number(dx.toString());
        var dy_d = Number(dy.toString());
        
        var log2of10 = Math.log(10)/Math.log(2);
        var digits = negx.scale();
        var chunks = Math.floor((digits * log2of10)/16 + 2);
        dxArray = new Array(chunks+1);
        xminArray = new Array(chunks+1);
        // convert(xminArray, posx, chunks+1);
        // console.log(xminArray);
        // console.log(yVal.toString());
        // var yVal_max = Number(posy.toString()) + dy_d/2;
        // console.log();
        
        // for (let i = 0; i < canvasHeight; i++) {
        //     var yVal_d = ymax_d - i*dy_d;
        //     // console.log(dy_d);
        //     // console.log();
        //     jobs[canvasHeight - i - 1] = {row: i, columns: canvasWidth,xmin: xmin_d, dx: dx_d, yVal: yVal_d}  
        //     }
        var row = 0;
        var divisions = Math.ceil(canvasHeight/4);
        for (let j = 0; j < divisions; j++)
            for (let i = 0; i<canvasHeight; i+=divisions){
                var yVal_d = ymax_d - row*dy_d;
                // console.log(yVal_d);
                jobs[canvasHeight - (i+j) - 1] = {row: row++, columns: canvasWidth,xmin: xmin_d, dx: dx_d, yVal: yVal_d};
            }
        newWorkers(workerCount);

        running = true;
        repaint();

        for (let i = 0; i< workerCount; i++){
            let j = jobs.pop();
            // console.log(workers[i]);
            workers[i].postMessage(["setup",j.row, maxIterations,hp,i]);
            workers[i].postMessage([
                "task", j.row, j.columns,
                j.xmin, j.dx, j.yVal
            ]);
        }
        // console.log(isMandelbrot(0,1,100));
        
        // console.log(osg.getImageData.data);               
    }

    function undo(){
        if (stateStack.length==0) return;
        
        var state = stateStack.pop();
        setLimits(...state);
        startJob();
    }
    
    function initialize() {
        // document.getElementById('maxIterations').value = "5000";
        // document.getElementById('workers').value = "16";
        // console.log(window.innerHeight, window.innerWidth);
        maxIterations = 5000;
        workerCount = 16;
        stateStack = [];
        setLimits(new BigDecimal("0.8"),new BigDecimal("1.2"),new BigDecimal("-2.2"),new BigDecimal("-1.2"));
        startJob();
    }
    
    function onMaxIterationChange(e){
        maxIterations = Number(e.target.value);
        startJob();
    }

    function onWorkerCountChange(e){
        workerCount = Number(e.target.value);
        startJob();
    }

    initialize();
    canvas.onmousedown = handleCanvasMouseDown;
    // console.log(window.outerWidth);
    var button = document.getElementById('refreshButton');
    button.onclick = initialize;   
    var undoButton = document.getElementById('undoButton');
    undoButton.onclick = undo;
    var selectIter = document.getElementById('maxIterations');
    selectIter.onchange = onMaxIterationChange;
    var selectWorkers = document.getElementById('workers');
    selectWorkers.onchange = onWorkerCountChange;
}		