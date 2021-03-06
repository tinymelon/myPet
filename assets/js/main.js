var API_URL = 'http://bayer.k0o.ru';
var APP_DATA = {};
var IS_TEST = false;
var TOUCH_X, TOUCH_Y, IS_MOVING;
var justRegistered = false;
var ScreensHistory = [];

document.addEventListener("deviceready", function() {
  $('body').addClass(device.platform == 'Android' ? 'android' : 'ios');
  $('#app_type').val(device.platform == 'Android' ? 1 : 2);
  $('#device_id').val(device.uuid);

  cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
  cordova.plugins.notification.local.registerPermission(function (granted) {
    // console.log('Permission has been granted: ' + granted);
  });
  Ionic.platform.registerBackButtonAction(GoBack, 999);
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
``
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
      senderID: "564788632487",
      sound: "true"
    },
    ios: {
      alert: "true",
      badge: "true",
      clearBadge: "true",
      sound: "true"
    }
  });

  push.on('registration', function(data) {
    $('#dev_token').val(data.registrationId);
  });

  push.on('notification', function(data) {
    if (data && data.response == 'userinfo')
      updateScoresInfo();
    else
      updateAppInfo();
  });

  push.on('error', function(e) {
    alert(e.message)
  });

  document.addEventListener("resume", onResume, false);
  function onResume() {
    setTimeout(function() {
      var int = 2629746000; //1 month
      for (var e in APP_DATA.events) {
        var event = APP_DATA.events[e];
        if (event.is_notify == 1) {
          cordova.plugins.notification.local.isPresent(parseInt(e), function (present) {
            if (!present) {
              var cur = moment(event.datetime, 'YYYY-MM-DD').valueOf();
              var date = new Date(moment(checkEventTime(cur, parseInt(event.notify) * int)).toISOString());
              var options = {
                id: parseInt(e),
                text: $('#event_name_selector').find('option[value="' + event.name + '"]').data('msg'),
                at: date
              };
              if (typeof cordova != 'undefined') {
                cordova.plugins.notification.local.schedule(options);
              }
              updateEventsList();
            }
          });
        }
      }
    }, 0);
  }

}, false);

function checkEventTime(time, interval) {
  var now = moment().valueOf();
  var nt = time + interval;
  while (nt < now) {
    nt += interval;
  }
  return nt;
}

