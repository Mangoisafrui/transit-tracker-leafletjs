// IIFE
(() => {

    //create map in leaflet and tie it to the div called 'theMap'
    let map = L.map('theMap').setView([44.650627, -63.597140], 14);


    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    
    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO'
    });

    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenTopoMap'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri' 

    });

    //REQ - 008

    L.control.layers(
        {
            "OpenStreetMap": osmLayer,
            "Satellite": satelliteLayer,
            "Dark": darkLayer,
            "Topo": topoLayer
        },
        null,
        { position: "topleft", collapsed: false }
    ).addTo(map);





    L.marker([44.650690, -63.596537]).addTo(map)
        .bindPopup('Halifax Transit Real-Time Bus Tracker')
        .openPopup();


    let vehiclesLayer = null;

    let vehicleHistory = {};    
    let historyLayer = L.layerGroup().addTo(map); 

    const allowedRoutes = ["1","2","3","4","5","6A","6B","6C","7A","7B","8","9A","9B","10A","10B","10C"];

    let isFetching = false; 
    let timerId = null;  


    //REQ-006
    let selectedRoutes = [...allowedRoutes];

    function updateSelectedRoutes() {
        selectedRoutes = Array.from(
            document.querySelectorAll(".routeCheck:checked")
        ).map(cb => cb.value);
    }

    document.getElementById("controls").addEventListener("change", () => {
        updateSelectedRoutes();
        refreshVehicles(); 
    });





    const busIcon = L.icon({
    iconUrl: "bus.png",   
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
    });


    function refreshVehicles() {

        if (isFetching) return;      
        isFetching = true;          

        
        if (timerId) clearTimeout(timerId); 


        fetch("https://halifax-transit-data.onrender.com/vehicles")
        .then(response => response.json())
        .then(data => {

            console.log("FULL RAW DATA:", data); 
          
   // IF API ERROR OCCURS, LOG IT AND ALERT THE USER, THEN EXIT THE FUNCTION TO AVOID FURTHER ISSUES
    if (!data.success || !data.entity) {
        console.warn("API ERROR:", data.error);
        alert("Transit data unavailable. Please try again later.");
        return;
    }

            console.log("ENTITY ARRAY LENGTH:", data.entity.length); 

            console.log("FIRST BUS OBJECT:", data.entity[0]); 

            console.log(
                "ROUTE SAMPLE:",
                data.entity.map(e => e.vehicle.trip.routeId).slice(0, 20)
            );


        // REQ-001


        const filteredEntities = data.entity.filter(e =>
            selectedRoutes.includes(e.vehicle.trip.routeId)
        );

        console.log("FILTERED RAW DATA:", filteredEntities);

        console.log("FILTERED COUNT:", filteredEntities.length);

        console.log(
                    "FILTERED ROUTE SAMPLE:",filteredEntities
                    .map(e => e.vehicle.trip.routeId)
                    .slice(0, 20)
        );

        

        //REQ 002
        const geoJsonData = {
            type: "FeatureCollection",
            features: filteredEntities.map(e => ({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [
                        e.vehicle.position.longitude,
                        e.vehicle.position.latitude
                        ]
                    },
                    properties: {
                        routeId: e.vehicle.trip.routeId,
                        vehicleId: e.vehicle.vehicle.id,
                        bearing: e.vehicle.position.bearing || 0
                    }
                    }))
        };

        console.log("GEOJSON DATA:", geoJsonData);


        //REQ 003 + 005
        //L.geoJSON(geoJsonData).addTo(map);

        if (vehiclesLayer) {
          vehiclesLayer.remove() 
        }

        vehiclesLayer = L.geoJSON(geoJsonData, {

            pointToLayer: function(feature, latlng) {
                return L.marker(latlng, {
                    icon: busIcon,
                    rotationAngle: feature.properties.bearing,
                    rotationOrigin: "center center"
                });
            },

            onEachFeature: function(feature, layer) {
                layer.bindPopup(
                    "Route: " + feature.properties.routeId +
                    "<br>Vehicle: " + feature.properties.vehicleId +
                    "<br>Bearing: " + feature.properties.bearing
                );
            }

        }).addTo(map);


        //REQ 007
        historyLayer.clearLayers();

        filteredEntities.reduce((acc, e) => {

        const id = e.vehicle.vehicle.id;
        const lat = e.vehicle.position.latitude;
        const lng = e.vehicle.position.longitude;

        vehicleHistory[id] = (vehicleHistory[id] || []).concat([[lat, lng]]);

        L.polyline(vehicleHistory[id]).addTo(historyLayer);

        return acc;

        }, []);


        //REQ 004
        timerId = setTimeout(refreshVehicles, 7000); 
            isFetching = false;                         
        })
        .catch(err => {
            console.error("FETCH ERROR:", err);

            timerId = setTimeout(refreshVehicles, 7000); 
            isFetching = false;                         
        });

    }
  
        refreshVehicles();


        


})();