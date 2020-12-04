var now = moment();
var thisWeek = moment(now).subtract(6, 'days').format('YYYY-MM-DD');
var lastWeek = moment(now).subtract(1, 'days').format('YYYY-MM-DD');
var _user = $('#is-user');
var _userNew = $('#is-user-new');
var _phien = $('#is-phien');
var _phienUser = $('#is-phien-moi-user');
var _pageView = $('#is-view-page');
var _pageViewPhien = $('#is-view-phien');
var _avgPhien = $('#is-avg-phien');
var _exit = $('#is-exit');

const dataConst = {
	clientid: '493450092586-k3jia3f47oc7hbhrbemdt3vbvqv9la8m.apps.googleusercontent.com',
	pollingInterval: 10,
	ids: 'ga:229773876',
	start_date: '365daysAgo',
	end_date: 'yesterday',
	max_results: 5,
	start_date_week: thisWeek,
	end_date_week: lastWeek
}

// == NOTE ==
// This code uses ES6 promises. If you want to use this code in a browser
// that doesn't supporting promises natively, you'll have to include a polyfill.

gapi.analytics.ready(function () {

	/**
	 * Authorize the user immediately if the user has already granted access.
	 * If no access has been created, render an authorize button inside the
	 * element with the ID "embed-api-auth-container".
	 */
	gapi.analytics.auth.authorize({
		container: 'embed-api-auth-container',
		clientid: dataConst.clientid
	});

	/**
	 * Create a new ActiveUsers instance to be rendered inside of an
	 * element with the id "active-users-container" and poll for changes every
	 * five seconds.
	 */
	var activeUsers = new gapi.analytics.ext.ActiveUsers({
		container: 'active-users-container',
		pollingInterval: dataConst.pollingInterval
	});


	/**
	 * Add CSS animation to visually show the when users come and go.
	 */
	activeUsers.once('success', function () {
		var element = this.container.firstChild;
		var timeout;
		this.on('change', function (data) {
			var element = this.container.firstChild;
			var animationClass = data.delta > 0 ? 'is-increasing' : 'is-decreasing';
			element.className += (' ' + animationClass);
			_user.text(data.activeUsers);
			clearTimeout(timeout);
			timeout = setTimeout(function () {
				element.className =
					element.className.replace(/ is-(increasing|decreasing)/g, '');
			}, 3000);
			executeRealTimeGeo();
			executeRealTimePage();
		});
	});


	/**
	 * Create a new ViewSelector2 instance to be rendered inside of an
	 * element with the id "view-selector-container".
	 */
	var viewSelector = new gapi.analytics.ext.ViewSelector2({
		container: 'view-selector-container',
		ids: dataConst.ids
	})
		.execute();

	/**
  * Create a table chart showing top browsers for users to interact with.
  * Clicking on a row in the table will update a second timeline chart with
  * data from the selected browser.
  */
	var mainChart = new gapi.analytics.googleCharts.DataChart({
		query: {
			'dimensions': 'ga:pagePath',
			'metrics': 'ga:users',
			'sort': '-ga:users',
			'start-date': dataConst.start_date,
			'end-date': dataConst.end_date,
			'max-results': dataConst.max_results
		},
		chart: {
			type: 'TABLE',
			container: 'main-chart-container',
			options: {
				width: '100%'
			}
		}
	});


	/**
	 * Update the activeUsers component, the Chartjs charts, and the dashboard
	 * title whenever the user changes the view.
	 */
	viewSelector.on('viewChange', function (data) {
		var title = document.getElementById('view-name');
		title.textContent = data.property.name + ' (' + data.view.name + ')';
		// Start tracking active users for this view.
		activeUsers.set(data).execute();

		// Render all the of charts for this view.
		renderWeekOverWeekChart(data.ids);
		renderYearOverYearChart(data.ids);
		renderTopBrowsersChart(data.ids);
		renderTopCountriesChart(data.ids);
		renderTopPagesChart(data.ids);
		getData(data.ids);
	});

	viewSelector.on('change', function (ids) {
		var options = { query: { ids: ids } };
		mainChart.set(options).execute();
	});


	/**
	 * Draw the a chart.js line chart with data from the specified view that
	 * overlays session data for the current week over session data for the
	 * previous week.
	 */
	function renderWeekOverWeekChart(ids) {

		// Adjust `now` to experiment with different days, for testing only...
		var now = moment(); // .subtract(3, 'day');

		var thisWeek = query({
			'ids': ids,
			'dimensions': 'ga:date,ga:nthDay',
			'metrics': 'ga:sessions',
			'start-date': moment(now).subtract(1, 'day').day(0).format('YYYY-MM-DD'),
			'end-date': moment(now).format('YYYY-MM-DD')
		});

		var lastWeek = query({
			'ids': ids,
			'dimensions': 'ga:date,ga:nthDay',
			'metrics': 'ga:sessions',
			'start-date': moment(now).subtract(1, 'day').day(0).subtract(1, 'week')
				.format('YYYY-MM-DD'),
			'end-date': moment(now).subtract(1, 'day').day(6).subtract(1, 'week')
				.format('YYYY-MM-DD')
		});

		Promise.all([thisWeek, lastWeek]).then(function (results) {

			var data1 = results[0].rows.map(function (row) { return +row[2]; });
			var data2 = results[1].rows.map(function (row) { return +row[2]; });
			var labels = results[1].rows.map(function (row) { return +row[0]; });

			labels = labels.map(function (label) {
				return moment(label, 'YYYYMMDD').format('ddd');
			});

			var data = {
				labels: labels,
				datasets: [
					{
						label: 'Last Week',
						fillColor: 'rgba(220,220,220,0.5)',
						strokeColor: 'rgba(220,220,220,1)',
						pointColor: 'rgba(220,220,220,1)',
						pointStrokeColor: '#fff',
						data: data2
					},
					{
						label: 'This Week',
						fillColor: 'rgba(151,187,205,0.5)',
						strokeColor: 'rgba(151,187,205,1)',
						pointColor: 'rgba(151,187,205,1)',
						pointStrokeColor: '#fff',
						data: data1
					}
				]
			};

			new Chart(makeCanvas('chart-1-container')).Line(data);
			generateLegend('legend-1-container', data.datasets);
		});
	}


	/**
	 * Draw the a chart.js bar chart with data from the specified view that
	 * overlays session data for the current year over session data for the
	 * previous year, grouped by month.
	 */
	function renderYearOverYearChart(ids) {

		// Adjust `now` to experiment with different days, for testing only...
		var now = moment(); // .subtract(3, 'day');

		var thisYear = query({
			'ids': ids,
			'dimensions': 'ga:month,ga:nthMonth',
			'metrics': 'ga:users',
			'start-date': moment(now).date(1).month(0).format('YYYY-MM-DD'),
			'end-date': moment(now).format('YYYY-MM-DD')
		});

		var lastYear = query({
			'ids': ids,
			'dimensions': 'ga:month,ga:nthMonth',
			'metrics': 'ga:users',
			'start-date': moment(now).subtract(1, 'year').date(1).month(0)
				.format('YYYY-MM-DD'),
			'end-date': moment(now).date(1).month(0).subtract(1, 'day')
				.format('YYYY-MM-DD')
		});

		Promise.all([thisYear, lastYear]).then(function (results) {
			var data1 = results[0].rows.map(function (row) { return +row[2]; });
			var data2 = results[1].rows.map(function (row) { return +row[2]; });
			var labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
				'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

			// Ensure the data arrays are at least as long as the labels array.
			// Chart.js bar charts don't (yet) accept sparse datasets.
			for (var i = 0, len = labels.length; i < len; i++) {
				if (data1[i] === undefined) data1[i] = null;
				if (data2[i] === undefined) data2[i] = null;
			}

			var data = {
				labels: labels,
				datasets: [
					{
						label: 'Last Year',
						fillColor: 'rgba(220,220,220,0.5)',
						strokeColor: 'rgba(220,220,220,1)',
						data: data2
					},
					{
						label: 'This Year',
						fillColor: 'rgba(151,187,205,0.5)',
						strokeColor: 'rgba(151,187,205,1)',
						data: data1
					}
				]
			};

			new Chart(makeCanvas('chart-2-container')).Bar(data);
			generateLegend('legend-2-container', data.datasets);
		})
			.catch(function (err) {
				console.error(err.stack);
			});
	}


	/**
	 * Draw the a chart.js doughnut chart with data from the specified view that
	 * show the top 5 browsers over the past seven days.
	 */
	function renderTopBrowsersChart(ids) {

		query({
			'ids': ids,
			'dimensions': 'ga:browser',
			'metrics': 'ga:pageviews',
			'sort': '-ga:pageviews',
			'start-date': dataConst.start_date,
			'end-date': dataConst.end_date,
			'max-results': dataConst.max_results
		})
			.then(function (response) {

				var data = [];
				var colors = ['#4D5360', '#949FB1', '#D4CCC5', '#E2EAE9', '#F7464A'];

				response.rows.forEach(function (row, i) {
					data.push({ value: +row[1], color: colors[i], label: row[0] });
				});

				new Chart(makeCanvas('chart-3-container')).Doughnut(data);
				generateLegend('legend-3-container', data);
			});
	}


	/**
	 * Draw the a chart.js doughnut chart with data from the specified view that
	 * compares sessions from mobile, desktop, and tablet over the past seven
	 * days.
	 */
	function renderTopCountriesChart(ids) {
		query({
			'ids': ids,
			'dimensions': 'ga:country',
			'metrics': 'ga:sessions',
			'sort': '-ga:sessions',
			'start-date': dataConst.start_date,
			'end-date': dataConst.end_date,
			'max-results': dataConst.max_results
		})
			.then(function (response) {
				var data = [];
				var colors = ['#4D5360', '#949FB1', '#D4CCC5', '#E2EAE9', '#F7464A'];

				response.rows.forEach(function (row, i) {
					data.push({
						label: row[0],
						value: +row[1],
						color: colors[i]
					});
				});

				new Chart(makeCanvas('chart-4-container')).Doughnut(data);
				generateLegend('legend-4-container', data);
			});
	}


	function renderTopPagesChart(ids) {
		query({
			'ids': ids,
			'dimensions': 'ga:pagePath',
			'metrics': 'ga:users',
			'sort': '-ga:users',
			'start-date': dataConst.start_date,
			'end-date': dataConst.end_date,
			'max-results': dataConst.max_results
		})
			.then(function (response) {

				var data = [];
				var colors = ['#4D5360', '#949FB1', '#D4CCC5', '#E2EAE9', '#F7464A'];

				response.rows.forEach(function (row, i) {
					data.push({
						label: row[0],
						value: +row[1],
						color: colors[i]
					});
				});

				new Chart(makeCanvas('chart-5-container')).Doughnut(data);
				generateLegend('legend-5-container', data);
			});
	}


	/**
	 * Extend the Embed APIs `gapi.analytics.report.Data` component to
	 * return a promise the is fulfilled with the value returned by the API.
	 * @@param {Object} params The request parameters.
	 * @@return {Promise} A promise.
	 */
	function query(params) {
		return new Promise(function (resolve, reject) {
			var data = new gapi.analytics.report.Data({ query: params });
			data.once('success', function (response) { resolve(response); })
				.once('error', function (response) { reject(response); })
				.execute();
		});
	}


	/**
	 * Create a new canvas inside the specified element. Set it to be the width
	 * and height of its container.
	 * @@param {string} id The id attribute of the element to host the canvas.
	 * @@return {RenderingContext} The 2D canvas context.
	 */
	function makeCanvas(id) {
		var container = document.getElementById(id);
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');

		container.innerHTML = '';
		canvas.width = container.offsetWidth;
		canvas.height = container.offsetHeight;
		container.appendChild(canvas);

		return ctx;
	}


	/**
	 * Create a visual legend inside the specified element based off of a
	 * Chart.js dataset.
	 * @@param {string} id The id attribute of the element to host the legend.
	 * @@param {Array.<Object>} items A list of labels and colors for the legend.
	 */
	function generateLegend(id, items) {
		var legend = document.getElementById(id);
		legend.innerHTML = items.map(function (item) {
			var color = item.color || item.fillColor;
			var label = item.label;
			return '<li><i style="background:' + color + '"></i>' +
				escapeHtml(label) + '</li>';
		}).join('');
	}


	// Set some global Chart.js defaults.
	Chart.defaults.global.animationSteps = 60;
	Chart.defaults.global.animationEasing = 'easeInOutQuart';
	Chart.defaults.global.responsive = true;
	Chart.defaults.global.maintainAspectRatio = false;


	/**
	 * Escapes a potentially unsafe HTML string.
	 * @@param {string} str An string that may contain HTML entities.
	 * @@return {string} The HTML-escaped string.
	 */
	function escapeHtml(str) {
		var div = document.createElement('div');
		div.appendChild(document.createTextNode(str));
		return div.innerHTML;
	}

	function getData(ids) {
		query({
			'ids': ids,
			'metrics': 'ga:newUsers,ga:sessions,ga:bounceRate,ga:pageviews,ga:pageviewsPerSession,ga:avgTimeOnPage',
			'start-date': dataConst.start_date_week,
			'end-date': dataConst.end_date_week,
			'max-results': dataConst.max_results
		})
			.then(function (response) {
				let data = response.rows[0];
				_userNew.text(data[0]);
				_phien.text(data[1]);
				_phienUser.text((parseFloat(data[1]) / parseFloat(data[0])).toFixed(2));
				_pageView.text(data[3]);
				_pageViewPhien.text(parseFloat(data[4]).toFixed(2));
				_avgPhien.text((parseFloat(data[5]) / 1000).toFixed(2));
				_exit.text(parseFloat(data[2]).toFixed(2) + ' giây');
			},
				function (err) { console.error("Execute error", err); });
	}

	function executeRealTimeGeo() {
		return gapi.client.analytics.data.realtime.get({
			"ids": dataConst.ids,
			"metrics": "rt:activeUsers",
			"dimensions": "rt:country,rt:region,rt:city,rt:latitude,rt:longitude"
		})
			.then(function (response) {
				var mapData = null;
				$.each(response.result.rows, function (i, el) {
					if (el[i] === 'Vietnam') {
						mapData = {
							'VN': 0
						}
					}
				});

				$('#world-map').empty();
				$('#world-map').vectorMap({
					map: 'world_mill_en',
					backgroundColor: "transparent",
					regionStyle: {
						initial: {
							fill: '#e4e4e4',
							"fill-opacity": 0.9,
							stroke: 'none',
							"stroke-width": 0,
							"stroke-opacity": 0
						}
					},
					series: {
						regions: [{
							values: mapData,
							scale: ["#1ab394", "#22d6b1"],
							normalizeFunction: 'polynomial'
						}]
					},
				});

			},
				function (err) { console.error("Execute error", err); });
	}


	function executeRealTimePage() {
		return gapi.client.analytics.data.realtime.get({
			"ids": dataConst.ids,
			"metrics": "rt:pageviews",
			"dimensions": "rt:pageTitle,rt:pagePath",
			'max-results': dataConst.max_results
		})
			.then(function (response) {
				console.log("Response", response);
				var tbody = $('#tbl-page').find('tbody');
				tbody.empty();
				var cloneTr = tbody.find('#clone').clone().removeClass('hidden');
				$.each(response.result.rows, function (i, el) {
					debugger
					cloneTr.find('.title').text(el[0]);
					cloneTr.find('.path').text(el[1]);
					tbody.append(cloneTr);
				});

			},
				function (err) { console.error("Execute error", err); });
	}
	
});
