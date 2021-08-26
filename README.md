# MMM-RainForecast

<p style="text-align: center">
    <a href="https://david-dm.org/jupadin/MMM-RainForecast"><img src="https://david-dm.org/jupadin/MMM-RainForecast.svg" alt ="Dependency Status"></a>
    <a href="https://choosealicense.com/licenses/mit"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

This module is an extention for the [MagicMirror](https://github.com/MichMich/MagicMirror).

The module is based on the work of [jalibu](https://github.com/jalibu/MMM-RAIN-MAP) and offers cleaner configuration options as well as is only based on [OpenStreetMap](https://www.openstreetmap.de/karte.html).

The module is based on the [Rainviewer API](https://www.rainviewer.com) and it shows the past rain data of 2 hours and rain forecast of 30 minutes (in 10 minutes steps).
There is no apiKey or credentials needed.
The API updates the wheather forecast every 10 minutes.

### To-Do's
- Use leaflets layer groups to group markers
- Use request module instead of xmlhttpsrequest
- Color time div when map shows forecast

## Installation

Open a terminal session, navigate to your MagicMirror's `modules` folder and execute `git clone https://github.com/jupadin/MMM-RainForecast.git`, such that a new folder called MMM-RainForecast will be created.
Navigate inside the folder and execute `npm install` to install all dependencies.
Activate the module by adding it to the `config.js` file of the MagicMirror as shown below.

## Using the module
````javascript
    modules: [
        {
            module: 'MMM-RainForecast',
            header: 'Rain Forecast',
            position: 'top_left',
            config: {,
                animationSpeed: 300,
                updateInterval: 600000,
                location: ["49.41114", "8.71496"],
                zoom: 8,
                limitMapWidth: 0,
                limitMapHeight: 300,
                markers: [{lat: "49.41114", long: "8.71496", color: "yellow"}],
            }
        }
    ]
````

## Configuration options

The table below lists all possible configuration options.
The following configuration options can be set and/or changed:

### Module

| Option | Type | Default | Description |
| ---- | ---- | ---- | ---- |
| `header` | `string` | `"Rain Forecast"` | Header, which will be displayed |
| `animationSpeed` | `int` | `300` | Speed how fast new fain forecast data is displayed [milliseconds] |
| `updateInterval`| `int` | `600000` | Interval when new rain forecast data is fetched (10 minutes - as described above) [milliseconds] |
| `location` | `array` | `["49.41114", "8.71496"]` | Latitude and Longitude which is then displayed |
| `zoom` | `int` | `8` | Map zoom value |
| `limitMapWidth` | `int` | `0` | Limit the maximum width of the map (`0` implies to use the maximal width defined by the other modules) |
| `limitMapHeight` | `int` | `300` | Limit the maximum height of the map |
| `markers` | `array` | [] | Set markers in map |

#### Markers example
```
markers: [{lat: "49.41114", long: "8.71496", color: "yellow"}]
```
where possible colors are
```
"black", "grey", "red", "green", "blue", "orange", "violet", "yellow", "gold"
```

## Further references
The idea to resize the map is taken from the observer approache of the MMM-TomTomTraffic module by [bendardenne](https://github.com/bendardenne/MMM-TomTomTraffic).