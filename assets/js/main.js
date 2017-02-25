var API_URL = 'https://growthof.me/heart';
var APP_DATA = {};
var IS_TEST = true;
var TOUCH_X, TOUCH_Y, IS_MOVING;

document.addEventListener("deviceready", function() {
  cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
  $('body').on('touchend', '.get_image_wrapper', function(e) {
    e.preventDefault();
    var _this = $(this);
    var inp = _this.find('input');
    function fail (err) {
      IonicAlert('Ошибка', JSON.stringify(err));
    }
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
          IonicAlert('Ошибка', d.system.msg);
        }
        var url = imageIdtoUrl(d.result);
        inp.val(d.result);
        _this.css('background-image', 'url("' + url + '")').addClass('active');
      }

      var ft = new FileTransfer();
      ft.upload(imageData, encodeURI(API_URL + '/pet/saveImg'), win, fail, options);
    }, fail);
  })
}, false);

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
  }).on('touchend', '.switch_screen', function () {
    if (IS_MOVING) return;
    var screen = $(this).data('to');
    var params;
    var func;
    if ($(this).data('param')) params = $(this).data('param');
    if ($(this).data('function')) func = $(this).data('function');
    switchTo(screen, params, func);
  }).on('submit', 'form', function(e) {
    e.preventDefault();
    var err = false;
    $(this).find('.format_phone').each(function(i,e) {
      $(e).val($(e).val().replace(/[^0-9.]/g, ''));
    });
    $(this).find('input[type="datetime-local"]').each(function(i,e) {
      $(e).siblings('input').val($(e).val().replace(/T/g, ' ') + ':00');
    });
    $(this).find('.required').each(function(i,e) {
      if ($(e).val() == '') {
        err = true;
        $(e).addClass('error');
      } else {
        $(e).removeClass('error');
      }
    });
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
        IonicAlert('Ошибка', d.system.msg);
        console.log(d);
        return;
      }
      var success = $(_this).data('success');
      var to = $(_this).data('to');
      if (d.system.code == 1 || (d.result && d.result != '')) {
        if (success && typeof window[success] == 'function') {
          if (!window[success](d)) return;
        } else {
          _this.reset();
        }
        switch (to) {
          case 'pet_list':
            updatePetList();
            break;
          case 'events_list':
            updateEventsList();
            if ($('#is_notify_value').val().length > 5) addEventNotify(d);
            break;
        }
        if (to) switchTo(to);
        else IonicAlert('Успешно', $(_this).data('message') || 'Данные сохранены')
      }
    })
  }).on('change', '#species_selector input', function() {
    var id = $(this).val();
    var breeds = id == 1 ? APP_DATA.library.cat_breeds : APP_DATA.library.dog_breeds;
    var drug_worm = APP_DATA.library.drugs[id][1];
    var drug_tick = APP_DATA.library.drugs[id][2];
    var html = '<option value=""></option>';
    for (var b in breeds) {
      html += '<option value="' + b + '">' + breeds[b] + '</option>'
    }
    $('#breed_selector').html(html);
    html = '<option value=""></option>';
    for (var w in drug_worm) {
      html += '<option value="' + w + '">' + drug_worm[w] + '</option>'
    }
    $('#worm_drug_selector').html(html);
    html = '<option value=""></option>';
    for (var w in drug_tick) {
      html += '<option value="' + w + '">' + drug_tick[w] + '</option>'
    }
    $('#tick_drug_selector').html(html);
  }).on('touchend', '.remove_pet', function(e) {
    if (IS_MOVING) return;
    sendRequest($(this).data('action'), $(e.target).attr('data-params'), 'post', function(d) {
      updatePetList();
      switchTo('pet_list');
    });
  }).on('touchend', '.remove_event', function(e) {
    if (IS_MOVING) return;
    var params = $(e.target).attr('data-params');
    sendRequest($(this).data('action'), $(e.target).attr('data-params'), 'post', function(d) {
      IonicNative.LocalNotifications.cancel('event' + parseInt(params));
      updateEventsList();
      switchTo('events_list');
    });
  }).on('touchend', '.item-cover', function() {
    var checked = $(this).attr('aria-checked') == 'true' ? true : false;
    var inputs = $(this).parents('.input_wrapper').find('input');
    if (checked) {
      inputs.removeAttr('disabled');
    } else {
      inputs.val('').attr('disabled', 'disabled');
    }
  });

  if (window.localStorage.getItem('_token')) {
    APP_DATA.token = window.localStorage.getItem('_token');
    switchTo('event_main');
    initApp();
  } else {
    switchTo('login');
  }
});


function loginSuccess(d) {
  if (d.result && d.result.token) {
    APP_DATA.token = d.result.token;
    window.localStorage.setItem('_token', APP_DATA.token);
    initApp();
    return true;
  } else {
    console.log(d);
    IonicAlert('Ошибка', JSON.stringify(d));
    return false;
  }
}

