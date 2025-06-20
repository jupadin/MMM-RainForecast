/* Magic Mirror
 * Module: MMM-RainForecast
 *
 * By jupadin
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const Log = require('../../js/logger.js');

module.exports = NodeHelper.create({
    start: function() {
        this.config = null;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification == "SET_CONFIG") {
            this.config = payload;
        }
        // Fetch new data from RainForecast-Server
        this.getData();
    },

    getData: function() {
        Log.info(`${this.name}: Fetching data from RainForecast-Server...`);

        const url = "https://api.rainviewer.com/public/weather-maps.json";
        const fetchOptions = {};

        fetch(url, fetchOptions)
        .then(response => {
            if (response.status != 200) {
                throw `Error fetching forecast data with status code ${response.status}.`;
            }
            return response.json();
        })
        .then(data => {
            this.sendSocketNotification("DATA", data);
            return;
        })
        .catch(error => {
            Log.debug(`${this.name}: ${error}.`)
            return;
        })
        
        // Set timeout to continuiusly fetch new data from RainForecast-Server
        setTimeout(this.getData.bind(this), (this.config.updateInterval));
    }
})