Scour.Global.defineRole('MooSelect',{

  onLoad : function(element,options) {
    options = options.getJSON();
    if(options.url) {
      new MooSelect.Remote(element,options);
    }
    else {
      new MooSelect(element,options);
    }
  },

  onCleanup : function(element) {
    var moo = element.retrieve('MooSelect');
    if(moo) {
      moo.destroy();
    }
  }

});
