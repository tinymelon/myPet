var API_URL = 'https://growthof.me/heart';

document.addEventListener("deviceready", function() {
  cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
}, false);

$(document).ready(function() {
  $('body').on('click', '#open_menu', function() {
    if ($(this).hasClass('active')) {
      $('#menu_wrapper').animate({
        'left': '-1000px'
      });
      $(this).removeClass('active');
    } else {
      $('#menu_wrapper').animate({
        'left': '0'
      });
      $(this).addClass('active');
    }
  }).on('change', '.select_type input', function() {
    $(this).parents('label').addClass('checked').siblings('label').removeClass('checked');
  }).on('click', '.submit_button', function() {
    var form = $(this).parents('form').submit();
  }).on('click', '.switch_screen', function () {
    var screen = $(this).data('to');
    switchTo(screen);
  }).on('submit', 'form', function(e) {
    e.preventDefault();
  }).on('submit', '#login_form', function(e) {
    var phone = $(this).find('input[name="phone"]').val().replace(/[^0-9.]/g, '');
    var pwd = $(this).find('input[name="pwd"]').val();
    var data = 'phone=' + phone + '&pwd=' + pwd;
    switchTo('pet_card');
    return;
    sendRequest('/user/login', data, 'post', function(d) {
      console.log(d);
    })
  });

  function switchTo(screen) {
    var to_elem = $('.screen_' + screen);
    if (to_elem.hasClass('brown_bg')) $('.content').addClass('brown_bg');
    else $('.content').removeClass('brown_bg');
    if (to_elem.hasClass('no_footer')) $('.footer').hide()
    else $('.footer').show();

    $('.section_wrapper').removeClass('active');
    to_elem.addClass('active');
  }

  function sendRequest(path, params, method, callback) {
    $.ajax({
      url: API_URL + path,
      data: params,
      type: method,
      success: function(d) {
        if (typeof callback == 'function') callback(d);
      },
      error: function (a,b,c) {
        console.log(a,b,c);
      }
    });
  }

  switchTo('login');
});
