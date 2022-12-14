"use strict";

var gl;   // The webgl context.

var aCoords_SB;         // For drawing the skybox
var uProjection_SB;     
var uModelview_SB;
var prog_SB

var aCoords;          // For drawing the reflective teapot
var aNormal;
var uProjection;    
var uModelview;
var uNormalMatrix;
var uInvVT;
var prog;

var projection = mat4.create();   // projection matrix
var modelview;    // modelview matrix
var normalMatrix = mat3.create();
var invVT = mat3.create();  // The inverse of the view transform rotation matrix.

var texID;   // The cubemap texture.
var cube;    // The cube that is the skybox.
var teapot;  // The teapot.

var rotator;   // A SimpleRotator object to enable rotation by mouse dragging.
               // Provides the view transform that is applied to both skybox and teapot.

var rotX = 0, rotY = 0;  // Additional rotations applied as modeling transform to the teapot.

/*async function loadOBJtoCreateVBO(objFile) {
    let objComponents = [];

    response = await fetch(objFile);
    text = await response.text();
    obj = parseOBJ(text);

    for(let i = 0; i < obj.geometries.length; i++) {
        let o = initVertexBufferForLaterUse(gl, obj.geometries[i].data.position, obj.geometries[i].data.normal, obj.geometries[i].data.texcoord);

        objComponents.push(o);
    }

    return objComponents;
}

var astro = await loadOBJtoCreateVBO('objs/Astro.obj');
var UFO = await loadOBJtoCreateVBO('objs/UFO.obj');*/

 function draw() {
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    
    mat4.perspective(projection, Math.PI/3, 1, 10, 2000);
    
    modelview = rotator.getViewMatrix();
    mat3.normalFromMat4(normalMatrix, modelview);
    
    // Draw the skybox, with the viewing transform from the rotator.
    
    gl.useProgram(prog_SB); // Select the shader program that is used for the skybox.
    gl.uniformMatrix4fv(uProjection_SB, false, projection);
    if (texID) {
        gl.enableVertexAttribArray(aCoords_SB);
        cube.render();  
        gl.disableVertexAttribArray(aCoords_SB);
    }
    
    // Get the inverse of the rotation that was applied to the skybox.
    // This is needed in the teapot shader to account for the rotation
    // of the skybox.  (Note that it is passed to the shader in the
    // teapot's render function.)
    
    mat3.fromMat4(invVT, modelview);
    mat3.invert(invVT,invVT);

    // Add modeling rotations to the view transform.

    mat4.rotateX(modelview,modelview,rotX);
    mat4.rotateY(modelview,modelview,rotY);
    
    mat3.normalFromMat4(normalMatrix, modelview);
    
    // Draw the teapot.
    
    gl.useProgram(prog); // Select the shader program that is used for the teapot.
    gl.uniformMatrix4fv(uProjection, false, projection);
    if (texID) {
        gl.enableVertexAttribArray(aCoords);
        gl.enableVertexAttribArray(aNormal);
        teapot.render();  
        gl.disableVertexAttribArray(aCoords);
        gl.disableVertexAttribArray(aNormal);
    }
}


function loadTextureCube(urls) {
    var ct = 0;
    var img = new Array(6);
    var urls = [
       "Space.jpeg", "Space.jpeg", 
       "Space.jpeg", "Space.jpeg", 
       "Space.jpeg", "Space.jpeg"
    ];
    for (var i = 0; i < 6; i++) {
        img[i] = new Image();
        img[i].onload = function() {
            ct++;
            if (ct == 6) {
                texID = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texID);
                var targets = [
                   gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
                   gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
                   gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z 
                ];
                for (var j = 0; j < 6; j++) {
                    gl.texImage2D(targets[j], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img[j]);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                }
                gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
                draw();
            }
        }
        img[i].src = urls[i];
    }
}


function createModel(modelData) {  // For creating the skybox cube.
    var model = {};
    model.coordsBuffer = gl.createBuffer();
    model.normalBuffer = gl.createBuffer();
    model.indexBuffer = gl.createBuffer();
    model.count = modelData.indices.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, model.coordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexNormals, gl.STATIC_DRAW);
    console.log(modelData.vertexPositions.length);
    console.log(modelData.indices.length);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);
    model.render = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsBuffer);
        gl.vertexAttribPointer(aCoords, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(uModelview, false, modelview );
        gl.uniformMatrix3fv(uNormalMatrix, false, normalMatrix);
        gl.uniformMatrix3fv(uInvVT, false, invVT);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }
    return model;
}