$(document).ready(function() {
  /*$('body').on('keypress', function(event){
    var key = event.which || event.keyCode || event.charCode;
    if(key == 61){
      GoBack();
    }
  });*/
  $('body').on('touchstart', function(e) {
    IS_MOVING = false;
    TOUCH_X = e.originalEvent.touches[0].pageX;
    TOUCH_Y = e.originalEvent.touches[0].pageY;
  }).on('touchmove', function(e) {
    if (Math.abs(TOUCH_X - e.originalEvent.touches[0].pageX) > 10 || Math.abs(TOUCH_Y - e.originalEvent.touches[0].pageY)) {
      IS_MOVING = true;
    }
  }).on('touchend', '#open_menu, .open_menu', function() {
    $('#menu_wrapper').toggleClass('active');
  }).on('change', '.select_type input', function() {
    $(this).parents('label').addClass('checked').siblings('label').removeClass('checked');
  }).on('touchend', '.submit_button', function() {
    if (IS_MOVING) return;
    var form = $(this).parents('form').submit();
  }).on('touchend', '.switch_screen', function (e) {
    if (IS_MOVING || $(this).hasClass('disabled')) return;
    if ($(e.target).hasClass('toggle') || $(e.target).hasClass('event_list_check') || $(e.target).parents('.event_list_check').length) {
      var el = $(e.target).parents('.event_item').find('button');
      var id = el.parents('.event_item').attr('data-id');
      var params = APP_DATA.events[id];
      var checked = el.attr('aria-checked') == 'true' ? true : false;
      if (checked) {
        el.attr('aria-checked', 'false');
        el.siblings('.toggle-icon').removeClass('toggle-checked');
        if (typeof cordova != 'undefined') {
          id = parseInt(id);
          cordova.plugins.notification.local.cancel(id);
          cordova.plugins.notification.local.clear(id);
        }
        params.is_notify = 0;
        APP_DATA.events[id].is_notify = 0;
        var par_str = '';
        for (var p in params) {
          par_str += p + '=' + params[p] + '&';
        }
        par_str += 'id=' + id;
        sendRequest('/memento/save', par_str, 'post', function() {
          updateEventsList(true);
        });
      } else {
        el.attr('aria-checked', 'true');
        el.siblings('.toggle-icon').addClass('toggle-checked');
        var per = parseInt(params.notify);
        var step = 2629746000; // 1 month
        var cur_date = moment(params.datetime, 'YYYY-MM-DD').valueOf();
        var date = new Date(moment(checkEventTime(cur_date, per * step)).toISOString());
        var options = {
          id: parseInt(id),
          text: $('#event_name_selector').find('option[value="' + params.name + '"]').data('msg'),
          at: date
        };
        if (typeof cordova != 'undefined') {
          cordova.plugins.notification.local.schedule(options);
        }
        params.is_notify = 1;
        APP_DATA.events[id].is_notify = 1;
        var par_str = '';
        for (var p in params) {
          par_str += p + '=' + params[p] + '&';
        }
        par_str += 'id=' + id;
        sendRequest('/memento/save', par_str, 'post', function() {
          updateEventsList(true);
        });
      }
      return;
    }
    e.preventDefault();
    var screen = $(this).data('to');
    var params;
    var func;
    if ($(this).data('param')) params = $(this).attr('data-param');
    if ($(this).data('function')) func = $(this).data('function');
    switchTo(screen, params, func);
  }).on('submit', 'form', function(e) {
    e.preventDefault();
    var err = false;
    var checked = true;
    $(this).find('.format_phone').each(function(i,e) {
      $(e).val($(e).val().replace(/[^0-9.]/g, ''));
    });
    $(this).find('input[type="date"]').each(function(i,e) {
      if ($(e).val())
        $(e).siblings('input').val(moment($(e).val()).format('YYYY-MM-DD'));
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
            if ($(_this).find('#add_event_notify').find('button').attr('aria-checked') == 'true') {
              addEventNotify(d, $('#event_name_selector').find('option:selected').data('msg'));
            } else {
              switchTo('events_list');
              updateEventsList();
            }

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
      } else {
        if (to) switchTo(to);
      }
    })
  }).on('change', '#species_selector input', function() {
    var id = $(this).val();
    var breeds = id == 1 ? APP_DATA.library.cat_breeds : APP_DATA.library.dog_breeds;
    var drug_worm = APP_DATA.library.drugs[id][1];
    var drug_tick = APP_DATA.library.drugs[id][2];
    var html = '<option value="0">Порода не определена</option>';
    for (var b in breeds) {
      html += '<option value="' + b + '">' + breeds[b] + '</option>'
    }
    $('#breed_selector').html(html).removeAttr('disabled');
    html = '<option value="0">Не выбран</option>';
    for (var w in drug_worm) {
      html += '<option value="' + w + '">' + drug_worm[w] + '</option>'
    }
    html += '<option value="9999">Другое</option>';
    $('#worm_drug_selector').html(html).removeAttr('disabled');
  }).on('change', '#my_pets_selector', function() {
    if (!$(this).val()) return;
    var id = parseInt(APP_DATA.pets[$(this).val()].species_id);
    var drug_worm = APP_DATA.library.drugs[id][1];
    var drug_tick = APP_DATA.library.drugs[id][2];
    var html = '<option value="0">Не указан</option>';
    if ($('#event_name_selector').val() == 'Обработка от глистов') {
      for (var w in drug_worm) {
        html += '<option value="' + w + '">' + drug_worm[w] + '</option>'
      }
    } else {
      for (var w in drug_tick) {
        html += '<option value="' + w + '">' + drug_tick[w] + '</option>'
      }
    }
    html += '<option value="000">Другое</option>';
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
      updateEventsList();
      switchTo('pet_list');
      $("#add_pet")[0].reset();
      $("#add_pet").find('input[name="id"]').val('');
    });
  }).on('touchend', '.remove_event', function(e) {
    if (IS_MOVING) return;
    var params = $(e.target).attr('data-params');
    sendRequest($(this).data('action'), $(e.target).attr('data-params'), 'post', function(d) {
      if (typeof cordova != 'undefined') {
        var id = parseInt(params.match(/\d+/)[0]);
        cordova.plugins.notification.local.get(id, function (present) {
          if (present) {
            cordova.plugins.notification.local.cancel(id);
          }
        });
      }

      updateEventsList();
      switchTo('events_list');
      $("#add_event")[0].reset();
      $("#add_event").find('input[name="id"]').val('');
    });
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
    if ($(e.target).attr('id') != 'open_menu' && !$(e.target).hasClass('open_menu'))
      $('#menu_wrapper').removeClass('active');
  }).on('change', '#event_name_selector', function() {
    switch ($(this).val()) {
      case 'Визит к грумеру':
      case 'Покупка корма':
        $('#notify_drug_wrapper').hide().find('select').val('0').trigger('change');
        break;
      case 'Вакцинация':
        $('#notify_drug_wrapper').hide().find('select').val('000').trigger('change');
        break;
      default:
        $('#notify_drug_wrapper').show();
        break;
    }
    if (!$('#my_pets_selector').val()) return;
    var id = parseInt(APP_DATA.pets[$('#my_pets_selector').val()].species_id);
    var drug_worm = APP_DATA.library.drugs[id][1];
    var drug_tick = APP_DATA.library.drugs[id][2];
    var html = '<option value="0">Не указан</option>';
    if ($('#event_name_selector').val() == 'Обработка от глистов') {
      for (var w in drug_worm) {
        html += '<option value="' + w + '">' + drug_worm[w] + '</option>'
      }
    } else {
      for (var w in drug_tick) {
        html += '<option value="' + w + '">' + drug_tick[w] + '</option>'
      }
    }
    html += '<option value="000">Другое</option>';
    $('#notify_drug_selector').html(html).removeAttr('disabled').trigger('change');
  }).on('change', '#notify_drug_selector', function() {
    if ($(this).val() == '000') {
      $('#notify_drug_name_wrapper').show();
    } else {
      $('#notify_drug_name_wrapper').hide();
    }
  }).on('touchend', '.item-cover', function() {
    var checked = $(this).attr('aria-checked') == 'true' ? true : false;
    var input = $(this).parents('.input_wrapper').find('input[name="is_notify"]');
    if (checked) {
      input.val('1');
    } else {
      input.val('0');
    }
  }).on('change', '#worm_drug_selector', function() {
    if ($(this).val() == '9999') {
      $('#pet_another_drug').show();
    } else {
      $('#pet_another_drug').hide();
    }
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
  $('#login_form').attr('data-to', 'pet_card').submit();
  justRegistered = true;
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

function petSuccess(d) {
  var id = d.result;
  $('.pet_remind').each(function (i, e) {
    var per_val, last_date, text, name;
    if ($(e).find('button').attr('aria-checked') == 'true') {
      per_val = $(e).find('select').val();
      last_date = $('input[name="' + $(e).attr('data-for') + '"]').val();
      switch ($(e).attr('data-for')) {
        case 'last_vacine_date':
          text = 'Хозяин, пора делать вакцинацию!';
          name = 'Вакцинация';
          break;
        case 'worm_date':
          text = 'Хозяин, защити меня от глистов!';
          name = 'Обработка от глистов';
          break;
        case 'birth_date':
          text = 'Поздравляем! У Вашего питомца сегодня день рождения!';
          name = 'День рождения';
          break;
      }
      var per = parseInt(per_val);
      var step = 2629746000; // 1 month
      var cur_date = moment(last_date).valueOf();
      var date = new Date(moment(checkEventTime(cur_date, per * step)).toISOString());
      var data = 'name=' + name + '&pet_id=' + id + '&drug=&drug_name=&datetime=' + last_date + '&notify=' + per_val + '&comment=&is_notify=1';
      sendRequest('/memento/save', data, 'post', function (ev) {
        var options = {
          id: parseInt(ev.result),
          text: text,
          at: date
        };
        console.log(options);
        if (typeof cordova != 'undefined') {
          cordova.plugins.notification.local.schedule(options);
        }
        updateEventsList();
      });
    }
  });
  updatePetList();
  switchTo('pet_list');
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
  var points = gift.points < APP_DATA.points_summary ? gift.points : APP_DATA.points_summary;
  screen.find('.gift_status_percent span').html(points);
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
      controls: ['zoomControl']
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
function updateEventsList(is_local) {
  APP_DATA.proccessed_ids = [];
  if (!is_local) {
    sendRequest('/memento/list', '', 'get', function(d) {
      var events = d.result;
      APP_DATA.events = events;
      updateEv(events);
    });
  } else {
    updateEv(APP_DATA.events);
  }


  function updateEv(events) {
    var html = '';
    var obj;
    var swich;
    if (typeof cordova != 'undefined') {
      $('#events_list_wrapper').html('');
      for (var i in events) {
        if (APP_DATA.proccessed_ids.indexOf(i) == -1) {
          printNotify(events[i], i);
          APP_DATA.proccessed_ids.push(i);
        }
      }
    } else {
      for (var i in events) {
        swich = $('#add_event_notify').clone();
        swich.removeAttr('id');
        obj = {};
        for (var p in events[i]) {
          obj[p] = events[i][p];
        }
        obj.id = i;
        var date = moment(events[i].datetime).format("DD.MM.YYYY");
        if (events[i].is_notify == 1) {
          swich.find('button').attr('aria-checked', 'true');
          swich.find('.toggle-icon').addClass('toggle-checked');
        } else {
          swich.find('button').attr('aria-checked', 'false');
          swich.find('.toggle-icon').removeClass('toggle-checked');
        }
        html +=
          "<div class='event_item switch_screen events_item_" + i + "' data-to='event_form' data-id='" + i + "' data-param='" + JSON.stringify(obj) + "'>"+
          '<div class="event_name_self">' + events[i].name + '</div>' +
          '<div class="event_bot_line"><div class="event_list_date">' + date + '</div><div class="event_list_check">' + swich.prop("outerHTML") + '</div></div>'+
          "</div>";

      }
      $('#events_list_wrapper').html(html);
    }
  }
}

function printNotify(event, i) {
  var obj;
  var swich;
  swich = $('#add_event_notify').clone();
  swich.removeAttr('id');
  obj = {};
  for (var p in event) {
    obj[p] = event[p];
  }
  obj.id = i;
  var id = parseInt(i);
  setTimeout(function() {
    cordova.plugins.notification.local.isPresent(id, function (present) {
      if (present) {
        cordova.plugins.notification.local.get(id, function (notif) {
          if (event.is_notify == 1) {
            swich.find('button').attr('aria-checked', 'true');
            swich.find('.toggle-icon').addClass('toggle-checked');
          } else {
            swich.find('button').attr('aria-checked', 'false');
            swich.find('.toggle-icon').removeClass('toggle-checked');
          }
          var date = moment(notif.at * 1000).format("DD.MM.YYYY");
          $('#events_list_wrapper').append("" +
            "<div class='event_item switch_screen events_item_" + i + "' data-to='event_form' data-id='" + i + "' data-param='" + JSON.stringify(obj) + "'>"+
            '<div class="event_name_self">' + event.name + '</div>' +
            '<div class="event_bot_line"><div class="event_list_date">' + date + '</div><div class="event_list_check">' + swich.prop("outerHTML") + '</div></div>'+
            "</div>");
        });
      } else {
        swich.find('button').attr('aria-checked', 'false');
        swich.find('.toggle-icon').removeClass('toggle-checked');
        var date = moment(event.datetime).format("DD.MM.YYYY");
        $('#events_list_wrapper').append("" +
          "<div class='event_item switch_screen events_item_" + i + "' data-to='event_form' data-id='" + i + "' data-param='" + JSON.stringify(obj) + "'>"+
          '<div class="event_name_self">' + event.name + '</div>' +
          '<div class="event_bot_line"><div class="event_list_date">' + date + '</div><div class="event_list_check">' + swich.prop("outerHTML") + '</div></div>'+
          "</div>");
      }
    });
  }, 300);
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
    } else {
      switchTo('pet_list');
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
  var per = parseInt($("#is_notify_value").val());
  var step = 2629746000; // 1 month
  var cur_date = moment($('#event_last_date').val()).valueOf();
  var date = new Date(moment(checkEventTime(cur_date, per * step)).toISOString());
  var options = {
    id: parseInt(d.result),
    text: name,
    at: date
  };
  if (typeof cordova != 'undefined') {
    cordova.plugins.notification.local.schedule(options);
  }
  IonicAlert('Успешно', 'Уведомление добавлено');
  $("#add_event")[0].reset();
  updateEventsList();
  switchTo('events_list');
}

function switchTo(screen, params, func, isAuto) {
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
    if (to_elem.find('form').attr('id') != 'register_form')
      to_elem.find('form')[0].reset();
    to_elem.find('.get_image_wrapper').removeClass('active').removeAttr('style');
    to_elem.find('.sex_block').removeClass('active');
    to_elem.find('#species_selector label').removeClass('checked').find('input').prop('checked', false);
    to_elem.find('#notify_drug_name_wrapper').hide();
    to_elem.find('#worm_drug_selector, #breed_selector').html('').attr('disabled', 'disabled');
    to_elem.find('#drug_care_text').hide();
    to_elem.find('input[name="img"], input[name="id"]').val('');
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
          if (params.name == 'Вакцинация') {
            $('#notify_drug_selector').val('000').trigger('change');
            $('#notify_drug_wrapper').hide();
          } else {
            $('#notify_drug_selector').val('0').trigger('change');
            $('#notify_drug_wrapper').show();
          }
          break;
        case 'text_page':
          var id = params.id;
          break;
        case 'gift_order':
          $('#order_phone').val(APP_DATA.user.phone);
          break;
      }
      for (var p in params) {
        switch (p) {
          case 'img':
            to_elem.find('input[name="' + p + '"]').val(params[p]).parent().css('background-image', 'url("' + imageIdtoUrl(params[p]) + '")').addClass('active');
            break;
          case 'datetime':
            if (params[p]) {
              var time = moment(params[p], 'YYYY-MM-DD').format('YYYY-MM-DD');
              to_elem.find('input[name="' + p + '"]').siblings('input').val(time).removeAttr('disabled');
              to_elem.find('input[name="' + p + '"]').parents('.input_wrapper').find('button').attr('aria-checked', 'true');
              to_elem.find('input[name="' + p + '"]').parents('.input_wrapper').find('.toggle-icon').addClass('toggle-checked');
            }
            break;
          default:
            if (p != 'species_id')
              to_elem.find('input[name="' + p + '"], select[name="' + p + '"], textarea[name="' + p + '"]').val(params[p]).trigger('change');
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
    $('.switch_screen').removeClass('active');
    $('.switch_screen[data-to="' + screen + '"]').addClass('active');
    if (typeof isAuto == 'undefined')
      ScreensHistory.push({screen: screen, func: func, params: params});
  }, 100);
}

function GoBack(ev) {
  //ev.preventDefault();
  //ev.stopPropagation();
  var prev = ScreensHistory[ScreensHistory.length - 2];
  if (prev) {
    ScreensHistory.pop();
    switchTo(prev.screen, prev.params, prev.func, true);
    $('.footer_nav').removeClass('active');
  }
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
  var fp;
  if (path.indexOf('http') > -1) fp = path;
  else fp = API_URL + path;
  $.ajax({
    url: fp,
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
      IonicAlert('Ошибка', 'Ошибка соединения с сервером');
    }
  });
}

function imageIdtoUrl(id) {
  return API_URL + "/image/draw/500x500/" + id + ".jpg";
}

function updateAppInfo() {
  sendRequest('/event/list', '', 'get', function(d) {
    APP_DATA.actions = d.result.events;
    var html = '';
    var actions = d.result.events;
    for (var a in actions) {
      html += "<img src='" + imageIdtoUrl(actions[a].img) + "' alt='' class='switch_screen' data-to='partners_map' data-param='{\"id\":" + a + ",\"network_id\": " + actions[a].network_id + "}' data-function='loadPartnersMap'>";
    }
    $('.partners_events').html(html);
  });
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
    for (var a in articles) {
      html += "<div class='dis_list_item switch_screen art_category_" + articles[a].category_id + "' data-to='disease' data-function='openArticle' data-param='{\"id\":\"" + a + "\",\"cat_id\":\"" + articles[a].category_id + "\"}'>" + articles[a].name + "</div>";
    }
    $('.dis_list_wrapper').html(html);
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
  updateScoresInfo();
}
function updateScoresInfo() {
  sendRequest('/user/info', '', 'get', function(d) {
    var user = d.result;
    APP_DATA.points_summary = parseInt(user.points);
    recalcPoints();
  });
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
    checkReg();

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
