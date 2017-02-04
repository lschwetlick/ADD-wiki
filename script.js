var out;

$( document ).ready(function() {
	$( "form#wiki" ).submit(function( event ) {
		event.preventDefault();
		var start_article = $(this).find("input[type=text]").val();
		console.log( "start_article: ", start_article );
	});

	var wiki_api_base = "https://en.wikipedia.org/w/api.php?"
	params = {
		action: "parse",
		format: "json",
		page: "Stack Overflow",
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
	The server wrapts the requested JSON in a function call with the callback's name.*/
	query = wiki_api_base + $.param(params) + "&callback=?";

	$.getJSON( query )
		.done(function(data) {
			console.log("GET success");
			out = $($.parseHTML('<div>' + data.parse.text["*"] + '</div>'));
		})
		.fail(function() {
			console.log("Error: ", query);
		});
});
