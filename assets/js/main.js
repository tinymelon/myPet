var API_URL = 'https://growthof.me/heart';
var APP_DATA = {};

document.addEventListener("deviceready", function() {
  cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
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
  }).on('submit', '#login_form', function(e) {
    var phone = $(this).find('input[name="phone"]').val();//.replace(/[^0-9.]/g, '');
    var pwd = $(this).find('input[name="pwd"]').val();
    var data = 'phone=' + phone + '&pwd=' + pwd;

    sendRequest('/user/login', data, 'post', function(d) {
      if (d.result && d.result.token) {
        APP_DATA.token = d.result.token;
        window.localStorage.setItem('_token', APP_DATA.token);
        switchTo('event_main');
      } else {
        console.log(d);
        alert('Login error');
      }
    })
  }).on('submit', '#register_form', function(e) {
    var phone = $(this).find('input[name="phone"]').val().replace(/[^0-9.]/g, '');
    var pwd = $(this).find('input[name="pwd"]').val();
    var fio = $(this).find('input[name="fio"]').val();
    var data = 'phone=' + phone + '&pwd=' + pwd + '&fio=' + fio;
    var checkboxes = $(this).find('input[type="checkbox"]');

    if (checkboxes[0].checked && checkboxes[1].checked) {
      sendRequest('/user/register', data, 'post', function (d) {
        if (d.result) {
          switchTo('login');
        } else {
          console.log(d);
          alert('Register error');
        }
      });
    } else {
      alert('Примите условия пользования приложением');
    }
  });

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
        if (typeof callback == 'function') callback(data);
      },
      error: function (a,b,c) {
        console.log(a,b,c);
        alert(c);
      }
    });
  }

  if (window.localStorage.getItem('_token')) {
    APP_DATA.token = window.localStorage.getItem('_token');
    switchTo('event_main');
  } else {
    switchTo('login');
  }
});
