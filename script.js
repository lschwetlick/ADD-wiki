var out;

$( document ).ready(function() {
	var pageids = [];
	$( "form#wiki" ).submit(function( event ) {
		event.preventDefault();
		var start_article = $(this).find("input[type=text]").val();
		console.log( "Start: ", start_article );
		pageids = [];
		$('#articles').empty();
		getWikiSentence(start_article);
	});

	/* Returns the query URL for the Wikipedia API of a given page */
	function wikiApiUrl(page) {
		var wiki_api_base = "https://en.wikipedia.org/w/api.php?"
		params = {
			action: "parse",
			format: "json",
			page: page,
			redirects: 1,
			prop: "text",
			section: 0,
			disablelimitreport: 1,
			disableeditsection: 1,
			disabletoc: 1,
			noimages: 1
		}
		/* "callback=?" makes jquery pick a custom name for the callback.
		JQuery then knows to set the datatype to JSONP.
		The server wraps the requested JSON in a function call with the callback's name.*/
		return wiki_api_base + $.param(params) + "&callback=?";
	}

	/* Returns a parsed structure queryable with JQuery from an HTML string */
	function parseToDOM(html_string) {
		return $($.parseHTML('<div>' + html_string + '</div>'));
	}

	/* Return HTML without elements that should not be rendered */
	function cleanWikiHTML(html_string) {
		temp_dom = parseToDOM(html_string);
		temp_dom = temp_dom.children('p');
		// Remove References of the form '[1]''
		temp_dom.children('sup').remove();
		// The box showing coordinates is part of the main html
		temp_dom.find('span#coordinates').remove();
		var html = '';
		temp_dom.each(function() { html += $(this).html() + ' '; });
		return html
	}

	function getWikiSentence(page_title){
		query_url = wikiApiUrl(page_title);
		console.log(query_url);
		$.getJSON( query_url )
			.done(function(data) {
				console.log("GET success");
				var html = cleanWikiHTML(data.parse.text["*"]);
				var divider = '</a>.';
				split = html.split(divider);
				if ( split.length == 1 ) {
					divider = '</a>).';
					split = html.split(divider);
					if ( split.length == 1 ) {
						console.log('No link at the end of a sentence found.')
						return
					}
				}
				console.log(split[0]);
				var sentence = parseToDOM(split[0] + divider);
				var last_a = sentence.children('a:last');

				var next_entry = last_a.attr('href').split('/wiki/')[1];
				var next_entry_title = last_a.attr('title');
				console.log('Next: ', next_entry_title);
				var current_pageid = data.parse.pageid;
				if ( pageids.indexOf(current_pageid) > -1 ) {
					console.log('Repition detected.')
					return
				}
				// TODO checkbox
				var include_markup = true;
				if ( include_markup ) {
					sentence = sentence.html();
				} else {
					sentence = sentence.text();
				}
				$('#articles').append($('<p>').html(sentence));
				pageids.push(current_pageid);
				getWikiSentence(next_entry_title);
			})
			.fail(function() {
				console.log("Error: ", query);
			});
	}
});

