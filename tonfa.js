(function(){

	var updateControlBindings = function(data){
		$.extend(this.options, data);
		this.on();
	}

	can.Control._inherit = can.Construct._inherit;

	var Tonfa = {};
	Tonfa.App = can.Control({
		defaults : {
			initPageId : "home"
		}
	}, {
		init : function(){
			this._pageData = {};
		},
		" mobileinit" : function(){
			this._appEl = this.element.find('#app-wrapper');
			this.page(this.options.initPageId);

			$.mobile.pageContainer        = this._appEl;
			$.mobile.firstPage            = this.element.find('#' + this.options.initPageId);
			$.mobile.ajaxEnabled          = false;
			$.mobile.pushStateEnabled     = false;
			$.mobile.hashListeningEnabled = false;
			$.mobile.linkBindingEnabled   = false;
		},
		" pagebeforechange" : function(el, ev, page){
			if(typeof this.beforeFilter !== 'undefined'){
				this.beforeFilter(page);
			}
			var id;
			if(typeof page.toPage === 'string'){
				id = page.toPage;
			} else if(typeof page.toPage === 'undefined') {
				id = this.options.initPageId;
			} else {
				id = page.toPage.attr('id');
			}
			if(this._lastPage != id){
				this.page(id);
				this.pageController(id, page.options._controllerData || {});
				this._lastPage = id;
				delete page.options._controllerData;
			}
			page.toPage = $('#' + id);
			if(page.toPage.length === 0){
				throw "Div with id '" + id + "' doesn't exist in the document!";
			}
		},
		":page route" : function(data){
			this.changePage(can.route.attr('page'));
		},
		changePage : function(page){
			$.mobile.changePage(page, (this._pageData[location.hash] || {}));
			delete this._pageData[location.hash];
		},
		goTo : function(url, data, opts){
			this._pageData[url] = $.extend((opts || {}), {_controllerData: (data || {})});
			window.location.hash = url;
		},
		page : function(id){
			if(this.element.find('#' + id).length === 0){
				if($('#' + id + 'EJS').length > 0){
					this._appEl.append(can.view(id + "EJS"));
				} else if (typeof window[can.capitalize(id)] !== 'undefined'){
					this._appEl.append("<div data-role='page' id='" + id + "'></div>");
				}
			}
		},
		pageController : function(id, data){
			var el = this.element.find('#' + id);
			var controller = can.capitalize(id);
			if(window[controller]){
				if(el.hasClass(id + 'Controller')){
					var control = el.data().controls[0];
					if(control){
						updateControlBindings.call(control, data)
						if(control.update){
							control.update();
							if(control.options.refreshOnUpdate){
								control.refresh();
							}
						}
					}
				} else {
					$.extend(data, {_app: this});
					new window[controller](el, data);
					el.addClass(id + 'Controller');
				}
			}
		},
		"a click" : function(el, ev){
			if( el.is( ":jqmData(rel='back')" ) ) {
				ev.stopPropagation();
				ev.preventDefault();
				ev.stopImmediatePropagation();
				window.history.back();
			}
		},
		"a vclick" : function(el, ev){
			if ( !el.jqmHijackable().length ) {
				return;
			}
			this.removeActiveLinkClass();
			this._activeClickedLink = el.closest( ".ui-btn" ).not( ".ui-disabled" );
			this._activeClickedLink.addClass( $.mobile.activeBtnClass );
			$( "." + $.mobile.activePageClass + " .ui-btn" ).not( el ).blur();
		},
		removeActiveLinkClass : function(force){
			if( !!this._activeClickedLink && ( !this._activeClickedLink.closest( '.ui-page-active' ).length || force ) ) {
				this._activeClickedLink.removeClass( $.mobile.activeBtnClass );
			}
			delete this._activeClickedLink
		}
	});



	Tonfa.Page = can.Control({
		defaults: {
			refreshOnUpdate : true
		}
	},{
		refresh : function(){
			if(this.element.data().page){
				this.element.trigger('pagecreate');
			}
		},
		goTo : function(page, data, opts){
			this.options._app.goTo(page, data, opts);
		},
		when : function(deferreds, cb){
			var self = this;
			$.when.apply($, deferreds).then(function(){
				var args = []
				for(var i = 0; i < arguments.length; i++){
					args.push(arguments[i][0]);
				}
				self[cb].apply(self, args);
			});
		}
	});


	can.EJS.Helpers.prototype.listview = function(list){
		return function(el){
			var $el = $(el);
			$el.attr('data-role', 'listview');
			list.bind('change', function(){
				$el.listview('refresh', true);
			});
		}
	}

	window.Tonfa = Tonfa;

})();