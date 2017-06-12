/*
Return JSON from url, use browser's localStorage as cache
JQuery extension, returns a promise.
'cacheInvalidMs' indicates the milliseconds after which the cache is invalidated.
	Default is 24 hours.
'cacheDelayMs' indicates the milliseconds after which data from the cache is returned.
	Can be used to simulate the delay of normal requests.
	Default is 0.
*/
//Adapted from https://gist.github.com/contolini/6115380
jQuery.extend({
	getCachedJSON: function(url, cacheDelayMs = 0, cacheInvalidMs = 86400000) {
		// Remove oldest entries to make space
		// Adapted from http://codereview.stackexchange.com/questions/38441
		function removeOldestLSEntries(n) {
			// Store timestamps into an object with original key as value
			var expiries = Object.keys(localStorage).reduce(function(collection,key){
				var t = JSON.parse(localStorage.getItem(key)).timestamp;
				collection[t] = key;
				return collection;
			},{});
			var timestamps = Object.keys(expiries);
			// Find the n oldest entries (smallest timestamp) and remove them
			for(var i = 0; i < n; i++){
				var oldest = Math.min.apply(null,timestamps);
				localStorage.removeItem(expiries[oldest]);
			}
		}

		// Both functions 'getJSON' and 'getCache' return a promise
		function getJSON(url) {
			var promise = $.getJSON(url);
			promise.done(function(data) {
				var cache = {data: data, timestamp: Date.now()};
				try {
					localStorage.setItem(url, JSON.stringify(cache));
				} catch (e) {
					// Different browsers return different error codes
					// when localStorage quota is exceeded
					// http://crocodillon.com/blog/always-catch-localstorage-security-and-quota-exceeded-errors
					console.log('%c' + e.message, 'color: red');
					removeOldestLSEntries(5);
					localStorage.setItem(url, JSON.stringify(cache));
				}
			});
			console.log('%c' + '(AJAX) ' + url, 'color: orange');
			return promise;
		}

		function getCache(url) {
			var stored = JSON.parse(localStorage.getItem(url));
			if ( stored ) {
				var validCache = (Date.now() - stored.timestamp) < cacheInvalidMs;
				if ( validCache ) {
					console.log('%c' + '(localStorange) ' + url, 'color: blue');
					var dfd = $.Deferred();
					if ( cacheDelayMs > 0 ){
						// simulate the delay of a real network request
						// JQuery's AJAX functions return a tuple of the requested data and other attributes
						setTimeout(function() { dfd.resolve([stored.data, 200]); }, cacheDelayMs );
					} else {
						dfd.resolve([stored.data, 200]);
					}
					return dfd.promise()
				}
			}
			return getJSON(url);
		}

		var supportsLocalStorage = 'localStorage' in window;
		return supportsLocalStorage ? getCache( url ) : getJSON( url );
	}
});
