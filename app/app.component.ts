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

      window["IonicAlert"] = function(title, text, isPhoto, callback) {
        if (isPhoto) {
          let alert = alerCtrl.create();
          alert.setTitle('Откуда вы хотите взять изображение?');

          alert.addInput({
            type: 'radio',
            label: 'Камера',
            value: '1',
            checked: true
          });

          alert.addInput({
            type: 'radio',
            label: 'Альбом',
            value: '0'
          });

          alert.addButton('Отмена');
          alert.addButton({
            text: 'OK',
            handler: data => {
              callback(data);
            }
          });
          alert.present();
        } else {
          let alert = alerCtrl.create({
            title: title,
            message: text,
            buttons: ['OK']
          });
          alert.present()
        }
      };
    });
  }
}
