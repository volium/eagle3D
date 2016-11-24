$(document).ready(function () {
    $('[data-toggle=offcanvas]').click(function () {
        $('.row-offcanvas').toggleClass('active')
    });

    $('[data-toggle=tooltip]').tooltip();

    $('a[data-request-confirm=true]').click(function(e){
        e.preventDefault();

        var that = this;

        $.prompt($(this).data('confirm-messagge'), {
            submit: function(e,v,m,f){
                if(v) location = $(that).attr('href');
            }
        });

        return false;
    });
});