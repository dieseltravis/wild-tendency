// client-side js
// run by the browser each time your view template is loaded

// by default, you've got jQuery,
// add other scripts at the bottom of index.html

$(function() {
  var $input = $("input"),
      $hello = $("#hello");
  //var $dreams = $("#hopes");
  
  /*
  var getDreams = function () {
    $.get("/dreams", function getDreams (dreams) {
      var html = "";
      dreams.forEach(function eachDream (dream) {
        html += `<b style="background-image: url('${dream.img}');">${dream.artist}</b>`;
      });
      $dreams.html(html);
    });
  };
  */

  $("form").submit(function submitForm (ev) {
    ev.preventDefault();
    
    var dream = $input.val();
    $hello.html("<blink>loading...</blink>");
    
    $.post("/dreams?" + $.param({ dream: dream }), function postDream () {
      //$input.val("");
      //$input.focus();
      $hello.html("<img src='/hello?" + Math.random() + ".jpg' />");
      //getDreams();
    }).fail(function(err) {
      console.info("error: ", err);
    }).always(function() {
      console.log("finished.");
    });
  });

  //getDreams();
});
