var API_URL = 'https://growthof.me/heart';
var APP_DATA = {};
var IS_TEST = false;
var TOUCH_X, TOUCH_Y, IS_MOVING;

document.addEventListener("deviceready", function() {
  $('body').addClass(device.platform == 'Android' ? 'android' : 'ios');
  $('#app_type').val(device.platform == 'Android' ? 1 : 2);
  $('#device_id').val(device.uuid);

  cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
  cordova.plugins.notification.local.registerPermission(function (granted) {
    // console.log('Permission has been granted: ' + granted);
  });
  Ionic.platform.registerBackButtonAction(function (event) {
    event.preventDefault();
  }, 100);
  $('body').on('touchend', '.get_image_wrapper', function(e) {
    if (IS_MOVING) return;
    e.preventDefault();
    var _this = $(this);
    var inp = _this.find('input');
    function fail (err) {
      console.log(JSON.stringify(err));
    }
    function failLoad(err) {
      console.log(JSON.stringify(err));
      IonicAlert('Ошибка', 'Не удается загрузить изображение на сервер');
    }
    var cameraType = IonicAlert('', '', true, function(cameraType) {
      navigator.camera.getPicture(function(imageData) {
        var options = new FileUploadOptions();
        options.fileKey = "img";
        options.fileName = "image.jpg";
        options.mimeType = "image/jpeg";
        options.chunkedMode = false;

        var params = {};
        params.token = APP_DATA.token;

        options.params = params;
        function win (response) {
          var d;
          try {
            d = JSON.parse(response.response);
          } catch (e) {
            console.log(e);
          }
          if (d.system.code == 0 && d.system.msg != '') {
            if (d.system.msg == 'Unknown user') {
              switchTo('login');
              return;
            }
            IonicAlert('Ошибка', translateError(d.system.msg));
          }
          var url = imageIdtoUrl(d.result);
          inp.val(d.result);
          _this.css('background-image', 'url("' + url + '")').addClass('active').removeClass('loading');
        }

        var ft = new FileTransfer();
        _this.addClass('loading');
        ft.upload(imageData, encodeURI(API_URL + '/pet/saveImg'), win, failLoad, options);
      }, fail, {
        sourceType: parseInt(cameraType),
        targetWidth: 800,
        targetHeight: 800
      });
    })
  });

  var push = PushNotification.init({
    android: {
      senderID: "564788632487"
    },
    ios: {
      alert: "true",
      badge: "true",
      sound: "true"
    }
  });

  push.on('registration', function(data) {
    $('#device_id').val(data.registrationId);
  });

  push.on('notification', function(data) {
    alert(JSON.stringify(data));
    updateAppInfo();
  });

  push.on('error', function(e) {
    alert(e.message)
  });

}, false);
document.addEventListener("resume", updateAppInfo, false);

