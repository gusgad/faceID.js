$(function () {
  "use strict";

  $('#processing').hide();
  $('#your-username').hide();


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
      document.getElementById('body').style.overflow = 'auto';
      document.getElementsByTagName('html')[0].style.overflow = 'auto';
    });
  }

  /*-----------------------------------
  *   LOAD THE WEIGHTS
  *-----------------------------------*/
  faceapi.nets.ssdMobilenetv1.loadFromUri('../weights').then(function(modelLoadRes) {
    faceapi.nets.faceLandmark68Net.loadFromUri('../weights').then(function(modelLoadRes) {
      faceapi.nets.faceRecognitionNet.loadFromUri('../weights').then(function(modelLoadRes) {
        console.info('Models and weights are loaded.')
      });
    });
  });

  /*-----------------------------------
  * START PROCESSING AFTER SAVE
  *-----------------------------------*/
  $('#take-snapshot').click(function() {
    $('#processing').show();
    var savedImage = document.getElementById('my_result').firstChild
    faceapi.detectAllFaces(savedImage).withFaceLandmarks().withFaceDescriptors().then(function(res) {
      console.log('res', res)
      var faceDataFromDB = JSON.parse(sessionStorage.getItem('userCreds=pablo'));
      console.log('faceDataFromDB', faceDataFromDB);
      faceDataFromDB['data'][0]['descriptor'] = new Float32Array(Object.values(faceDataFromDB['data'][0]['descriptor']));
      
      const labeledDescriptors = [
        new faceapi.LabeledFaceDescriptors(
          faceDataFromDB['username'],
          [faceDataFromDB['data'][0]['descriptor']]
        )
      ]
      var faceMatcher = new faceapi.FaceMatcher(labeledDescriptors)
      console.log('faceMatcher', faceMatcher)
      var bestMatch = faceMatcher.findBestMatch(res[0]['descriptor'])


      console.log(bestMatch)
      $('#processing').hide();
      $('#your-username').show();
      $('#your-username-text').text(bestMatch['label'] + '!');
    });
  });
  
});