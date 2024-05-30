// public/js/app.js
$(document).ready(function() {
    $('#test-all').click(function() {
      $.post('/api/endpoint', function(data) {
        $('#responseBody').text(data);
        $('#responseModal').modal('show');
      });
    });
  });
  