function createModelSB(modelData) {  // For creating the teapot model.
    var model = {};
    model.coordsBuffer = gl.createBuffer();
    model.indexBuffer = gl.createBuffer();
    model.count = modelData.indices.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, model.coordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);
    console.log(modelData.vertexPositions.length);
    console.log(modelData.indices.length);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);
    model.render = function() { 
        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsBuffer);
        gl.vertexAttribPointer(aCoords_SB, 3, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(uModelview_SB, false, modelview );
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }
    return model;
}



/**
 *  An event listener for the keydown event.  It is installed by the init() function.
 */
function doKey(evt) {
    var rotationChanged = true;
	switch (evt.keyCode) {
	    case 37: rotY -= 0.15; break;        // left arrow
	    case 39: rotY +=  0.15; break;       // right arrow
	    case 38: rotX -= 0.15; break;        // up arrow
	    case 40: rotX += 0.15; break;        // down arrow
	    case 13: rotX = rotY = 0; break;  // return
	    case 36: rotX = rotY = 0; break;  // home
	    default: rotationChanged = false;
	}
	if (rotationChanged) {
     	     evt.preventDefault();
             draw();
	}
}


function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
   var vsh = gl.createShader( gl.VERTEX_SHADER );
   gl.shaderSource(vsh,vertexShaderSource);
   gl.compileShader(vsh);
   if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
      throw "Error in vertex shader:  " + gl.getShaderInfoLog(vsh);
   }
   var fsh = gl.createShader( gl.FRAGMENT_SHADER );
   gl.shaderSource(fsh, fragmentShaderSource);
   gl.compileShader(fsh);
   if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
      throw "Error in fragment shader:  " + gl.getShaderInfoLog(fsh);
   }
   var prog = gl.createProgram();
   gl.attachShader(prog,vsh);
   gl.attachShader(prog, fsh);
   gl.linkProgram(prog);
   if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
      throw "Link error in program:  " + gl.getProgramInfoLog(prog);
   }
   return prog;
}


function getTextContent( elementID ) {
    var element = document.getElementById(elementID);
    var fsource = "";
    var node = element.firstChild;
    var str = "";
    while (node) {
        if (node.nodeType == 3) // this is a text node
            str += node.textContent;
        node = node.nextSibling;
    }
    return str;
}


function init() {
   try {
        var canvas = document.getElementById("glcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            gl = canvas.getContext("experimental-webgl");
        }
        if ( ! gl ) {
            throw "Could not create WebGL context.";
        }
        var vertexShaderSource = getTextContent("vshaderSB"); 
        var fragmentShaderSource = getTextContent("fshaderSB");
        prog_SB = createProgram(gl,vertexShaderSource,fragmentShaderSource);
        aCoords_SB =  gl.getAttribLocation(prog_SB, "coords");
        uModelview_SB = gl.getUniformLocation(prog_SB, "modelview");
        uProjection_SB = gl.getUniformLocation(prog_SB, "projection");
        vertexShaderSource = getTextContent("vshader"); 
        fragmentShaderSource = getTextContent("fshader");
        prog = createProgram(gl,vertexShaderSource,fragmentShaderSource);
        aCoords =  gl.getAttribLocation(prog, "coords");
        aNormal =  gl.getAttribLocation(prog, "normal");
        uModelview = gl.getUniformLocation(prog, "modelview");
        uProjection = gl.getUniformLocation(prog, "projection");
        uNormalMatrix = gl.getUniformLocation(prog, "normalMatrix");
        uInvVT = gl.getUniformLocation(prog, "invVT");
        gl.enable(gl.DEPTH_TEST);
        rotator = new SimpleRotator(canvas,draw);
        rotator.setView( [0,0,1], [0,1,0], 40 );
        teapot = createModel(teapotModel);
//        teapot = createModel(cube(20));  // Could use a cube instead of a teapot, to test the reflection more easly.
        cube = createModelSB(cube(1000));
   }
   catch (e) {
      document.getElementById("message").innerHTML =
           "Could not initialize WebGL: " + e;
      return;
   }
   loadTextureCube();
    document.addEventListener("keydown", doKey, false);
   draw();
}