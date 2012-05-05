(function(){

	Models = {};

	var loggedInUser;

	Models.User = can.Model({
		findOne: function(user){
			var url = (typeof user === "undefined") ? "user" : "users/" + user;
			if(url === "user" && typeof loggedInUser !== 'undefined'){
				return loggedInUser;
			} else {
				var req =  $.ajax({
					dataType: 'jsonp',
					url : 'https://api.github.com/' + url
				})
				if(url === 'user'){
					loggedInUser = req;
				}
			}
			return req;
		},
		model : function(data){
			return can.Model.model.call(this, data.data);
		}
	}, {})

	Models.Issue = can.Model({
		findAll: function(params){
			var url;
			if(typeof params === 'undefined'){
				url = 'https://api.github.com/issues'
			} else {
				url = can.sub('https://api.github.com/repos/{owner}/{repo}/issues', params)
			}
			return $.ajax({
				dataType: 'jsonp',
				url : url,
				data: {
					state: 'open',
					sort: 'updated'
				}
			})
		},
		models : function(data){
			return can.Model.models.call(this, data.data);
		}
	}, {
		repoName : function(){
			return can.capitalize(this.url.split('/')[5]).replace(/-/g, ' ');
		},
		repoOwner : function(){
			return this.url.split('/')[4];
		},
		repo : function(){
			return this.url.split('/')[5];
		}
	})

	Models.Repo = can.Model({
		findAll: function(){
			return $.ajax({
				dataType: 'jsonp',
				url : 'https://api.github.com/user/repos'
			})
		},
		findOne : function(params){
			return $.ajax({
				dataType: 'jsonp',
				url : can.sub('https://api.github.com/repos/{owner}/{repo}', params)
			})
		},
		models : function(data){
			return can.Model.models.call(this, data.data);
		},
		model : function(data){
			return can.Model.model.call(this, data.data ? data.data : data);
		}
	}, {
		slug : function(){
			return this.url.split('/').splice(-1, 1);
		},
		owner : function(){
			return this.url.split('/').splice(-2, 1);
		}
	})

	var extractCode = function(hash) {
		var match = hash.match(/code=(\w+)/);
		return !!match && match[1];
	};

	Home = Tonfa.Page({
		defaults: {
			settings: {
				host: 'github.com',
				clientId: '818672ba28dfbd8a1c1f'
			}
		}
	},
	{
		init : function(){
			this.handleLogin();
		},
		update : function(){
			this.handleLogin();
		},
		handleLogin : function(){
			var code = extractCode(location.href);
			if(code){
				this.login(code);
			} else {
				this.showLoginButton();
			}
		},
		login : function(code){
			if(window.accessToken){
				this.goTo('dashboard');
				return;
			}
			var self = this;
			this.element.html(can.view('loggingInEJS'));
			$.get('login.php', {
				code: code
			}, function(data){
				if(data === ""){
					window.location.href = self.authUrl();
				} else {
					window.accessToken = data;
					$.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
						if(options.data){
							options.data += "&access_token="+data;
						} else {
							options.data = "access_token="+data;
						}
						
					});
					self.goTo('dashboard');
				}
				
			});
		},
		showLoginButton : function(){
			this.element.html(can.view('loginButtonEJS', {
				url: this.authUrl()
			}));
		},
		authUrl : function(){
			var authUrl = "https://" + this.options.settings.host + "/login/oauth/authorize";
			return authUrl + "?response_type=token" + "&client_id=" + this.options.settings.clientId;
		}
	});

	Dashboard = Tonfa.Page({}, {
		init : function(){
			this.when([Models.User.findOne(), Models.Issue.findAll()], 'render')
		},
		render : function(user, issues){
			this.element.html(can.view('dashboardDataEJS', {user: user, issues: issues}));
			this.refresh();
		},
		".issues a click" : function(el, ev){
			ev.preventDefault();
			var issue = el.closest('.issue').data().issue;
			this.goTo(el.attr('href'), {issue: issue});
		}
	})

	Repos = Tonfa.Page({}, {
		init : function(){
			this.when([Models.User.findOne(), Models.Repo.findAll()], 'render');
		},
		render : function(user, repos){
			this.element.html(can.view('reposDataEJS', {user: user, repos: repos}));
			this.refresh();
		},
		".repos a click" : function(el, ev){
			ev.preventDefault();
			var repo = el.closest('li').data().repo
			this.goTo(el.attr('href'), {repo: repo});
		}
	});

	Repo = Tonfa.Page({}, {
		init : function(){
			var repoData = { repo: can.route.attr('repo_slug'), owner: can.route.attr('repo_owner') }, 
					repo     = this.options.repo ? [this.options.repo] : Models.Repo.findOne(repoData);

			this.when([Models.User.findOne(), repo], 'render');
		},
		update : function(){
			var self = this;
			this.when([Models.User.findOne(), [this.options.repo]], 'render');
		},
		render : function(user, repo){
			this.repo = repo;
			this.element.html(can.view('repoDataEJS', {user: user, repo: this.repo}));
			this.refresh();
		},
		"a.issues click" : function(el, ev){
			ev.preventDefault();
			this.goTo(el.attr('href'), {repo: this.repo});
		}
	})

	Issues = Tonfa.Page({}, {
		init : function(){
			this.load();
		},
		update : function(){
			this.load();
		},
		load : function(){
			var repoData = { repo: can.route.attr('repo_slug'), owner: can.route.attr('repo_owner') }, 
					repo     = this.options.repo ? [this.options.repo] : Models.Repo.findOne(repoData);
			this.when([Models.User.findOne(), repo, Models.Issue.findAll(repoData)], 'render');
		},
		render : function(user, repo, issues){
			this.repo = repo;
			this.element.html(can.view('issuesDataEJS', {user: user, repo: repo, issues: issues}));
			this.refresh();
		},
		".issues a click" : function(el, ev){
			ev.preventDefault();
			var issue = el.closest('.issue').data().issue;
			this.goTo(el.attr('href'), {issue: issue, repo: this.repo});
		}
	})

	Issue = Tonfa.Page({}, {
		init: function(){
			this.load();
		},
		load : function(){
			var r = can.route,
					issueData = {
						owner  : r.attr('repo_owner'), 
						repo   : r.attr('repo_slug'), 
						number : r.attr('issue_number')
					},
					issue     = this.options.issue ? [this.options.issue] : Models.Issue.findOne(issueData),
					repo      = this.options.repo ? [this.options.repo] : Models.Repo.findOne(issueData)
			this.when([Models.User.findOne(), repo, issue], 'render');
		},
		render : function(user, repo, issue){
			this.element.html(can.view('issueDataEJS', {user: user, repo: repo, issue: issue}));
			this.refresh();
		}
	})


	App = Tonfa.App({}, {
		beforeFilter : function(page){
			if(!window.accessToken){
				page.toPage = $('#home');
			}
		},
		":page/:repo_owner/:repo_slug route" : function(){
			var page = can.route.attr('page');
			if(page === 'repos'){
				page = 'repo'
			}
			this.changePage(page)
		},
		"issue/:repo_owner/:repo_slug/:issue_number route" : function(){
			this.changePage('issue');
		}
	});


	new App($(document));
	
})();