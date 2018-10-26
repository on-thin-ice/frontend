import { TWEEN } from '@tweenjs/tween.js'
import * as THREE from 'three';
export class Globe {
  public globe_internal;
  public constructor(container, opts) {
    var DAT = DAT || {};

    DAT.Globe_int = function (container, opts) {
      opts = opts || {};

      var colorFn = opts.colorFn || function (x) {
        var c = new THREE.Color();
        c.setHSL((0.6 - (x * 0.5)), 1.0, 0.5);
        return c;
      };
      var imgDir = opts.imgDir || 'globe/';
      var selectedTiles = opts.tiles;
      var Shaders = {
        'earth': {
          uniforms: {
            'texture': { type: 't', value: null }
          },
          vertexShader: [
            'varying vec3 vNormal;',
            'varying vec2 vUv;',
            'void main() {',
            'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
            'vNormal = normalize( normalMatrix * normal );',
            'vUv = uv;',
            '}'
          ].join('\n'),
          fragmentShader: [
            'uniform sampler2D texture;',
            'varying vec3 vNormal;',
            'varying vec2 vUv;',
            'void main() {',
            'vec3 diffuse = texture2D( texture, vUv ).xyz;',
            'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
            'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
            'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
            '}'
          ].join('\n')
        },
        'atmosphere': {
          uniforms: {},
          vertexShader: [
            'varying vec3 vNormal;',
            'void main() {',
            'vNormal = normalize( normalMatrix * normal );',
            'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
            '}'
          ].join('\n'),
          fragmentShader: [
            'varying vec3 vNormal;',
            'void main() {',
            'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
            'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
            '}'
          ].join('\n')
        }
      };

      var camera, scene, renderer, w, h, light;
      var mesh, atmosphere, point, tilemesh, tilegeometry, wireFrameMesh;
      var points;

      var overRenderer;

      var curZoomSpeed = 0;
      var zoomSpeed = 50;
      var raycaster = new THREE.Raycaster();
      var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
      var rotation = { x: 0, y: 0 },
        target = { x: Math.PI * 3 / 2, y: Math.PI / 6.0 },
        targetOnDown = { x: 0, y: 0 };
      var pinchActionPositions = [{ x: 0, y: 0 }, { x: 0, y: 0 }]

      var distance = 100000, distanceTarget = 100000;
      var padding = 40;
      var PI_HALF = Math.PI / 2;

      function init() {

        container.style.color = '#fff';
        container.style.font = '13px/20px Arial, sans-serif';

        var shader, uniforms, material;
        w = container.offsetWidth || window.innerWidth;
        h = container.offsetHeight || window.innerHeight;

        camera = new THREE.PerspectiveCamera(30, w / h, 1, 10000);
        camera.position.z = distance;


        scene = new THREE.Scene();
        light = new THREE.DirectionalLight( 0xffffff );
        scene.add( light );
        light = new THREE.DirectionalLight( 0xffffff );
        light.position.y = -1000;
        scene.add( light );
        

        var geometry: any = new THREE.SphereGeometry(200, 40, 30);

        shader = Shaders['earth'];
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);

        uniforms['texture'].value = THREE.ImageUtils.loadTexture(imgDir + 'earth.png');

        // var wireframeMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, wireframe: true, transparent: false } );
        // wireFrameMesh = new THREE.Mesh(new THREE.IcosahedronBufferGeometry(300,6),wireframeMaterial);
        // scene.add(wireFrameMesh);
         

        material = new THREE.ShaderMaterial({

          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader

        });
        
        
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.y = Math.PI;
        scene.add(mesh);

        shader = Shaders['atmosphere'];
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);

        material = new THREE.ShaderMaterial({

          uniforms: uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          transparent: true

        });
        

        mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(1.1, 1.1, 1.1);
        scene.add(mesh);

        geometry = new THREE.Geometry();
        geometry.vertices.push(
          new THREE.Vector3(0, 0, 0)
        );
        let r = 0.5;
        for (let i = Math.PI / 6; i < Math.PI * 2; i += Math.PI / 3) {
          let y = r * Math.cos(i);
          let x = r * Math.sin(i);
          geometry.vertices.push(new THREE.Vector3(x, y, 0))
        }
        geometry.faces.push(
          new THREE.Face3(0, 1, 2),
          new THREE.Face3(0, 2, 3),
          new THREE.Face3(0, 3, 4),
          new THREE.Face3(2, 4, 5),
          new THREE.Face3(2, 5, 6),
          new THREE.Face3(2, 6, 1),
        );

        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, -0.5));

        point = new THREE.Mesh(geometry);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);

        renderer.domElement.style.position = 'absolute';

        container.appendChild(renderer.domElement);

        container.addEventListener('mousedown', onMouseDown, false);

        container.addEventListener('touchstart', onTouchDown, false);

        container.addEventListener('wheel', onMouseWheel, false);

        document.addEventListener('keydown', onDocumentKeyDown, false);

        window.addEventListener('resize', onWindowResize, false);

        container.addEventListener('mouseover', function () {
          overRenderer = true;
        }, false);

        container.addEventListener('touchend', function () {
          overRenderer = true;
        }, false);

        container.addEventListener('touchcancel', function () {
          overRenderer = true;
        }, false);

        container.addEventListener('mouseout', function () {
          overRenderer = false;
        }, false);
      }

      function addData(data, opts) {
        var lat, lng, size, color, i, step, colorFnWrapper;

        opts.animated = opts.animated || false;
        this.is_animated = opts.animated;
        opts.format = opts.format || 'magnitude'; // other option is 'legend'
        if (opts.format === 'magnitude') {
          step = 3;
          colorFnWrapper = function (data, i) { return colorFn(data[i + 2]); }
        } else if (opts.format === 'legend') {
          step = 4;
          colorFnWrapper = function (data, i) { return colorFn(data[i + 3]); }
        } else {
          throw ('error: format not supported: ' + opts.format);
        }

        if (opts.animated) {
          if (this._baseGeometry === undefined) {
            this._baseGeometry = new THREE.Geometry();
            for (i = 0; i < data.length; i += step) {
              lat = data[i];
              lng = data[i + 1];
              //        size = data[i + 2];
              color = colorFnWrapper(data, i);
              size = 0;
              addPoint(lat, lng, size, color, this._baseGeometry);
            }
          }
          if (this._morphTargetId === undefined) {
            this._morphTargetId = 0;
          } else {
            this._morphTargetId += 1;
          }
          opts.name = opts.name || 'morphTarget' + this._morphTargetId;
        }
        var subgeo = new THREE.Geometry();
        for (i = 0; i < data.length; i += step) {
          lat = data[i];
          lng = data[i + 1];
          color = colorFnWrapper(data, i);
          size = data[i + 2];
          size = 1;
          addPoint(lat, lng, size, color, subgeo);
        }
        if (opts.animated) {
          this._baseGeometry.morphTargets.push({ 'name': opts.name, vertices: subgeo.vertices });
        } else {
          this._baseGeometry = subgeo;
        }

      };

      function addPolys(data, opts){
        let scale = 205.0;
        let heightRenderingScale = 0.01;
        let geometry = new THREE.Geometry();
        data.vertices.forEach(element => {
          var targetScale = 1.0/Math.sqrt(element.x*element.x+element.y*element.y+element.z*element.z);
          var specificscale = scale * targetScale*(1-(element.h*heightRenderingScale));
          geometry.vertices.push(
            
            new THREE.Vector3(specificscale*element.x, specificscale*element.y, specificscale*element.z)
          );
        });
        var tile = 0;
        data.tiles.forEach(element=>{
          var insertIdx = geometry.vertices.length;
          var xavg = element.map(idx => data.vertices[idx].x).reduce((a,b)=>a+b)/element.length;
          var yavg = element.map(idx => data.vertices[idx].y).reduce((a,b)=>a+b)/element.length;
          var zavg = element.map(idx => data.vertices[idx].z).reduce((a,b)=>a+b)/element.length;
          var havg = element.map(idx => data.vertices[idx].h).reduce((a,b)=>a+b)/element.length;
          var targetScale = 1.0/Math.sqrt(xavg*xavg+yavg*yavg+zavg*zavg);
          var specificscale = scale * targetScale*(1-(havg*heightRenderingScale));
          geometry.vertices.push(
            new THREE.Vector3(specificscale*xavg, specificscale*yavg, specificscale*zavg)
          );
          var limit = 0.5;
          if (yavg<-limit||yavg>limit){
            for(var idx = 0; idx < element.length; idx++){
              var face = new THREE.Face3(insertIdx, element[idx], element[(idx+1)%element.length]);
              var c = new THREE.Color();
              c.setHSL((0.6 - (tile)*0.1%0.2), 0.4, 0.8);
              face.color = c;//new THREE.Color(0xff0000);
              geometry.faces.push(face);
            }
          }
          
          tile++;
        });
        var material = new THREE.MeshPhongMaterial( {
					color: 0xffffff,
					flatShading: true,
					vertexColors: THREE.FaceColors,
          shininess: 0,
          opacity: 0.95,
          transparent: true,
          side: THREE.DoubleSide
				} );
        var wireframeMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, transparent: true } );
        //let geom = new THREE.IcosahedronBufferGeometry(225,5);
        let mesh = new THREE.Mesh(geometry,material);
        tilemesh = mesh;
        tilegeometry = geometry;
        // let wireframe = new THREE.Mesh( geometry, wireframeMaterial );
        // mesh.add(wireframe);
        scene.add(mesh);
      }

      function createPoints() {
        if (this._baseGeometry !== undefined) {
          if (this.is_animated === false) {
            this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
              color: 0xffffff,
              vertexColors: THREE.FaceColors,
              morphTargets: false
            }));
          } else {
            if (this._baseGeometry.morphTargets.length < 8) {
              console.log('t l', this._baseGeometry.morphTargets.length);
              var padding = 8 - this._baseGeometry.morphTargets.length;
              console.log('padding', padding);
              for (var i = 0; i <= padding; i++) {
                console.log('padding', i);
                this._baseGeometry.morphTargets.push({ 'name': 'morphPadding' + i, vertices: this._baseGeometry.vertices });
              }
            }
            this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
              color: 0xffffff,
              vertexColors: THREE.FaceColors,
              morphTargets: true
            }));
          }
          points = this.points;
          scene.add(this.points);
        }
      }

      function addExpedition(data){
        data.forEach(element => {
          let vec = tilegeometry.vertices[tilegeometry.faces[element.tileId%tilegeometry.faces.length].a];
          let box = new THREE.BoxGeometry(10,10,10);
          let mesh = new THREE.Mesh(box);
          mesh.position.set(vec.x,vec.y,vec.z);
          scene.add(mesh);
        });
        
      }

      function addPoint(lat, lng, size, color, subgeo) {

        var phi = (90 - lat) * Math.PI / 180;
        var theta = (180 - lng) * Math.PI / 180;

        point.position.x = 200 * Math.sin(phi) * Math.cos(theta);
        point.position.y = 200 * Math.cos(phi);
        point.position.z = 200 * Math.sin(phi) * Math.sin(theta);

        point.lookAt(mesh.position);

        point.scale.z = Math.max(size, 0.1); // avoid non-invertible matrix
        point.updateMatrix();

        for (var i = 0; i < point.geometry.faces.length; i++) {

          point.geometry.faces[i].color = color;

        }
        if (point.matrixAutoUpdate) {
          point.updateMatrix();
        }
        subgeo.merge(point.geometry, point.matrix);
      }

      function onTouchDown(event) {
        event.preventDefault();
        if (event.touches.length === 1) {


          container.addEventListener('touchmove', onTouchMove, false);
          container.addEventListener('touchend', onMouseUp, false);
          container.addEventListener('touchcancel', onMouseUp, false);
          let touchDetails = event.touches[0];
          mouseOnDown.x = - touchDetails.clientX;
          mouseOnDown.y = touchDetails.clientY;

          targetOnDown.x = target.x;
          targetOnDown.y = target.y;

          container.style.cursor = 'move';
        } else if (event.touches.length === 2) {
          pinchActionPositions[0].x = event.touches[0].clientX;
          pinchActionPositions[0].y = event.touches[0].clientY;
          pinchActionPositions[1].x = event.touches[1].clientX;
          pinchActionPositions[1].y = event.touches[1].clientY;
        }
      }


      function onMouseDown(event) {
        event.preventDefault();

        container.addEventListener('mousemove', onMouseMove, false);
        container.addEventListener('mouseup', onMouseUp, false);
        container.addEventListener('mouseout', onMouseUp, false);

        mouseOnDown.x = - event.clientX;
        mouseOnDown.y = event.clientY;

        targetOnDown.x = target.x;
        targetOnDown.y = target.y;

        container.style.cursor = 'move';
      }

      function onTouchMove(event) {
        if (event.touches.length === 1) {
          let touchDetails = event.touches[0];
          mouse.x = - touchDetails.clientX;
          mouse.y = touchDetails.clientY;

          var zoomDamp = distance / 1000;

          target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
          target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

          target.y = target.y > PI_HALF ? PI_HALF : target.y;
          target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
        } else if (event.touches.length === 2) {
          var curDiff = Math.abs(event.touches[0].clientY - event.touches[1].clientY);
          var prevDiff = Math.abs(pinchActionPositions[0].y - pinchActionPositions[1].y);
          pinchActionPositions[0].x = event.touches[0].clientX;
          pinchActionPositions[0].y = event.touches[0].clientY;
          pinchActionPositions[1].x = event.touches[1].clientX;
          pinchActionPositions[1].y = event.touches[1].clientY;
          if (prevDiff > 0) {
            if (curDiff > prevDiff) {
              // The distance between the two pointers has increased
              zoom(curDiff-prevDiff)
            }
            if (curDiff < prevDiff) {
              // The distance between the two pointers has decreased
              zoom(curDiff-prevDiff)
            }
          }
        }
      }

      function onMouseMove(event) {
        mouse.x = - event.clientX;
        mouse.y = event.clientY;

        var zoomDamp = distance / 1000;

        target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
        target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

        target.y = target.y > PI_HALF ? PI_HALF : target.y;
        target.y = target.y < - PI_HALF ? - PI_HALF : target.y;
      }

      function onMouseUp(event) {
        if (event.touches.length === 1) {
          let touchDetails = event.touches[0];
          mouse.x = - touchDetails.clientX;
          mouse.y = touchDetails.clientY;
        } else {
          mouse.x = - event.clientX;
          mouse.y = event.clientY;
        }
       
        container.removeEventListener('mousemove', onMouseMove, false);
        container.removeEventListener('mouseup', onMouseUp, false);
        container.removeEventListener('mouseout', onMouseUp, false);
        container.removeEventListener('touchmove', onTouchMove, false);
        container.removeEventListener('touchend', onMouseUp, false);
        container.removeEventListener('touchcancel', onMouseUp, false);
        container.style.cursor = 'auto';
        if (Math.abs(mouseOnDown.x-mouse.x)<2&&Math.abs(mouseOnDown.y-mouse.y)<2){
          let ray = new THREE.Raycaster( );
          var mx = (-mouseOnDown.x/ window.innerWidth ) * 2 - 1;
          var my = (mouseOnDown.y/ window.innerHeight  ) * 2 - 1;
          ray.setFromCamera( {x:mx,y:-my}, camera );
          
          var intersects = ray.intersectObjects(scene.children);
          if (intersects.length > 0 && intersects[0].object==tilemesh){
            ray.intersectObject(tilemesh);
            if (intersects.length > 0) {
                var idx = intersects[0].faceIndex;
                var startIDX = idx-idx%6;
                for(var faceIDX = startIDX; faceIDX < startIDX+6; faceIDX++){
                  if (!tilegeometry.faces[faceIDX].selected){
                    tilegeometry.faces[faceIDX].color.setRGB( 1, 0, 0 );
                    tilegeometry.faces[faceIDX].selected = true;
                    selectedTiles.push(faceIDX);
                  } else {
                    tilegeometry.faces[faceIDX].color.setRGB( 1, 1, 1 );
                    tilegeometry.faces[faceIDX].selected = false;
                    var index = selectedTiles.indexOf(faceIDX);
                    if (index > -1) {
                      selectedTiles.splice(index, 1);
                    }
                  }
                  
                }
                tilegeometry.colorsNeedUpdate = true;
            }
          }
        }
      }

      function onMouseWheel(event) {
        event.preventDefault();
        if (overRenderer) {
          zoom((event.wheelDeltaY?event.wheelDeltaY:event.deltaY*50) * 0.5);
        }
        return false;
      }

      function onDocumentKeyDown(event) {
        switch (event.keyCode) {
          case 38:
            zoom(100);
            event.preventDefault();
            break;
          case 40:
            zoom(-100);
            event.preventDefault();
            break;
        }
      }

      function onWindowResize(event) {
        //camera.aspect = container.offsetWidth / container.offsetHeight;
        //camera.updateProjectionMatrix();
        //renderer.setSize(container.offsetWidth, container.offsetHeight);
        var aspect = window.innerWidth / window.innerHeight;

        camera.aspect = aspect;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );

      }

      function zoom(delta) {
        distanceTarget -= delta;
        distanceTarget = distanceTarget > 800 ? 800 : distanceTarget;
        distanceTarget = distanceTarget < 220 ? 220 : distanceTarget;
      }

      function animate() {
        requestAnimationFrame(animate);
        render();
      }

      function render() {
        zoom(curZoomSpeed);
        

        rotation.x += (target.x - rotation.x) * 0.1;
        rotation.y += (target.y - rotation.y) * 0.1;
        distance += (distanceTarget - distance) * 0.3;

        camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
        camera.position.y = distance * Math.sin(rotation.y);
        camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);
        camera.lookAt(mesh.position);

        renderer.render(scene, camera);
      }

      init();
      this.animate = animate;


      this.__defineGetter__('time', function () {
        return this._time || 0;
      });

      this.__defineSetter__('time', function (t) {
        var validMorphs = [];
        var morphDict = this.points.morphTargetDictionary;
        for (var k in morphDict) {
          if (k.indexOf('morphPadding') < 0) {
            validMorphs.push(morphDict[k]);
          }
        }
        validMorphs.sort();
        var l = validMorphs.length - 1;
        var scaledt = t * l + 1;
        var index = Math.floor(scaledt);
        for (var i = 0; i < validMorphs.length; i++) {
          this.points.morphTargetInfluences[validMorphs[i]] = 0;
        }
        var lastIndex = index - 1;
        var leftover = scaledt - index;
        if (lastIndex >= 0) {
          this.points.morphTargetInfluences[lastIndex] = 1 - leftover;
        }
        this.points.morphTargetInfluences[index] = leftover;
        this._time = t;
      });
      this.zoom = zoom;
      this.addData = addData;
      this.addPolys = addPolys;
      this.createPoints = createPoints;
      this.renderer = renderer;
      this.scene = scene;
      this.addExpedition = addExpedition;

      return this;

    };
    this.globe_internal = DAT.Globe_int(container, opts);
  }
}



