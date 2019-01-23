let App = {
    socket: new WebSocket("ws://10.20.0.103:8000"),
    places: [],
    username: "Anon",
    ui: {
        reset() {
            App.ui.locationname.value = App.ui.locationdescription.value = "";
            App.ui.longitude.innerHTML = "Longitude: ";
            App.ui.latitude.innerHTML = "Latitude: ";
            App.ui.locationtype.selectedIndex = 0;
            App.ui.map.removeLayer(App.ui.indicator);
        }
    },
    init() {
        if (!localStorage.value) {
            App.username = prompt("Pick a username!");
            localStorage.value = App.username;
        } else {
            App.username = localStorage.value;
        }
        
        navigator.geolocation.getCurrentPosition(pos => {
            App.ui.userPosition = L.marker([pos.coords.latitude, pos.coords.longitude], {
                icon: App.ui.youarehere
            }).addTo(App.ui.map);
            App.ui.userPosition.bindPopup("<p style='margin:5px;'><b>" + App.username +"</b></p>");

            App.userLatitude = pos.coords.latitude;
            App.userLongitude = pos.coords.longitude;

            fetch(App.genFoursquaresRequest({
                id:"A0TFATANX3LKQXFIP1B2ZJCEISHD13OYM5NK0S2SJERWGV44",
                secret:"CZK531LCMFXQF0TXHBLULTF5QQZLQVJBJQY2C1CWU1TOFVB5",
                limit:10,
                lat: App.userLatitude,
                long: App.userLongitude,
                query:""
            })).then(response => {
                return response.json();
            }).then(json => {
                json.response.groups[0].items.forEach(i => App.addRecommendation({name: i.venue.name, address: i.venue.location.address, type: i.venue.categories[0].name, distance: i.venue.location.distance}));
            }).catch(error => {
                throw error;
            });

        });

        places = [];
        App.ui.longitude = document.getElementById("long");
        App.ui.latitude = document.getElementById("lat");
        App.ui.locationname = document.getElementById("locationname");
        App.ui.locationtype = document.getElementById("locationtype");
        App.ui.locationdescription = document.getElementById("locationdescription");
        App.ui.recommendations = document.getElementById("recommendations");


        App.ui.map = L.map("map").setView([52.5077302, 13.469056], 20);
        let mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';

        L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data &copy; ' + mapLink,
            maxZoom: 18,
        }).addTo(App.ui.map);

        App.ui.markerIcon = new L.Icon({
            iconUrl: "map-marker.png",
            iconSize: [41, 41],
            iconAnchor: [20, 41],
            popupAnchor: [0, -51]
        });
        App.ui.indicatorIcon = new L.Icon({
            iconUrl: "indicator.png",
            iconSize: [41, 41],
            iconAnchor: [20, 51],
            popupAnchor: [0, -51]
        });
        App.ui.youarehere = new L.Icon({
            iconUrl: "youarehere.png",
            iconSize: [28.2, 80],
            iconAnchor: [14.1, 80],
            popupAnchor: [0, -85]
        });

        App.ui.map.on("click", App.clickHandler);

        App.socket.onmessage = m => {
            console.log(m.data);
            data = JSON.parse(m.data);
            let place = new Place(data.lat, data.long, data.name, data.type, data.description, data.creator);
        }

        document.addEventListener("click", e => {
            let target = e.target || e.srcElement;
            if(target.classList.contains("recommendation") || target.parentElement.classList.contains("recommendation")) {
                App.ui.selectedLocationIndicator = App.ui.selectedLocationIndicator.setLatLng([]) || L.marker
            }
        });
    },
    addRecommendation(params) {
        let div = document.createElement("div");
        div.classList.add("recommendation");
        div.innerHTML =
        "<p style='font-size: 11px; margin: 3px; font-weight: bold;'>" + params.name + "</p>" +
        "<p style='font-size: 10px; margin: 3px; font-weight: normal;'>" + params.type + ", " + params.address + "</p>" +
        "<p style='font-size: 8px; margin: 3px; font-weight: normal;'>" + params.distance + "m away" + "</p>";
        App.ui.recommendations.appendChild(div);

        return div;
        
    },
    genFoursquaresRequest(params) {
        return "https://api.foursquare.com/v2/venues/explore?client_id=" + params.id +"&client_secret=" + params.secret + "&v=20180323&limit=" + params.limit + "&ll=" + params.lat + "," + params.long + "&query=" + params.query;
    },
    clickHandler(e) {
        App.ui.longitude.innerHTML = "Longitude: " + e.latlng.lng;
        App.ui.latitude.innerHTML = "Latitude: " + e.latlng.lat;

        if (!App.ui.indicator) {
            App.ui.indicator = L.marker([e.latlng.lat, e.latlng.lng], {
                icon: App.ui.indicatorIcon
            }).addTo(App.ui.map);
        } else {
            App.ui.indicator.setLatLng(e.latlng);
        }

        if (!App.ui.map.hasLayer(App.ui.indicator)) {
            App.ui.indicator.addTo(App.ui.map);
        }
    },
    submitLocationData() {
        if (App.ui.longitude.innerHTML == "Longitude: ") {
            alert("Please click somewhere on the map first!");
            return;
        }
        if ([App.ui.locationname, App.ui.locationdescription].some(e => e.value == "")) {
            alert("Please fill out all the fields");
            return;
        }
        App.socket.send(JSON.stringify({
            lat: parseFloat(App.ui.longitude.innerHTML.split("Longitude: ")[1]),
            long: parseFloat(App.ui.latitude.innerHTML.split("Latitude: ")[1]),
            name: App.ui.locationname.value,
            type: App.ui.locationtype.options[App.ui.locationtype.selectedIndex].text,
            description: App.ui.locationdescription.value,
            creator: App.username
        }));
        App.ui.reset();
    }
}

class Place {
    constructor(lat, long, name, type, description, creator) {
        Object.assign(this, {
            lat,
            long,
            name,
            type,
            description,
            creator
        });
        places.push(this);

        this.marker = L.marker([this.long, this.lat], {
            icon: App.ui.markerIcon
        }).addTo(App.ui.map);
        this.marker.bindPopup(this.getPopupHtml());
    }
    getPopupHtml() {
        let html =
            "<p style='font-size: 11px; margin: 3px; font-weight: bold;'>" + this.name + "</p>" +
            "<p style='font-size: 10px; margin: 3px; margin-bottom: 10px; font-weight: normal;'>" + this.type + "</p>" +
            "<p style='font-size: 11px; margin: 3px; font-weight: normal;'>" + this.description + "</p>" +
            "<p style='font-size: 8px; margin: 3px; margin-top: 15px; font-weight: normal;'>Submitted by " + this.creator + "</p>";

        return html;
    }
}

App.init();
