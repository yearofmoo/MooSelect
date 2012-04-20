(function($) {

if(Form && Form.Validator && Form.Validator.add) {

  Form.Validator.add('validate-mooselect',{
    errorMsg : Locale.get('FormValidator.required'),
    test : function(select) {
      return select.retrieve('MooSelect').hasSelectedValue();
    }
  });

  Class.refactor(Form.Validator,{

    initialize : function(form,options) {
      this.previous(form,options);
      this.setupMooSelectEvents();
    },

    setupMooSelectEvents : function() {
      this.addEvents({
        'elementFail':function(elm,array) {
          if(elm.hasClass('validate-mooselect')) {
            this.onInvalidMooSelect(elm);
          }
        }.bind(this),
        'elementPass':function(elm,array) {
          if(elm.hasClass('validate-mooselect')) {
            this.onValidMooSelect(elm);
          }
        }.bind(this)
      });
    },

    validateField : function(field,force) {
      var former = this.options.ignoreHidden;
      this.options.ignoreHidden = false;
      var result = this.previous(field,force);
      this.options.ignoreHidden = former;
      return result;
    },

    onValidMooSelect : function(element) {
      var moo = element.retrieve('MooSelect');
      var container = moo.getContainer();
      container.addClass('validation-passed');
      container.removeClass('validation-failed');
    },

    onInvalidMooSelect : function(element) {
      var moo = element.retrieve('MooSelect');
      var container = moo.getContainer();
      container.addClass('validation-failed');
      container.removeClass('validation-passed');
    }

  });

}

})(document.id);
