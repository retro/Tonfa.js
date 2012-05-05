# Tonfa.js

Tonfa.js is a small library (~150 lines of code) that glues CanJS and jQueryMobile together. Some of the features that it gives you:

## True routing

Tonfa.js disables jQueryMobile's url handling and replaces it with CanJS' more robust and powerful can.route.

## Passing objects between urls. 

You can "attach" some data to the url change and send it to another page. This is very useful when you have a list of items that is already loaded from the server and you want to pass one item to the detailed view. You can use it like this:

    Dashboard = Tonfa.Page({}, {
    	".issues a click" : function(el, ev){
    		ev.preventDefault();
    		var issue = el.closest('.issue').data().issue;
    		this.goTo(el.attr('href'), {issue: issue});
    	}
    })

`this.goTo` function will change the url of the page, but it will also "attach" some data to that url. Good thing about this is that it allows Tonfa.js to take care of handling the url and any transitions you might have, while giving you an option to pass some data. Data sent to the page will be passed as the options object to it's controller:

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

As you can see in the `load` function it tries to access issue from `this.options.issue` (issue passed as an option to the controller). If it doesn't exist it loads it from the server API. With this approach you can allow users to reload page and still load all relevant data, but you can also pass relevant data to this controller if you have it already loaded somewhere else.

## Sensible defaults

Tonfa.js has a concept of pages inherited from the jQueryMobile. It's default route works identically to the jQueryMobile's. It also provides a bit of plumbing for you:

For instance if user goes to the `#!/issues` url Tonfa.js will do the following:

1. Try to find template (in the script tag) with the id `issuesEJS` and append it to the page.
2. If that template doesn't exist it will check if `window.Issues` exists and if it does it will create a placeholder div.
3. Finally if window.Issues exist it will initialize it on the div that was added to the page.

This allows you to avoid writing boilerplate code and focus on your app.