$(document).ready(function() {
  $('body').on('touchstart', function(e) {
    IS_MOVING = false;
    TOUCH_X = e.originalEvent.touches[0].pageX;
    TOUCH_Y = e.originalEvent.touches[0].pageY;
  }).on('touchmove', function(e) {
    if (Math.abs(TOUCH_X - e.originalEvent.touches[0].pageX) > 10 || Math.abs(TOUCH_Y - e.originalEvent.touches[0].pageY)) {
      IS_MOVING = true;
    }
  }).on('touchend', '#open_menu', function() {
    $('#menu_wrapper').toggleClass('active');
  }).on('change', '.select_type input', function() {
    $(this).parents('label').addClass('checked').siblings('label').removeClass('checked');
  }).on('touchend', '.submit_button', function() {
    if (IS_MOVING) return;
    var form = $(this).parents('form').submit();
  }).on('touchend', '.switch_screen', function (e) {
    if (IS_MOVING || $(this).hasClass('disabled')) return;
    e.preventDefault();
    var screen = $(this).data('to');
    var params;
    var func;
    if ($(this).data('param')) params = $(this).attr('data-param');
    if ($(this).data('function')) func = $(this).data('function');
    $('.switch_screen').removeClass('active');
    $(this).addClass('active');
    switchTo(screen, params, func);
  }).on('submit', 'form', function(e) {
    e.preventDefault();
    var err = false;
    var checked = true;
    $(this).find('.format_phone').each(function(i,e) {
      $(e).val($(e).val().replace(/[^0-9.]/g, ''));
    });
    $(this).find('input[type="datetime-local"]').each(function(i,e) {
      if ($(e).val())
        $(e).siblings('input').val(moment($(e).val()).format('YYYY-MM-DD HH:mm:ss'));
      else
        $(e).siblings('input').val('');
    });
    var obj = {};
    $(this).find('.fields_input').each(function(i,e) {
      obj[$(e).data('name')] = $(e).val();
    });
    $(this).find('.fields_place').val(JSON.stringify(obj));
    if ($(this).find('input[type="checkbox"]').length) {
      checked = false;
      $(this).find('input[type="checkbox"]').each(function (i, e) {
        if (e.checked) checked = true;
      });
    }
    $(this).find('.required').each(function(i,e) {
      var el = $(e);
      if ($(e).parents('.get_image_wrapper').length) el = $(e).parents('.get_image_wrapper');
      if ($(e).val() == '') {
        err = true;
        el.addClass('error');
      } else {
        el.removeClass('error');
      }
    });
    if (!checked && $(this).attr('id') == 'register_form') {
      IonicAlert('Ошибка', 'Отметьте согласие с правилами');
      return;
    } else if (!checked) {
      IonicAlert('Ошибка', 'Выберите вид питомца');
      return;
    }
    if (err) {
      IonicAlert('Ошибка', 'Заполните отмеченные поля');
      return;
    }
    var before = $(this).data('before');
    if (before && typeof window[before] == 'function') {
      if (!window[before](this)) return;
    }
    var data = $(this).serialize();
    var _this = this;
    sendRequest($(this).attr('action'), data, 'post', function(d) {
      if (d.system.code == 0 && d.system.msg != '') {
        IonicAlert('Ошибка', translateError(d.system.msg));
        console.log(d);
        return;
      }
      var success = $(_this).data('success');
      var to = $(_this).data('to');
      if (d.system.code == 1 || (d.result && d.result != '')) {
        if (success && typeof window[success] == 'function') {
          if (!window[success](d)) return;
        }
        switch (to) {
          case 'pet_list':
            updatePetList();
            break;
          case 'events_list':
            updateEventsList();
            if ($('#is_notify_value').val().length > 5) addEventNotify(d, $('#event_name_selector').find('option:selected').data('msg'));
            break;
        }
        if (to) switchTo(to);
        else IonicAlert('Успешно', $(_this).data('message') || 'Данные сохранены');
        if ($(_this).attr('id') != 'edit_personal') {
          _this.reset();
          $(_this).find('.get_image_wrapper').removeClass('active').css('background-image', '');
        } else {
          $(_this).find('input, select').each(function(i,e) {
            var n = $(e).attr('name');
            var v = $(e).val();
            APP_DATA.user[n] = v;
          });
        }
      }
    })
  }).on('change', '#species_selector input', function() {
    var id = $(this).val();
    var breeds = id == 1 ? APP_DATA.library.cat_breeds : APP_DATA.library.dog_breeds;
    var drug_worm = APP_DATA.library.drugs[id][1];
    var drug_tick = APP_DATA.library.drugs[id][2];
    var html = '';
    for (var b in breeds) {
      html += '<option value="' + b + '">' + breeds[b] + '</option>'
    }
    $('#breed_selector').html(html).removeAttr('disabled');
    html = '';
    for (var w in drug_worm) {
      if (drug_worm[w] != 'Другое')
        html += '<option value="' + w + '">' + drug_worm[w] + '</option>'
    }
    for (var w in drug_tick) {
      html += '<option value="' + w + '">' + drug_tick[w] + '</option>'
    }
    $('#worm_drug_selector').html(html).removeAttr('disabled');
  }).on('change', '#my_pets_selector', function() {
    if (!$(this).val()) return;
    var id = parseInt(APP_DATA.pets[$(this).val()].species_id);
    var drug_worm = APP_DATA.library.drugs[id][1];
    var drug_tick = APP_DATA.library.drugs[id][2];
    var html = '<option value="0">Не указан</option>';
    for (var w in drug_worm) {
      if (drug_worm[w] != 'Другое')
        html += '<option value="' + w + '">' + drug_worm[w] + '</option>'
    }
    for (var w in drug_tick) {
      html += '<option value="' + w + '">' + drug_tick[w] + '</option>'
    }
    $('#notify_drug_selector').html(html).removeAttr('disabled').trigger('change');
  }).on('change', '#notify_drug_selector', function() {
    if ($(this).val() != 0) {
      $('#drug_care_text').show();
    } else {
      $('#drug_care_text').hide();
    }
  }).on('touchend', '.remove_pet', function(e) {
    if (IS_MOVING) return;
    sendRequest($(this).data('action'), $(e.target).attr('data-params'), 'post', function(d) {
      updatePetList();
      switchTo('pet_list');
      $("#add_pet")[0].reset();
      $("#add_pet").find('input[name="id"]').val('');
    });
  }).on('touchend', '.remove_event', function(e) {
    if (IS_MOVING) return;
    var params = $(e.target).attr('data-params');
    sendRequest($(this).data('action'), $(e.target).attr('data-params'), 'post', function(d) {
      cordova.plugins.notification.local.cancel(params.match(/\d+/)[0]);
      updateEventsList();
      switchTo('events_list');
      $("#add_event")[0].reset();
      $("#add_event").find('input[name="id"]').val('');
    });
  }).on('touchend', '.item-cover', function() {
    var checked = $(this).attr('aria-checked') == 'true' ? true : false;
    var inputs = $(this).parents('.input_wrapper').find('input[type="datetime-local"]');
    if (checked) {
      inputs.removeAttr('disabled');
    } else {
      inputs.val('').attr('disabled', 'disabled');
    }
  }).on('keyup change', '#new_user_password', function() {
    if ($(this).val() != '')
      $('#old_user_password').show().find('input').addClass('required');
    else
      $('#old_user_password').hide().find('input').removeClass('required');
  }).on('touchend', '.logout', function() {
    if (IS_MOVING) return;
    APP_DATA.token = '';
    window.localStorage.removeItem('_token');
    switchTo('login');
  }).on('touchend', '.sex_block', function() {
    if (IS_MOVING) return;
    $(this).addClass('active').siblings().removeClass('active');
    $(this).siblings('input').val($(this).data('val'));
  }).on('touchend', function(e) {
    if (IS_MOVING) return;
    if ($(e.target).attr('id') != 'open_menu')
      $('#menu_wrapper').removeClass('active');
  });

  sendRequest('/library/get', 'names=cat_breeds,dog_breeds,drugs,messages,categories,pages,areas,conf,periodicities', 'get', function(d) {
    APP_DATA.library = d.result;
    var categories = d.result.categories;
    var areas = d.result.areas;
    var html = '';
    for (var c in categories) {
      html += '<option value="' + c + '">' + categories[c] + '</option>';
    }
    $('#feedback_category_id').html(html);

    html = '';
    for (var c in areas) {
      html += '<option value="' + c + '">' + areas[c] + '</option>';
    }
    $('.put_regions').html(html);


    if (window.localStorage.getItem('_token')) {
      APP_DATA.token = window.localStorage.getItem('_token');
      initApp();
      checkReg(true);
    } else {
      switchTo('login');
    }
  });

  $('input[name="phone"]').mask("+7 9999999999");
});

