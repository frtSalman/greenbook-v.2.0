import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Tile as TileLayer, Vector as VectorLayer, Group } from 'ol/layer.js';
import OSM from 'ol/source/OSM.js';
import VectorSource from 'ol/source/Vector.js';
import KML from 'ol/format/KML.js';
import { fromLonLat, transform } from 'ol/proj';
import Control from 'ol/control/Control';
import { defaults, FullScreen, ScaleLine, Attribution } from 'ol/control';
import { Feature, Overlay } from 'ol';
import { Point, LineString, Polygon } from 'ol/geom';
import { Style, Icon, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import Draw from 'ol/interaction/Draw.js';

window.onload = init;

const mapElement = document.querySelector('#postMap');

const form = document.querySelector('.create-post-container form');

let isDrawing = false;

let draw;

const projectId = mapElement.classList[1];

const zoom = 12;

async function init() {
    let currentLat;
    let currentLong;
    if (navigator.geolocation) {
        // If Geolocation API is supported
        navigator.geolocation.getCurrentPosition(
            position => {
                currentLat = position.coords.latitude;
                currentLong = position.coords.longitude;
                console.log(
                    `Latitude: ${currentLat}, Longitude: ${currentLong}`
                );

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
    const response = await fetch(`/projects/${projectId}/projectCoords`);
    const coords = await response.json();
    const map = new Map({
        view: new View({
            center: [+coords.cCoords[1], +coords.cCoords[0]],
            zoom: zoom,
            projection: 'EPSG:4326',
        }),
        target: 'postMap',
        controls: defaults().extend([new FullScreen()]),
    });

    // Openstreet Base Map
    const openlayersStandartMap = new TileLayer({
        source: new OSM(),
        //extent: [26, 36, 45, 42], // bu sınırların dışı asla renderlenmez.
        visible: true,
        title: 'OSMStandart',
    });

    class kmlMapElement {
        visibilty = true;
        kmlVector;
        constructor(filePath, btnText, className) {
            this.filePath = filePath;
            this.btnText = btnText;
            this.className = className;
            this.newKmlFilePath = this.filePath.slice(6);
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

    /* adding icons on main map ----- start */

    // Create icon features and styles with reprojected coordinates
    const createIconFeature = (coords, name, src, popupImageSrc) => {
        const iconCoords = transform(
            [+coords[1], +coords[0]],
            'EPSG:3857',
            'EPSG:4326'
        );
        const iconFeature = new Feature({
            geometry: new Point(fromLonLat(iconCoords)),
            name: name,
            popupImageSrc: popupImageSrc,
        });
        const iconStyle = new Style({
            image: new Icon({
                anchor: [0.5, 1],
                anchorXUnits: 'fraction',
                anchorYUnits: 'fraction',
                src: src,
            }),
        });
        iconFeature.setStyle(iconStyle);
        return iconFeature;
    };

    const kmStartIconFeature = createIconFeature(
        coords.kmSCoords,
        'Kilometre Başı',
        '/images/start-flag-ı.svg',
        coords.kmStartPicLink
    );
    const kmEndIconFeature = createIconFeature(
        coords.kmECoords,
        'Kilometre Sonu',
        '/images/finish-flag.svg',
        coords.kmEndPicLink
    );
    const kmConIconFeature = createIconFeature(
        coords.kgmCoords,
        'Kontrollük',
        '/images/kgm-con.svg',
        coords.kgmConPicLink
    );
    const kmQIconFeature = createIconFeature(
        coords.quarry,
        'Taş Ocağı',
        '/images/kgm-quarry.svg',
        coords.quarryPicLink
    );
    const kmPIconFeature = createIconFeature(
        coords.plent,
        'Asfalt Plenti',
        '/images/kgm-plent.svg',
        coords.plentPicLink
    );

    const iconsVectorSource = new VectorSource({
        features: [
            kmStartIconFeature,
            kmEndIconFeature,
            kmConIconFeature,
            kmQIconFeature,
            kmPIconFeature,
        ],
    });

    const iconsVectorLayer = new VectorLayer({
        source: iconsVectorSource,
    });

    /* adding icons on main maps ----- end */

    const styleFunction = function (feature) {
        const geometryType = feature.getGeometry().getType();
        let style;

        if (geometryType === 'Point') {
            style = new Style({
                image: new CircleStyle({
                    radius: 7,
                    fill: new Fill({ color: 'red' }),
                    stroke: new Stroke({
                        color: 'white',
                        width: 2,
                    }),
                }),
            });
        } else if (geometryType === 'LineString') {
            style = new Style({
                stroke: new Stroke({
                    color: 'blue',
                    width: 7,
                }),
            });
        } else if (geometryType === 'Polygon') {
            style = new Style({
                stroke: new Stroke({
                    color: 'green',
                    lineDash: [4],
                    width: 3,
                }),
                fill: new Fill({
                    color: 'rgba(0, 255, 0, 0.1)',
                }),
            });
        }

        return style;
    };

    const drawSource = new VectorSource({ wrapX: false });

    const drawLayer = new VectorLayer({
        source: drawSource,
        style: styleFunction,
    });

    const LG = new Group({
        layers: [
            openlayersStandartMap,
            ...kmlVectors,
            drawLayer,
            iconsVectorLayer,
        ],
    });

    class mapZoomElement {
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

        handleZoom() {
            // Create a temporary marker feature at the user's current location
            const userLocationCoords = [+this.coords[1], +this.coords[0]];

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

    const kmSEl = new mapZoomElement(
        `fa fa-flag-checkered`,
        coords.kmSCoords,
        'kmStartC'
    );
    const kmCEl = new mapZoomElement(
        'fa fa-arrows-to-dot',
        coords.cCoords,
        'centerC'
    );
    const kmEEl = new mapZoomElement('fa fa-ban', coords.kmECoords, 'kmEndC');
    const kgmCEl = new mapZoomElement(
        'fa fa-house-flag',
        coords.kgmCoords,
        'kgmC'
    );
    const qEl = new mapZoomElement(
        'fa fa-hill-rockslide',
        coords.quarry,
        'quarryC'
    );

    const pEl = new mapZoomElement('fa fa-industry', coords.plent, 'plentC');

    const locEl = new mapZoomElement(
        'fa fa-location-crosshairs',
        [currentLat, currentLong],
        'locC'
    );

    /* start initiate draw elements */

    const pointEl = document.querySelector('.point');
    const lineEl = document.querySelector('.lineString');
    const polyEl = document.querySelector('.polygon');
    const quitDrawEl = document.querySelector('.quitDraw');

    const pointCont = new Control({
        element: pointEl,
    });
    const lineCont = new Control({
        element: lineEl,
    });
    const polyCont = new Control({
        element: polyEl,
    });
    const quitDrawCont = new Control({
        element: quitDrawEl,
    });

    pointEl.addEventListener('click', () => {
        if (draw !== null) {
            map.removeInteraction(draw);
        }
        draw = new Draw({
            type: 'Point',
            source: drawSource,
        });

        map.addInteraction(draw);
    });

    lineEl.addEventListener('click', () => {
        if (draw !== null) {
            map.removeInteraction(draw);
        }
        draw = new Draw({
            type: 'LineString',
            source: drawSource,
        });

        map.addInteraction(draw);
    });

    polyEl.addEventListener('click', () => {
        if (draw !== null) {
            map.removeInteraction(draw);
        }
        draw = new Draw({
            type: 'Polygon',
            source: drawSource,
        });

        map.addInteraction(draw);
    });

    quitDrawEl.addEventListener('click', () => {
        if (draw !== null) {
            map.removeInteraction(draw);
        }
    });

    /* stop initiate draw elements */

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
    map.addControl(locationCont);

    map.addControl(pointCont);
    map.addControl(lineCont);
    map.addControl(polyCont);
    map.addControl(quitDrawCont);

    function getTodayDate() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
        const year = today.getFullYear();

        return `${day}.${month}.${year}`;
    }

    let allGeometries = [];

    drawSource.on('addfeature', evt => {
        const feature = evt.feature;
        const geometry = feature.getGeometry();
        const geometryType = geometry.getType();
        const coordinates = geometry.getCoordinates();

        allGeometries.push({
            type: geometryType,
            coordinates: coordinates,
            geomDate: getTodayDate(),
            creator: coords.creatorName,
        });

        document.querySelector('input[name="geoData"]').value =
            JSON.stringify(allGeometries);
    });

    const submit = document.querySelector('#sbmtbtn');

    form.addEventListener('submit', event => {
        event.preventDefault();
    });

    function compressImageUsingCanvas(file, maxWidthOrHeight) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (event) {
                const img = new Image();
                img.src = event.target.result;

                img.onload = function () {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions based on maxWidthOrHeight
                    if (width > height) {
                        if (width > maxWidthOrHeight) {
                            height = Math.round(
                                (height *= maxWidthOrHeight / width)
                            );
                            width = maxWidthOrHeight;
                        }
                    } else {
                        if (height > maxWidthOrHeight) {
                            width = Math.round(
                                (width *= maxWidthOrHeight / height)
                            );
                            height = maxWidthOrHeight;
                        }
                    }

                    // Set canvas dimensions
                    canvas.width = width;
                    canvas.height = height;

                    // Draw the image onto the canvas
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert canvas to Blob (WebP format for smaller size)
                    canvas.toBlob(
                        blob => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Canvas conversion failed'));
                            }
                        },
                        'image/webp', // Format
                        0.8 // Quality (0-1 range for compression level)
                    );
                };

                img.onerror = function () {
                    reject(new Error('Failed to load image'));
                };
            };

            reader.onerror = function () {
                reject(new Error('Failed to read image file'));
            };

            reader.readAsDataURL(file);
        });
    }

    submit.addEventListener('click', async event => {
        console.time('over all time spend');
        event.preventDefault();

        const geoData = document.getElementById('geoData').value;
        const postTitle = document.getElementById('postTitle').value;
        const kmStart = document.getElementById('kmStart').value;
        const kmEnd = document.getElementById('kmEnd').value;

        if (!geoData || !postTitle || !kmStart || !kmEnd) {
            window.alert(
                'Lütfen haritadaki yer işaretleri de dahil tüm bilgileri eksiksiz giriniz.'
            );
            return;
        }

        const formData = new FormData(form);
        const imageFiles = document.getElementById('postImages').files;

        const compressedFilePaths = [];

        const maxWidthOrHeight = 1440; // Resize to 1440x1440

        console.time('photo post time');

        const loadingSpinner = document.getElementById('loading');

        loadingSpinner.setAttribute('style', 'display:block;');

        console.log(loadingSpinner);

        // Upload images individually
        for (let i = 0; i < imageFiles.length; i++) {
            try {
                // Compress the image using Canvas
                const compressedImage = await compressImageUsingCanvas(
                    imageFiles[i],
                    maxWidthOrHeight
                );

                const date = new Date().toISOString().replace(/:/g, '-');

                // Calculate compressed image size
                const compressedSizeKB = (compressedImage.size / 1024).toFixed(
                    2
                ); // Size in KB
                console.log(`Compressed image size: ${compressedSizeKB} KB`);

                // Create FormData and append the compressed image
                const photoFormData = new FormData();
                photoFormData.append(
                    'postImage',
                    compressedImage,
                    `compressed-${date}-${imageFiles[i].name}.webp`
                );

                // Upload the compressed image to the server
                const response = await fetch(`/posts/photoUploads`, {
                    method: 'POST',
                    body: photoFormData,
                });

                if (!response.ok) {
                    throw new Error('Failed to upload photo');
                }

                const result = await response.json();
                compressedFilePaths.push(result.postPhotoPath);
            } catch (error) {
                console.error('Error uploading image:', error);
                window.alert('Error uploading images');
                return;
            }
        }

        console.timeEnd('photo post time');

        // Prepare post creation form data
        formData.delete('postImages'); // Remove original files from formData
        formData.append('postPhotoPaths', JSON.stringify(compressedFilePaths)); // Add paths as JSON

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                console.timeEnd('over all time spend');
                loadingSpinner.setAttribute('display', 'none');
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                console.log('Error creating post');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
        }
    });

    map.addLayer(LG);
}
