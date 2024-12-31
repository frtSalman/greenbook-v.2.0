import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Tile as TileLayer, Vector as VectorLayer, Group } from 'ol/layer.js';
import { OSM, Vector as VectorSource } from 'ol/source.js';
import KML from 'ol/format/KML.js';
import { fromLonLat, toLonLat } from 'ol/proj';
import Control from 'ol/control/Control';
import { defaults, FullScreen, ScaleLine, Attribution } from 'ol/control';
import { Feature, Overlay } from 'ol';
import { Point, LineString, Polygon } from 'ol/geom';
import { Style, Icon, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import { getArea, getLength } from 'ol/sphere.js';
import { unByKey } from 'ol/Observable.js';
import Draw from 'ol/interaction/Draw.js';

window.onload = init;

let popupContainer = document.createElement('div');
popupContainer.className = 'popup';

let currentLat;
let currentLong;

if (navigator.geolocation) {
    // If Geolocation API is supported
    navigator.geolocation.getCurrentPosition(
        position => {
            currentLat = position.coords.latitude;
            currentLong = position.coords.longitude;
            console.log(`Latitude: ${currentLat}, Longitude: ${currentLong}`);

            // You can use these coordinates for map functions, etc.
        },
        error => {
            console.error(`Error: ${error.message}`);
        },
        {
            enableHighAccuracy: true, // Get a more accurate reading
            timeout: 5000, // Time out after 5 seconds
            maximumAge: 0, // Prevent using a cached position
        }
    );
} else {
    console.log('Geolocation is not supported by this browser.');
}

let map;
let mVector; // ölçüm elemanlarının vector layeri silinmesi kolay olsun diye global yapıldı.
/**
 * The measure tooltip element.
 * @type {HTMLElement}
 */
let measureTooltipElement;

/**
 * Overlay to show the measurement.
 * @type {Overlay}
 */
let measureTooltip;

let mToolTip;

async function init() {
    console.log('deneme main map');
    const mapDiv = document.querySelector('.map');
    const projectId = mapDiv.classList[1];
    const response = await fetch(`/projects/${projectId}/projectCoords`);
    const coords = await response.json();
    map = new Map({
        view: new View({
            center: fromLonLat([+coords.cCoords[1], +coords.cCoords[0]]),
            zoom: 12,
            projection: 'EPSG:3857',
        }),
        target: 'map',
        controls: defaults().extend([
            new FullScreen(),
            new ScaleLine(),
            new Attribution(),
        ]),
    });

    const openlayersStandartMap = new TileLayer({
        source: new OSM(),
        visible: true,
        title: 'OSMStandart',
    });

    class kmlMapElement {
        visibilty = true;
        constructor(filePath, btnText, className) {
            this.newKmlFilePath = filePath.slice(6);
            this.btnText = btnText;
            this.className = className;
            const button = document.createElement('button');
            button.insertAdjacentHTML('afterbegin', `<p>${this.btnText}</p>`);

            this.element = document.createElement('div');
            this.element.className = `ol-control button ${this.className}`;
            this.element.appendChild(button);

            this.kmlVector = new VectorLayer({
                visible: true,
                source: new VectorSource({
                    url: this.newKmlFilePath,
                    format: new KML(),
                }),
            });

            button.addEventListener('click', this.toggleKML.bind(this), false);
        }

        toggleKML() {
            if (this.visibilty === true) {
                this.kmlVector.setVisible(false);
                this.visibilty = false;
            } else {
                this.kmlVector.setVisible(true);
                this.visibilty = true;
            }
        }
    }

    const filePathOne = coords.kmlFileOnePath;
    const filePathTwo = coords.kmlFileTwoPath;
    const filePathThree = coords.kmlFileThreePath;
    const filePathFour = coords.kmlFileFourPath;

    let kmlVectors = [];
    let kmlElOne, kmlElTwo, kmlElThree, kmlElFour;

    if (filePathOne) {
        kmlElOne = new kmlMapElement(filePathOne, '1', 'kmlOne');
        kmlVectors.push(kmlElOne.kmlVector);
    }

    if (filePathTwo) {
        kmlElTwo = new kmlMapElement(filePathTwo, '2', 'kmlTwo');
        kmlVectors.push(kmlElTwo.kmlVector);
    }

    if (filePathThree) {
        kmlElThree = new kmlMapElement(filePathThree, '3', 'kmlThree');
        kmlVectors.push(kmlElThree.kmlVector);
    }

    if (filePathFour) {
        kmlElFour = new kmlMapElement(filePathFour, '4', 'kmlFour');
        kmlVectors.push(kmlElFour.kmlVector);
    }

    const LG = new Group({
        layers: [openlayersStandartMap, ...kmlVectors],
    });

    class mapElement {
        locationLayer;

        constructor(btnText, coords, className) {
            this.btnText = btnText;
            this.coords = coords;
            this.className = className;

            const button = document.createElement('button');
            button.insertAdjacentHTML(
                'afterbegin',
                `<i class="${this.btnText}"></i>`
            );

            this.element = document.createElement('div');
            this.element.className = `ol-control button ${this.className}`;
            this.element.appendChild(button);

            button.addEventListener('click', this.handleZoom.bind(this), false);
        }

        // Inside the `locEl.handleZoom` function:
        handleZoom() {
            // Create a temporary marker feature at the user's current location
            const userLocationCoords = fromLonLat([
                +this.coords[1],
                +this.coords[0],
            ]);

            // Create a new marker feature
            const locationMarker = new Feature({
                geometry: new Point(userLocationCoords),
                name: 'Your Location',
            });

            // Define the style for the marker (customize the icon as you wish)
            const locationMarkerStyle = new Style({
                image: new Icon({
                    anchor: [0.5, 1],
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'fraction',
                    src: '/images/loc-dot.svg', // Specify the path to your marker icon
                }),
            });

            // Set the style to the feature
            locationMarker.setStyle(locationMarkerStyle);

            // Create a new vector source and layer to hold the marker
            const locationVectorSource = new VectorSource({
                features: [locationMarker],
            });

            this.locationLayer = new VectorLayer({
                source: locationVectorSource,
            });

            // Add the marker layer to the map
            map.addLayer(this.locationLayer);

            // Zoom to the user's location with animation
            map.getView().animate({
                center: userLocationCoords,
                zoom: 15,
                duration: 2000,
            });

            setTimeout(() => {
                map.removeLayer(this.locationLayer);
            }, 10000);
        }
    }

    const kmSEl = new mapElement(
        `fa fa-flag-checkered`,
        coords.kmSCoords,
        'kmStartC'
    );
    const kmCEl = new mapElement(
        'fa fa-arrows-to-dot',
        coords.cCoords,
        'centerC'
    );
    const kmEEl = new mapElement('fa fa-ban', coords.kmECoords, 'kmEndC');
    const kgmCEl = new mapElement('fa fa-house-flag', coords.kgmCoords, 'kgmC');
    const qEl = new mapElement(
        'fa fa-hill-rockslide',
        coords.quarry,
        'quarryC'
    );

    const pEl = new mapElement('fa fa-industry', coords.plent, 'plentC');

    console.log(coords.cCoords);

    const locEl = new mapElement(
        'fa fa-location-crosshairs',
        [currentLat || coords.cCoords[0], currentLong || coords.cCoords[1]],
        'locC'
    );

    const locationCont = new Control({
        element: locEl.element,
    });

    const kmStartZoomCont = new Control({
        element: kmSEl.element,
    });
    const CenterZoomCont = new Control({
        element: kmCEl.element,
    });
    const kmEndZoomCont = new Control({
        element: kmEEl.element,
    });
    const kgmZoomCont = new Control({
        element: kgmCEl.element,
    });
    const quarryZoomCont = new Control({
        element: qEl.element,
    });
    const plentZoomCont = new Control({
        element: pEl.element,
    });

    const searchControl = document.querySelector('.search-control');

    const searchControlElement = new Control({
        element: searchControl,
    });

    if (kmlElOne) {
        const kmlElOneCont = new Control({
            element: kmlElOne.element,
        });
        map.addControl(kmlElOneCont);
    }

    if (kmlElTwo) {
        const kmlElTwoCont = new Control({
            element: kmlElTwo.element,
        });
        map.addControl(kmlElTwoCont);
    }

    if (kmlElThree) {
        const kmlElThreeCont = new Control({
            element: kmlElThree.element,
        });
        map.addControl(kmlElThreeCont);
    }

    if (kmlElFour) {
        const kmlElFourCont = new Control({
            element: kmlElFour.element,
        });
        map.addControl(kmlElFourCont);
    }

    map.addControl(kmStartZoomCont);
    map.addControl(CenterZoomCont);
    map.addControl(kmEndZoomCont);
    map.addControl(kgmZoomCont);
    map.addControl(quarryZoomCont);
    map.addControl(plentZoomCont);
    map.addControl(searchControlElement);
    map.addControl(locationCont);

    map.addLayer(LG);

    /* adding overlays for icons popups */

    // Create the overlay for the popup
    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content';
    popupContainer.appendChild(popupContent);
    const overlay = new Overlay({
        element: popupContainer,
        autoPan: true,
        autoPanAnimation: {
            duration: 250,
        },
    });
    map.addOverlay(overlay);

    /* adding icons on main map ----- start */
    // for km Start
    const kmStartCoords = [+coords.kmSCoords[1], +coords.kmSCoords[0]];

    const kmStartIconFeature = new Feature({
        geometry: new Point(fromLonLat(kmStartCoords)),
        name: 'Kilometre Başı',
        popupImageSrc: coords.kmStartPicLink,
        type: 'photo',
    });

    const kmStartIconStyle = new Style({
        image: new Icon({
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: '/images/start-flag-ı.svg',
        }),
    });

    kmStartIconFeature.setStyle(kmStartIconStyle);

    // for km End
    const kmEndCoords = [+coords.kmECoords[1], +coords.kmECoords[0]];
    const kmEndIconFeature = new Feature({
        geometry: new Point(fromLonLat(kmEndCoords)),
        name: 'Kilometre Sonu',
        popupImageSrc: coords.kmEndPicLink,
        type: 'photo',
    });

    const kmEndIconStyle = new Style({
        image: new Icon({
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: '/images/finish-flag.svg',
        }),
    });

    kmEndIconFeature.setStyle(kmEndIconStyle);
    // for kgm Con
    const kmConCoords = [+coords.kgmCoords[1], +coords.kgmCoords[0]];
    const kmConIconFeature = new Feature({
        geometry: new Point(fromLonLat(kmConCoords)),
        name: 'Kontrollük',
        popupImageSrc: coords.kgmConPicLink,
        type: 'photo',
    });

    const kmConIconStyle = new Style({
        image: new Icon({
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: '/images/kgm-con.svg',
        }),
    });

    kmConIconFeature.setStyle(kmConIconStyle);

    // for quarry
    const kmQCoords = [+coords.quarry[1], +coords.quarry[0]];
    const kmQIconFeature = new Feature({
        geometry: new Point(fromLonLat(kmQCoords)),
        name: 'Taş Ocağı',
        popupImageSrc: coords.quarryPicLink,
        type: 'photo',
    });

    const kmQIconStyle = new Style({
        image: new Icon({
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: '/images/kgm-quarry.svg',
        }),
    });

    kmQIconFeature.setStyle(kmQIconStyle);

    // for plent

    const kmPCoords = [+coords.plent[1], +coords.plent[0]];
    const kmPIconFeature = new Feature({
        geometry: new Point(fromLonLat(kmPCoords)),
        name: 'Asfalt Plenti',
        popupImageSrc: coords.plentPicLink,
        type: 'photo',
    });

    const kmPIconStyle = new Style({
        image: new Icon({
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: '/images/kgm-plent.svg',
        }),
    });

    kmPIconFeature.setStyle(kmPIconStyle);

    const ıconsVectorSource = new VectorSource({
        features: [
            kmStartIconFeature,
            kmEndIconFeature,
            kmConIconFeature,
            kmQIconFeature,
            kmPIconFeature,
        ],
    });

    const ıconsVectorLayer = new VectorLayer({
        source: ıconsVectorSource,
    });

    map.addLayer(ıconsVectorLayer);

    // Event listener for displaying the popup
    map.on('click', function (event) {
        // Hide the popup
        overlay.setPosition(undefined);

        // Check if a feature was clicked
        map.forEachFeatureAtPixel(event.pixel, function (feature) {
            const coordinates = feature.getGeometry().getCoordinates();
            const name = feature.get('name');

            console.log(feature.values_.geoId);

            if (feature.values_.type === 'geom') {
                popupContent.innerHTML = `
                <div>
                <div
                id="detailBtnMap"
                class="linkbtn detail-for-modal"
                >
                <i class="fa-solid fa-magnifying-glass fa-lg"></i>
                </div>
                </div>
            `;

                const popUpDetail = document.querySelector('#detailBtnMap');

                popUpDetail.setAttribute(
                    'hx-get',
                    `/posts/modal/${feature.values_.geoId}`
                );
                popUpDetail.setAttribute('hx-target', '.post-modal');
                popUpDetail.setAttribute('hx-trigger', 'click');
                popUpDetail.setAttribute('hx-swap', 'innerHTML');

                // Process the new HTMX element
                htmx.process(popUpDetail); // Tell HTMX to bind to the new element

                popUpDetail.addEventListener('click', e => {
                    const postModal = document.querySelector('.post-modal');
                    const postModalOverlay = document.querySelector('.overlay');

                    postModal.classList.remove('hidden');
                    postModalOverlay.classList.remove('hidden');

                    document.addEventListener('keydown', e => {
                        if (
                            e.key === 'Escape' &&
                            !postModal.classList.contains('hidden')
                        ) {
                            postModal.classList.add('hidden');
                            postModalOverlay.classList.add('hidden');
                        }
                    });

                    postModalOverlay.addEventListener('click', e => {
                        if (!postModal.classList.contains('hidden')) {
                            postModal.classList.add('hidden');
                            postModalOverlay.classList.add('hidden');
                        }
                    });
                });
            } else if (feature.values_.type === 'photo') {
                const popupImageSrc = feature.get('popupImageSrc');
                popupContent.innerHTML = `
                <strong>${name}</strong><br>
                <img src="/${popupImageSrc}" alt="${name}" onclick="makeBig(event)">
            `;
            } else {
                return;
            }

            // Set the content of the popup
            overlay.setPosition(coordinates);
        });
    });

    // Change cursor to pointer when hovering over an icon feature
    map.on('pointermove', function (event) {
        const pixel = map.getEventPixel(event.originalEvent);
        const hit = map.hasFeatureAtPixel(pixel);
        map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    /* adding icons on main maps ----- end */

    function getRandomColor() {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 128);
        const b = Math.floor(Math.random() * 256);
        return `rgb(${r}, ${g}, ${b})`;
    }

    function convertRgbToRgba(rgb, alpha) {
        // Extract the numeric values from the rgb string
        const rgbValues = rgb.match(/\d+/g);

        // Check if rgbValues has exactly 3 values
        if (rgbValues.length === 3) {
            // Return the rgba string with the specified alpha value
            return `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, ${alpha})`;
        } else {
            throw new Error('Invalid RGB format');
        }
    }

    function createFeatures(data) {
        const features = [];
        data.forEach(item => {
            const geo = item.postGeoData;
            const geo_id = item.id;
            const randomColor = getRandomColor();

            const stylePol = new Style({
                stroke: new Stroke({
                    color: randomColor,
                    lineDash: [4],
                    width: 4,
                }),
                fill: new Fill({
                    color: convertRgbToRgba(randomColor, 0.5),
                }),
            });

            const styleNorm = new Style({
                stroke: new Stroke({
                    color: randomColor,
                    width: 3,
                }),
                fill: new Fill({
                    color: randomColor,
                }),
                image: new CircleStyle({
                    radius: 5,
                    fill: new Fill({
                        color: randomColor,
                    }),
                }),
            });

            geo.forEach(item => {
                let geometry;
                if (item.type === 'Point') {
                    geometry = new Point(fromLonLat(item.coordinates));
                } else if (item.type === 'LineString') {
                    const coords = item.coordinates.map(coord =>
                        fromLonLat(coord)
                    );
                    geometry = new LineString(coords);
                } else if (item.type === 'Polygon') {
                    const coords = item.coordinates.map(ring =>
                        ring.map(coord => fromLonLat(coord))
                    );
                    geometry = new Polygon(coords);
                }

                if (geometry) {
                    const feature = new Feature(geometry);
                    feature.setProperties({
                        name: 'İş Tarihi',
                        date: item.geomDate,
                        creator: item.creator,
                        geoId: geo_id,
                        geomType: item.type,
                        type: 'geom',
                    });
                    if (feature.values_.geomType === 'Polygon') {
                        feature.setStyle(stylePol);
                    } else {
                        feature.setStyle(styleNorm);
                    }

                    features.push(feature);
                }
            });
        });
        return features;
    }

    let vL;

    let vectorLayers = [];

    document
        .getElementById('daySearchButton')
        .addEventListener('click', async () => {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;

            const datas = await fetch(
                `/posts/geoData/${projectId}?startDate=${startDate}&endDate=${endDate}`
            );
            const geoDatas = await datas.json();
            const postGeoDatas = geoDatas.datas;
            const features = createFeatures(postGeoDatas);

            const vS = new VectorSource({
                features: features,
            });

            vL = new VectorLayer({
                source: vS,
            });

            vectorLayers.push(vL);

            map.addLayer(vL);

            console.log(features[0]);

            const zoomX = features[0].values_.geometry.extent_[0];
            const zoomY = features[0].values_.geometry.extent_[1];

            setTimeout(() => {
                map.getView().animate({
                    center: [+zoomX, +zoomY],
                    zoom: 15,
                    duration: 2000,
                });
            }, 500);
        });

    const eraseDrawEl = document.querySelector('.eraseDraw');
    const eraseDrawCont = new Control({
        element: eraseDrawEl,
    });

    eraseDrawEl.addEventListener('click', () => {
        vectorLayers.forEach(layer => {
            map.removeLayer(layer);
        });
        vectorLayers = [];
    });

    map.addControl(eraseDrawCont);

    map.on('click', function (event) {
        // Get the coordinate in the map's projection
        const coordinate = event.coordinate;

        // Convert the coordinate to geographic (longitude, latitude)
        const lonLat = toLonLat(coordinate);

        // Log the coordinates
        console.log('Geographic coordinate (Lat, Lon):', [
            lonLat[1],
            lonLat[0],
        ]);
    });

    /* İnitilazing measurements */

    const mSource = new VectorSource();

    mVector = new VectorLayer({
        source: mSource,
        style: {
            'fill-color': 'rgba(255, 255, 255, 0.8)',
            'stroke-color': '#ffcc33',
            'stroke-width': 4,
            'circle-radius': 15,
            'circle-fill-color': '#ffcc33',
        },
    });

    let sketch;

    map.addLayer(mVector);

    const typeSelect = document.getElementById('type');

    let draw; // global so we can remove it later

    /**
     * Format length output.
     * @param {LineString} line The line.
     * @return {string} The formatted length.
     */
    const formatLength = function (line) {
        const length = getLength(line);
        let output;
        if (length > 100) {
            output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
        } else {
            output = Math.round(length * 100) / 100 + ' ' + 'm';
        }
        return output;
    };

    /**
     * Format area output.
     * @param {Polygon} polygon The polygon.
     * @return {string} Formatted area.
     */
    const formatArea = function (polygon) {
        const area = getArea(polygon);
        let output;
        if (area > 10000) {
            output =
                Math.round((area / 1000000) * 100) / 100 +
                ' ' +
                'km<sup>2</sup>';
        } else {
            output = Math.round(area * 100) / 100 + ' ' + 'm<sup>2</sup>';
        }
        return output;
    };

    const mStyle = new Style({
        fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)',
        }),
        stroke: new Stroke({
            color: 'rgba(0, 0, 0, 0.5)',
            lineDash: [10, 10],
            width: 2,
        }),
        image: new CircleStyle({
            radius: 5,
            stroke: new Stroke({
                color: 'rgba(0, 0, 0, 0.7)',
            }),
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.2)',
            }),
        }),
    });

    function addInteraction() {
        const type = typeSelect.value == 'area' ? 'Polygon' : 'LineString';
        draw = new Draw({
            source: mSource,
            type: type, // Polygon or LineString
            style: function (feature) {
                const geometryType = feature.getGeometry().getType();
                if (geometryType === type || geometryType === 'Point') {
                    return mStyle;
                }
            },
        });

        map.addInteraction(draw);

        createMeasureTooltip();

        let listener;
        draw.on('drawstart', function (evt) {
            // set sketch
            sketch = evt.feature;

            /** @type {import("../src/ol/coordinate.js").Coordinate|undefined} */
            let tooltipCoord = evt.coordinate;

            listener = sketch.getGeometry().on('change', function (evt) {
                const geom = evt.target;
                let output;
                if (geom instanceof Polygon) {
                    output = formatArea(geom);
                    tooltipCoord = geom.getInteriorPoint().getCoordinates(); // dinamik alanın yazılı olduğu tooltipi koyacağı koordinat
                } else if (geom instanceof LineString) {
                    output = formatLength(geom);
                    tooltipCoord = geom.getLastCoordinate(); // dinamik uzunluğun yazılı olduğu tooltipi koyacağı koordinat
                }
                measureTooltipElement.innerHTML = output;
                measureTooltip.setPosition(tooltipCoord); // measuretooltip harita üzerinde ölçümü gösteren Overlay
            });
        });

        draw.on('drawend', function () {
            measureTooltipElement.className =
                'ol-tooltip ol-tooltip-static mtoolTip';
            measureTooltip.setOffset([0, -7]);
            // unset sketch
            sketch = null;
            // unset tooltip so that a new one can be created
            measureTooltipElement = null;
            createMeasureTooltip();
            unByKey(listener);
        });
    }

    function createMeasureTooltip() {
        if (measureTooltipElement) {
            measureTooltipElement.remove();
        }
        measureTooltipElement = document.createElement('div');
        measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
        measureTooltip = new Overlay({
            element: measureTooltipElement,
            offset: [0, -15],
            positioning: 'bottom-center',
            stopEvent: false,
            insertFirst: false,
        });
        map.addOverlay(measureTooltip);
    }

    const mEl = document.querySelector('.m');
    const mSelect = document.querySelector('.m-select');

    mEl.addEventListener('click', () => {
        mSelect.classList.toggle('closed');

        if (draw !== null) {
            map.removeInteraction(draw);
        }

        typeSelect.onclick = function () {
            map.removeInteraction(draw);
            addInteraction();
        };
    });

    const mCont = new Control({
        element: mEl,
    });

    map.addControl(mCont);
}
