/* Magic Mirror
 * Module: MMM-RainForecast
 *
 * By jupadin
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const { XMLHttpRequest } = require('xmlhttprequest');

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
        console.info(this.name + ": Fetching data from RainForecast-Server...");
        this.getTimestamps().then(fetchedTimestamps => {
            this.sendSocketNotification("DATA", fetchedTimestamps)
        });
        
        // Set timeout to continuiusly fetch new data from RainForecast-Server
        setTimeout(this.getData.bind(this), (this.config.updateInterval));
    },

    getTimestamps: function() {
        return new Promise((resolve, reject) => {
            const apiRequest = new XMLHttpRequest();
            apiRequest.open("GET", "https://api.rainviewer.com/public/weather-maps.json");
            apiRequest.onload = () => {
                if (apiRequest.status >= 200 && apiRequest.status <= 300) {
                    resolve(apiRequest.responseText);
                } else {
                    reject(apiRequest.statusText);
                }
            };
            apiRequest.send();
        });
    }
})