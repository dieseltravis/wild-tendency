$(function() {
  var $input = $("input"),
      $hello = $("#hello");

  $("form").submit(function submitForm (ev) {
    ev.preventDefault();
    
    var dream = $input.val();
    $hello.html("<blink>loading...</blink>");
    
    $.post("/dreams?" + $.param({ dream: dream }), function postDream () {
      var helloImgUrl = "/hello?l=" + dream + "&r=" + Math.random() + ".jpg";
      $hello.html("<a href='" + helloImgUrl + "'><img src='" + helloImgUrl + "' /></a>");
    }).fail(function(err) {
      $hello.html("uh oh, something broke, check the console...");
      console.info("error: ", err);
    }).always(function() {
      console.log("finished.");
    });
  });
});