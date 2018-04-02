var stopNow=false;
function myFunction() {
    alert("aaah")
	var stopNow=true;
}

$( document ).ready(function() {
	var $output = $('#articles');
	var $outputElement = $('<p>');
	var $form = $("form#wiki");
	var $search = $form.find("input[type=search]");
	var $progress = $('#progress');
	var $scrollTopLink = $('#scrollTop');
	var pageids = [];
	var total_pageids=[];
	var add_level;

	/* Setup button handler */
	$form.submit(function( event ) {
		event.preventDefault();
		$('#submit-btn').prop('disabled', true);
		var start_article = $search.val();
		add_level = $(this).find("input[type=range]").val()
		console.log('Start: %c' + start_article, 'color: green');
		console.log("ADD level", add_level)
		setProgress(start_article);
		// Reset
		total_pageids.push(pageids);
		console.log("this pass id list:")
		console.log(pageids.length)
		console.log("total id list:")
		console.log(total_pageids.length)
		pageids = [];
		$output.empty();
		$scrollTopLink.hide();
		// Start
		minifyUI();
		// getWikiSentence(start_article.toLowerCase());
		getWikiSentence(start_article);
	});

	handleParams();

	// Enable click handler to work for elements that are created dynamically
	// Equivalent of deprecated .live()
	$output.on("click", "a.internal", function(event) {
		event.preventDefault();
		var query = $(this).attr('href').split('#')[1];
		handleParams(query);
	});
	$('#by').on("click", "a.internal", function(event) {
		event.preventDefault();
		handleParams($(this).attr('href'));
	});

	function minifyUI() {
		$('#header-container').animate({
			marginLeft: "20px",
			marginTop: "7px",
			fontSize: "10pt"
		});
		$('#header-container').addClass('minified');
		$('#logo-container').animate({
			width: "3em",
			marginLeft: "120px",
			marginTop: "10px"
		});
		$('#logo-container').addClass('minified');
		$('#settings-div').animate({
			marginTop: '-100px',
			paddingBottom: '20px'
		});
		// $('h1').animate({
		// 	fontSize: '0.9em'
		// });
		// // $('span').animate({
		// // 	fontSize: '1.2em'
		// // });
		// $('h2').animate({
		// 	fontSize: '0.4em'
		// });
	}

	function handleParams(param) {
		var query = param || window.location.hash.substr(1);
		console.log('query: ', query);
		if (!query) { return }
		$search.val(query.replace(/_/g,' '));
		$form.submit();
	}

	/* Returns the query URL for the Wikipedia API of a given page */
	function wikiApiFirstSectionUrl(page,escalateParagraph) {
		var wiki_api_base = "https://en.wikipedia.org/w/api.php?"
		params = {
			action: "parse",
			format: "json",
			// Prevent double encode, page is already urlencoded
			page: decodeURI(page),
			redirects: 1,
			prop: "text",
			section: escalateParagraph,
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
		//temp_dom = temp_dom.children('p, ul, ol').first().nextUntil('h2', 'p, ul, ol');
		// The response comes wrapped in a 'mw-parser-output' div...
		temp_dom = temp_dom.children('div.mw-parser-output').children('p, ul, ol:not(.references)');
        
		temp_dom.find('sup').remove();
        // Remove citations
        temp_dom.children('.references').remove();
        // I am trying to get rid of references that did not get removed in the children -> references.
        // Sometimes the wiki is badly formatted like "Eastern Mediterranean"
        // temp_dom.find('.references').remove();
        temp_dom.find('span.reference-text').remove();
        //Removes little listen buttons
        temp_dom.children('.metadata').remove();
        // The box showing coordinates is part of the main html
        temp_dom.find('span#coordinates').remove();
        // Remove links to pronunciation audio
        temp_dom.find('span.noexcerpt').remove();
        // Remove cite error that API returns
        temp_dom.find('span.mw-ext-cite-error').remove();



		var html = '';
		temp_dom.each(function() { html += $(this).prop('outerHTML'); });
		console.log('Cleaned HTMl length:', html.length);
		return html
	}

	/* Returns a text up to a sentence that ends with an <a> tag */
	function parseForSentence(html_string) {
		if (add_level == 1){
			// First link that ends a sentence
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
					console.log(split[0] + divider)

					var re= /<a.+title=\".+:.[^>]+\">/;
					if ( re.exec(split[0])!=null ){
						console.log("first link is Wiktionary or External. Ignoring")
						var cut_el0 = split[0].replace(re, '');
						var new_el1=cut_el0.concat(split[1]);
						split=[new_el1, split.slice(2)];
					}

					return [split[0] + divider, true]
				}
			}
		}
		else if (add_level == 3){
			// First link no matter what
			var divider = '</a>'
			var split = html_string.split(divider);
			if ( split.length > 1 ) {
				return [split[0] + divider + '&mdash;', true]
			}
		}
		else if (add_level == 2){
			// First link after subject
			var first_divider = '</b>';
			var i = html_string.indexOf(first_divider) + first_divider.length;
			var constant_part = html_string.substring(0, i); 
			var split_part = html_string.substring(i, html_string.length);	
			var divider = '</a>'
			var split = split_part.split(divider);

			var re= /<a.+title=\".+:.[^>]+\">/;
			if ( re.exec(split[0])!=null ){
				console.log("first link is Wiktionary or External. Ignoring")
				var cut_el0 = split[0].replace(re, '');
				var new_el1=cut_el0.concat(split[1]);
				split=[new_el1, split.slice(2)];
			}

			if ( split.length > 1 ) {
				return [constant_part + split[0] + divider + '&mdash;', true]
			}
			
		}
		console.log('No next wiki page');
		// false: No link could be found. No next wiki page available
		return [html_string, false]     	
	} 

	function removeFirstBracket(text) {
        // how close to the beginning does it have to be be deleted? Remember all the html markup is in there as well
        var chars_from_start = 500;
        if (text.substring(0, chars_from_start).indexOf('(') != -1) {
            console.log('Removing brackets');
            open_bracket_index = null;
            close_bracket_index = null;
            counter = 0;
            acounter = 0;
            for (i = 0; i < text.length; i++) {
                if (text[i] == '<' & text[i + 1] == 'a') {
                    acounter = acounter + 1
                } else if (text[i] == '/' & text[i + 1] == 'a' & text[i + 2] == '>') {
                    acounter = acounter - 1
                }

                if (acounter == 0) {
                    if (text[i] == '(') {
                        counter = counter + 1;
                        if (open_bracket_index == null) {
							if (text[i-1] ==' '){
								open_bracket_index = i-1;
							}else{
                            	open_bracket_index = i;
							}
                        }
                    } //if
                    else if (text[i] == ')') {
                        counter = counter - 1;
                        if (counter == 0) {
							// if(text[i+1]="<"){
                            close_bracket_index = i+1; 							
							// }else{
								// close_bracket_index = i + 2;//+1 is the bracket itself, +1 again for the space after it	
							// }
                            return text.slice(0, open_bracket_index) + text.slice(close_bracket_index);
                        }
                    } //else if
                } //if
            } //for
        } // if
        return text
    } //function

	/* Return the name of the page linked to from the last <a> tag */
	function getNextEntryName(sentence_dom) {
		var last_a = sentence_dom.find('a:last');
		var next_entry = last_a.attr('href').split('/wiki/')[1];
		var title = last_a.attr('title');
		console.log('Next: %c' + title, 'color: green');
		setProgress(title);
		return next_entry
	}

	/* Append text to the page */
	function appendSentences(dom, include_markup) {
		dom = dom.clone();
		dom.find('a').each(function() {
			// Don't link to Wikipedia help pages
			if ( $(this).attr('href').startsWith('/wiki/Help:') ) {
				$(this).replaceWith($(this).text());
			} else {
				$(this).attr('href', this.href.replace('/wiki/', '#'));
				$(this).addClass('internal');
			}
		});
		if ( include_markup ) {
			sentence = dom.html();
		} else {
			sentence = dom.text();
		}
		$output.append($outputElement.clone().html(sentence));
		// Scroll to new bottom of page
		$("html, body").animate({ scrollTop: $(document).height() }, 1);
	}

	function setProgress(title) {
		$progress.text('Looking up \'' + title + '\'...');
	}

	/* Return whether the id was already queried, also stores passed ids */
	function isRepetition(page_id) {
		if ( pageids.indexOf(page_id) > -1 ) {
			console.log('Repetition detected.');
			console.log("this pass id list:")
			console.log(pageids.length)
			console.log("total id list:")
			console.log(total_pageids.length)
			
			console.log([].concat.apply([], total_pageids)) //flatten
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

	// Cleanup after one query is finished
	function done(reason) {
		$('#submit-btn').prop('disabled', false);
		var word_count = $output.text().trim().split(/\s+/).length;
		console.log(word_count);
		$progress.text('Done. ' + reason + '. ' + word_count + ' words written.');
		$scrollTopLink.show();
	}

	function ArticleNotFound(){
		console.log("Oops that article doesn't seem to exist yet");
		$progress.text("Oops, the article you tried to look up doesn't seem to exist yet")
		$('#submit-btn').prop('disabled', false);
		$scrollTopLink.show();
	}

	function getWikiSentence(page_title, escalateParagraph=0){
		// 
		// console.log("stopNow")
		// if (stopNow) {console.log("manual abort");return;}
		console.log(escalateParagraph)

		var cat_query_url = wikiApiCategoriesUrl(page_title);
		var cat_query = $.getCachedJSON( cat_query_url, 250 );
		cat_query.fail(function() { console.error("Error: ", cat_query_url); });
		var text_query_url = wikiApiFirstSectionUrl(page_title,escalateParagraph);
		var text_query = $.getCachedJSON( text_query_url, 250 );
		text_query.fail(function() { console.error("Error: ", text_query_url); });

		$.when( cat_query, text_query ).done( function(cat_resp, text_resp){
			try{
				//var [cat_data, cat_status, cat_jqXHR] = cat_resp;
				var cat_data = cat_resp[0];
				//var [text_data, text_status, text_jqXHR] = text_resp;
				var text_data = text_resp[0];
				var pageid = cat_data.parse.pageid;
			}
			catch(err){
				ArticleNotFound()
				return
			}
			var section_text = text_data.parse.text["*"];
			console.assert(pageid == text_data.parse.pageid, pageid, text_data.parse.pageid);
			if(escalateParagraph<1){
				if ( isRepetition(pageid) ) {
					done('Repetition detected for article: "' + page_title.replace(/_/g, ' ') + '"');
					return
				}
			}
			var categories = cat_data.parse.categories;
			var isDis = categories.some(function(e){
				return e["*"].toLowerCase().indexOf('disambiguation') > -1 
			});
			if ( isDis ) {
				console.log('Disambiguation page found: ', cat_data.parse.title);				
				try{
				var firstHref=getFirstHref(section_text)
				}
				catch(err){
					console.log("escalating paragraph")
					getWikiSentence(page_title,1)
					return
				}

				getWikiSentence(firstHref);
				
			} else {
				console.log("not dis")
				var html = cleanWikiHTML(section_text);				
				// Double because sometimes theres double brackets
				html = removeFirstBracket(removeFirstBracket(removeFirstBracket(html)))

				//TODO Do not return next_entry_available here, make getNextEntryName check
				var [sentence, next_entry_available] = parseForSentence(html);
				var sentence_dom = parseToDOM(sentence);

				console.log('sentenceDom')
				console.log(sentence_dom)

				// TODO checkbox for include_markup
				appendSentences(sentence_dom, true);
				if ( !next_entry_available ) { done('No next Wiki page was found'); return }
				var next_page = getNextEntryName(sentence_dom);
				if(next_page==undefined){
					ArticleNotFound()
					return
				} //if
				getWikiSentence(next_page);
			}
		}); //done
	} //getWikiSentence
}); //document.ready
