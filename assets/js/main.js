var API_URL = 'https://growthof.me/heart';
var APP_DATA = {};

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
          IonicAlert('Ошибка', d.system.msg);
          if (d.system.msg == 'Unknown user') switchTo('login');
        }
        var url = API_URL + "/data/img/" + d.result + ".jpg";
        inp.val(d.result);
        _this.css('background-image', 'url("' + url + '")').addClass('active');
      }

      var ft = new FileTransfer();
      ft.upload(imageData, encodeURI(API_URL + '/pet/saveImg'), win, fail, options);
    }, fail);
  })
}, false);

$(document).ready(function() {
  $('body').on('touchend', '#open_menu', function() {
    $('#menu_wrapper').toggleClass('active');
  }).on('change', '.select_type input', function() {
    $(this).parents('label').addClass('checked').siblings('label').removeClass('checked');
  }).on('touchend', '.submit_button', function() {
    var form = $(this).parents('form').submit();
  }).on('touchend', '.switch_screen', function () {
    var screen = $(this).data('to');
    var params;
    if ($(this).data('param')) params = $(this).data('param');
    switchTo(screen, params);
  }).on('submit', 'form', function(e) {
    e.preventDefault();
    var err = false;
    $(this).find('.format_phone').each(function(i,e) {
      $(e).val($(e).val().replace(/[^0-9.]/g, ''));
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
    var token = APP_DATA.token ? '&token=' + APP_DATA.token : '';
    var data = $(this).serialize() + token;
    var _this = this;
    sendRequest($(this).attr('action'), data, 'post', function(d) {
      var success = $(_this).data('success');
      var to = $(_this).data('to');
      if (d.result && (d.result.length || Object.keys(d.result).length)) {
        if (success && typeof window[success] == 'function') {
          if (!window[success](d)) return;
        }
        if (to) switchTo(to);
      } else {
        console.log(d);
        IonicAlert('Ошибка', d.system.msg);
      }
    })
  });

  if (window.localStorage.getItem('_token')) {
    APP_DATA.token = window.localStorage.getItem('_token');
    switchTo('add_buy');
  } else {
    switchTo('login');
  }
});


function loginSuccess(d) {
  if (d.result && d.result.token) {
    APP_DATA.token = d.result.token;
    window.localStorage.setItem('_token', APP_DATA.token);
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

function switchTo(screen, params) {
  var to_elem = $('.screen_' + screen);
  if (to_elem.hasClass('brown_bg')) $('.content').addClass('brown_bg');
  else $('.content').removeClass('brown_bg');
  if (to_elem.hasClass('no_footer')) $('.footer').hide()
  else $('.footer').show();
  if (params) {
    if (typeof params == 'string') {
      try {
        params = JSON.parse(params);
      } catch (e) {
        console.log(e);
      }
    }
    for (var p in params) {
      to_elem.find('input[name="' + p + '"], select[name="' + p + '"]').val(params[p]);
    }
  }
  setTimeout(function() {
    $('.section_wrapper').removeClass('active');
    to_elem.addClass('active');
    $('#menu_wrapper').removeClass('active');
  }, 100);
}

function sendRequest(path, params, method, callback) {
  $.ajax({
    url: API_URL + path,
    data: params,
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
        IonicAlert('Ошибка', data.system.msg);
        if (data.system.msg == 'Unknown user') switchTo('login');
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
