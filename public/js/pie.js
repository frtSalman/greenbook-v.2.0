const createPieGraph = (graphId, conAm, compAm, unit) => {
    document.addEventListener('DOMContentLoaded', function () {
        const ctx = document.getElementById(graphId).getContext('2d');

        const myChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['KM', 'GM'],
                datasets: [
                    {
                        label: '%',
                        data: [
                            ((conAm - compAm) / conAm) * 100,
                            100 - ((conAm - compAm) / conAm) * 100,
                        ],
                        backgroundColor: [
                            'rgba(252, 220, 42, 0.2)',
                            'rgba(74, 149, 28, 0.2)',
                        ],
                        borderColor: [
                            'rgba(252, 220, 42, 1)',
                            'rgba(74, 149, 28, 1)',
                        ],
                        borderWidth: 1,
                    },
                ],
            },
        });
    });
};

const createGraphIfElementsExist = (smSelector, gmSelector, graphId, unit) => {
    const smElement = document.querySelector(smSelector);
    const gmElement = document.querySelector(gmSelector);

    if (
        smElement !== null &&
        gmElement !== null &&
        smElement.children.length > 1 &&
        gmElement.children.length > 1
    ) {
        const smAmount = +smElement.children[1].innerText;
        const gmAmount = +gmElement.children[1].innerText;
        createPieGraph(graphId, smAmount, gmAmount, unit);
    }
};

createGraphIfElementsExist(
    '#excavations .sm',
    '#excavations .gm',
    'excgraph',
    'metreküp'
);
createGraphIfElementsExist(
    '#fillings .sm',
    '#fillings .gm',
    'fillgraph',
    'metreküp'
);
createGraphIfElementsExist(
    '#pmtPmat .sm',
    '#pmtPmat .gm',
    'pmtgraph',
    'metreküp'
);
createGraphIfElementsExist('#bsk .sm', '#bsk .gm', 'bskgraph', 'metreküp');
createGraphIfElementsExist('#sk .sm', '#sk .gm', 'skgraph', 'metreküp');
createGraphIfElementsExist(
    '#cement .sm',
    '#cement .gm',
    'cemgraph',
    'metreküp'
);
createGraphIfElementsExist('#rebar .sm', '#rebar .gm', 'rbrgraph', 'metreküp');
createGraphIfElementsExist('#brdPile .sm', '#brdPile .gm', 'brdgraph', 'adet');

createGraphIfElementsExist(
    '#stnWall .sm',
    '#stnWall .gm',
    'stnWgraph',
    'metreküp'
);

createGraphIfElementsExist(
    '#concrateWall .sm',
    '#concrateWall .gm',
    'cWgraph',
    'metreküp'
);

createGraphIfElementsExist(
    '#culvert .sm',
    '#culvert .gm',
    'culvertgraph',
    'adet'
);

createGraphIfElementsExist('#rEarth .sm', '#rEarth .gm', 'rEgraph', 'metreküp');

createGraphIfElementsExist('#tunnel .sm', '#tunnel .gm', 'tgraph', 'metre');

createGraphIfElementsExist('#brige .sm', '#brige .gm', 'bgraph', 'metre');

createGraphIfElementsExist(
    '#trafic .sm',
    '#trafic .gm',
    'trafficgraph',
    'adet'
);

createGraphIfElementsExist(
    '#landScape .sm',
    '#landScape .gm',
    'landScapegraph',
    'adet'
);

createGraphIfElementsExist(
    '#quardRail .sm',
    '#quardRail .gm',
    'quardRailgraph',
    'adet'
);

createGraphIfElementsExist('#dren .sm', '#dren .gm', 'drengraph', 'adet');

createGraphIfElementsExist('#elec .sm', '#elec .gm', 'elecgraph', 'adet');

createGraphIfElementsExist('#net .sm', '#net .gm', 'netgraph', 'adet');

createGraphIfElementsExist('#sewer .sm', '#sewer .gm', 'sewergraph', 'adet');
