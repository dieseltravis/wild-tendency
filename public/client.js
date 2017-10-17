// client-side js
// run by the browser each time your view template is loaded

// by default, you've got jQuery,
// add other scripts at the bottom of index.html

$(function() {
  var $input = $("input");
  var $dreams = $("#hopes");
  
  var getDreams = function () {
    $.get("/dreams", function getDreams (dreams) {
      var html = "";
      dreams.forEach(function eachDream (dream) {
        html += `<b style="background-image: url('${dream.img}');">${dream.artist}</b>`;
      });
      $dreams.html(html);
    });
  };

  $("form").submit(function submitForm (ev) {
    ev.preventDefault();
    
    var dream = $input.val();
    $.post("/dreams?" + $.param({ dream: dream }), function postDream () {
      $input.val("");
      $input.focus();
      
      getDreams();
    });
  });

  getDreams();
});
