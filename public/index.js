$(document).ready(function() {
    // This WILL work because we are listening on the 'document', 
    // for a click on an element with an ID of #test-element
    let loader = false
    $(document).on("click","#submit",function() {
        $("#submit").append('<div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div>');
        $("#submit").attr("disabled", "disabled");
    });

})