function recoverMessage() {
  IonicAlert('Успешно', 'Запрос на восстановление пароля отправлен');
  switchTo('login');
}

function loginSuccess(d) {
  if (d.result && d.result.token) {
    APP_DATA.token = d.result.token;
    window.localStorage.setItem('_token', APP_DATA.token);
    initApp();
    $('#login_form input, #approve_form input').blur();
    return true;
  } else {
    console.log(d);
    IonicAlert('Ошибка', translateError(d.system.msg));
    return false;
  }
}

function registerSuccess(d) {
  var n = $('#register_phone').val();
  var p = $('#register_pwd').val();
  $('#login_phone').val(n);
  $('#login_pwd').val(p);
  switchTo('approve');
}

function approveSuccess(d) {
  $('#login_form').submit();
}

function orderCompleted(d) {
  var gift_id = $('#gift_order').find('input[name="gift_id"]').val();
  APP_DATA.points_summary = parseInt(APP_DATA.user.points) - parseInt(APP_DATA.gifts[gift_id].points);
  APP_DATA.user.points = APP_DATA.points_summary;
  recalcPoints();
  switchTo('gift_list');
}

function registerBefore(t) {
  var checkboxes = $(t).find('input[type="checkbox"]');

  if (checkboxes[0].checked) {
    $('#approve_phone').val($('#register_phone').val());
    return true;
  } else {
    IonicAlert('Ошибка', 'Примите условия пользования приложением');
    return false;
  }
}

