import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import {CollapseModule, CollapseDirective} from 'ngx-bootstrap';


import { AppComponent } from './app.component';


@NgModule({
  declarations: [
    AppComponent
  ],
  
  imports: [
    BrowserModule,
    HttpClientModule,
    CollapseModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
