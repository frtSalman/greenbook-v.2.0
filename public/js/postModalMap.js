'use strict';

(async function () {
    const projectId = document.querySelector('.map').classList[1];
    const response = await fetch(`/projects/${projectId}/projectCoords`);
    const coords = await response.json();
    // Initialize map
    const map = new ol.Map({
        target: 'postModalMap',
        view: new ol.View({
            center: ol.proj.fromLonLat([
                +coords.cCoords[1],
                +coords.cCoords[0],
            ]),
            zoom: 13,
        }),
    });

    const openlayersStandartMap = new ol.layer.Tile({
        source: new ol.source.OSM(),
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

            this.kmlVector = new ol.layer.Vector({
                visible: true,
                source: new ol.source.Vector({
                    url: this.newKmlFilePath,
                    format: new ol.format.KML(),
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

    // Create icon features and styles
    const createIconFeature = (coords, name, src, popupImageSrc) => {
        const iconCoords = ol.proj.fromLonLat([+coords[1], +coords[0]]);
        const iconFeature = new ol.Feature({
            geometry: new ol.geom.Point(iconCoords),
            name: name,
            popupImageSrc: popupImageSrc,
        });
        const iconStyle = new ol.style.Style({
            image: new ol.style.Icon({
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

    const iconsVectorSource = new ol.source.Vector({
        features: [
            kmStartIconFeature,
            kmEndIconFeature,
            kmConIconFeature,
            kmQIconFeature,
            kmPIconFeature,
        ],
    });

    const iconsVectorLayer = new ol.layer.Vector({
        source: iconsVectorSource,
    });

    const LG = new ol.layer.Group({
        layers: [openlayersStandartMap, ...kmlVectors, iconsVectorLayer],
    });

    map.addLayer(LG);

    if (kmlElOne) {
        const kmlElOneCont = new ol.control.Control({
            element: kmlElOne.element,
        });
        map.addControl(kmlElOneCont);
    }

    if (kmlElTwo) {
        const kmlElTwoCont = new ol.control.Control({
            element: kmlElTwo.element,
        });
        map.addControl(kmlElTwoCont);
    }

    if (kmlElThree) {
        const kmlElThreeCont = new ol.control.Control({
            element: kmlElThree.element,
        });
        map.addControl(kmlElThreeCont);
    }

    if (kmlElFour) {
        const kmlElFourCont = new ol.control.Control({
            element: kmlElFour.element,
        });
        map.addControl(kmlElFourCont);
    }

    function createFeatures(data) {
        const features = [];
        data.forEach(item => {
            let geometry;
            if (item.type === 'Point') {
                geometry = new ol.geom.Point(
                    ol.proj.fromLonLat(item.coordinates)
                );
            } else if (item.type === 'LineString') {
                const coords = item.coordinates.map(coord =>
                    ol.proj.fromLonLat(coord)
                );
                geometry = new ol.geom.LineString(coords);
            } else if (item.type === 'Polygon') {
                const coords = item.coordinates.map(ring =>
                    ring.map(coord => ol.proj.fromLonLat(coord))
                );
                geometry = new ol.geom.Polygon(coords);
            }

            if (geometry) {
                const feature = new ol.Feature(geometry);
                features.push(feature);
            }
        });
        return features;
    }

    const styleFunction = function (feature) {
        const geometryType = feature.getGeometry().getType();
        let style;

        if (geometryType === 'Point') {
            style = new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({ color: 'red' }),
                    stroke: new ol.style.Stroke({
                        color: 'white',
                        width: 2,
                    }),
                }),
            });
        } else if (geometryType === 'LineString') {
            style = new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'blue',
                    width: 7,
                }),
            });
        } else if (geometryType === 'Polygon') {
            style = new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: 'green',
                    lineDash: [4],
                    width: 3,
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(0, 255, 0, 0.1)',
                }),
            });
        }

        return style;
    };

    const features = createFeatures(
        JSON.parse(document.querySelector('input[name=geoData]').value)
    );

    const vectorSource = new ol.source.Vector({
        features: features,
    });

    const vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        style: styleFunction,
    });

    map.addLayer(vectorLayer);

    console.log(features[0].values_.geometry.extent_[0]);

    const zoomX = features[0].values_.geometry.extent_[0];
    const zoomY = features[0].values_.geometry.extent_[1];

    setTimeout(() => {
        map.getView().animate({
            center: [+zoomX, +zoomY],
            zoom: 15,
            duration: 2000,
        });
    }, 1500);
})();