function switchToItem(screen, params) {
  var gift = APP_DATA.gifts[params.id];
  screen.find('.gift_photo img').attr('src', imageIdtoUrl(gift.img));
  screen.find('.gift_title').html(gift.name);
  var gp = Math.floor(gift.points/APP_DATA.max_points * 100);
  var p = APP_DATA.max_percent;
  if (p >= gp) {
    screen.find('.fake_submit_button').removeClass('disabled');
    p = gp;
  } else {
    screen.find('.fake_submit_button').addClass('disabled');
  }
  screen.find('.gift_status_percent span').html(p);
  screen.find('.gift_status_overlay').css('height', p + '%');
  screen.find('.fake_submit_button').attr('data-param', '{"gift_id": ' + gift.id + '}')
}

function openCategory(screen, params) {
  screen.find('.dis_list_item').hide();
  screen.find('.art_category_' + params.id).show();
}

function openArticle(screen, params) {
  var article = APP_DATA.publications[params.cat_id].articles[params.id];
  screen.find('.disease_header').html(article.name);
  screen.find('.disease_text').html(article.description);
  if (article.img) {
    $('.disease_image').attr('src', imageIdtoUrl(article.img)).show();
  } else {
    $('.disease_image').hide();
  }
}
function openFeedback(screen, params) {
  var article = APP_DATA.feedback[params.id];
  screen.find('.disease_header').html(article.msg);
  screen.find('.disease_text').html(article.response);
}

function loadPartnersMap(screen, params) {
  if (APP_DATA.myMap) APP_DATA.myMap.destroy();
  var zoom = 10;
  var stores;
  if (params) {
    stores = APP_DATA.stores_networks[params.network_id] ? APP_DATA.stores_networks[params.network_id].stores : null;
    $('.partners_text').html(APP_DATA.actions[params.id].description);
    $('.partners_header').html(APP_DATA.stores_networks[params.network_id].name);
    $('.show_if_event').show();
    $('#partners_map').css('height', 400);
  } else {
    stores = APP_DATA.stores;
    $('.show_if_event').hide();;
    $('#partners_map').css('height', $('.fixed-content').height() - $('.nav_header').height() - 25);
  }
  if (!stores) return;
  navigator.geolocation.getCurrentPosition(geolocationSuccess, geolocationError);
  function geolocationSuccess(resp) {
    APP_DATA.myMap = new ymaps.Map('partners_map', {
      center: [resp.coords.latitude, resp.coords.longitude],
      zoom: zoom,
      behaviors: ['default', 'scrollZoom'],
      controls: []
    });
    var myPlacemark = new ymaps.Placemark([resp.coords.latitude, resp.coords.longitude], {}, {
      preset: 'islands#geolocationIcon'
    });
    APP_DATA.myMap.geoObjects.add(myPlacemark);
    addPlaceMarks();
  }
  function geolocationError() {
    APP_DATA.myMap = new ymaps.Map('partners_map', {
      center: [55.725045, 37.646961],
      zoom: zoom,
      behaviors: ['default', 'scrollZoom'],
      controls: []
    });
    addPlaceMarks();
  }
  function addPlaceMarks() {
    var coords;
    var myPlacemark;
    for (var s in stores) {
      coords = stores[s].geolocation.split(',');
      myPlacemark = new ymaps.Placemark([coords[1], coords[0]], {
        balloonContentHeader: stores[s].name,
        balloonContentBody: stores[s].contacts
      }, {
        iconLayout: 'default#image',
        iconImageHref: 'assets/images/map_pin.png',
        iconImageSize: [30, 41],
        iconImageOffset: [-15, -41]
      });
      APP_DATA.myMap.geoObjects.add(myPlacemark);
    }
  }
}

