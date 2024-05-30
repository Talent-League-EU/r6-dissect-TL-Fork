$(document).ready(function() {
    i18next.init({
      lng: 'en',  // default language
      backend: {
        loadPath: '/locales/{{lng}}/translation.json'
      }
    }, function(err, t) {
      if (err) return console.error('i18next initialization error:', err);
      jqueryI18next.init(i18next, $);
      $('body').localize(); // This localizes the body after i18next is ready
    });
});
  