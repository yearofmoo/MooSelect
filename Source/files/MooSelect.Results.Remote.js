(function($) {

MooSelect.Results.Remote = new Class({

  Extends : MooSelect.Results,

  options : {
    url : null,
    requestSearchParam : 'q',
    requestClass : Request.JSON,
    requestOptions : {
      method : 'GET'
    },
    requestResponseHandler : null,
    cache : true
  },

  initialize : function(options) {
    this.parent(options);
    this._filter = this.filter.bind(this);
    this.filter = this.$filter.bind(this);
    this.clearCache();
    if(this.options.preloadSearch != null) {
      this.filter(this.options.preloadSearch,true);
    }
  },

  $filter : function(search,skipLength) {
    if(!this._filter) {
     this._filter = this.parent.bind(this);
    }
    search = search || '';
    var length = skipLength ? 0 : this.options.minSearchLength;
    if(search.length >= length) {
      this.searchText = search;
      var cache = this.getCachedResponse(search);
      if(cache) {
        this.onRequestSuccess.apply(this,cache);
      }
      else {
        var request = this.getRequester();
        request.cancel();
        request.options.url = this.prepareSearchURL(search);
        request.options.data = this.prepareSearchData(search);
        request.send();
      }
    }
    else {
      this.fireEvent('minSearch');
    }
  },

  prepareSearchData : function(text) {
    var data;
    var fn = this.options.dataPrepareFn;
    if(fn && typeOf(fn) == 'function') {
      data = fn(text);
    }
    else {
      data = {};
      var key = this.options.requestSearchParam;
      data[key] = text;
    }
    return data;
  },

  prepareSearchURL : function(search) {
    var url = this.getURL();
    var fn = this.options.urlPrepareFn;
    if(fn) {
      url = fn(url,search);
    }
    return url;
  },

  getCachedResponse : function(search) {
    return this.cache[search];
  },

  cacheResponse : function(search,args) {
    this.cache[search]=args;
  },

  clearCache : function() {
    this.cache = {};
  },

  getURL : function() {
    return this.options.url || this.options.requestOptions.url;
  },

  getRequester : function() {
    if(!this.requester) {
      var fn = this.options.requestResponseHandler;
      if(fn) {
        this.handleResponse = fn.bind(this);
      }

      var C = this.options.requestClass;
      var options = this.options.requestOptions || {};
      options.url = this.getURL();
      this.requester = new C(options);
      this.requester.addEvents({
        'success' : this.onRequestSuccess.bind(this),
        'request' : this.onRequestLoading.bind(this),
        'failure' : this.onRequestFailure.bind(this),
        'complete' : this.onRequestComplete.bind(this),
        'cancel' : this.onRequestCancel.bind(this)
      });
    }
    return this.requester;
  },

  getSearchText : function() {
    return this.searchText;
  },

  handleResponse : function(json) {
    return json;
  },

  onRequestCancel : function() {
    this.fireEvent('requestCancel');
  },

  onRequestComplete : function() {
    this.fireEvent('requestComplete');
  },

  onRequestFailure : function() {
    this.onRequestEmpty();
    this.fireEvent('requestFailure');
  },

  onRequestEmpty : function() {
    this.setResults([]);
    this.fireEvent('empty');
    this.fireEvent('requestEmpty');
  },

  onRequestLoading : function() {
    if(this.options.hideResultsWhenSearching) {
      this.hide();
    }
    this.fireEvent('loading');
    this.fireEvent('requestLoading');
  },

  sanitizeResult : function(result) {
    if(result.group) {
      result.results = result.results.map(this.sanitizeResult,this);
    }
    else {
      delete result.selected;
      result.text = result.text.trim();
      result.value = result.value.toString();
    }
    return result;
  },

  performFinalSearchResultsFilter : function(results) { //this method is meant to be overridden
    return results;
  },

  onRequestSuccess : function() {
    this.cacheResponse(this.getSearchText(),arguments);

    var results = this.handleResponse.apply(this,arguments) || [];
    results = results.map(this.sanitizeResult,this);
    results = this.performFinalSearchResultsFilter(results);

    if(!this.options.mergeResults) {
      this.results = null;
      this.getContainer().empty();
    }
    this.setResults(results);
    if(results.length == 0) {
      this.onRequestEmpty();
    }
    else {
      if(this.options.hideResultsWhenSearching) {
        this.show();
      }
      if(this.options.filterResults) {
        this._filter(this.getSearchText());
      }
      if(this.getTotalResults() > 0) {
        this.fireEvent('results');
      }
      this.hoverFirstResult();
      this.fireEvent('requestSuccess',[results,arguments]);
    }
  }

});

})(document.id);