function updatePetList() {
  sendRequest('/pet/list', '', 'get', function(d) {
    var pets = d.result;
    APP_DATA.pets = pets;
    var html = '';
    var s_html = '';
    var url;
    var obj;
    for (var i in pets) {
      url = imageIdtoUrl(pets[i].img);
      obj = {};
      for (var p in pets[i]) {
        obj[p] = pets[i][p];
      }
      obj.id = i;
      html +=
        "<div class='pet_item switch_screen pet_item_" + i + "' data-to='pet_card' data-param='" + JSON.stringify(obj) + "'>"+
        "<div class='pet_photo' style='background-image: url(" + url + ")'></div>"+
        "<div class='pet_name'>" + pets[i].name + "</div>"+
        "</div>";
      s_html += '<option value="' + i + '">' + pets[i].name + '</option>';
    }
    $('.pet_list_wrapper').html(html);
    $('#my_pets_selector').html(s_html).trigger('change');
  });
}
function updateEventsList() {
  sendRequest('/memento/list', '', 'get', function(d) {
    var events = d.result;
    APP_DATA.events = events;
    var html = '';
    var url;
    var obj;
    for (var i in events) {
      url = imageIdtoUrl(events[i].img);
      obj = {};
      for (var p in events[i]) {
        obj[p] = events[i][p];
      }
      obj.id = i;
      html +=
        "<div class='event_item switch_screen events_item_" + i + "' data-to='event_form' data-param='" + JSON.stringify(obj) + "'>"+
          events[i].name +
        "</div>";
    }
    $('#events_list_wrapper').html(html);
  });
}

function checkReg(switchScr) {
  if (!APP_DATA.library || !APP_DATA.user) {
    setTimeout(function() {
      checkReg(switchScr);
    }, 200);
    return;
  }
  var av = APP_DATA.library.conf.available_areas;
  var in_reg = (av.indexOf(parseInt(APP_DATA.user.region_id)) > -1) ? true : false;
  if (in_reg) {
    $('.moscow_content').show();
    $('.regions_content').hide();
  } else {
    $('.moscow_content').hide();
    $('.regions_content').show();
  }
  if (switchScr) {
    if (in_reg) {
      switchTo('event_main');
      $('.footer_nav.icon4').addClass('active');
    } else {
      switchTo('pet_list');
      $('.footer_nav.icon5').addClass('active');
    }
  }
  return in_reg;
}
function checkUserRegion() {
  if (APP_DATA.user.region_id == '') {
    IonicAlert('Ошибка', 'Выберите регион в личном кабинете');
    switchTo('personal');
    return false;
  } else if (!checkReg()) {
    IonicAlert('Ошибка', 'В вашем регионе акция не проводится');
    return false;
  }
  return true;
}

function checkRegionForContent() {
  $('#edit_personal').find('input,select').each(function(i,e) {
    APP_DATA.user[$(e).attr('name')] = $(e).val();
  });
  checkReg();
  IonicAlert('Успешно', 'Данные сохранены');
}

function loadTextPage(screen, params) {
  $('.header .header_text').html(APP_DATA.library.pages[params.id].title);
  screen.find('.header_text').html(APP_DATA.library.pages[params.id].title);
  screen.find('.text_page_content').html(APP_DATA.library.pages[params.id].contents);
}

function addEventNotify(d, name) {
  var options = {
    id: d.result,
    text: name,
    at: new Date(moment($('#is_notify_value').val()).toISOString())
  };
  cordova.plugins.notification.local.schedule(options);
  /*if (not && not.error) {
    console.log(not.error);
    IonicAlert('Ошибка', 'Ошибка создания уведомления');
  }
  else {*/
    IonicAlert('Успешно', 'Уведомление добавлено');
    switchTo('events_list');
  //}
  $("#add_event")[0].reset();
}

