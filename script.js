$( document ).ready(function() {
	var $form = $("form#wiki");
	var $output = $('#articles');
	var $outputElement = $('<p>');
	var pageids = [];

	/* Setup button handler */
	$form.submit(function( event ) {
		event.preventDefault();
		var start_article = $(this).find("input[type=text]").val();
		console.log( "Start: ", start_article );
		pageids = [];
		$output.empty();
		getWikiSentence(start_article);
	});

	/* Returns the query URL for the Wikipedia API of a given page */
	function wikiApiUrl(page) {
		var wiki_api_base = "https://en.wikipedia.org/w/api.php?"
		params = {
			action: "parse",
			format: "json",
			// Prevent double encode, page is already urlencoded
			page: decodeURI(page),
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
		// http://stackoverflow.com/questions/15403600
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
		// Remove links to pronunciation audio
		temp_dom.find('span.noexcerpt').remove();
		var html = '';
		temp_dom.each(function() { html += $(this).html() + ' '; });
		return html
	}

	/* Returns a text up to a sentence that ends with an <a> tag */
	function parseForSentence(html_string) {
		var divider = '</a>.';
		split = html_string.split(divider);
		if ( split.length == 1 ) {
			divider = '</a>).';
			split = html_string.split(divider);
			if ( split.length == 1 ) {
				divider = '</a>;';
				split = html_string.split(divider);
				if ( split.length == 1 ) {
					console.log('No link at the end of a sentence found.')
					// false: No next wiki page available
					return [split[0], false];
				}
			}
		}
		//TODO make "ADD-level" configurable, e.g. use last possible link
		// true: Continue, sentence has a link at the end
		return [split[0] + divider, true];
	}

	/* Return the name of the page linked to from the last <a> tag */
	function getNextEntryName(sentence_dom) {
		//TODO use first link and cut of the sentence to make it properly ADD.
		var last_a = sentence_dom.children('a:last');
		var next_entry = last_a.attr('href').split('/wiki/')[1];
		console.log('Next: ', last_a.attr('title'));
		return next_entry
	}

	/* Append text to the page */
	function appendSentences(sentence_dom, include_markup) {
		if ( include_markup ) {
			sentence = sentence_dom.html();
		} else {
			sentence = sentence_dom.text();
		}
		$output.append(
			$outputElement.clone().html(sentence)
		);
	}

	/* Return whether the id was already queried, also stores passed ids */
	function isRepetition(page_id) {
		if ( pageids.indexOf(page_id) > -1 ) {
			console.log('Repetition detected.');
			return true
		}
		pageids.push(page_id);
		return false
	}

	function getWikiSentence(page_title){
		var query_url = wikiApiUrl(page_title);
		console.log(query_url);
		//TODO save API results to localStorage for caching
		$.getJSON( query_url )
			.done(function(data){
				if ( isRepetition(data.parse.pageid) ) { return }
				var html = cleanWikiHTML(data.parse.text["*"]);
				var [sentence, next_entry_available] = parseForSentence(html);
				var sentence_dom = parseToDOM(sentence);
				// TODO checkbox for include_markup
				appendSentences(sentence_dom, true);
				if ( !next_entry_available ) { return }
				var next_entry = getNextEntryName(sentence_dom);
				getWikiSentence(next_entry);
			})
			.fail(function() { console.log("Error: ", query_url); });
	}
});

