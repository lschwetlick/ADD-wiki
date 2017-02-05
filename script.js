var out;

$( document ).ready(function() {
	$( "form#wiki" ).submit(function( event ) {
		event.preventDefault();
		var start_article = $(this).find("input[type=text]").val();
		console.log( "Start: ", start_article );
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

	function getWikiSentence(page_title){
		$.getJSON( wikiApiUrl(page_title) )
			.done(function(data) {
				console.log("GET success");
				out = parseToDOM(data.parse.text["*"]);

				out.find('p').children('sup').remove();
				html = '';
				out.find('p').each(function() { html += $(this).html() + ' '; });
				split = html.split('</a>.');
				if ( split.length == 1 ) {
					console.log('No link at the end of a sentence found.')
					return
				}
				var sentence = parseToDOM(split[0] + '</a>.');
				var last_a = sentence.find('a:last');

				var next_entry = last_a.attr('href').split('/wiki/')[1];
				var next_entry_title = last_a.attr('title');
				console.log('Next: ', next_entry_title);
				$('#content').text(sentence.text());
			})
			.fail(function() {
				console.log("Error: ", query);
			});
	}
});

