var now = moment();
var thisWeek = moment(now).subtract(6, 'days').format('YYYY-MM-DD');
var lastWeek = moment(now).subtract(1, 'days').format('YYYY-MM-DD');
var _user = $('#is-user');
var _userNew = $('#is-user-new');
var _phien = $('#is-phien');
var _phienUser = $('#is-phien-moi-user');
var _pageViewPhien = $('#is-view-phien');
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

gapi.analytics.ready(function() {

    google.charts.load('current', {
        'packages': ['geochart'],
        'mapsApiKey': 'AIzaSyAXrzWe32s5f9anyYoClDYUFiiP874Xnfw'
    });

    google.charts.setOnLoadCallback(drawRegionsMap);

    function drawRegionsMap() {
        var data = google.visualization.arrayToDataTable([
            ['Nước', 'Thành phố', 'Số người dùng'],
            ['', '', 0]
        ]);

        var options = {
            displayMode: 'markers',
            colorAxis: { colors: ['orange'] }
        };
        var chart = new google.visualization.GeoChart(document.getElementById('regions_div'));
        chart.draw(data, options);
    }

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
    activeUsers.once('success', function() {
        var element = this.container.firstChild;
        var timeout;
        this.on('change', function(data) {
            var element = this.container.firstChild;
            var animationClass = data.delta > 0 ? 'is-increasing' : 'is-decreasing';
            element.className += (' ' + animationClass);
            _user.text(data.activeUsers);
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                element.className =
                    element.className.replace(/ is-(increasing|decreasing)/g, '');
                executeRealTimeGeo();
                executeRealTimePage();
            }, 3000);

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
            'start-date': dataConst.start_date_week,
            'end-date': dataConst.end_date_week,
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
    viewSelector.on('viewChange', function(data) {
        var title = document.getElementById('view-name');
        title.textContent = data.property.name + ' (' + data.view.name + ')';
        // Start tracking active users for this view.
        activeUsers.set(data).execute();
        // Render all the of charts for this view.
        getData(data.ids);
    });

    viewSelector.on('change', function(ids) {
        var options = { query: { ids: ids } };
        mainChart.set(options).execute();
    });

    /**
     * Extend the Embed APIs `gapi.analytics.report.Data` component to
     * return a promise the is fulfilled with the value returned by the API.
     * @@param {Object} params The request parameters.
     * @@return {Promise} A promise.
     */
    function query(params) {
        return new Promise(function(resolve, reject) {
            var data = new gapi.analytics.report.Data({ query: params });
            data.once('success', function(response) { resolve(response); })
                .once('error', function(response) { reject(response); })
                .execute();
        });
    }

    function getData(ids) {
        query({
                'ids': ids,
                'metrics': 'ga:newUsers,ga:sessions,ga:bounceRate,ga:pageviews,ga:pageviewsPerSession,ga:avgTimeOnPage',
                'start-date': dataConst.start_date_week,
                'end-date': dataConst.end_date_week,
                'max-results': dataConst.max_results
            })
            .then(function(response) {
                    let data = response.rows[0];
                    _userNew.text(data[0]);
                    _phien.text(data[1]);
                    _phienUser.text((parseFloat(data[1]) / parseFloat(data[0])).toFixed(2));
                    _pageViewPhien.text(parseFloat(data[4]).toFixed(2));
                    _exit.text(parseFloat(data[2]).toFixed(2) + ' giây');
                },
                function(err) { console.error("Execute error", err); });
    }

    function executeRealTimeGeo() {
        return gapi.client.analytics.data.realtime.get({
                "ids": dataConst.ids,
                "metrics": "rt:activeUsers",
                "dimensions": "rt:country,rt:region,rt:city,rt:latitude,rt:longitude"
            })
            .then(function(response) {

                    var dataSet = [
                        ['Nước', 'Thành phố', 'Số người dùng']
                    ];

                    $.each(response.result.rows, function(i, el) {
                        dataSet.push([el[0], el[2], parseInt(el[5])]);
                    });

                    var data = google.visualization.arrayToDataTable(dataSet);
                    var options = {
                        displayMode: 'markers',
                        colorAxis: { colors: ['orange'] }
                    };

                    var chart = new google.visualization.GeoChart(document.getElementById('regions_div'));
                    chart.draw(data, options);
                },
                function(err) {
                    console.error("Execute error", err);
                });
    }

    function executeRealTimePage() {
        return gapi.client.analytics.data.realtime.get({
                "ids": dataConst.ids,
                "metrics": "rt:pageviews",
                "dimensions": "rt:pageTitle,rt:pagePath",
                'max-results': dataConst.max_results
            })
            .then(function(response) {
                    var tbody = $('#tbl-page').find('tbody');
                    $.each(response.result.rows, function(i, el) {
                        var cloneTr = tbody.find('#clone').clone().removeClass('hidden');
                        if (i % 2 === 0) {
                            cloneTr.addClass('gapi-analytics-data-chart-styles-table-tr-even').find('.title').text(el[0]);
                            cloneTr.addClass('gapi-analytics-data-chart-styles-table-tr-even').find('.path').text(el[1]);
                        } else {
                            cloneTr.addClass('gapi-analytics-data-chart-styles-table-tr-odd').find('.title').text(el[0]);
                            cloneTr.addClass('gapi-analytics-data-chart-styles-table-tr-odd').find('.path').text(el[1]);
                        }

                        tbody.append(cloneTr);
                    });

                },
                function(err) { console.error("Execute error", err); });
    }
});