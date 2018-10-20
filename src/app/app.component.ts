import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { TWEEN } from '@tweenjs/tween.js'
import * as THREE from 'three';
import { Globe } from './globe';
import * as data from './globe_7_0.64.json';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements AfterViewInit {
  @ViewChild('container') containerRef :ElementRef; 
  private gl:Globe;
  ngAfterViewInit(): void {
      this.gl = new Globe(this.containerRef.nativeElement,{imgDir:"/assets/globe/"});

      var globe = this.gl;
      var xhr;
      
    //   var dataOut = [];
    //   var index = 0;
    //   var verts = (<any>data).vertices;
    //   for(let i = 0; i < verts.length; i++){
    //       let x = verts[i].x;
    //       let y = verts[i].y;
    //       let z = verts[i].z;
    //       let r = Math.sqrt(x*x+y*y+z*z)
    //       let lat = Math.asin(verts[i].z/r);
    //       //let long = Math.atan2(verts[i].y,verts[i].x);
    //       let long;
    //       if (x > 0) {
    //             long = Math.atan(y/x)*(180/Math.PI)
    //         } else if (y > 0) {
    //             long = Math.atan(y/x)*(180/Math.PI) + 180
    //         } else {
    //             long =  Math.atan(y/x)*(180/Math.PI) - 180
    //         }
          
          
    //       dataOut[index++] = 180*lat/Math.PI;
    //       dataOut[index++] = long;
    //       dataOut[index++] = 0.1;
    //   }
    //   globe.globe_internal.addData(dataOut, {format: 'magnitude', name: 'test', animated: false});


    //   var settime = function(globe) {
    //     return function() {
    //         new TWEEN.Tween(globe).to({time: 0},500).easing(TWEEN.Easing.Cubic.EaseOut).start();
    //     };
    // };

    // globe.globe_internal.createPoints();
    globe.globe_internal.addPolys(data.default);
            globe.globe_internal.animate();
            document.body.style.backgroundImage = 'none'; // remove loading

      
  }

  private zoomIn(){
    this.gl.globe_internal.zoom(100);
  }

  private zoomOut(){
    this.gl.globe_internal.zoom(-100);
  }

  private title = 'on-thin-ice';


}
  