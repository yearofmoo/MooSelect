(function($) {

MooSelect.Remote = new Class({

  Extends : MooSelect,

  options : {
    filterResults : false,
    hideResultsWhenSearching : true,
    mergeResults : false,
    cache : true,
    minSearchLength : 3,

    messages : {
      loading : Locale.get('MooSelect.messages.loading'),
      minSearch : Locale.get('MooSelect.messages.minSearch')
    }
  },

  initialize : function(element,options) {
    options = options || {};
    options.disableSearcher = false;
    options.remoteOptions = options.remoteOptions || {};
    if(options.url) {
      options.remoteOptions.url = options.url;
      delete options.url;
    }

    Object.append(options.remoteOptions,{
      minSearchLength : this.options.minSearchLength,
      filterResults : this.options.filterResults,
      hideResultsWhenSearching : this.options.hideResultsWhenSearching,
      mergeResults : this.options.mergeResults,
      cache : this.options.cache
    });

    this.parent(element,options);
  },

  onResponse : function() {
    this.hideMessage();
  },

  hideMessage : function() {
    this.getMessage().hide();
  },

  onLoading : function() {
    var message = this.getMessage();
    message.setType('loading');
    message.setText(this.options.messages.loading);
    message.show();
  },

  onMinSearch : function() {
    if(this.options.messages.minSearch && !this.getResults().hasResults()) {
      var message = this.getMessage();
      var text = this.options.messages.minSearch;
      text = text.replace('%(MIN)',this.options.minSearchLength);
      message.setType('min');
      message.setText(text);
      message.show();
    }
  },

  show : function() {
    this.parent();
    this.onMinSearch();
  },

  buildResults : function() {
    this.parent();
    this.getResults().addEvents({
      'loading':this.onLoading.bind(this),
      'requestComplete':this.onResponse.bind(this),
      'results':this.hideMessage.bind(this),
      'minSearch':this.onMinSearch.bind(this)
    });
  },

  buildResultsObject : function(options) {
    options = options || {};
    Object.append(options,this.options.remoteOptions);
    options.classPrefix = this.options.classPrefix;
    options.globalClassName = this.options.globalClassName;
    options.globalClassPrefix = this.options.globalClassPrefix;
    var object = new MooSelect.Results.Remote(options);
    object.performFinalSearchResultsFilter = this.filterResultsWithStageResults.bind(this);
    return object;
  },

  filterResultsWithStageResults : function(values) {
    var stage = this.getStage();

    var results = [];
    values.each(function(value) {
      if(value.group) {
        var group = Object.clone(value);
        group.results = [];
        for(var i=0;i<value.results.length;i++) {
          var v = value.results[i];
          if(!stage.hasResult(v.value)) {
            group.results.push(v);
          }
        }
        if(group.results.length > 0) {
          results.push(group);
        }
      }
      else if(!stage.hasResult(value.value)) {
        results.push(value);
      }
    });

    return results;
  },

  setSelectedInputValue : function(value) {
    var options = this.getInput().getElements('option').map(function(option) {
      return option.value;
    });
    if(options.indexOf(value)==-1) {
      this.registerNewInputOptions([value]);
    }
    this.parent(value);
  }

});

})(document.id);