function registerBefore(t) {
  var checkboxes = $(t).find('input[type="checkbox"]');

  if (checkboxes[0].checked && checkboxes[1].checked) {
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
  var p = Math.floor(gift.points/APP_DATA.max_points * 100);
  screen.find('.gift_status_percent span').html(p);
  screen.find('.gift_status_overlay').css('height', p + '%');
}

function openCategory(screen, params) {
  screen.find('.dis_list_item').hide();
  screen.find('.art_category_' + params.id).show();
}

function openArticle(screen, params) {
  var article = APP_DATA.publications[params.cat_id].articles[params.id];
  $('.disease_header').html(article.name);
  $('.disease_text').html(article.description);
  if (article.img) {
    $('.disease_image').attr('src', imageIdtoUrl(article.img)).show();
  } else {
    $('.disease_image').hide();
  }
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
      console.log([coords[1], coords[0]]);
      myPlacemark = new ymaps.Placemark([coords[1], coords[0]], {}, {
        iconLayout: 'default#image',
        iconImageHref: 'assets/images/map_pin.png',
        iconImageSize: [30, 41],
        iconImageOffset: [-3, -42]
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
    var s_html = '<option value=""></option>';
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
    $('#my_pets_selector').html(s_html);
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

function addEventNotify(d) {
  var options = {
    id: 'event' + d.id,
    text: 'Напоминание о событии: ' + $('#event_name_selector').val(),
    at: new Date(moment($('#is_notify_value').val()).toISOString())
  };
  var not;
  if (IonicNative.LocalNotifications.isScheduled(d.id)) {
    not = IonicNative.LocalNotifications.update(options);
  } else {
    not = IonicNative.LocalNotifications.schedule(options);
  }
  if (not && not.error) IonicAlert('Ошибка', not.error);
  else {
    IonicAlert('Успешно', 'Уведомление добавлено');
    switchTo('events_list');
    $("#add_event")[0].reset();
  }
}

function checkTouchDelta(x,y) {
  alert(Math.abs(TOUCH_X - x), Math.abs(TOUCH_Y - y));
  if (Math.abs(TOUCH_X - x) > 10 || Math.abs(TOUCH_Y - y) > 10) return false;
  else return true;
}

function switchTo(screen, params, func) {
  var to_elem = $('.screen_' + screen);
  if (to_elem.hasClass('brown_bg')) $('.content').addClass('brown_bg');
  else $('.content').removeClass('brown_bg');
  if (to_elem.hasClass('no_footer')) $('.footer, #open_menu').hide()
  else $('.footer, #open_menu').show();
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
          break;
        case 'event_form':
          $('.remove_event').show().attr('data-params', 'id=' + params.id);
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
    $('#menu_wrapper').removeClass('active');
  }, 100);
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
        IonicAlert('Ошибка', data.system.msg);
      } else {
        if (typeof callback == 'function') callback(data);
      }
    },
    error: function (a,b,c) {
      console.log(a,b,c);
      IonicAlert('Ошибка', c);
    }
  });
}

function imageIdtoUrl(id) {
  return API_URL + "/data/img/" + id + ".jpg";
}

function initApp() {
  sendRequest('/library/get', 'names=cat_breeds,dog_breeds,drugs,messages,categories', 'get', function(d) {
    APP_DATA.library = d.result;
    var categories = d.result.categories;
    var html = '<option value=""></option>';
    for (var c in categories) {
      html += '<option value="' + c + '">' + categories[c] + '</option>';
    }
    $('#feedback_category_id').html(html);
  });
  updatePetList();
  updateEventsList();
  sendRequest('/bill/list', '', 'get', function(d) {
    APP_DATA.bills = d.result;
    APP_DATA.points_summary = 0;
    for (var b in APP_DATA.bills) {
      APP_DATA.points_summary += parseInt(APP_DATA.bills[b].points);
    }
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
          "<b>" + Math.floor(gifts[g].points/max * 100) + "%</b>"+
          "</div>"+
          "</div>";
      }
      gifts[max_id].final = true;
      APP_DATA.max_points = max;
      APP_DATA.gifts = gifts;
      APP_DATA.max_percent = Math.floor(APP_DATA.points_summary/APP_DATA.max_points * 100);
      $('.heart_percent').html(APP_DATA.max_percent);
      $('.gift_list_wrapper').html(html);
    });
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
    for (var p in publications) {
      html += "<div class='art_category_item switch_screen' data-to='dis_list' data-function='openCategory' data-param='{\"id\":\"" + p + "\"}'>" + publications[p].name + "</div>";
    }
    $('.art_categories_wrapper').html(html);
    html = '';
    for (var a in articles) {
      html += "<div class='dis_list_item switch_screen art_category_" + articles[a].category_id + "' data-to='disease' data-function='openArticle' data-param='{\"id\":\"" + a + "\",\"cat_id\":\"" + articles[a].category_id + "\"}'>" + articles[a].name + "</div>";
    }
    $('.dis_list_wrapper').html(html);
  });
  sendRequest('/user/info', '', 'get', function(d) {
    var user = d.result;
    APP_DATA.user = user;
    var user_form = $('#edit_personal');
    for (var p in user) {
      if (p != 'img')
        user_form.find('input[name="' + p + '"], select[name="' + p + '"]').val(user[p]);
      else {
        user_form.find('input[name="' + p + '"]').val(user[p]).parent().css('background-image', 'url("' + imageIdtoUrl(user[p]) + '")').addClass('active');
      }
    }
  });
  sendRequest('/event/list', '', 'get', function(d) {
    var actions = d.result;
    APP_DATA.actions = actions;
    var html = '';
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
}
