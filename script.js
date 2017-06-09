$( document ).ready(function() {
	var $output = $('#articles');
	var $outputElement = $('#articles');
	var pageids = [];

	/* Setup button handler */
	$("form#wiki").submit(function( event ) {
		event.preventDefault();
		var start_article = $(this).find("input[type=search]").val();
		ADD_LEVEL = $(this).find("input[type=range]").val()
		console.log("Start: ", start_article);
		console.log("ADD level", ADD_LEVEL)
		// Reset
		pageids = [];
		$output.empty();
		// Start
		getWikiSentence(start_article);
	});

	/* Returns the query URL for the Wikipedia API of a given page */
	function wikiApiFirstSectionUrl(page) {
		var wiki_api_base = "https://en.wikipedia.org/w/api.php?"
		params = {
			action: "parse",
			format: "json",
			// Prevent double encode, page is already urlencoded
			page: decodeURI(page),
			redirects: 1,
			prop: "text",
			section: 0,
			disableeditsection: 1,
			disabletoc: 1,
			noimages: 1
		}
		/* "callback=?" makes jquery pick a custom name for the callback.
		JQuery then knows to set the datatype to JSONP.
		The server wraps the requested JSON in a function call with the callback's name.*/
		return wiki_api_base + $.param(params) + "&callback=?";
	}

	//TODO deduplicate
	/* Returns the query URL for the Wikipedia API of a given page's categories */
	function wikiApiCategoriesUrl(page) {
		var wiki_api_base = "https://en.wikipedia.org/w/api.php?"
		params = {
			action: "parse",
			format: "json",
			// Prevent double encode, page is already urlencoded
			page: decodeURI(page),
			redirects: 1,
			prop: "categories",
			//disablelimitreport: 1, //increases response times drastically
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
		//TODO this breaks on "Magic"
		//temp_dom = temp_dom.children('p, ul, ol').first().nextUntil('h2', 'p, ul, ol');
		// The response comes wrapped in a 'mw-parser-output' div...
		temp_dom = temp_dom.children('div.mw-parser-output').children('p, ul, ol:not(.references)');

		// Remove References of the form '[1]''
		// temp_dom.children('sup').remove();
		temp_dom.find('sup').remove();
		// Remove citations
		temp_dom.children('.references').remove();
		// temp_dom.find('.references').remove();
		
		// Trying to get rid of references that did not get removed in the children -> references.
		// Sometimes the wiki is badly formatted like "Eastern Mediterranean"
		temp_dom.find('span.reference-text').remove(); 
		// The box showing coordinates is part of the main html
		temp_dom.find('span#coordinates').remove();
		// Remove links to pronunciation audio
		temp_dom.find('span.noexcerpt').remove();
		// Remove cite error that API returns
		temp_dom.find('span.mw-ext-cite-error').remove();
		// Remove images
		temp_dom.find('img').remove();
		// Remove audiolink help
		temp_dom.find('small.metadata').remove();
		var html = '';
		temp_dom.each(function() { html += $(this).prop('outerHTML'); });
		console.log('Cleaned HTMl length:', html.length);
		return html
	}

	/* Returns a text up to a sentence that ends with an <a> tag */
	function parseForSentence(html_string) {
		// ADD_LEVEL = 3;

		if (ADD_LEVEL==1){
        	var dividers = ['.', ').', ';', ');', '!', ')!', '?', ')?', '</li>']; // wont this ignore instances of ";" or "!" even if they come before the first "."???
			// Old fashioned iteration. [].forEach does not support breaking 
			// out of the loop, see
			// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
			for(var i = 0; i < dividers.length; i++) {
				var divider = '</a>' + dividers[i];
				var split = html_string.split(divider);	
				if ( split.length > 1 ) {
					//TODO make "ADD-level" configurable, e.g. use last possible link
					// true: Continue, sentence has a link at the end
					return [split[0] + divider, true]
				}
			}
		}
		else if (ADD_LEVEL==3){
			
			var divider = '</a>'
			var split = html_string.split(divider);
			if ( split.length > 1 ) {
				return [split[0] + divider + '&mdash;', true]
			}
			
		}
		else if (ADD_LEVEL==2){
			var first_divider = '</b>';
			var i = html_string.indexOf(first_divider) + first_divider.length;
			var constant_part = html_string.substring(0, i); 
			var split_part = html_string.substring(i, html_string.length);
			console.log(split_part);
			var divider = '</a>'
			var split = split_part.split(divider);
			if ( split.length > 1 ) {
				return [constant_part + split[0] + divider + '&mdash;', true]
			}
			
		}
		console.log('No next wiki page');
	// 	false: No link could be found. No next wiki page available
		return [html_string, false]     	
	} 
	// 	var dividers = ['.', ').', ';', ');', '!', ')!', '?', ')?', '</li>']; // wont this ignore instances of ";" or "!" even if they come before the first "."???
	// 	// Old fashioned iteration. [].forEach does not support breaking 
	// 	// out of the loop, see
	// 	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
	// 	for(var i = 0; i < dividers.length; i++) {
	// 		var divider = '</a>' + dividers[i];
	// 		var split = html_string.split(divider);	
	// 		console.log(split)
	// 		if ( split.length > 1 ) {
	// 			//TODO make "ADD-level" configurable, e.g. use last possible link
	// 			// true: Continue, sentence has a link at the end
	// 			return [split[0] + divider, true]
	// 		}
	// 	}
	// 	console.log('No next wiki page');
	// 	// false: No link could be found. No next wiki page available
	// 	return [html_string, false]
	// }

	/* Return the name of the page linked to from the last <a> tag */
	function getNextEntryName(sentence_dom) {
		//TODO use first link and cut of the sentence to make it properly ADD.
		var last_a = sentence_dom.find('a:last');
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

	function getFirstHref(html_string) {
		var dom = parseToDOM(cleanWikiHTML(html_string));
		var first_a = dom.find('a:first');
		var next_entry = first_a.attr('href').split('/wiki/')[1];
		console.log('Next: ', first_a.attr('title'));
		return next_entry
	}

	function getWikiSentence(page_title){
		var cat_query_url = wikiApiCategoriesUrl(page_title);
		var cat_query = $.getCachedJSON( cat_query_url, 100 );
		cat_query.fail(function() { console.log("Error: ", cat_query_url); });
		var text_query_url = wikiApiFirstSectionUrl(page_title);
		var text_query = $.getCachedJSON( text_query_url, 100 );
		text_query.fail(function() { console.log("Error: ", text_query_url); });
		
		$.when( cat_query, text_query ).done( function(cat_resp, text_resp){
			//var [cat_data, cat_status, cat_jqXHR] = cat_resp;
			var cat_data = cat_resp[0];
			//var [text_data, text_status, text_jqXHR] = text_resp;
			var text_data = text_resp[0];
			var pageid = cat_data.parse.pageid;
			var section_text = text_data.parse.text["*"];
			console.assert(pageid == text_data.parse.pageid, pageid, text_data.parse.pageid);
			if ( isRepetition(pageid) ) { return }
			var categories = cat_data.parse.categories;
			var isDis = categories.some(function(e){
				return e["*"].toLowerCase().indexOf('disambiguation') > -1 
			});
			if ( isDis ) {
				console.log('Disambiguation page found: ', cat_data.parse.title);
				getWikiSentence(getFirstHref(section_text));
			} else {
				var html = cleanWikiHTML(section_text);
				//TODO Do not return next_entry_available here, make getNextEntryName check
				var [sentence, next_entry_available] = parseForSentence(html);
				var sentence_dom = parseToDOM(sentence);
				// TODO checkbox for include_markup
				appendSentences(sentence_dom, true);
				if ( !next_entry_available ) { return }
				var next_page = getNextEntryName(sentence_dom);
				getWikiSentence(next_page);
			}
		}); //done
	} //getWikiSentence
}); //document.ready
