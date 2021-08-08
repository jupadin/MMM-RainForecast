/* Magic Mirror
 * Module: MMM-RainForecast
 *
 * By Julian Dinter
 * MIT Licensed.
 */

Module.register("MMM-RainForecast", {
    // Default module config.
    defaults: {
        header: "Rain Forecast",
        animationSpeed: 0.6 * 1000, // 600 milliseconds
        updateInterval: 10 * 60 * 1000, // 10 minutes
        location: ["49.40", "8.69"],
        zoom: 8,
        width: "100",
        height: "100",
        markers: [{lat: "49.40", long: "8.69", color: "yellow"}],
    },
    
    moduleFadeInTime: 2000,
    loaded: false,
    fetchedData: null,
    forecastData: null,
    animationPosition: 0,
    map: null,
    mapDiv: null,
    latLongError: false,
    layers: [],
    animationTimer: null,

    // Define start sequence.
    start: function() {
        Log.info("Starting module: " + this.name);
        this.initMap();
        this.sendSocketNotification("SET_CONFIG", this.config);
    },

    // Define required styles.
    getStyles: function() {
        return["MMM-RainForecast.css", "font-awesome.css", "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"]
    },

    // Define required scripts.
    getScripts: function() {
        return ["https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"];
    },

    // Define header.
    getHeader: function() {
        return this.config.header;
    },

    // Override dom generator.
    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.id = "wrapper";

        if (this.latLongError) {
            wrapper.innerHTML = "No <i>latitude</i> and / or <i>longitude</i> set";
            wrapper.className = "light small dimmed";
            return wrapper;
        }

        if (!this.loaded) {
            wrapper.innerHTML = "Loading...";
            wrapper.className = "light small dimmed";
            return wrapper;
        }

        var map = this.map;
        var mapDiv = this.mapDiv;

        // We need to wait until the div is added to the dom, then we need to call the function invalidateSize()
        // in order for the map to behave correctly (resize).
        const observer = new MutationObserver(mutations => {

            // Resize map div to be filled with the map to the desired size.
            mapDiv.style.width = "100%";
            mapDiv.style.height = "400px";

            setTimeout(() => {
                map.invalidateSize(false);
            }, this.moduleFadeInTime);

            // Disconnect the observer from the wrapper change in size
            observer.disconnect();
        });

        observer.observe(wrapper, {
            attributes: true,
            childList: true,
            subtree: true
        });

        wrapper.appendChild(this.mapDiv);

        // Return the wrapper to the dom.
        return wrapper;
    },

    // Override socket notification handler.
    socketNotificationReceived: function(notification, payload) {
        if (notification == "DATA") {
            // If the module was is not loaded yet, fade in dom to display map
            if (!this.loaded) {
                this.loaded = true;
                // Update dom with given module fade in time.
                this.updateDom(this.moduleFadeInTime);
            }
            // Handle fetched data
            this.fetchedData = payload;

            // Update rain data layers
            this.updateMap();

        } else if (notification == "ERROR") {
            // TODO: Update front-end to display specific error.
        }
    },

    initMap: function() {
        const mapCanvas = document.createElement("div");
        mapCanvas.classList.add("map");

        const map = L.map(mapCanvas, {
            zoomControl: false, // Do not show zoom buttons
            attributionControl: false, // Show attribute (Copyright) of map
        });

        if (!this.config.location || !Array.isArray(this.config.location) || this.config.location.length != 2) {
            console.error(this.name + ": Provide a map location in the module configuration");
            this.latLongError = true;
            return null;
        }

        // Set map view to given location and zoom
        map.setView(this.config.location, this.config.zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const colors = ["black", "red", "green", "blue", "orange", "violet", "yellow", "gold"];

        // TODO: USE MARKER GROUP LAYERS
        this.config.markers.forEach(marker => {
            const markerColor = colors.includes(marker.color) ? marker.color : "red";
            // TODO: Handle color
            L.marker([marker.lat, marker.long], {}).addTo(map);
        });

        mapCanvas.style.width = this.config.width + "px";
        mapCanvas.style.height = this.config.height + "px";
        
        this.map = map;
        this.mapDiv = mapCanvas;
    },

    updateMap: function() {
        const map = this.map;

        // Stop (global) animation timer
        this.stopPlayTimer();

        // Reset animation position
        this.animationPosition = 0;

        // Process fetched data
        const jsonData = JSON.parse(this.fetchedData);
        this.forecastData = jsonData.radar.past.concat(jsonData.radar.nowcast);

        // Remove all (forecast) layers from map and clear forecast layer array
        this.forecastData.forEach(forecast => {
            const map = this.map;
            const timeStamp = forecast.time;
            if (this.layers[timeStamp] && map.hasLayer(this.layers[timeStamp])) {
                map.removeLayer(this.layers[timeStamp]);
            }
        });
        this.layers = [];

        // Add all new fetched and created rain map tile layers to layers array with 0 opacity.
        this.forecastData.forEach(forecastDataObject => {
            this.addLayer(forecastDataObject);
        });

        // Change opacity for first frame after module fade in time.
        setTimeout(this.showFrame.bind(this, this.forecastData[0]), 2 * this.moduleFadeInTime);
        
        // Start playing showing all other views.
        setTimeout(this.play.bind(this), 2 * this.moduleFadeInTime + this.config.animationSpeed);
    },

    showFrame: function(forecastDataObject) {
        if (!this.layers.includes[forecastDataObject.time]) {
            this.addLayer(forecastDataObject);
        }
        const firstForecastDataObjectTimeStamp = forecastDataObject.time;
        this.layers[firstForecastDataObjectTimeStamp].setOpacity(0.65);
    },

    stopPlayTimer: function() {
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = false;
        }
    },

    play: function() {
        const extraDelayLastFrame = 2000;
        let timeOut = this.config.animationSpeed;
        let nextAnimationPosition = this.animationPosition + 1;
        
        if (this.animationPosition + 1 === this.forecastData.length) {
            nextAnimationPosition = 0;
        }

        if (nextAnimationPosition + 1 === this.forecastData.length) {
            timeOut += extraDelayLastFrame;
        }

        const currentAnimationTimeStamp = this.forecastData[this.animationPosition].time;
        const nextAnimationTimeStamp = this.forecastData[nextAnimationPosition].time;

        // Set opacity of previous frame to 0
        if (this.layers[currentAnimationTimeStamp]) {
            this.layers[currentAnimationTimeStamp].setOpacity(0);
        }

        // Set opacity of next frame to given value
        this.layers[nextAnimationTimeStamp].setOpacity(0.65);

        this.animationPosition = nextAnimationPosition;
        this.animationTimer = setTimeout(this.play.bind(this), timeOut);
    },

    addLayer: function(forecastDataObject) {
        const map = this.map;
        const path = forecastDataObject.path;
        const timeStamp = forecastDataObject.time;

        // Add map to layers array
        let options = {tileSize: 256, opacity: 0.01};
        if (!this.layers[timeStamp]) {
            options["zIndex"] = timeStamp;
            this.layers[timeStamp] = new L.tileLayer("https://tilecache.rainviewer.com" + path + "/256/{z}/{x}/{y}/2/1_1.png", options);
            // Set opacity to 0 when new tile layer is created, such that tile layer is not shown on initial map view.
            this.layers[timeStamp].setOpacity(0);
        }

        // Add layer to map
        if (!map.hasLayer(this.layers[timeStamp])) {
            this.layers[timeStamp].addTo(map);
        }
    }
})