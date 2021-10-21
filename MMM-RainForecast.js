/* Magic Mirror
 * Module: MMM-RainForecast
 *
 * By jupadin
 * MIT Licensed.
 */

Module.register("MMM-RainForecast", {
    // Default module config.
    defaults: {
        header: "Rain Forecast",
        animationSpeed: 0.3 * 1000, // 300 milliseconds
        updateInterval: 10 * 60 * 1000, // 10 minutes
        location: ["49.41114", "8.71496"],
        zoom: 8,
        limitMapWidth: 0,
        limitMapHeight: 300,
        markers: [{lat: "49.41114", long: "8.71496", color: "yellow"}],
    },

    // Define start sequence.
    start: function() {
        Log.info("Starting module: " + this.name);
        this.moduleFadeInTime = 2000;
        this.loaded = false;
        this.fetchedData = null;
        this.forecastData = null;
        this.animationPosition = 0;
        this.map = null;
        this.mapDiv = null;
        this.latLongError = false;
        this.layers = [];
        this.animationTimer = null;

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

        var mapWrapper = document.createElement("div");
        mapWrapper.id = "mapWrapper";

        var map = this.map;
        var mapDiv = this.mapDiv;

        // We need to wait until the div is added to the dom, then we need to call the function invalidateSize()
        // in order for the map to behave correctly (resize).
        const observer = new MutationObserver(mutations => {
            // Resize map div to be filled with the map to the desired size.
            mapDiv.style.width = "100%";
            // mapDiv.style.width = "200px";
            mapDiv.style.height = "400px";

            if (this.config.limitMapWidth > 0) {
                mapDiv.style.width = this.config.limitMapWidth + "px";
            }
            if (this.config.limitMapHeight > 0) {
                mapDiv.style.height = this.config.limitMapHeight + "px";
            }

            // Invalidate old size to resize map to desired size.
            setTimeout(() => {
                map.invalidateSize(false);
            }, this.moduleFadeInTime);

            // Disconnect the observer from the wrapper change in size.
            observer.disconnect();
        });

        observer.observe(wrapper, {
            attributes: true,
            childList: true,
            subtree: true
        });

        const timeDiv = document.createElement("div");
        timeDiv.id = "timeDiv";
        timeDiv.style.visibility = "hidden";

        const clockTime = document.createElement("div");
        clockTime.id = "clockTime";

        const clockIcon = document.createElement("i");
        clockIcon.id = "clockIcon";

        clockIcon.className = "fas fa-clock";

        timeDiv.appendChild(clockIcon);
        timeDiv.appendChild(clockTime);
        this.mapDiv.appendChild(timeDiv);
        mapWrapper.appendChild(this.mapDiv);     
        wrapper.appendChild(mapWrapper);

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
            attributionControl: true, // Show attribute (Copyright) of map
        });

        // Make map non-interactive
        map.dragging.disable();
        map.keyboard.disable();

        if (!this.config.location || !Array.isArray(this.config.location) || this.config.location.length != 2) {
            console.error(this.name + ": Provide a map location in the module configuration");
            this.latLongError = true;
            return null;
        }

        // Set map view to given location and zoom
        map.setView(this.config.location, this.config.zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const colors = ["black", "grey", "red", "green", "blue", "orange", "violet", "yellow", "gold"];

        var customMarker = null;

        // TODO: USE MARKER GROUP LAYERS
        this.config.markers.forEach(marker => {
            const markerColor = colors.includes(marker.color) ? marker.color : "blue";
            if (markerColor == "blue") {
                L.marker([marker.lat, marker.long], {interactive: false, keyboard: false}).addTo(map);
            } else {
                customMarker = new L.Icon({
                    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-" + markerColor + ".png",
                    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
                L.marker([marker.lat, marker.long], {icon: customMarker, interactive: false, keyboard: false}).addTo(map);
            }
        });

        // Set mapCanvas to 300 in order to see the attribution in one line.
        mapCanvas.style.width = "300px";
        mapCanvas.style.height = "300px";
        
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

        const timeDiv = document.getElementById("timeDiv");
        timeDiv.style.visibility = "visible";

        const firstForecastDataObjectTimeStamp = forecastDataObject.time;
        this.layers[firstForecastDataObjectTimeStamp].setOpacity(0.65);

        const clockDiv = document.getElementById("clockTime");
        const date = new Date(firstForecastDataObjectTimeStamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        clockDiv.innerHTML = date;
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
        
        // Reset animation position if we already showed the last frame
        if (this.animationPosition + 1 === this.forecastData.length) {
            nextAnimationPosition = 0;
        }

        // Add extra delay to timeOut value,
        // if we show the current rain map
        // or if we showed the last frame
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
        const clockTime = document.getElementById("clockTime");
        const date = new Date(nextAnimationTimeStamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        clockTime.innerHTML = date;

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
