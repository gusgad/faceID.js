$(function () {
  "use strict";

  /*-----------------------------------
   * DEFAULT STATES
   *-----------------------------------*/
  $('#processing').hide();
  $('#your-username').hide();
  $('.reload').hide()

  /*-----------------------------------
   * NAVBAR CLOSE ON CLICK
   *-----------------------------------*/

  $('.navbar-nav > li:not(.dropdown) > a').on('click', function () {
    $('.navbar-collapse').collapse('hide');
  });
  /*-----------------
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
  *   HELPERS
  *-----------------------------------*/
  function getBase64Image(img) {
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    var dataURL = canvas.toDataURL("image/png");

    return dataURL;
  }

  // reloads the page when "try again" is clicked
  $('.reload').on('click', function() {
    location.reload();
  });

  // get all elements from sessionStorage aka our database
  function allStorage() {
    var values = Object.assign({}, sessionStorage)
    return values;
  };

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
    $('html,body').animate({ scrollTop: document.body.scrollHeight }, 800);
    var storageKeys = allStorage();

    $('#processing').show();
    var savedImage = document.getElementById('my_result').firstChild
    faceapi.detectAllFaces(savedImage).withFaceLandmarks().withFaceDescriptors().then(function(res) {
      if (res.length > 0) {
        var labelledStorageKeys = Object.values(storageKeys)
        // filter the storage and take only faceID.js related objects
        .filter(function(storageKey) {
          storageKey = JSON.parse(storageKey);
          if (storageKey.hasOwnProperty('username') && storageKey.hasOwnProperty('data')) {
            return true;
          }
        })
        .map(function(storageKey) {
          return JSON.parse(storageKey);
        });

        // get all objects that were in the sessionStorage and map them into descriptors
        var labelledDescriptors = labelledStorageKeys
        .map(function(storageKey) {
          var descriptor = new Float32Array(Object.values(storageKey['data'][0]['descriptor']));
          return new faceapi.LabeledFaceDescriptors(
            storageKey['username'],
            [descriptor]
          );
        });

        // LEVEL 1 - find the best match by comparing current landmarks to the ones from sessionStorage
        var faceMatcher = new faceapi.FaceMatcher(labelledDescriptors)
        var bestMatch = faceMatcher.findBestMatch(res[0]['descriptor'])

        // LEVEL 2 - process the perceptual hash (http://www.hackerfactor.com/blog/index.php?/archives/432-Looks-Like-It.html)
        var bestMatchLabel = bestMatch['label'];
        var bestMatchedDescriptor = labelledStorageKeys.find(function(labelledStorageKey) {
          return labelledStorageKey['username'] === bestMatchLabel
        })
        if (savedImage) {
          var simiScore = simi.compare(savedImage, bestMatchedDescriptor.img);
          console.log('simiScore', simiScore)
          // if the score is high enough, we can proceed
          if (simiScore > 0.010) {
            savedImage.width = 300;
            savedImage.height = 220;

            var bestImg = new Image();
            bestImg.src = bestMatchedDescriptor.img;
            bestImg.width = 300;
            bestImg.height = 220;

            // LEVEL 3 - The Structural Similarity Index (SSIM)
            ssim(getBase64Image(savedImage), getBase64Image(bestImg))
            .then(function(out) {
              console.log('SSIM:', out.mssim);
              if (out.mssim > 0.00010) {
                console.log(bestMatch)
                $('#processing').hide();
                $('#your-username').show();
                $('#your-username-header').show();
                $('#your-username-text').text(bestMatch['label'] + '!');
                $('#take-snapshot').hide();
                $('.reload').show();
              } else {
                hideOnError();
                console.log('LEVEL 3 - not passed');
              }
            })
            .catch(function(err) {
              console.error('Error generating SSIM', err);
              hideOnError();
            });
            
          } else {
            hideOnError();
            console.log('LEVEL 2 - not passed');
          }
        } else {
          hideOnError();
          console.log('LEVEL 1 - not passed');
        }
      } else {
        hideOnError();
      }
      
    });
  });

  function hideOnError() {
    $('#processing').hide();
    $('#your-username').show();
    $('#your-username-header').hide();
    $('#your-username-undertext').hide();
    $('#your-username-text').text(`We were not able to find a match, 
    please try again or register with a better picture of yourself.`);
    $('#take-snapshot').hide();
    $('.reload').show();
    return false;
  };
  
});