function switchTo(screen, params, func) {
  var to_elem = $('.screen_' + screen);
  if (to_elem.hasClass('brown_bg')) $('.content').addClass('brown_bg');
  else $('.content').removeClass('brown_bg');
  if (to_elem.hasClass('no_footer')) $('.footer, #open_menu').hide();
  else $('.footer, #open_menu').show();
  if (!to_elem.find('.nav_header').length) {
    $('.header .nav_header').hide();
  } else {
    $('.header .nav_header').html(to_elem.find('.nav_header').html()).show();
  }
  if (to_elem.find('form').length && to_elem.find('form').attr('id') != 'edit_personal') {
    to_elem.find('form')[0].reset();
    to_elem.find('.get_image_wrapper').removeClass('active').removeAttr('style');
    to_elem.find('.sex_block').removeClass('active');
    to_elem.find('#species_selector label').removeClass('checked').find('input').prop('checked', false);
    to_elem.find('#worm_drug_selector, #breed_selector').html('').attr('disabled', 'disabled');
    to_elem.find('#drug_care_text').hide();
    to_elem.find('input[name="img"]').val('');
  }
  if (params) {
    if (typeof params == 'string') {
      try {
        params = JSON.parse(params);
      } catch (e) {
        console.log(e);
      }
    }
    if (!func) {
      switch (screen) {
        case 'pet_card':
          $('#species_selector').find('input[value="' + params.species_id + '"]').prop('checked', true).trigger('change');
          $('.remove_pet').show().attr('data-params', 'id=' + params.id);
          $('.sex_block[data-val="' + params.sex_id + '"]').addClass('active');
          break;
        case 'event_form':
          $('.remove_event').show().attr('data-params', 'id=' + params.id);
          break;
        case 'text_page':
          var id = params.id;
          break;
        case 'gift_order':
          $('#order_phone').val(APP_DATA.user.phone);
          break;
        case 'edit_personal':

          break;
      }
      for (var p in params) {
        switch (p) {
          case 'img':
            to_elem.find('input[name="' + p + '"]').val(params[p]).parent().css('background-image', 'url("' + imageIdtoUrl(params[p]) + '")').addClass('active');
            break;
          case 'datetime':
          case 'notify':
            if (params[p]) {
              var time = moment(params[p], 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DDTHH:mm');
              to_elem.find('input[name="' + p + '"]').siblings('input').val(time).removeAttr('disabled');
              to_elem.find('input[name="' + p + '"]').parents('.input_wrapper').find('button').attr('aria-checked', 'true');
              to_elem.find('input[name="' + p + '"]').parents('.input_wrapper').find('.toggle-icon').addClass('toggle-checked');
            }
            break;
          default:
            if (p != 'species_id')
              to_elem.find('input[name="' + p + '"], select[name="' + p + '"]').val(params[p]);
            break;
        }
      }
    }
    if (!params.id) $('.remove_btn').hide();
  }
  if (!params) $('.remove_btn').hide();
  if (func && typeof window[func] == 'function') {
    window[func](to_elem, params);
  }
  setTimeout(function() {
    $('.section_wrapper').removeClass('active');
    to_elem.addClass('active');
  }, 100);
}

function recalcPoints() {
  APP_DATA.max_percent = Math.floor(APP_DATA.points_summary/APP_DATA.max_points * 100);
  $('.heart_percent').html(APP_DATA.max_percent);
}

function translateError(err) {
  if (APP_DATA.library && APP_DATA.library.messages) {
    var messages = APP_DATA.library.messages;
    if (messages[err]) return messages[err];
    for (var m in messages) {
      if (err.indexOf(m) != -1) {
        var mach = err.match(/\s(\w+)$/);
        if (m.indexOf('id') != -1) {
          return messages[m].replace(/\bid\b/g, mach[1]);
        } else {
          return messages[m] + mach[0];
        }
      }
    }
  }

  return err;
}

function sendRequest(path, params, method, callback) {
  var token = '';
  var is_test = '';
  if (APP_DATA.token) {
    if (params != '') token = '&token=' + APP_DATA.token;
    else token = 'token=' + APP_DATA.token;
  }
  if (IS_TEST) {
    if (params != '' || token != '') is_test = '&is_test=1';
    else is_test = 'is_test=1';
  }
  $.ajax({
    url: API_URL + path,
    data: params + token + is_test,
    type: method,
    success: function(d) {
      var data = d;
      if (typeof d == 'string') {
        try {
          data = JSON.parse(d);
        } catch (e) {
          console.log(e);
        }
      }
      if (data.system.code == 0 && data.system.msg != '') {

        if (data.system.msg == 'Unknown user' || data.system.msg == 'Unknown param: token') {
          switchTo('login');
          return;
        }
        IonicAlert('Ошибка', translateError(data.system.msg));
      } else {
        if (typeof callback == 'function') callback(data);
      }
    },
    error: function (a,b,c) {
      console.log(a,b,c);
      IonicAlert('Ошибка', 'Ошибка соедмнения с сервером');
    }
  });
}

function imageIdtoUrl(id) {
  return API_URL + "/image/draw/500x500/" + id + ".jpg";
}

function updateAppInfo() {
  alert('Updating...');
}

function initApp() {
  updatePetList();
  updateEventsList();
  sendRequest('/article/list', '', 'get', function(d) {
    var publications = {};
    var articles = d.result.articles;
    var categories = d.result.categories;
    var cat;
    for (var a in articles) {
      cat = articles[a].category_id;
      if (!publications[cat]) {
        publications[cat] = {
          name: categories[cat].name,
          articles: {}
        }
      }
      publications[cat].articles[a] = articles[a];
    }
    APP_DATA.publications = publications;
    var html = '';
    /*for (var p in publications) {
      html += "<div class='art_category_item switch_screen' data-to='dis_list' data-function='openCategory' data-param='{\"id\":\"" + p + "\"}'>" + publications[p].name + "</div>";
    }
    $('.art_categories_wrapper').html(html);
    html = '';*/
    for (var a in articles) {
      html += "<div class='dis_list_item switch_screen art_category_" + articles[a].category_id + "' data-to='disease' data-function='openArticle' data-param='{\"id\":\"" + a + "\",\"cat_id\":\"" + articles[a].category_id + "\"}'>" + articles[a].name + "</div>";
    }
    $('.dis_list_wrapper').html(html);
  });
  sendRequest('/user/info', '', 'get', function(d) {
    var user = d.result;
    APP_DATA.points_summary = parseInt(user.points);
    if (user.fields) {
      var fields = JSON.parse(user.fields);
      for (var f in fields) {
        user[f] = fields[f];
      }
    }
    APP_DATA.user = user;
    var user_form = $('#edit_personal');
    for (var p in user) {
      if (p != 'img')
        user_form.find('input[name="' + p + '"], select[name="' + p + '"]').val(user[p]);
      else {
        user_form.find('input[name="' + p + '"]').val(user[p]).parent().css('background-image', 'url("' + imageIdtoUrl(user[p]) + '")').addClass('active');
      }
    }
    $('.user_region').val(JSON.parse(APP_DATA.user.fields)['region_id']);

    sendRequest('/gift/list', '', 'get', function(d) {
      var gifts = d.result;

      var max = 0;
      var max_id;
      for (var g in gifts) {
        if (parseInt(gifts[g].points) > max) {
          max = parseInt(gifts[g].points);
          max_id = g;
        }
      }
      var html = '';
      for (var g in gifts) {
        html +=
          "<div class='gift_list_item clearfix switch_screen' data-to='gift_miska' data-function='switchToItem' data-param='{\"id\":\"" + g + "\"}'>"+
          "<div class='gift_item_photo'><img src='" + imageIdtoUrl(gifts[g].img) + "'></div>"+
          "<div class='gift_item_title'>"+
          "<small>" + gifts[g].name + "</small>"+
          "<b>" + Math.floor(gifts[g].points/max * 100) + "</b>"+
          "<small>баллов</small>"+
          "</div>"+
          "</div>";
      }
      gifts[max_id].final = true;
      APP_DATA.max_points = max;
      APP_DATA.gifts = gifts;
      recalcPoints();
      $('.gift_list_wrapper').html(html);
    });
  });
  sendRequest('/event/list', '', 'get', function(d) {
    APP_DATA.actions = d.result.events;
    var html = '';
    var actions = d.result.events;
    for (var a in actions) {
      html += "<img src='" + imageIdtoUrl(actions[a].img) + "' alt='' class='switch_screen' data-to='partners_map' data-param='{\"id\":" + a + ",\"network_id\": " + actions[a].network_id + "}' data-function='loadPartnersMap'>";
    }
    $('.partners_events').html(html);
  });
  sendRequest('/store/list', '', 'get', function(d) {
    var stores_networks = {};
    var stores = d.result.stores;
    APP_DATA.stores = stores;
    var networks = d.result.networks;
    var net;
    for (var a in stores) {
      net = stores[a].network_id;
      if (!stores_networks[net]) {
        stores_networks[net] = {
          name: networks[net].name,
          stores: {}
        }
      }
      stores_networks[net].stores[a] = stores[a];
    }
    APP_DATA.stores_networks = stores_networks;
  });
  sendRequest('/feedback/list', '', 'get', function(d) {
    var quests = d.result;
    APP_DATA.feedback = quests;
    var html = '';
    for (var a in quests) {
      html += "<div class='dis_list_item switch_screen quest_list_item' data-to='feedback_item' data-function='openFeedback' data-param='{\"id\":\"" + a + "\",\"id\":\"" + a + "\"}'>" + quests[a].msg + "</div>";
    }
    $('.quest_list_wrapper').html(html);
  });
}
