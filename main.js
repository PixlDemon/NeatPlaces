let App = {
	socket: new WebSocket("ws://10.20.0.103:8000"),
	locationData: [],
	username: "Anon",
	nextToggleAddLocationUIAnimationDirection: "normal",
	UI: {
		reset() {
			App.UI.locationNameInput.value = App.UI.locationDescriptionInput.value = "";
			App.UI.longitudeDisplay.innerHTML = "Longitude: ";
			App.UI.latitudeDisplay.innerHTML = "Latitude: ";
			App.UI.locationTypeDropdown.selectedIndex = 0;
			App.UI.map.removeLayer(App.UI.indicator);
		}
	},
	init() {
		if (!localStorage.value) {
			App.username = prompt("Pick a username!");
			localStorage.value = App.username;
		} else {
			App.username = localStorage.value;
		}

		App.UI.longitudeDisplay = document.getElementById("long");
		App.UI.latitudeDisplay = document.getElementById("lat");
		App.UI.locationNameInput = document.getElementById("locationname");
		App.UI.locationTypeDropdown = document.getElementById("locationtype");
		App.UI.locationDescriptionInput = document.getElementById("locationdescription");
		App.UI.locationList = document.getElementById("locationlist");
		App.UI.foursquareDisplay = document.getElementById("foursquaredisplay");
		App.UI.submitLocationUI = document.getElementById("addlocationui");
		App.UI.mapContainer = document.getElementById("map");
		App.UI.locationSearchBar = document.getElementById("locationsearch");
		App.UI.mapContainer.style.animationPlayState = "paused";
		App.UI.foursquareDisplay.style.display = "none";

		navigator.geolocation.getCurrentPosition(pos => {
			App.UI.userPosition = L.marker([pos.coords.latitude, pos.coords.longitude], {
				icon: App.UI.userPositionIcon
			}).addTo(App.UI.map);
			App.UI.userPosition.bindPopup("<p style='margin:5px;'><b>" + App.username +"</b></p>");

			App.userLatitude = pos.coords.latitude;
			App.userLongitude = pos.coords.longitude;

			fetch(App.genfoursquareRequest({
				id:"A0TFATANX3LKQXFIP1B2ZJCEISHD13OYM5NK0S2SJERWGV44",
				secret:"CZK531LCMFXQF0TXHBLULTF5QQZLQVJBJQY2C1CWU1TOFVB5",
				limit:30,
				lat: App.userLatitude,
				long: App.userLongitude,
				query:""
			})).then(response => {
				return response.json();
			}).then(json => {
				App.genLocationListHTML(json.response);
				App.UI.foursquareDisplay.style.display = "block";
			}).catch(error => {
				throw error;
			});

		});

		App.UI.map = L.map("map", {zoomSnap: 0.1}).setView([52.5077302, 13.469056], 20);
		let mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';

		L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: 'Map data &copy; ' + mapLink,
			maxZoom: 18,
		}).addTo(App.UI.map);

		App.UI.submittedLocationIndicator = new L.Icon({
			iconUrl: "map-marker.png",
			iconSize: [41, 41],
			iconAnchor: [20, 41],
			popupAnchor: [0, -51]
		});
		App.UI.currentSelectedCoordinatesIndicator = new L.Icon({
			iconUrl: "indicator.png",
			iconSize: [41, 41],
			iconAnchor: [20, 41],
			popupAnchor: [0, -51]
		});
		App.UI.userPositionIcon = new L.Icon({
			iconUrl: "userpositionindicator.png",
			iconSize: [28.2, 80],
			iconAnchor: [14.1, 80],
			popupAnchor: [0, -85]
		});
		App.UI.foursquareLocationIndicator = new L.icon({
			iconUrl: "locationmarker.png",
			iconSize: [41, 41],
			iconAnchor: [20, 41],
			popupAnchor: [0, -51]
		});


		App.UI.map.on("click", App.clickHandler);

		App.socket.onmessage = m => {
			data = JSON.parse(m.data);
			let place = new Place(data.lat, data.long, data.name, data.type, data.description, data.creator);
		}

		let clickedRecommendation;

		App.UI.locationList.onclick = e => {
			if(!(e.target == App.UI.foursquareDisplay)) {
				clickedRecommendation != undefined ? clickedRecommendation.classList.remove("locationlistentrySelected") : 0;

				clickedRecommendation = e.target;

				while(!clickedRecommendation.id.includes("listentry")) {
					clickedRecommendation = clickedRecommendation.parentElement;
				}
				console.log(clickedRecommendation.id);
				let clickedlocationData = App.locationData[parseInt(clickedRecommendation.id.split("listentry")[1])];//Array.prototype.indexOf.call(App.UI.locationList.children, clickedRecommendation)];
				
				App.UI.selectedFoursquareLocationMarker = (App.UI.selectedFoursquareLocationMarker ? 

					App.UI.selectedFoursquareLocationMarker
					.setLatLng([clickedlocationData.lat, clickedlocationData.long]) : 
					L.marker([clickedlocationData.lat, clickedlocationData.long], {icon: App.UI.foursquareLocationIndicator})
					.addTo(App.UI.map));
				
					App.UI.selectedFoursquareLocationMarker.bindPopup(clickedRecommendation.innerHTML);
					App.UI.selectedFoursquareLocationMarker.openPopup();

				clickedRecommendation.classList.add("locationlistentrySelected");
				
				App.UI.map.panTo([App.userLatitude - (App.userLatitude - App.UI.selectedFoursquareLocationMarker.getLatLng().lat) / 2, App.userLongitude - (App.userLongitude - App.UI.selectedFoursquareLocationMarker.getLatLng().lng) / 2]);
				let interval = setInterval(x=>{
					if(App.UI.map.getBounds().contains(App.UI.selectedFoursquareLocationMarker.getLatLng())){
						clearInterval(interval);
					} else {
						App.UI.map.setZoom(App.UI.map.getZoom() - 1);
					}
				}, 1000/60);
			}
		}
	},
	locationSearch() {
		fetch(App.genfoursquareRequest({
			id:"A0TFATANX3LKQXFIP1B2ZJCEISHD13OYM5NK0S2SJERWGV44",
			secret:"CZK531LCMFXQF0TXHBLULTF5QQZLQVJBJQY2C1CWU1TOFVB5",
			limit:30,
			lat: App.userLatitude,
			long: App.userLongitude,
			query:App.UI.locationSearchBar.value,
		})).then(response => {
			return response.json();
		}).then(json => {
			App.genLocationListHTML(json.response);
			App.UI.foursquareDisplay.style.display = "block";
		}).catch(error => {
			throw error;
		});

	},
	genLocationListEntryHTML(params, index) {
		let HTML = "<div class='locationlistentry' id='listentry" + index + "'>" +
		"<p style='font-size: 11px; margin: 3px; font-weight: bold;'>" + params.name + "</p>" +
		"<p style='font-size: 10px; margin: 3px; font-weight: normal;'>" + params.type + ", " + params.address + "</p>" +
		"<p style='font-size: 8px; margin: 3px; font-weight: normal;'>" + params.distance + "m away" + "</p>" +
		"</div>"
		App.locationData.push(params);
		return HTML;
		
	},
	genfoursquareRequest(params) {
		return "https://api.foursquare.com/v2/venues/explore?client_id=" + params.id +"&client_secret=" + params.secret + "&v=20180323&limit=" + params.limit + "&ll=" + params.lat + "," + params.long + "&query=" + params.query;
	},
	genLocationListHTML(response) {
		
		let HTML = "";
		App.locationData = [];
		response.groups[0].items.sort((a, b) => {
			return a.venue.location.distance - b.venue.location.distance;
		});

		response.groups[0].items.forEach((i, index) => HTML += App.genLocationListEntryHTML({
			name: i.venue.name, 
			address: i.venue.location.address, 
			type: i.venue.categories[0].name, 
			distance: i.venue.location.distance, 
			lat: i.venue.location.lat, 
			long: i.venue.location.lng
		}, index));

		App.UI.locationList.innerHTML = HTML;
		return HTML;
	},
	clickHandler(e) {
		App.UI.longitudeDisplay.innerHTML = "Longitude: " + e.latlng.lng;
		App.UI.latitudeDisplay.innerHTML = "Latitude: " + e.latlng.lat;

		if (!App.UI.indicator) {
			App.UI.indicator = L.marker([e.latlng.lat, e.latlng.lng], {
				icon: App.UI.currentSelectedCoordinatesIndicator
			}).addTo(App.UI.map);
		} else {
			App.UI.indicator.setLatLng(e.latlng);
		}

		if (!App.UI.map.hasLayer(App.UI.indicator)) {
			App.UI.indicator.addTo(App.UI.map);
		}
	},
	submitLocationData() {
		if (App.UI.longitudeDisplay.innerHTML == "Longitude: ") {
			alert("Please click somewhere on the map first!");
			return;
		}
		if ([App.UI.locationNameInput, App.UI.locationDescriptionInput].some(e => e.value == "")) {
			alert("Please fill out all the fields");
			return;
		}
		App.socket.send(JSON.stringify({
			lat: parseFloat(App.UI.longitudeDisplay.innerHTML.split("Longitude: ")[1]),
			long: parseFloat(App.UI.latitudeDisplay.innerHTML.split("Latitude: ")[1]),
			name: App.UI.locationNameInput.value,
			type: App.UI.locationTypeDropdown.options[App.UI.locationTypeDropdown.selectedIndex].text,
			description: App.UI.locationDescriptionInput.value,
			creator: App.username
		}));
		App.UI.reset();
		App.toggleAddLocationUi();
	},
	toggleAddLocationUi() {
		App.UI.mapContainer.style.animation = "none";
		setTimeout(x => {
			App.UI.mapContainer.style.animation = "resizeMap 0.5s ease 1 " + App.nextToggleAddLocationUIAnimationDirection + " forwards";
			App.nextToggleAddLocationUIAnimationDirection = App.nextToggleAddLocationUIAnimationDirection == "normal" ? "reverse" : "normal";
		}, 0.000000000001);
		App.UI.submitLocationUI.style.display = (App.UI.submitLocationUI.style.display == "block" ? "none" : "block");
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

		this.marker = L.marker([this.long, this.lat], {
			icon: App.UI.submittedLocationIndicator
		}).addTo(App.UI.map);
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
