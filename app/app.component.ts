import { Component } from '@angular/core';
import { Platform, AlertController } from 'ionic-angular';
import { StatusBar, Splashscreen } from 'ionic-native';

import { HomePage } from '../pages/home/home';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage = HomePage;

  constructor(platform: Platform, public alerCtrl: AlertController) {
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
      Splashscreen.hide();

      interface Window { IonicAlert: any; }

      window["IonicAlert"] = function(title, text) {
        let alert = alerCtrl.create({
          title: title,
          message: text,
          buttons: ['Ok']
        });
        alert.present()
      };
    });
  }
}
