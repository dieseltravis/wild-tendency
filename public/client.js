$(function() {
  var $input = $("input"),
      $hello = $("#hello");

  $("form").submit(function submitForm (ev) {
    ev.preventDefault();
    
    var dream = $input.val();
    $hello.html("<blink>loading...</blink>");
    
    $.post("/dreams?" + $.param({ dream: dream }), function postDream () {
      $hello.html("<img src='/hello?" + Math.random() + ".jpg' />");
    }).fail(function(err) {
      console.info("error: ", err);
    }).always(function() {
      console.log("finished.");
    });
  });
});