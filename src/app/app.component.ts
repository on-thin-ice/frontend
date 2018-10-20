import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { TWEEN } from '@tweenjs/tween.js'
import * as THREE from 'three';
import { Globe } from './globe';

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

      var parser = function processData(allText) {

          var allTextLines = allText.split(/\r\n|\n/).filter(function(s){
              if (s) {
                  return s.charAt(0) != '#';
              }
              return false;
          });
          var data = [];
          var index = 0;
          for (var i = 0; i < 512; i++){
              var lineValues = allTextLines[i].split(/[ ,]+/).filter(function(s){return s!=""});

              for (var j = 0; j < 1024; j++){
                  if (i%4==0&&j%4==0) {
                      data[index++] = -90.0+0.3515625 * i;
                      data[index++] = 0.3515625 * j;
                      data[index++] = lineValues[j]*0.01;
                  }
              }
          }
          globe.globe_internal.addData(data, {format: 'magnitude', name: 'test', animated: false});
      };

        var settime = function(globe) {
            return function() {
                new TWEEN.Tween(globe).to({time: 0},500).easing(TWEEN.Easing.Cubic.EaseOut).start();
            };
        };
      
      xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://services.swpc.noaa.gov/text/aurora-nowcast-map.txt', true);
      xhr.onreadystatechange = function(e) {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            var data = xhr.responseText;
            parser(data);

            globe.globe_internal.createPoints();
            globe.globe_internal.animate();
            document.body.style.backgroundImage = 'none'; // remove loading
          }
        }
      };

      xhr.send(null);
  }

  private zoomIn(){
    this.gl.globe_internal.zoom(100);
  }

  private zoomOut(){
    this.gl.globe_internal.zoom(-100);
  }

  private title = 'on-thin-ice';


}
  