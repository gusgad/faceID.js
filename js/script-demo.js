$(function () {
  "use strict";

  /*-----------------------------------
   * DEFAULT STATES
   *-----------------------------------*/
  $('.associated-photo').hide();
  $('#processing').hide();
  $('#success').hide();
  $('.username-req').hide();
  $('.photo-req').hide();
  $('#retake').hide();
  $('#fail').hide();

  /*-----------------------------------
   * FIXED  MENU - HEADER
   *-----------------------------------*/
  function menuscroll() {
    var $navmenu = $('.nav-menu');
    if ($(window).scrollTop() > 50) {
      $navmenu.addClass('is-scrolling');
    } else {
      $navmenu.removeClass("is-scrolling");
    }
  }
  menuscroll();
  $(window).on('scroll', function () {
    menuscroll();
  });
  /*-----------------------------------
   * NAVBAR CLOSE ON CLICK
   *-----------------------------------*/

  $('.navbar-nav > li:not(.dropdown) > a').on('click', function () {
    $('.navbar-collapse').collapse('hide');
  });
  /* 
   * NAVBAR TOGGLE BG
   *-----------------*/
  var siteNav = $('#navbar');
  siteNav.on('show.bs.collapse', function (e) {
    $(this).parents('.nav-menu').addClass('menu-is-open');
  })
  siteNav.on('hide.bs.collapse', function (e) {
    $(this).parents('.nav-menu').removeClass('menu-is-open');
  })

  /*-----------------------------------
   * ONE PAGE SCROLLING
   *-----------------------------------*/
  // Select all links with hashes
  // Select all links with hashes
  $('a[href*="#"]')
    // Remove links that don't actually link to anything
    .not('[href="#"]')
    .not('[href="#0"]')
    .click(function (event) {
      // On-page links
      if (
        location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '')
        &&
        location.hostname == this.hostname
      ) {
        // Figure out element to scroll to
        var target = $(this.hash);
        target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
        // Does a scroll target exist?
        if (target.length) {
          // Only prevent default if animation is actually gonna happen
          event.preventDefault();
          $('html, body').animate({
            scrollTop: target.offset().top
          }, 1000, function () {
            // Callback after animation
            // Must change focus!
            var $target = $(target);
            $target.focus();
            if ($target.is(":focus")) { // Checking if the target was focused
              return false;
            } else {
              $target.attr('tabindex', '-1'); // Adding tabindex for elements not focusable
              $target.focus(); // Set focus again
            };
          });
        }
      }
    });


  /*-----------------------------------
  * INITIALIZE THE ANIMATED WEBCAM MODAL
  *-----------------------------------*/
  $("#openCameraModal").animatedModal({ animatedIn: 'lightSpeedIn', animatedOut: 'bounceOutDown'});
  $("#openCameraModal").click(function() {
    /*-----------------------------------
    * INITIALIZE THE WEBCAM
    *-----------------------------------*/
    Webcam.set({
      image_format: 'jpeg',
      jpeg_quality: 100,
      fps: 60
    });
    Webcam.attach('#my_camera');
    Webcam.on('error', function (err) {
      console.log('Webcam error:', err)
    });
    var take_snapshot = document.getElementById('take-snapshot').addEventListener('click', take_snapshot)

    function take_snapshot() {
      Webcam.snap(function (data_uri) {
        document.getElementById('my_result').innerHTML = '<img src="' + data_uri + '"/>';
        document.getElementById('animatedModal').remove();
        document.getElementById('body').style.overflow = 'auto';
        document.getElementsByTagName('html')[0].style.overflow = 'auto';
        $('.photo-req').hide();
        $('.associated-photo').show();
        $('#openCameraModal').hide();
        var savedImage = document.getElementById('my_result').firstChild;
        $('#retake').show();
        if ($('#exampleInputUsername').val() && savedImage) {
          $('#save-and-process').removeClass('disabled');
        }
      });
    }
  });

  /*-----------------------------------
  *   LOAD THE WEIGHTS
  *-----------------------------------*/
 faceapi.nets.ssdMobilenetv1.loadFromUri('../weights').then(function(modelLoadRes) {
  faceapi.nets.faceLandmark68Net.loadFromUri('../weights').then(function(modelLoadRes) {
    faceapi.nets.faceRecognitionNet.loadFromUri('../weights').then(function(modelLoadRes) {
      console.log(modelLoadRes)
    });
  });
});

/*-----------------------------------
*   HELPERS
*-----------------------------------*/
function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function getBase64Image(img) {
  var canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  var dataURL = canvas.toDataURL("image/png");

  return dataURL;
}

$('#retake').on('click', function() {
  location.reload();
});

/*-----------------------------------
* LISTEN TO USERNAME CHANGES TO VALIDATE IT
*-----------------------------------*/
$('#exampleInputUsername').on('keyup', function() {
  var savedImage = document.getElementById('my_result').firstChild;
  if ($('#exampleInputUsername').val() && savedImage) {
    $('#save-and-process').removeClass('disabled');
  } else {
    $('#save-and-process').addClass('disabled');
  }
});

 /*-----------------------------------
  * START PROCESSING AFTER SAVE
  *-----------------------------------*/
  $('#save-and-process').click(function() {
    
    var savedImage = document.getElementById('my_result').firstChild
    if ($('#exampleInputUsername').val() && savedImage) {
      $('html,body').animate({ scrollTop: document.body.scrollHeight }, 800);
      $('.username-req').hide();
      $('.photo-req').hide();
      $('#processing').show();
      
      faceapi.detectAllFaces(savedImage).withFaceLandmarks().withFaceDescriptors().then(function(res) {
        if (res.length === 0) {
          $('#fail').show();
          $('#processing').hide();
          $('#success').hide();
        } else {
          // save username hash, image and face landmarks from detections to sessionStorage to serve as a database
          sessionStorage.setItem('userID=' + makeid(5), JSON.stringify(
            {
              username: $('#exampleInputUsername').val(),
              img: getBase64Image(savedImage),
              data: res}
          ));
          $('#processing').hide();
          $('#success').show();
        }
        
      });
    } else if (!$('#exampleInputUsername').val()) {
      $('.username-req').show();
      $('.photo-req').hide();
    } else if (!$('#my_result').firstChild) {
      $('.photo-req').show();
      $('.username-req').hide();
    }
  });
  
});